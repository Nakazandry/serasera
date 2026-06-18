require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5001;

const DEFAULT_CATEGORIES = [
  ['Tech', 'Objets connectés, ordinateurs, téléphones et accessoires'],
  ['Mode', 'Vêtements, chaussures, sacs et accessoires'],
  ['Maison', 'Décoration, mobilier, cuisine et équipements maison'],
  ['Gaming', 'Consoles, jeux, setups et périphériques'],
  ['Fournitures & bureau', 'Stylos, cahiers, livres scolaires et matériel de bureau'],
  ['Livres & documents', 'Livres, romans, manuels, cours et documents'],
  ['Beauté & santé', 'Cosmétiques, soins, parfums et bien-être'],
  ['Sport & loisirs', 'Articles de sport, loisirs, musique et activités'],
  ['Enfants & bébé', 'Jouets, vêtements enfant, puériculture et accessoires bébé'],
  ['Véhicules & pièces', 'Vélos, motos, voitures, pièces et accessoires'],
  ['Autre', 'Produits qui ne rentrent pas encore dans une catégorie précise'],
];

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'sera_sera_secret_2026') {
    console.error('JWT_SECRET doit être défini avec une valeur forte avant la mise en production.');
    process.exit(1);
  }
  if (!process.env.CLIENT_URL) {
    console.error('CLIENT_URL doit être défini avant la mise en production.');
    process.exit(1);
  }
}

const server = app.listen(PORT);

server.on('listening', () => {
  console.log(`Sera-Sera API active sur http://localhost:${PORT}`);
});

const ensureSchema = async () => {
  await pool.query("ALTER TABLE commandes ADD COLUMN IF NOT EXISTS acheteur_masque BOOLEAN NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE commandes ADD COLUMN IF NOT EXISTS vendeur_masque BOOLEAN NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE commandes ADD COLUMN IF NOT EXISTS annule_par VARCHAR(20)");
  await pool.query("ALTER TABLE commandes ADD COLUMN IF NOT EXISTS raison_annulation TEXT");
  await pool.query("ALTER TABLE produits ADD COLUMN IF NOT EXISTS images_urls JSONB NOT NULL DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE produits ADD COLUMN IF NOT EXISTS vendeur_masque BOOLEAN NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS bloque_jusqu_a TIMESTAMP");
  await pool.query("ALTER TABLE signalements ADD COLUMN IF NOT EXISTS signaleur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL");
  await pool.query("ALTER TABLE signalements ADD COLUMN IF NOT EXISTS compte_signale_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS expediteur_masque BOOLEAN NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS destinataire_masque BOOLEAN NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP");
  await pool.query(
    `UPDATE produits p
     SET statut = 'disponible'
     WHERE p.statut = 'vendu'
       AND EXISTS (
         SELECT 1
         FROM commandes co
         WHERE co.produit_id = p.id
           AND co.statut IN ('En attente', 'Confirmée', 'Expédiée')
       )`
  );
  await pool.query(
    `UPDATE produits p
     SET vendeur_masque = true
     WHERE p.statut = 'suspendu'
       AND p.stock = 0
       AND EXISTS (
         SELECT 1
         FROM commandes co
         WHERE co.produit_id = p.id
       )`
  );
  for (const [nom, description] of DEFAULT_CATEGORIES) {
    await pool.query(
      'INSERT INTO categories (nom, description) VALUES ($1, $2) ON CONFLICT (nom) DO UPDATE SET description = EXCLUDED.description',
      [nom, description]
    );
  }
};

ensureSchema().catch((error) => {
  console.error('Initialisation schema impossible:', error.message);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} deja utilise. Arretez l'autre serveur ou changez PORT dans backend/.env.`);
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});

const shutdown = async () => {
  await pool.end();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
