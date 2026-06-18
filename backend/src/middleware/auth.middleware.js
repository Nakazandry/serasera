const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const auth = async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    const error = new Error('Authentification requise');
    error.status = 401;
    return next(error);
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT est_bloque, bloque_jusqu_a FROM utilisateurs WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) {
      const error = new Error('Compte introuvable');
      error.status = 401;
      return next(error);
    }

    if (user.est_bloque && user.bloque_jusqu_a && new Date(user.bloque_jusqu_a) <= new Date()) {
      await pool.query('UPDATE utilisateurs SET est_bloque = false, bloque_jusqu_a = null WHERE id = $1', [req.user.id]);
      return next();
    }

    if (user.est_bloque) {
      const until = user.bloque_jusqu_a ? ` jusqu’au ${new Date(user.bloque_jusqu_a).toLocaleDateString('fr-FR')}` : ' définitivement';
      const error = new Error(`Compte bloqué${until}`);
      error.status = 403;
      return next(error);
    }
    return next();
  } catch (err) {
    if (err.status) return next(err);
    const error = new Error('Token invalide ou expiré');
    error.status = 401;
    return next(error);
  }
};

const adminOnly = (req, _res, next) => {
  if (req.user?.role !== 'admin') {
    const error = new Error('Accès administrateur requis');
    error.status = 403;
    return next(error);
  }
  return next();  
};

module.exports = { auth, adminOnly };
