import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';

export default function Products() {
  const { user, isAuthenticated } = useAuth();
  const { items, addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: searchParams.get('search') || '', category: '', min: '', max: '', rating: '', sort: 'recent' });

  const load = async (nextFilters = filters) => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/products', { params: nextFilters });
      setProducts(data);
    } catch {
      setProducts([]);
      showToast('Catalogue impossible à charger.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const nextSearch = searchParams.get('search') || '';
    const nextFilters = { ...filters, search: nextSearch };
    setFilters(nextFilters);
    load(nextFilters);
  }, [searchParams]);

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = () => {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && !(key === 'sort' && value === 'recent')) params[key] = value;
    });
    setSearchParams(params);
    load(filters);
  };
  const addCart = async (product) => {
    if (!isAuthenticated) {
      showToast('Connectez-vous pour ajouter un produit au panier.', 'error');
      return;
    }
    if (Number(product.vendeur_id) === Number(user?.id)) {
      showToast('Vous ne pouvez pas acheter votre propre produit.', 'error');
      return;
    }

    try {
      await addToCart(product);
      showToast(`${product.titre} ajouté au panier.`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Ajout au panier impossible.', 'error');
    }
  };
  const quantityInCart = (productId) => items.find((item) => Number(item.produit_id) === Number(productId))?.quantite || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="badge">Catalogue</span>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Produits disponibles</h1>
        </div>
        <button className="btn btn-primary w-full md:w-auto" onClick={applyFilters}>Appliquer les filtres</button>
      </div>
      <section className="grid gap-3 rounded-2xl border border-line bg-white/5 p-3 sm:p-4 md:grid-cols-6">
        <input className="input md:col-span-2" placeholder="Recherche" value={filters.search} onChange={(e) => update('search', e.target.value)} />
        <select className="input" value={filters.category} onChange={(e) => update('category', e.target.value)}>
          <option value="">Catégorie</option>
          {categories.map((category) => (
            <option value={category.nom} key={category.id}>{category.nom}</option>
          ))}
        </select>
        <input className="input" placeholder="Prix min" value={filters.min} onChange={(e) => update('min', e.target.value)} />
        <input className="input" placeholder="Prix max" value={filters.max} onChange={(e) => update('max', e.target.value)} />
        <select className="input" value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
          <option value="recent">Récent</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
          <option value="rating">Meilleure note</option>
        </select>
        <select className="input" value={filters.rating} onChange={(e) => update('rating', e.target.value)}>
          <option value="">Note min.</option>
          <option value="4">4+</option>
          <option value="3">3+</option>
          <option value="2">2+</option>
        </select>
      </section>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading && <p className="rounded-3xl border border-line bg-white/5 p-8 text-center text-slate-300 sm:col-span-2 lg:col-span-4">Chargement des produits...</p>}
        {!isLoading && products.length === 0 && (
          <p className="rounded-3xl border border-line bg-white/5 p-8 text-center text-slate-300 sm:col-span-2 lg:col-span-4">
            Aucun produit disponible pour ces filtres.
          </p>
        )}
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onCart={addCart}
            onFavorite={(item) => toggleFavorite(item).catch(() => null)}
            isFavorite={isFavorite(product.id)}
            cartCount={quantityInCart(product.id)}
            cartDisabled={Number(product.vendeur_id) === Number(user?.id) || Number(product.stock || 0) <= 0}
            cartDisabledLabel={Number(product.vendeur_id) === Number(user?.id) ? 'Votre produit' : 'Indisponible'}
          />
        ))}
      </div>
    </div>
  );
}
