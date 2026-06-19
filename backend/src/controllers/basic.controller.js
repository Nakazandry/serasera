const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const REPORT_REASONS = [
  'Arnaque ou fraude',
  'Harcèlement ou menace',
  'Produit interdit ou dangereux',
  'Fausse identité',
  'Spam ou publicité abusive',
];

const activeUserCondition = "(u.est_bloque = false OR (u.bloque_jusqu_a IS NOT NULL AND u.bloque_jusqu_a <= CURRENT_TIMESTAMP))";

exports.categories = asyncHandler(async (_req, res) => {
  const { rows } = await pool.query('SELECT id, nom, description, image_url, date_creation FROM categories ORDER BY nom');
  res.json(rows);
});

exports.createCategory = asyncHandler(async (req, res) => {
  const nom = String(req.body.nom || '').trim();
  if (!nom) return res.status(400).json({ message: 'Nom de catégorie requis' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO categories (nom, description, image_url) VALUES ($1, $2, $3) RETURNING *',
      [nom, req.body.description || null, req.body.image_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Cette catégorie existe déjà' });
    throw error;
  }
});

exports.addCart = asyncHandler(async (req, res) => {
  const { produit_id, quantite = 1 } = req.body;
  const quantity = Number(quantite);
  if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ message: 'Quantite invalide' });

  const { rows: products } = await pool.query(
    `SELECT p.id, p.stock, p.vendeur_id
     FROM produits p
     JOIN utilisateurs u ON u.id = p.vendeur_id
     WHERE p.id = $1
       AND p.statut = 'disponible'
       AND p.vendeur_masque = false
       AND ${activeUserCondition}`,
    [produit_id]
  );
  if (!products[0]) return res.status(404).json({ message: 'Produit indisponible' });
  if (products[0].vendeur_id === req.user.id) return res.status(400).json({ message: 'Vous ne pouvez pas acheter votre propre produit' });

  const { rows: cartRows } = await pool.query(
    'SELECT quantite FROM paniers WHERE utilisateur_id = $1 AND produit_id = $2',
    [req.user.id, produit_id]
  );
  const currentQuantity = Number(cartRows[0]?.quantite || 0);
  if (products[0].stock < currentQuantity + quantity) return res.status(400).json({ message: 'Stock insuffisant' });

  const { rows } = await pool.query(
    `INSERT INTO paniers (utilisateur_id, produit_id, quantite)
     VALUES ($1, $2, $3)
     ON CONFLICT (utilisateur_id, produit_id)
     DO UPDATE SET quantite = paniers.quantite + EXCLUDED.quantite
     RETURNING *`,
    [req.user.id, produit_id, quantity]
  );
  res.status(201).json(rows[0]);
});

