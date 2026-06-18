CREATE TABLE IF NOT EXISTS utilisateurs (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  avatar_url TEXT,
  telephone VARCHAR(40),
  adresse TEXT,
  est_bloque BOOLEAN NOT NULL DEFAULT false,
  bloque_jusqu_a TIMESTAMP,
  date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produits (
  id SERIAL PRIMARY KEY,
  vendeur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  titre VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  prix NUMERIC(12, 2) NOT NULL CHECK (prix >= 0),
  image_url TEXT,
  images_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  stock INTEGER NOT NULL DEFAULT 1 CHECK (stock >= 0),
  etat VARCHAR(20) NOT NULL DEFAULT 'neuf' CHECK (etat IN ('neuf', 'occasion')),
  localisation VARCHAR(180),
  statut VARCHAR(30) NOT NULL DEFAULT 'disponible' CHECK (statut IN ('disponible', 'vendu', 'suspendu')),
  vendeur_masque BOOLEAN NOT NULL DEFAULT false,
  date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favoris (
  id SERIAL PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  produit_id INTEGER NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (utilisateur_id, produit_id)
);

CREATE TABLE IF NOT EXISTS paniers (
  id SERIAL PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  produit_id INTEGER NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL DEFAULT 1 CHECK (quantite > 0),
  date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (utilisateur_id, produit_id)
);

CREATE TABLE IF NOT EXISTS commandes (
  id SERIAL PRIMARY KEY,
  acheteur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  vendeur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  produit_id INTEGER NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL CHECK (quantite > 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  statut VARCHAR(30) NOT NULL DEFAULT 'En attente'
    CHECK (statut IN ('En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée')),
  annule_par VARCHAR(20) CHECK (annule_par IN ('client', 'vendeur')),
  raison_annulation TEXT,
  acheteur_masque BOOLEAN NOT NULL DEFAULT false,
  vendeur_masque BOOLEAN NOT NULL DEFAULT false,
  date_commande TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  expediteur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  destinataire_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  produit_id INTEGER REFERENCES produits(id) ON DELETE SET NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT false,
  expediteur_masque BOOLEAN NOT NULL DEFAULT false,
  destinataire_masque BOOLEAN NOT NULL DEFAULT false,
  modifie_le TIMESTAMP,
  date_envoi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes_vendeurs (
  id SERIAL PRIMARY KEY,
  vendeur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  acheteur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  commande_id INTEGER UNIQUE NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  note INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signalements (
  id SERIAL PRIMARY KEY,
  utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  signaleur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  compte_signale_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
  produit_id INTEGER REFERENCES produits(id) ON DELETE CASCADE,
  motif TEXT NOT NULL,
  statut VARCHAR(30) NOT NULL DEFAULT 'ouvert',
  date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_produits_recherche ON produits USING gin (to_tsvector('french', titre || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_produits_vendeur ON produits(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_acheteur ON commandes(acheteur_id);
CREATE INDEX IF NOT EXISTS idx_commandes_vendeur ON commandes(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_messages_destinataire ON messages(destinataire_id);

INSERT INTO categories (nom, description, image_url) VALUES
  ('Tech', 'Objets connectés, ordinateurs et accessoires futuristes', NULL),
  ('Mode', 'Vêtements, sneakers et accessoires premium', NULL),
  ('Maison', 'Décoration, mobilier et objets design', NULL),
  ('Gaming', 'Consoles, setups et périphériques', NULL),
  ('Fournitures & bureau', 'Stylos, cahiers, livres scolaires et matériel de bureau', NULL),
  ('Livres & documents', 'Livres, romans, manuels, cours et documents', NULL),
  ('Beauté & santé', 'Cosmétiques, soins, parfums et bien-être', NULL),
  ('Sport & loisirs', 'Articles de sport, loisirs, musique et activités', NULL),
  ('Enfants & bébé', 'Jouets, vêtements enfant, puériculture et accessoires bébé', NULL),
  ('Véhicules & pièces', 'Vélos, motos, voitures, pièces et accessoires', NULL),
  ('Autre', 'Produits qui ne rentrent pas encore dans une catégorie précise', NULL)
ON CONFLICT (nom) DO NOTHING;
