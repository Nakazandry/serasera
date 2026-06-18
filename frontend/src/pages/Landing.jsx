import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiShield, FiStar, FiZap } from 'react-icons/fi';
import api from '../services/api';
import Logo from '../components/Logo';
import ProductCard from '../components/ProductCard';

export default function Landing() {
  const [popularProducts, setPopularProducts] = useState([]);

  useEffect(() => {
    api.get('/products', { params: { sort: 'rating' } })
      .then(({ data }) => setPopularProducts(data.slice(0, 4)))
      .catch(() => setPopularProducts([]));
  }, []);

  return (
    <div className="space-y-14">
      <section className="grid min-h-[70vh] items-center gap-10 py-8 lg:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-7">
          <div className="flex items-center gap-4">
            <Logo markClassName="h-16 w-16" />
            <span className="badge">Marketplace futuriste et locale</span>
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-black leading-tight md:text-7xl">Sera-Sera</h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Achetez, vendez, discutez et notez les meilleurs vendeurs dans une expérience e-commerce rapide, élégante et sécurisée.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-primary" to="/products">Explorer <FiArrowRight /></Link>
            <Link className="btn btn-ghost" to="/register">Devenir vendeur</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['12k+', 'produits actifs'],
              ['4.8/5', 'note vendeurs'],
              ['24h', 'réponse moyenne'],
            ].map(([value, label]) => (
              <div key={label} className="border-l border-cyan-300/50 pl-4">
                <p className="text-2xl font-black">{value}</p>
                <p className="text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="grid h-[520px] place-items-center rounded-[2rem] border border-line bg-white/10 p-8 shadow-glow">
            <div className="space-y-6 text-center">
              <Logo className="justify-center" markClassName="h-44 w-44" />
              <p className="text-4xl font-black">Sera-Sera</p>
              <p className="mx-auto max-w-sm text-sm text-slate-300">Une identité simple pour vos produits, vos commandes et vos discussions.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          [FiZap, 'Vente instantanée', 'Publiez un article avec stock, état, localisation et image.'],
          [FiShield, 'Commandes suivies', 'Panier, statut commande et historique acheteur-vendeur.'],
          [FiStar, 'Confiance visible', 'Notes vendeurs et commentaires après livraison.'],
        ].map(([Icon, title, text]) => (
          <div className="card" key={title}>
            <Icon className="mb-4 text-3xl text-cyan-200" />
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 text-sm text-slate-300">{text}</p>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-3xl font-black">Produits populaires</h2>
          <Link className="btn btn-ghost" to="/products">Voir tout</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {popularProducts.length === 0 && (
            <p className="rounded-3xl border border-line bg-white/5 p-8 text-center text-slate-300 sm:col-span-2 lg:col-span-4">
              Aucun produit publié pour le moment.
            </p>
          )}
          {popularProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </div>
  );
}
