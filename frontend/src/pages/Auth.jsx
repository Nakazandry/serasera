import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLock, FiMail, FiUser } from 'react-icons/fi';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', mot_de_passe: '', telephone: '', adresse: '' });
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await (isRegister ? register(form) : login({ email: form.email, mot_de_passe: form.mot_de_passe }));
      showToast(isRegister ? 'Compte créé.' : 'Connexion réussie.', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.response?.data?.message || 'Action impossible', 'error');
    }
  };

  return (
    <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-white/10 shadow-glow lg:grid-cols-2">
      <div className="hidden min-h-[620px] place-items-center bg-slate-950/60 p-10 lg:grid">
        <div className="space-y-8 text-center">
          <Logo className="justify-center" markClassName="h-36 w-36" />
          <div>
            <p className="text-5xl font-black">Sera-Sera</p>
            <p className="mt-3 text-sm font-semibold uppercase text-cyan-200">Acheter. Vendre. Discuter.</p>
          </div>
          <div className="mx-auto grid max-w-sm grid-cols-3 gap-3 text-left">
            {['Produits', 'Messages', 'Commandes'].map((label) => (
              <div className="rounded-2xl border border-line bg-white/10 p-3 text-center text-sm font-bold" key={label}>{label}</div>
            ))}
          </div>
        </div>
      </div>
      <form className="space-y-5 p-6 md:p-10" onSubmit={submit}>
        <div>
          <span className="badge">{isRegister ? 'Créer un compte' : 'Bienvenue'}</span>
          <h1 className="mt-4 text-4xl font-black">{isRegister ? 'Rejoindre Sera-Sera' : 'Connexion'}</h1>
        </div>
        {isRegister && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="mb-2 flex items-center gap-2 text-sm text-slate-300"><FiUser /> Nom</span><input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required /></label>
            <label><span className="mb-2 block text-sm text-slate-300">Prénom</span><input className="input" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required /></label>
          </div>
        )}
        <label><span className="mb-2 flex items-center gap-2 text-sm text-slate-300"><FiMail /> Email</span><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>
          <span className="mb-2 flex items-center gap-2 text-sm text-slate-300"><FiLock /> Mot de passe</span>
          <span className="relative block">
            <input
              className="input pr-12"
              type={showPassword ? 'text' : 'password'}
              minLength="6"
              value={form.mot_de_passe}
              onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })}
              required
            />
            <button
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </span>
        </label>
        {isRegister && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            <input className="input" placeholder="Adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          </div>
        )}
        <button className="btn btn-primary w-full">{isRegister ? 'Créer mon compte' : 'Se connecter'}</button>
        <p className="text-sm text-slate-300">
          {isRegister ? 'Déjà inscrit ? ' : 'Pas encore de compte ? '}
          <Link className="text-cyan-200" to={isRegister ? '/login' : '/register'}>{isRegister ? 'Connexion' : 'Inscription'}</Link>
        </p>
      </form>
    </section>
  );
}
