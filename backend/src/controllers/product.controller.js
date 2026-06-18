const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const productSelect = (includeGallery = false) => `
  p.id,
  p.vendeur_id,
  p.categorie_id,
  p.titre,
  p.description,
  p.prix,
  p.image_url,
  ${includeGallery ? 'p.images_urls,' : ''}
  p.stock,
  p.etat,
  p.localisation,
  p.statut,
  p.date_creation,
  c.nom AS categorie_nom,
  u.nom AS vendeur_nom,
  u.prenom AS vendeur_prenom,
  COALESCE(ROUND(AVG(n.note)::numeric, 1), 0) AS note_vendeur
`;

const activeSellerCondition = "(u.est_bloque = false OR (u.bloque_jusqu_a IS NOT NULL AND u.bloque_jusqu_a <= CURRENT_TIMESTAMP))";
const publicProductCondition = 'p.vendeur_masque = false';

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  throw error;
};

const fileToDataUrl = (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

const getUploadedImageDataUrls = (req) => {
  const files = [
    ...(req.files?.images || []),
    ...(req.files?.image || []),
    ...(req.file ? [req.file] : []),
  ];
  return files.map(fileToDataUrl);
};

const parseOptionalId = (value, label) => {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) badRequest(`${label} invalide`);
  return parsed;
};

const parsePrice = (value) => {
  const normalized = String(value ?? '').trim().replace(',', '.');
  const parsed = Number(normalized);

  if (!normalized || !Number.isFinite(parsed) || parsed < 0) {
    badRequest('Prix invalide');
  }

  return parsed;
};

const parseOptionalNumber = (value, label) => {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0) badRequest(`${label} invalide`);
  return parsed;
};

const parseStock = (value) => {
  if (value === undefined || value === null || value === '') return 1;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) badRequest('Stock invalide');
  return parsed;
};

const parseProductPayload = (body) => {
  const titre = String(body.titre ?? '').trim();
  const description = String(body.description ?? '').trim();

  if (!titre) badRequest('Titre requis');
  if (!description) badRequest('Description requise');

  return {
    categorie_id: parseOptionalId(body.categorie_id, 'Categorie'),
    titre,
    description,
    prix: parsePrice(body.prix),
    image_url: body.image_url ? String(body.image_url).trim() : null,
    stock: parseStock(body.stock),
    etat: ['neuf', 'occasion'].includes(body.etat) ? body.etat : 'neuf',
    localisation: body.localisation ? String(body.localisation).trim() : null,
  };
};