exports.cart = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pa.*, p.titre, p.prix, p.image_url, p.stock,
            u.id AS vendeur_id, u.nom AS vendeur_nom, u.prenom AS vendeur_prenom,
            u.telephone AS vendeur_telephone, u.adresse AS vendeur_adresse
     FROM paniers pa
     JOIN produits p ON p.id = pa.produit_id
     JOIN utilisateurs u ON u.id = p.vendeur_id
     WHERE pa.utilisateur_id = $1
     ORDER BY pa.date_creation DESC`,
    [req.user.id]
  );
  res.json(rows);
});

exports.removeCart = asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM paniers WHERE id = $1 AND utilisateur_id = $2', [req.params.id, req.user.id]);
  res.status(204).send();
});

exports.checkout = asyncHandler(async (req, res) => {
  const adresseLivraison = String(req.body.adresse_livraison || '').trim();
  const noteVendeur = String(req.body.note_vendeur || '').trim();

  if (!adresseLivraison) return res.status(400).json({ message: 'Adresse de livraison requise' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: blockedItems } = await client.query(
      `SELECT p.titre
       FROM paniers pa
       JOIN produits p ON p.id = pa.produit_id
       JOIN utilisateurs u ON u.id = p.vendeur_id
       WHERE pa.utilisateur_id = $1
         AND NOT ${activeUserCondition}`,
      [req.user.id]
    );
    if (blockedItems.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Un produit du panier appartient à un vendeur bloqué. Retirez-le avant de commander.' });
    }

    const { rows: items } = await client.query(
      `SELECT pa.*, p.prix, p.vendeur_id, p.stock, p.titre, p.statut, p.vendeur_masque
       FROM paniers pa
       JOIN produits p ON p.id = pa.produit_id
       JOIN utilisateurs u ON u.id = p.vendeur_id
       WHERE pa.utilisateur_id = $1
         AND ${activeUserCondition}
       ORDER BY pa.id
       FOR UPDATE OF p`,
      [req.user.id]
    );
    if (items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Panier vide' });
    }

    const unavailable = items.find((item) => item.vendeur_masque || item.statut !== 'disponible' || Number(item.quantite) > Number(item.stock));
    if (unavailable) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Produit indisponible ou stock insuffisant pour ${unavailable.titre}` });
    }

    const created = [];
    for (const item of items) {
      const total = Number(item.prix) * Number(item.quantite);
      const { rows } = await client.query(
        `INSERT INTO commandes (acheteur_id, vendeur_id, produit_id, quantite, total)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.user.id, item.vendeur_id, item.produit_id, item.quantite, total]
      );
      created.push(rows[0]);
      await client.query(
        `UPDATE produits
         SET stock = stock - $1,
             statut = 'disponible'
         WHERE id = $2`,
        [item.quantite, item.produit_id]
      );
    }

    const sellers = items.reduce((list, item) => {
      const existing = list.find((seller) => Number(seller.vendeur_id) === Number(item.vendeur_id));
      if (existing) {
        existing.titres.push(`${item.titre} x${item.quantite}`);
        return list;
      }

      list.push({ vendeur_id: item.vendeur_id, titres: [`${item.titre} x${item.quantite}`] });
      return list;
    }, []);

    for (const seller of sellers) {
      const content = [
        'Nouvelle commande à livrer.',
        `Produits: ${seller.titres.join(', ')}`,
        `Adresse de livraison: ${adresseLivraison}`,
        noteVendeur ? `Note client: ${noteVendeur}` : null,
      ].filter(Boolean).join('\n');

      await client.query(
        `INSERT INTO messages (expediteur_id, destinataire_id, contenu)
         VALUES ($1, $2, $3)`,
        [req.user.id, seller.vendeur_id, content]
      );
    }

    await client.query('DELETE FROM paniers WHERE utilisateur_id = $1', [req.user.id]);
    await client.query('COMMIT');
    return res.status(201).json(created);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

exports.orders = asyncHandler(async (req, res) => {
  const includeHidden = req.query.include_hidden === 'true';
  const { rows } = await pool.query(
    `SELECT co.*, p.titre, p.image_url,
            vendeur.nom AS vendeur_nom, vendeur.prenom AS vendeur_prenom,
            acheteur.nom AS acheteur_nom, acheteur.prenom AS acheteur_prenom,
            n.note AS note_commande, n.commentaire AS commentaire_note,
            CASE WHEN co.acheteur_id = $1 THEN true ELSE false END AS est_acheteur,
            CASE WHEN co.vendeur_id = $1 THEN true ELSE false END AS est_vendeur
     FROM commandes co
     JOIN produits p ON p.id = co.produit_id
     JOIN utilisateurs vendeur ON vendeur.id = co.vendeur_id
     JOIN utilisateurs acheteur ON acheteur.id = co.acheteur_id
     LEFT JOIN notes_vendeurs n ON n.commande_id = co.id
     WHERE (co.acheteur_id = $1 OR co.vendeur_id = $1)
       AND ($2::boolean = true
         OR (co.acheteur_id = $1 AND co.acheteur_masque = false)
         OR (co.vendeur_id = $1 AND co.vendeur_masque = false))
     ORDER BY co.date_commande DESC`,
    [req.user.id, includeHidden]
  );
  res.json(rows);
});

exports.updateOrder = asyncHandler(async (req, res) => {
  const allowedStatuses = ['En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];
  const nextStatus = req.body.statut;
  const cancellationReason = String(req.body.raison_annulation || '').trim();
  const shouldRestockRequest = req.body.remettre_disponible;
  if (!allowedStatuses.includes(nextStatus)) return res.status(400).json({ message: 'Statut invalide' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orders } = await client.query(
      `SELECT co.id, co.produit_id, co.quantite, co.statut, co.acheteur_id, co.vendeur_id, p.titre
       FROM commandes
       co JOIN produits p ON p.id = co.produit_id
       WHERE co.id = $1 AND (co.vendeur_id = $2 OR co.acheteur_id = $2)
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    const order = orders[0];
    if (!order) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Commande introuvable' });
    }

    const isSeller = Number(order.vendeur_id) === Number(req.user.id);
    const isBuyer = Number(order.acheteur_id) === Number(req.user.id);
    if (isBuyer && !isSeller && nextStatus !== 'Annulée') {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Seul le vendeur peut changer ce statut' });
    }
    if (isBuyer && nextStatus === 'Annulée' && ['Expédiée', 'Livrée'].includes(order.statut)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cette commande ne peut plus être annulée par le client' });
    }
    if (order.statut !== 'Annulée' && nextStatus === 'Annulée' && !cancellationReason) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Raison d’annulation requise' });
    }

    if (order.statut !== 'Annulée' && nextStatus === 'Annulée') {
      const shouldRestock = isBuyer || shouldRestockRequest === true;
      if (shouldRestock) {
        await client.query(
          "UPDATE produits SET stock = stock + $1, statut = 'disponible' WHERE id = $2",
          [order.quantite, order.produit_id]
        );
      } else {
        await client.query(
          `UPDATE produits
           SET statut = CASE WHEN stock <= 0 THEN 'vendu' ELSE 'disponible' END
           WHERE id = $1`,
          [order.produit_id]
        );
      }
    }

    if (order.statut === 'Annulée' && nextStatus !== 'Annulée') {
      const { rows: products } = await client.query(
        'SELECT stock FROM produits WHERE id = $1 FOR UPDATE',
        [order.produit_id]
      );
      if (!products[0] || Number(products[0].stock) < Number(order.quantite)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Stock insuffisant pour réactiver cette commande' });
      }

      await client.query(
        `UPDATE produits
         SET stock = stock - $1,
             statut = 'disponible'
         WHERE id = $2`,
        [order.quantite, order.produit_id]
      );
    }

    const annulePar = nextStatus === 'Annulée' && order.statut !== 'Annulée'
      ? (isBuyer ? 'client' : 'vendeur')
      : null;
    const { rows } = await client.query(
      `UPDATE commandes
       SET statut = $1::varchar,
           annule_par = CASE WHEN $1::text = 'Annulée' THEN COALESCE($3::varchar, annule_par) ELSE null END,
           raison_annulation = CASE WHEN $1::text = 'Annulée' THEN COALESCE($4::text, raison_annulation) ELSE null END
       WHERE id = $2
       RETURNING *`,
      [nextStatus, req.params.id, annulePar, cancellationReason || null]
    );

    if (nextStatus === 'Livrée') {
      await client.query(
        `UPDATE produits
         SET statut = CASE WHEN stock <= 0 THEN 'vendu' ELSE 'disponible' END
         WHERE id = $1`,
        [order.produit_id]
      );
    }

    if (order.statut === 'Livrée' && nextStatus !== 'Livrée' && nextStatus !== 'Annulée') {
      await client.query(
        "UPDATE produits SET statut = 'disponible' WHERE id = $1",
        [order.produit_id]
      );
    }

    if (order.statut !== 'Annulée' && nextStatus === 'Annulée') {
      const destinataireId = isBuyer ? order.vendeur_id : order.acheteur_id;
      const productAvailabilityText = isBuyer || shouldRestockRequest === true
        ? 'Le produit est remis en disponibilité.'
        : 'Le produit n’est pas remis en vente.';
      const content = isBuyer
        ? `Le client a annulé la commande #${order.id} pour ${order.titre}. Raison: ${cancellationReason}. ${productAvailabilityText}`
        : `Le vendeur a annulé la commande #${order.id} pour ${order.titre}. Raison: ${cancellationReason}. ${productAvailabilityText}`;

      await client.query(
        `INSERT INTO messages (expediteur_id, destinataire_id, produit_id, contenu)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, destinataireId, order.produit_id, content]
      );
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

exports.removeOrder = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE commandes
     SET acheteur_masque = CASE WHEN acheteur_id = $2 THEN true ELSE acheteur_masque END,
         vendeur_masque = CASE WHEN vendeur_id = $2 THEN true ELSE vendeur_masque END
     WHERE id = $1 AND (acheteur_id = $2 OR vendeur_id = $2)
     RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Commande introuvable' });
  res.status(204).send();
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const { destinataire_id, produit_id, contenu } = req.body;
  if (!destinataire_id) return res.status(400).json({ message: 'Destinataire requis' });
  if (Number(destinataire_id) === Number(req.user.id)) return res.status(400).json({ message: 'Vous ne pouvez pas vous envoyer un message' });
  if (!String(contenu || '').trim()) return res.status(400).json({ message: 'Message requis' });

  const { rows } = await pool.query(
    `INSERT INTO messages (expediteur_id, destinataire_id, produit_id, contenu)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, destinataire_id, produit_id || null, String(contenu).trim()]
  );
  res.status(201).json(rows[0]);
});

