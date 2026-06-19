import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Favorites() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { items, addToCart } = useCart();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const quantityInCart = (productId) => items.find((item) => Number(item.produit_id) === Number(productId))?.quantite || 0;

  const addFavoriteToCart = async (product) => {
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="badge">Favoris</span>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Produits favoris</h1>
        </div>
        <Link className="btn btn-ghost w-full md:w-auto" to="/products"><FiHeart /> Voir le catalogue</Link>
      </div>

      {favorites.length === 0 ? (
        <section className="rounded-3xl border border-line bg-white/5 p-8 text-center">
          <p className="text-lg font-bold">Aucun favori pour le moment.</p>
          <p className="mt-2 text-sm text-slate-400">Clique sur le coeur d'un produit pour le retrouver ici.</p>
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {favorites.map((product) => (
            <ProductCard
              key={product.produit_id}
              product={{ ...product, id: product.produit_id }}
              onCart={addFavoriteToCart}
              onFavorite={(item) => toggleFavorite(item).catch(() => null)}
              isFavorite={isFavorite(product.produit_id)}
              cartCount={quantityInCart(product.produit_id)}
              cartDisabled={Number(product.vendeur_id) === Number(user?.id) || Number(product.stock || 0) <= 0}
              cartDisabledLabel={Number(product.vendeur_id) === Number(user?.id) ? 'Votre produit' : 'Indisponible'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