exports.list = asyncHandler(async (req, res) => {
  const { search = '', category = '', min = '', max = '', rating = '', sort = 'recent' } = req.query;
  const params = [];
  const where = ["p.statut = 'disponible'", 'p.stock > 0', publicProductCondition, activeSellerCondition];
  const minPrice = parseOptionalNumber(min, 'Prix minimum');
  const maxPrice = parseOptionalNumber(max, 'Prix maximum');
  const minRating = parseOptionalNumber(rating, 'Note minimum');

  if (search) {
    params.push(`%${search}%`);
    where.push(`(p.titre ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.localisation ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    where.push(`c.nom = $${params.length}`);
  }
  if (minPrice !== null) {
    params.push(minPrice);
    where.push(`p.prix >= $${params.length}`);
  }
  if (maxPrice !== null) {
    params.push(maxPrice);
    where.push(`p.prix <= $${params.length}`);
  }

  const orderBy = {
    recent: 'p.date_creation DESC',
    price_asc: 'p.prix ASC',
    price_desc: 'p.prix DESC',
    rating: 'note_vendeur DESC',
  }[sort] || 'p.date_creation DESC';

  const having = minRating !== null ? `HAVING COALESCE(AVG(n.note), 0) >= $${params.push(minRating)}` : '';
  const { rows } = await pool.query(
    `SELECT ${productSelect(false)}
     FROM produits p
     LEFT JOIN categories c ON c.id = p.categorie_id
     JOIN utilisateurs u ON u.id = p.vendeur_id
     LEFT JOIN notes_vendeurs n ON n.vendeur_id = u.id
     WHERE ${where.join(' AND ')}
     GROUP BY p.id, c.nom, u.id
     ${having}
     ORDER BY ${orderBy}`,
    params
  );
  res.json(rows);
});

exports.create = asyncHandler(async (req, res) => {
  const parsed = parseProductPayload(req.body);
  const uploadedImages = getUploadedImageDataUrls(req);
  const images_urls = uploadedImages.length ? uploadedImages : (parsed.image_url ? [parsed.image_url] : []);
  const image_url = images_urls[0] || null;
  const { categorie_id, titre, description, prix, stock, etat, localisation } = parsed;
  const { rows } = await pool.query(
    `INSERT INTO produits (vendeur_id, categorie_id, titre, description, prix, image_url, images_urls, stock, etat, localisation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [req.user.id, categorie_id, titre, description, prix, image_url, JSON.stringify(images_urls), stock, etat, localisation]
  );
  res.status(201).json(rows[0]);
});

exports.detail = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${productSelect(true)}
     FROM produits p
     LEFT JOIN categories c ON c.id = p.categorie_id
     JOIN utilisateurs u ON u.id = p.vendeur_id
     LEFT JOIN notes_vendeurs n ON n.vendeur_id = u.id
     WHERE p.id = $1
       AND ${publicProductCondition}
       AND ${activeSellerCondition}
     GROUP BY p.id, c.nom, u.id`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Produit introuvable' });
  res.json(rows[0]);
});

exports.update = asyncHandler(async (req, res) => {
  const allowed = {
    categorie_id: (value) => parseOptionalId(value, 'Categorie'),
    titre: (value) => {
      const parsed = String(value || '').trim();
      if (!parsed) badRequest('Titre requis');
      return parsed;
    },
    description: (value) => {
      const parsed = String(value || '').trim();
      if (!parsed) badRequest('Description requise');
      return parsed;
    },
    prix: parsePrice,
    image_url: (value) => value ? String(value).trim() : null,
    stock: parseStock,
    etat: (value) => {
      if (!['neuf', 'occasion'].includes(value)) badRequest('Etat invalide');
      return value;
    },
    localisation: (value) => value ? String(value).trim() : null,
    statut: (value) => {
      if (!['disponible', 'vendu', 'suspendu'].includes(value)) badRequest('Statut invalide');
      return value;
    },
  };
  const values = [];
  const sets = [];
  Object.entries(allowed).forEach(([key, parser]) => {
    if (req.body[key] !== undefined) {
      values.push(parser(req.body[key]));
      sets.push(`${key} = $${values.length}`);
    }
  });
  const uploadedImageUrls = getUploadedImageDataUrls(req);
  if (uploadedImageUrls.length) {
    values.push(uploadedImageUrls[0]);
    sets.push(`image_url = $${values.length}`);
    values.push(JSON.stringify(uploadedImageUrls));
    sets.push(`images_urls = $${values.length}`);
  }
  if (sets.length === 0) badRequest('Aucune modification fournie');

  values.push(req.params.id, req.user.id);
  const { rows } = await pool.query(
    `UPDATE produits SET ${sets.join(', ')}
     WHERE id = $${values.length - 1} AND vendeur_id = $${values.length}
     RETURNING *`,
    values
  );
  if (!rows[0]) return res.status(404).json({ message: 'Produit introuvable' });
  res.json(rows[0]);
});

exports.remove = asyncHandler(async (req, res) => {
  const { rows: orders } = await pool.query(
    'SELECT id FROM commandes WHERE produit_id = $1 LIMIT 1',
    [req.params.id]
  );

  if (orders[0]) {
    const { rows } = await pool.query(
      `UPDATE produits
       SET statut = 'suspendu', stock = 0, vendeur_masque = true
       WHERE id = $1 AND vendeur_id = $2
       RETURNING id, statut`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Produit introuvable' });
    return res.json({ message: 'Produit supprimé de vos articles. Les commandes existantes restent dans l’historique.', produit: rows[0] });
  }

  const { rowCount } = await pool.query('DELETE FROM produits WHERE id = $1 AND vendeur_id = $2', [req.params.id, req.user.id]);
  if (rowCount === 0) return res.status(404).json({ message: 'Produit introuvable' });
  return res.status(204).send();
});

exports.mine = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, vendeur_id, categorie_id, titre, description, prix, image_url, stock, etat, localisation, statut, date_creation
     FROM produits
     WHERE vendeur_id = $1 AND vendeur_masque = false
     ORDER BY date_creation DESC`,
    [req.user.id]
  );
  res.json(rows);
});
