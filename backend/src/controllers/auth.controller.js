const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { createToken } = require('../utils/tokens');

const publicFields = 'id, nom, prenom, email, role, avatar_url, telephone, adresse, est_bloque, bloque_jusqu_a, date_creation';

exports.register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Informations invalides', errors: errors.array() });

  const nom = String(req.body.nom || '').trim();
  const prenom = String(req.body.prenom || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const { mot_de_passe, telephone, adresse } = req.body;
  const hashed = await bcrypt.hash(mot_de_passe, 12);
  let rows;

  try {
    ({ rows } = await pool.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, telephone, adresse)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${publicFields}`,
      [nom, prenom, email, hashed, telephone || null, adresse || null]
    ));
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Email deja utilise' });
    throw error;
  }

  res.status(201).json({ user: rows[0], token: createToken(rows[0]) });
});

exports.login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { mot_de_passe } = req.body;
  const { rows } = await pool.query(
    `SELECT ${publicFields}, mot_de_passe
     FROM utilisateurs
     WHERE email = $1`,
    [email]
  );
  const user = rows[0];

  if (!user || !(await bcrypt.compare(mot_de_passe, user.mot_de_passe))) {
    const error = new Error('Email ou mot de passe incorrect');
    error.status = 401;
    throw error;
  }
  if (user.est_bloque && user.bloque_jusqu_a && new Date(user.bloque_jusqu_a) <= new Date()) {
    await pool.query('UPDATE utilisateurs SET est_bloque = false, bloque_jusqu_a = null WHERE id = $1', [user.id]);
    user.est_bloque = false;
    user.bloque_jusqu_a = null;
  }

  if (user.est_bloque) {
    const until = user.bloque_jusqu_a ? ` jusqu’au ${new Date(user.bloque_jusqu_a).toLocaleDateString('fr-FR')}` : ' définitivement';
    const error = new Error(`Compte bloqué${until}`);
    error.status = 403;
    throw error;
  }

  delete user.mot_de_passe;
  res.json({ user, token: createToken(user) });
});

exports.me = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT ${publicFields} FROM utilisateurs WHERE id = $1`, [req.user.id]);
  res.json(rows[0]);
});

exports.updateMe = asyncHandler(async (req, res) => {
  const fields = {
    nom: (value) => String(value || '').trim(),
    prenom: (value) => String(value || '').trim(),
    telephone: (value) => String(value || '').trim() || null,
    adresse: (value) => String(value || '').trim() || null,
  };
  const values = [];
  const sets = [];

  Object.entries(fields).forEach(([key, parser]) => {
    if (req.body[key] !== undefined) {
      const parsed = parser(req.body[key]);
      if ((key === 'nom' || key === 'prenom') && !parsed) {
        const error = new Error(`${key === 'nom' ? 'Nom' : 'Prenom'} requis`);
        error.status = 400;
        throw error;
      }
      values.push(parsed);
      sets.push(`${key} = $${values.length}`);
    }
  });

  if (req.file) {
    values.push(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`);
    sets.push(`avatar_url = $${values.length}`);
  }

  if (!sets.length) return res.status(400).json({ message: 'Aucune modification fournie' });

  values.push(req.user.id);
  const { rows } = await pool.query(
    `UPDATE utilisateurs SET ${sets.join(', ')}
     WHERE id = $${values.length}
     RETURNING ${publicFields}`,
    values
  );

  res.json(rows[0]);
});
