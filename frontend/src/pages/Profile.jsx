import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCamera, FiGlobe, FiHeart, FiMail, FiMapPin, FiMoon, FiPackage, FiPhone, FiSave, FiShoppingCart, FiSun, FiUser } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { count } = useCart();
  const { theme, setTheme, language, setLanguage } = usePreferences();
  const { showToast } = useToast();
  const [stats, setStats] = useState({ products: 0, favorites: 0, orders: 0 });
  const [form, setForm] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    telephone: user?.telephone || '',
    adresse: user?.adresse || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');

  useEffect(() => {
    Promise.allSettled([
      api.get('/products/mine'),
      api.get('/products/favorites/mine'),
      api.get('/orders', { params: { include_hidden: 'true' } }),
    ]).then(([products, favorites, orders]) => {
      const activeOrders = orders.status === 'fulfilled'
        ? orders.value.data.filter((order) => order.statut !== 'Annulée')
        : [];
      setStats({
        products: products.status === 'fulfilled' ? products.value.data.length : 0,
        favorites: favorites.status === 'fulfilled' ? favorites.value.data.length : 0,
        orders: activeOrders.length,
      });
    });
  }, []);

  useEffect(() => {
    setForm({
      nom: user?.nom || '',
      prenom: user?.prenom || '',
      telephone: user?.telephone || '',
      adresse: user?.adresse || '',
    });
    setAvatarPreview(user?.avatar_url || '');
  }, [user]);

  useEffect(() => {
    if (!avatarFile) return undefined;

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  const submitProfile = async (event) => {
    event.preventDefault();

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      if (avatarFile) payload.append('avatar', avatarFile);

      await updateProfile(payload);
      setAvatarFile(null);
      showToast('Profil mis à jour.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Modification impossible', 'error');
    }
  };

  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.email || 'Utilisateur';

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="card">
          {user?.avatar_url ? (
            <img className="h-24 w-24 rounded-full object-cover" src={user.avatar_url} alt={fullName} />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full bg-cyan-300 text-4xl font-black text-slate-950">
              {(user?.prenom?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
          )}
          <h1 className="mt-5 text-3xl font-black">{fullName}</h1>
          <p className="mt-1 text-sm text-slate-400">{user?.role === 'admin' ? 'Administrateur' : 'Membre Sera-Sera'}</p>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <p className="flex items-center gap-2"><FiMail className="text-cyan-200" /> {user?.email || 'Email non renseigné'}</p>
            <p className="flex items-center gap-2"><FiPhone className="text-cyan-200" /> {user?.telephone || 'Téléphone non renseigné'}</p>
            <p className="flex items-center gap-2"><FiMapPin className="text-cyan-200" /> {user?.adresse || 'Adresse non renseignée'}</p>
          </div>
        </aside>

        <div className="space-y-5">
          <div>
            <span className="badge">Profil</span>
            <h2 className="mt-3 text-4xl font-black">Votre compte</h2>
          </div>
          <section className="grid gap-4 md:grid-cols-4">
            {[
              [FiShoppingCart, count, 'Dans le panier'],
              [FiHeart, stats.favorites, 'Favoris'],
              [FiPackage, stats.products, 'Mes produits'],
              [FiUser, stats.orders, 'Commandes'],
            ].map(([Icon, value, label]) => (
              <div className="card" key={label}>
                <Icon className="mb-3 text-2xl text-cyan-200" />
                <p className="text-3xl font-black">{value}</p>
                <p className="text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </section>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-primary" to="/orders">Voir mes commandes</Link>
            <Link className="btn btn-ghost" to="/favorites">Voir mes favoris</Link>
          </div>
          <section className="card grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400">Nom</p>
              <p className="mt-1 font-bold">{user?.nom || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Prénom</p>
              <p className="mt-1 font-bold">{user?.prenom || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="mt-1 font-bold">{user?.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Compte créé</p>
              <p className="mt-1 font-bold">{user?.date_creation ? new Date(user.date_creation).toLocaleDateString('fr-FR') : '-'}</p>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="card space-y-5">
          <div>
            <span className="badge">Paramètres</span>
            <h2 className="mt-3 text-2xl font-black">Photo de profil</h2>
            <p className="mt-1 text-sm text-slate-400">JPG, PNG ou WebP, maximum 5 Mo.</p>
          </div>
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <img className="h-24 w-24 rounded-full object-cover" src={avatarPreview} alt={fullName} />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-full bg-cyan-300 text-4xl font-black text-slate-950">
                {(user?.prenom?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <label className="btn btn-ghost cursor-pointer">
              <FiCamera /> Changer
              <input className="sr-only" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </aside>

        <form className="card space-y-5" onSubmit={submitProfile}>
          <h2 className="text-2xl font-black">Modifier mon profil</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm text-slate-300">Nom</span>
              <input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </label>
            <label>
              <span className="mb-2 block text-sm text-slate-300">Prénom</span>
              <input className="input" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            </label>
            <label>
              <span className="mb-2 block text-sm text-slate-300">Téléphone</span>
              <input className="input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </label>
            <label>
              <span className="mb-2 block text-sm text-slate-300">Adresse</span>
              <input className="input" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 flex items-center gap-2 text-sm text-slate-300"><FiGlobe /> Langue</span>
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">{theme === 'dark' ? <FiMoon /> : <FiSun />} Apparence</span>
              <select className="input" value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="dark">Mode sombre</option>
                <option value="light">Mode clair</option>
              </select>
            </label>
          </div>

          <button className="btn btn-primary w-full"><FiSave /> Enregistrer</button>
        </form>
      </section>
    </div>
  );
}