exports.messages = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.*, p.titre AS produit_titre,
            expediteur.nom AS expediteur_nom,
            expediteur.prenom AS expediteur_prenom,
            destinataire.nom AS destinataire_nom,
            destinataire.prenom AS destinataire_prenom
     FROM messages m
     JOIN utilisateurs expediteur ON expediteur.id = m.expediteur_id
     JOIN utilisateurs destinataire ON destinataire.id = m.destinataire_id
     LEFT JOIN produits p ON p.id = m.produit_id
     WHERE (m.expediteur_id = $1 AND m.expediteur_masque = false)
        OR (m.destinataire_id = $1 AND m.destinataire_masque = false)
     ORDER BY m.date_envoi DESC`,
    [req.user.id]
  );
  res.json(rows);
});

exports.updateMessage = asyncHandler(async (req, res) => {
  const contenu = String(req.body.contenu || '').trim();
  if (!contenu) return res.status(400).json({ message: 'Message requis' });

  const { rows } = await pool.query(
    `UPDATE messages
     SET contenu = $1, modifie_le = CURRENT_TIMESTAMP
     WHERE id = $2 AND expediteur_id = $3 AND expediteur_masque = false
     RETURNING *`,
    [contenu, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Message introuvable ou non modifiable' });
  res.json(rows[0]);
});

exports.removeMessage = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE messages
     SET expediteur_masque = CASE WHEN expediteur_id = $2 THEN true ELSE expediteur_masque END,
         destinataire_masque = CASE WHEN destinataire_id = $2 THEN true ELSE destinataire_masque END
     WHERE id = $1 AND (expediteur_id = $2 OR destinataire_id = $2)
     RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Message introuvable' });
  res.status(204).send();
});

exports.removeConversation = asyncHandler(async (req, res) => {
  const contactId = Number(req.params.userId);
  if (!Number.isInteger(contactId) || contactId <= 0) return res.status(400).json({ message: 'Contact invalide' });

  await pool.query(
    `UPDATE messages
     SET expediteur_masque = CASE WHEN expediteur_id = $1 THEN true ELSE expediteur_masque END,
         destinataire_masque = CASE WHEN destinataire_id = $1 THEN true ELSE destinataire_masque END
     WHERE (expediteur_id = $1 AND destinataire_id = $2)
        OR (expediteur_id = $2 AND destinataire_id = $1)`,
    [req.user.id, contactId]
  );
  res.status(204).send();
});

exports.rateSeller = asyncHandler(async (req, res) => {
  const { commande_id, note, commentaire } = req.body;
  const parsedNote = Number(note);
  if (!Number.isInteger(parsedNote) || parsedNote < 1 || parsedNote > 5) {
    return res.status(400).json({ message: 'Note invalide' });
  }

  const { rows: orders } = await pool.query(
    `SELECT id, vendeur_id, acheteur_id, statut
     FROM commandes
     WHERE id = $1 AND acheteur_id = $2 AND statut = 'Livrée'`,
    [commande_id, req.user.id]
  );
  if (!orders[0]) return res.status(400).json({ message: 'Commande livrée requise' });

  const { rows } = await pool.query(
    `INSERT INTO notes_vendeurs (vendeur_id, acheteur_id, commande_id, note, commentaire)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (commande_id)
     DO UPDATE SET note = EXCLUDED.note, commentaire = EXCLUDED.commentaire, date_creation = CURRENT_TIMESTAMP
     RETURNING *`,
    [orders[0].vendeur_id, req.user.id, commande_id, parsedNote, commentaire || null]
  );
  res.status(201).json(rows[0]);
});

exports.favorite = asyncHandler(async (req, res) => {
  const { rows: products } = await pool.query(
    `SELECT p.id
     FROM produits p
     JOIN utilisateurs u ON u.id = p.vendeur_id
     WHERE p.id = $1
       AND p.statut = 'disponible'
       AND p.vendeur_masque = false
       AND ${activeUserCondition}`,
    [req.body.produit_id]
  );
  if (!products[0]) return res.status(404).json({ message: 'Produit indisponible' });

  const { rows } = await pool.query(
    `INSERT INTO favoris (utilisateur_id, produit_id)
     VALUES ($1, $2)
     ON CONFLICT (utilisateur_id, produit_id) DO NOTHING
     RETURNING *`,
    [req.user.id, req.body.produit_id]
  );
  res.status(201).json(rows[0] || { produit_id: req.body.produit_id });
});

exports.favorites = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT f.*, p.vendeur_id, p.titre, p.description, p.prix, p.image_url, p.localisation, p.etat, p.stock,
            c.nom AS categorie_nom,
            u.nom AS vendeur_nom,
            u.prenom AS vendeur_prenom,
            COALESCE(ROUND(AVG(n.note)::numeric, 1), 0) AS note_vendeur
     FROM favoris f
     JOIN produits p ON p.id = f.produit_id
     JOIN utilisateurs u ON u.id = p.vendeur_id
     LEFT JOIN categories c ON c.id = p.categorie_id
     LEFT JOIN notes_vendeurs n ON n.vendeur_id = p.vendeur_id
     WHERE f.utilisateur_id = $1
       AND p.vendeur_masque = false
       AND ${activeUserCondition}
     GROUP BY f.id, p.id, c.nom, u.id
     ORDER BY f.date_creation DESC`,
    [req.user.id]
  );
  res.json(rows);
});

