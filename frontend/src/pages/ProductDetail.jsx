import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiFlag, FiHeart, FiMessageCircle, FiShoppingCart, FiStar } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import api from '../services/api';
import ProductImage from '../components/ProductImage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';

export default function ProductDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { items, addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();
  const { selectDialog } = useDialog();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  const [reportReasons, setReportReasons] = useState([]);
  const touchStartXRef = useRef(null);

  useEffect(() => {
    setIsLoading(true);
    api.get(`/products/${id}`)
      .then(({ data }) => setProduct(data))
      .catch(() => setProduct(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    api.get('/reports/reasons').then(({ data }) => setReportReasons(data)).catch(() => null);
  }, []);

  const productImages = Array.isArray(product?.images_urls) && product.images_urls.length
    ? product.images_urls
    : [product?.image_url].filter(Boolean);

  useEffect(() => {
    setSelectedImage(productImages[0] || '');
  }, [product?.id, product?.image_url, product?.images_urls]);

  const selectedImageIndex = Math.max(productImages.indexOf(selectedImage), 0);
  const showImageAt = (index) => {
    if (productImages.length === 0) return;
    const nextIndex = (index + productImages.length) % productImages.length;
    setSelectedImage(productImages[nextIndex]);
  };
  const showPreviousImage = () => showImageAt(selectedImageIndex - 1);
  const showNextImage = () => showImageAt(selectedImageIndex + 1);
  const handleTouchEnd = (event) => {
    if (touchStartXRef.current === null || productImages.length < 2) return;

    const distance = touchStartXRef.current - event.changedTouches[0].clientX;
    touchStartXRef.current = null;
    if (Math.abs(distance) < 40) return;
    if (distance > 0) showNextImage();
    else showPreviousImage();
  };

  const quantityInCart = items.find((item) => Number(item.produit_id) === Number(product?.id))?.quantite || 0;
  const favorite = product ? isFavorite(product.id) : false;
  const addCart = async (item) => {
    if (!isAuthenticated) {
      showToast('Connectez-vous pour ajouter ce produit au panier.', 'error');
      return;
    }
    if (Number(item.vendeur_id) === Number(user?.id)) {
      showToast('Vous ne pouvez pas acheter votre propre produit.', 'error');
      return;
    }

    try {
      await addToCart(item);
      showToast(`${item.titre} ajouté au panier.`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Ajout au panier impossible.', 'error');
    }
  };

  const reportSeller = async () => {
    if (!isAuthenticated) {
      showToast('Connectez-vous pour signaler un compte.', 'error');
      return;
    }

    const selectedReason = await selectDialog({
      title: 'Signaler ce compte',
      message: 'Choisissez la raison principale du signalement.',
      options: reportReasons,
      confirmLabel: 'Envoyer',
      danger: true,
    });

    if (!selectedReason) {
      showToast('Raison de signalement invalide.', 'error');
      return;
    }

    try {
      await api.post('/reports', {
        compte_signale_id: product.vendeur_id,
        produit_id: product.id,
        motif: selectedReason,
      });
      showToast('Signalement envoyé à l’administration.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Signalement impossible', 'error');
    }
  };

  if (isLoading) {
    return <p className="rounded-3xl border border-line bg-white/5 p-8 text-center text-slate-300">Chargement du produit...</p>;
  }

  if (!product) {
    return <p className="rounded-3xl border border-line bg-white/5 p-8 text-center text-slate-300">Produit introuvable.</p>;
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div
            className="relative overflow-hidden rounded-3xl border border-line shadow-glow"
            onTouchStart={(event) => { touchStartXRef.current = event.touches[0].clientX; }}
            onTouchEnd={handleTouchEnd}
          >
            <ProductImage className="aspect-[4/3] w-full object-cover" src={selectedImage || product.image_url} alt={product.titre} iconClassName="text-5xl" />
            {productImages.length > 1 && (
              <>
                <button className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-slate-950/70 text-white backdrop-blur transition hover:bg-cyan-300 hover:text-slate-950" onClick={showPreviousImage} type="button" title="Image précédente">
                  <FiChevronLeft />
                </button>
                <button className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-slate-950/70 text-white backdrop-blur transition hover:bg-cyan-300 hover:text-slate-950" onClick={showNextImage} type="button" title="Image suivante">
                  <FiChevronRight />
                </button>
                <span className="absolute bottom-3 right-3 rounded-full border border-line bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                  {selectedImageIndex + 1}/{productImages.length}
                </span>
              </>
            )}
          </div>
          {productImages.length > 1 && (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {productImages.map((image, index) => (
                <button className={`overflow-hidden rounded-2xl border ${image === selectedImage ? 'border-cyan-300' : 'border-line'}`} onClick={() => setSelectedImage(image)} key={`${image.slice(0, 48)}-${index}`}>
                  <ProductImage className="aspect-square w-full object-cover" src={image} alt={`${product.titre} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="badge">{product.categorie_nom || 'Marketplace'}</span>
            <h1 className="text-4xl font-black">{product.titre}</h1>
            <p className="text-slate-300">{product.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge">{product.etat || 'neuf'}</span>
            <span className="badge">Stock {product.stock || 1}</span>
            <span className="badge flex items-center gap-1 text-amber-200"><FiStar /> {product.note_vendeur || 0}</span>
          </div>
          <p className="text-4xl font-black text-cyan-200">{Number(product.prix).toLocaleString('fr-FR')} Ar</p>
          <div className="flex flex-wrap gap-3">
            <button
              className={`btn relative ${Number(product.vendeur_id) === Number(user?.id) || Number(product.stock || 0) <= 0 ? 'cursor-not-allowed border border-line bg-white/10 text-slate-400' : 'btn-primary'}`}
              disabled={Number(product.vendeur_id) === Number(user?.id) || Number(product.stock || 0) <= 0}
              onClick={() => addCart(product)}
            >
              <FiShoppingCart /> {Number(product.vendeur_id) === Number(user?.id) ? 'Votre produit' : Number(product.stock || 0) <= 0 ? 'Indisponible' : 'Ajouter au panier'}
              {quantityInCart > 0 && (
                <span className="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-400 px-1 text-[10px] font-black text-white">
                  {quantityInCart}
                </span>
              )}
            </button>
            <button className={`btn ${favorite ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleFavorite(product).catch(() => null)}>
              {favorite ? <FaHeart /> : <FiHeart />} {favorite ? 'Favori' : 'Ajouter favori'}
            </button>
            <Link
              className="btn btn-ghost"
              to="/messages"
              state={{
                recipientId: product.vendeur_id,
                recipientName: `${product.vendeur_prenom || 'Sera'} ${product.vendeur_nom || 'Seller'}`,
                productId: product.id,
                productTitle: product.titre,
              }}
            >
              <FiMessageCircle /> Contacter vendeur
            </Link>
            <button className="btn btn-ghost text-rose-100" onClick={reportSeller}>
              <FiFlag /> Signaler ce compte
            </button>
          </div>
          <div className="rounded-3xl border border-line bg-white/5 p-5">
            <p className="text-sm text-slate-400">Vendeur</p>
            <p className="flex flex-wrap items-center gap-3 text-xl font-bold">
              {product.vendeur_prenom || 'Sera'} {product.vendeur_nom || 'Seller'}
              <span className="badge flex items-center gap-1 text-amber-200"><FiStar /> {product.note_vendeur || 0}</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
