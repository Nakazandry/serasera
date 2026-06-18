# Sera-Sera

Application e-commerce moderne React + Express + PostgreSQL.

## Structure

- `frontend` : React, Vite, Tailwind CSS, react-icons, axios
- `backend` : Node.js, Express, PostgreSQL, JWT, bcrypt
- `backend/database/schema.sql` : tables PostgreSQL complètes

## Configuration base de données

La configuration locale est déjà prête dans `backend/.env` :

```env
DB_NAME=sera_sera
DB_USER=postgres
DB_PASSWORD=123456
```

## Demarrage

Dans un terminal :

```bash
cd backend
npm install
createdb -U postgres -h localhost sera_sera
npm run db:init
npm run dev
```

Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

URLs par défaut :

- Frontend : `http://localhost:5174`
- Backend : `http://localhost:5001/api`

Si `createdb` échoue avec `localhost:5432 - no response`, démarrez PostgreSQL avant d'initialiser la base.