exports.removeFavorite = asyncHandler(async (req, res) => {
  await pool.query(
    'DELETE FROM favoris WHERE utilisateur_id = $1 AND produit_id = $2',
    [req.user.id, req.params.produit_id]
  );
  res.status(204).send();
});

exports.reportAccount = asyncHandler(async (req, res) => {
  const compteSignaleId = Number(req.body.compte_signale_id);
  const produitId = req.body.produit_id ? Number(req.body.produit_id) : null;
  const motif = String(req.body.motif || '').trim();

  if (!Number.isInteger(compteSignaleId) || compteSignaleId <= 0) return res.status(400).json({ message: 'Compte signalé invalide' });
  if (compteSignaleId === Number(req.user.id)) return res.status(400).json({ message: 'Vous ne pouvez pas signaler votre propre compte' });
  if (!REPORT_REASONS.includes(motif)) return res.status(400).json({ message: 'Raison de signalement invalide' });

  const { rows: users } = await pool.query('SELECT id FROM utilisateurs WHERE id = $1', [compteSignaleId]);
  if (!users[0]) return res.status(404).json({ message: 'Compte introuvable' });

  const { rows } = await pool.query(
    `INSERT INTO signalements (utilisateur_id, signaleur_id, compte_signale_id, produit_id, motif)
     VALUES ($1, $1, $2, $3, $4)
     RETURNING *`,
    [req.user.id, compteSignaleId, produitId, motif]
  );
  res.status(201).json(rows[0]);
});

