import { useEffect, useState } from 'react';
import { FiBox, FiDollarSign, FiFlag, FiPlus, FiTag, FiUsers } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Admin() {
  const { showToast } = useToast();
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ nom: '', description: '' });

  const load = () => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => null);
    api.get('/admin/users').then(({ data }) => setUsers(data)).catch(() => null);
    api.get('/admin/products').then(({ data }) => setProducts(data)).catch(() => null);
    api.get('/admin/orders').then(({ data }) => setOrders(data)).catch(() => null);
    api.get('/admin/reports').then(({ data }) => setReports(data)).catch(() => null);
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => null);
  };

  useEffect(() => { load(); }, []);

  const banUser = async (userId, duration) => {
    try {
      await api.patch(`/admin/users/${userId}/ban`, { duration });
      showToast('Compte banni.', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Bannissement impossible', 'error');
    }
  };

  const unbanUser = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/unban`);
      showToast('Compte débloqué.', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Déblocage impossible', 'error');
    }
  };

  const updateReport = async (reportId, statut) => {
    try {
      await api.patch(`/admin/reports/${reportId}/status`, { statut });
      showToast('Signalement mis à jour.', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Mise à jour impossible', 'error');
    }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    try {
      await api.post('/categories', categoryForm);
      setCategoryForm({ nom: '', description: '' });
      showToast('Catégorie ajoutée.', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Création de catégorie impossible', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="badge">Administration</span>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Pilotage marketplace</h1>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        {[
          [FiUsers, stats.total_utilisateurs || 0, 'Utilisateurs'],
          [FiBox, stats.total_produits || 0, 'Produits'],
          [FiFlag, stats.total_commandes || 0, 'Commandes'],
          [FiDollarSign, `${Number(stats.chiffre_affaires || 0).toLocaleString('fr-FR')} Ar`, 'CA fictif'],
        ].map(([Icon, value, label]) => (
          <div className="card" key={label}><Icon className="mb-3 text-2xl text-cyan-200" /><p className="text-2xl font-black">{value}</p><p className="text-sm text-slate-400">{label}</p></div>
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        <UsersTable rows={users} onBan={banUser} onUnban={unbanUser} />
        <Table title="Produits" rows={products} keys={['id', 'titre', 'prix', 'statut']} />
        <Table title="Commandes" rows={orders} keys={['id', 'total', 'statut', 'date_commande']} />
      </section>
      <CategoriesPanel
        rows={categories}
        form={categoryForm}
        onChange={setCategoryForm}
        onSubmit={createCategory}
      />
      <ReportsTable rows={reports} onBan={banUser} onStatus={updateReport} />
    </div>
  );
}

function CategoriesPanel({ rows, form, onChange, onSubmit }) {
  return (
    <section className="rounded-2xl border border-line bg-white/5 sm:rounded-3xl">
      <div className="border-b border-line p-4">
        <h2 className="flex items-center gap-2 text-xl font-black"><FiTag /> Catégories</h2>
        <p className="mt-1 text-sm text-slate-400">Les vendeurs choisissent une catégorie existante. L’admin ajoute les catégories manquantes.</p>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[360px_1fr]">
        <form className="space-y-3" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder="Nom de catégorie"
            value={form.nom}
            onChange={(event) => onChange({ ...form, nom: event.target.value })}
            required
          />
          <textarea
            className="input min-h-24"
            placeholder="Description optionnelle"
            value={form.description}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
          />
          <button className="btn btn-primary w-full"><FiPlus /> Ajouter</button>
        </form>
        <div className="flex flex-wrap content-start gap-2">
          {rows.map((category) => (
            <span className="badge" key={category.id}>{category.nom}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function UsersTable({ rows, onBan, onUnban }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white/5 sm:rounded-3xl">
      <h2 className="border-b border-line p-4 text-xl font-black">Utilisateurs</h2>
      <div className="space-y-3 p-4">
        {rows.slice(0, 8).map((user) => (
          <div className="rounded-2xl border border-line bg-white/5 p-3" key={user.id}>
            <p className="truncate font-bold">{user.email}</p>
            <p className="text-xs text-slate-400">{user.role} · {user.est_bloque ? `Bloqué${user.bloque_jusqu_a ? ` jusqu'au ${new Date(user.bloque_jusqu_a).toLocaleDateString('fr-FR')}` : ' définitivement'}` : 'Actif'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-ghost text-xs" onClick={() => onBan(user.id, '1m')}>Ban 1 mois</button>
              <button className="btn btn-ghost text-xs" onClick={() => onBan(user.id, '3m')}>Ban 3 mois</button>
              <button className="btn btn-ghost text-xs text-rose-100" onClick={() => onBan(user.id, 'permanent')}>Définitif</button>
              {user.est_bloque && <button className="btn btn-primary text-xs" onClick={() => onUnban(user.id)}>Débloquer</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTable({ rows, onBan, onStatus }) {
  return (
    <section className="rounded-2xl border border-line bg-white/5 sm:rounded-3xl">
      <div className="border-b border-line p-4">
        <h2 className="text-xl font-black">Signalements</h2>
        <p className="mt-1 text-sm text-slate-400">Raisons contrôlées et actions rapides sur le compte signalé.</p>
      </div>
      <div className="grid gap-3 p-4">
        {rows.length === 0 && <p className="text-sm text-slate-400">Aucun signalement.</p>}
        {rows.map((report) => (
          <div className="grid gap-3 rounded-2xl border border-line bg-white/5 p-4 lg:grid-cols-[1fr_auto]" key={report.id}>
            <div className="min-w-0">
              <p className="break-words font-bold">{report.motif}</p>
              <p className="text-sm text-slate-300">
                Signalé: {report.cible_prenom || ''} {report.cible_nom || ''} · {report.cible_email || 'Compte supprimé'}
              </p>
              <p className="text-xs text-slate-400">
                Par: {report.signaleur_prenom || ''} {report.signaleur_nom || ''} · {report.signaleur_email || '-'}
                {report.produit_titre ? ` · Produit: ${report.produit_titre}` : ''}
              </p>
              <span className="mt-2 inline-flex rounded-full border border-line px-3 py-1 text-xs">{report.statut}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {report.compte_signale_id && (
                <>
                  <button className="btn btn-ghost text-xs" onClick={() => onBan(report.compte_signale_id, '1m')}>Ban 1 mois</button>
                  <button className="btn btn-ghost text-xs" onClick={() => onBan(report.compte_signale_id, '3m')}>Ban 3 mois</button>
                  <button className="btn btn-ghost text-xs text-rose-100" onClick={() => onBan(report.compte_signale_id, 'permanent')}>Définitif</button>
                </>
              )}
              <button className="btn btn-primary text-xs" onClick={() => onStatus(report.id, 'traité')}>Traité</button>
              <button className="btn btn-ghost text-xs" onClick={() => onStatus(report.id, 'rejeté')}>Rejeter</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Table({ title, rows, keys }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white/5 sm:rounded-3xl">
      <h2 className="border-b border-line p-4 text-xl font-black">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.slice(0, 6).map((row) => (
              <tr className="border-b border-line last:border-0" key={`${title}-${row.id}`}>
                {keys.map((key) => <td className="max-w-36 truncate p-3 text-slate-300" key={key}>{String(row[key] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
