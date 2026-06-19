import { Link } from 'react-router-dom';
import { FiHeart, FiMapPin, FiShoppingCart, FiStar } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import ProductImage from './ProductImage';

export default function ProductCard({ product, onCart, onFavorite, isFavorite = false, cartCount = 0, cartDisabled = false, cartDisabledLabel = 'Indisponible' }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-line bg-white/10 shadow-glow transition hover:-translate-y-1 hover:bg-white/15">
      <Link to={`/products/${product.id}`}>
        <div className="aspect-[4/3] overflow-hidden bg-slate-900">
          <ProductImage className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={product.image_url} alt={product.titre} />
        </div>
      </Link>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase text-cyan-200">{product.categorie_nom || 'Marketplace'}</p>
            <h3 className="line-clamp-2 break-words font-bold">{product.titre}</h3>
          </div>
          <button
            className={`shrink-0 rounded-full border border-line p-2 transition hover:bg-rose-400/15 ${isFavorite ? 'bg-rose-400/20 text-rose-200' : 'text-rose-200'}`}
            onClick={() => onFavorite?.(product)}
            title={isFavorite ? 'Déjà dans les favoris' : 'Ajouter aux favoris'}
          >
            {isFavorite ? <FaHeart /> : <FiHeart />}
          </button>
        </div>
        <p className="line-clamp-2 text-sm text-slate-300">{product.description}</p>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate text-slate-300">
            Vendeur: <span className="font-semibold text-white">{product.vendeur_prenom || 'Sera'} {product.vendeur_nom || 'Seller'}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-amber-200"><FiStar /> {product.note_vendeur || 0}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
          <span className="flex min-w-0 items-center gap-1 truncate"><FiMapPin className="shrink-0" /> {product.localisation || 'En ligne'}</span>
          <span className="rounded-full border border-line bg-white/10 px-2 py-0.5 text-xs text-slate-200">Qté {product.stock ?? 0}</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <strong className="break-words text-xl text-white">{Number(product.prix).toLocaleString('fr-FR')} Ar</strong>
          <button
            className={`btn relative w-full sm:w-auto ${cartDisabled ? 'cursor-not-allowed border border-line bg-white/10 text-slate-400' : 'btn-primary'}`}
            disabled={cartDisabled}
            onClick={() => onCart?.(product)}
            title={cartDisabled ? cartDisabledLabel : 'Ajouter au panier'}
          >
            <FiShoppingCart /> {cartDisabled ? cartDisabledLabel : 'Ajouter'}
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-400 px-1 text-[10px] font-black text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