exports.reportReasons = asyncHandler(async (_req, res) => {
  res.json(REPORT_REASONS);
});

exports.adminStats = asyncHandler(async (_req, res) => {
  const [users, products, orders, revenue, bestSellers] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM utilisateurs'),
    pool.query('SELECT COUNT(*) FROM produits'),
    pool.query("SELECT COUNT(*) FROM commandes WHERE statut <> 'Annulée'"),
    pool.query("SELECT COALESCE(SUM(total), 0) AS total FROM commandes WHERE statut <> 'Annulée'"),
    pool.query(`SELECT u.id, u.nom, u.prenom, ROUND(AVG(n.note)::numeric, 1) AS note
                FROM notes_vendeurs n JOIN utilisateurs u ON u.id = n.vendeur_id
                GROUP BY u.id ORDER BY note DESC LIMIT 5`),
  ]);
  res.json({
    total_utilisateurs: Number(users.rows[0].count),
    total_produits: Number(products.rows[0].count),
    total_commandes: Number(orders.rows[0].count),
    chiffre_affaires: Number(revenue.rows[0].total),
    meilleurs_vendeurs: bestSellers.rows,
  });
});

exports.adminUsers = asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, nom, prenom, email, role, telephone, adresse, est_bloque, bloque_jusqu_a, date_creation
     FROM utilisateurs
     ORDER BY id DESC
     LIMIT 100`
  );
  res.json(rows);
});

exports.adminProducts = asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, vendeur_id, categorie_id, titre, prix, stock, etat, localisation, statut, date_creation
     FROM produits
     ORDER BY id DESC
     LIMIT 100`
  );
  res.json(rows);
});

exports.adminOrders = asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, acheteur_id, vendeur_id, produit_id, quantite, total, statut, date_commande
     FROM commandes
     ORDER BY id DESC
     LIMIT 100`
  );
  res.json(rows);
});

exports.adminReports = asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*,
            signaleur.email AS signaleur_email, signaleur.nom AS signaleur_nom, signaleur.prenom AS signaleur_prenom,
            cible.email AS cible_email, cible.nom AS cible_nom, cible.prenom AS cible_prenom,
            cible.est_bloque AS cible_est_bloque, cible.bloque_jusqu_a AS cible_bloque_jusqu_a,
            p.titre AS produit_titre
     FROM signalements s
     LEFT JOIN utilisateurs signaleur ON signaleur.id = COALESCE(s.signaleur_id, s.utilisateur_id)
     LEFT JOIN utilisateurs cible ON cible.id = s.compte_signale_id
     LEFT JOIN produits p ON p.id = s.produit_id
     ORDER BY s.date_creation DESC
     LIMIT 100`
  );
  res.json(rows);
});

exports.banUser = asyncHandler(async (req, res) => {
  const duration = String(req.body.duration || '').trim();
  const allowed = {
    '1m': "CURRENT_TIMESTAMP + INTERVAL '1 month'",
    '3m': "CURRENT_TIMESTAMP + INTERVAL '3 months'",
    permanent: 'NULL',
  };
  if (!allowed[duration]) return res.status(400).json({ message: 'Durée de bannissement invalide' });
  if (Number(req.params.id) === Number(req.user.id)) return res.status(400).json({ message: 'Vous ne pouvez pas bannir votre propre compte' });

  const { rows } = await pool.query(
    `UPDATE utilisateurs
     SET est_bloque = true, bloque_jusqu_a = ${allowed[duration]}
     WHERE id = $1
     RETURNING id, nom, prenom, email, role, est_bloque, bloque_jusqu_a`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable' });
  res.json(rows[0]);
});

exports.unbanUser = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE utilisateurs
     SET est_bloque = false, bloque_jusqu_a = null
     WHERE id = $1
     RETURNING id, nom, prenom, email, role, est_bloque, bloque_jusqu_a`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable' });
  res.json(rows[0]);
});

exports.resolveReport = asyncHandler(async (req, res) => {
  const status = String(req.body.statut || 'traité').trim();
  if (!['traité', 'rejeté'].includes(status)) return res.status(400).json({ message: 'Statut invalide' });

  const { rows } = await pool.query(
    'UPDATE signalements SET statut = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Signalement introuvable' });
  res.json(rows[0]);
});
