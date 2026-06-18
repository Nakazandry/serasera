import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiEdit2, FiHeart, FiImage, FiMapPin, FiPackage, FiPlus, FiShoppingBag, FiShoppingCart, FiStar, FiTrash2, FiX } from 'react-icons/fi';
import api from '../services/api';
import ProductImage from '../components/ProductImage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';

const emptyProduct = { titre: '', description: '', prix: '', categorie_id: '', stock: 1, etat: 'neuf', localisation: '' };

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirmDialog } = useDialog();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentImages, setCurrentImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const load = () => {
    api.get('/products/mine').then(({ data }) => setProducts(data)).catch(() => null);
    api.get('/products/favorites/mine').then(({ data }) => setFavorites(data)).catch(() => null);
    api.get('/orders', { params: { include_hidden: 'true' } }).then(({ data }) => setOrders(data)).catch(() => null);
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => null);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviews([]);
      return undefined;
    }

    const previewUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previewUrls);

    return () => previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
  }, [imageFiles]);

  const openAddProduct = () => {
    setEditingProduct(null);
    setCurrentImages([]);
    setForm(emptyProduct);
    setImageFiles([]);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setCurrentImages([]);
    setForm(emptyProduct);
    setImageFiles([]);
  };

  const openEditProduct = async (product) => {
    try {
      const { data } = await api.get(`/products/${product.id}`);
      setEditingProduct(data);
      setCurrentImages(Array.isArray(data.images_urls) && data.images_urls.length ? data.images_urls : [data.image_url].filter(Boolean));
      setForm({
        titre: data.titre || '',
        description: data.description || '',
        prix: data.prix || '',
        categorie_id: data.categorie_id || '',
        stock: data.stock ?? 1,
        etat: data.etat || 'neuf',
        localisation: data.localisation || '',
        statut: data.statut || 'disponible',
      });
      setImageFiles([]);
      setIsProductModalOpen(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Chargement du produit impossible', 'error');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const productData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        productData.append(key, value);
      });
      imageFiles.forEach((file) => productData.append('images', file));

      const request = editingProduct
        ? api.put(`/products/${editingProduct.id}`, productData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        : api.post('/products', productData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await request;
      closeProductModal();
      showToast(editingProduct ? 'Produit modifié.' : 'Produit publié.', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || (editingProduct ? 'Modification impossible' : 'Publication impossible'), 'error');
    }
  };

  const removeProduct = async (product) => {
    const confirmed = await confirmDialog({
      title: 'Supprimer le produit',
      message: `Voulez-vous supprimer "${product.titre}" ?`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!confirmed) return;

    try {
      const { data } = await api.delete(`/products/${product.id}`);
      showToast(data?.message || 'Produit supprimé.', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Suppression impossible', 'error');
    }
  };

  const completedOrders = orders.filter((order) => order.statut !== 'Annulée');
  const sales = completedOrders.filter((order) => order.est_vendeur);
  const receivedNotes = sales.map((order) => Number(order.note_commande)).filter(Boolean);
  const averageNote = receivedNotes.length
    ? (receivedNotes.reduce((sum, note) => sum + note, 0) / receivedNotes.length).toFixed(1)
    : '0';
  const purchases = completedOrders.filter((order) => order.est_acheteur);
  const recentSales = sales.slice(0, 3);
  const recentPurchases = purchases.slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-line bg-white/10 p-6 md:flex-row md:items-end">
        <div>
          <span className="badge">Tableau de bord</span>
          <h1 className="mt-3 text-4xl font-black">Bonjour {user?.prenom || 'vendeur'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Gérez vos produits, suivez vos commandes et retrouvez rapidement vos favoris.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={openAddProduct}><FiPlus /> Ajouter un produit</button>
          <Link className="btn btn-primary" to="/orders">Commandes <FiArrowRight /></Link>
          <Link className="btn btn-ghost" to="/favorites">Favoris</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          [FiPackage, products.length, 'Mes produits'],
          [FiShoppingCart, purchases.length, 'Mes achats'],
          [FiShoppingBag, sales.length, 'Mes ventes'],
          [FiHeart, favorites.length, 'Favoris'],
          [FiStar, averageNote, 'Notes reçues'],
        ].map(([Icon, value, label]) => (
          <div className="card" key={label}><Icon className="mb-3 text-2xl text-cyan-200" /><p className="text-3xl font-black">{value}</p><p className="text-sm text-slate-400">{label}</p></div>
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Mes articles</h2>
              <div className="flex items-center gap-3">
                <button className="text-sm font-semibold text-cyan-200" onClick={openAddProduct}>Ajouter</button>
                <Link className="text-sm font-semibold text-cyan-200" to="/products">Voir catalogue</Link>
              </div>
            </div>
            {products.length === 0 && (
              <p className="rounded-2xl border border-line bg-white/5 p-5 text-sm text-slate-300">
                Aucun produit publié pour le moment.
              </p>
            )}
            {products.map((product) => (
              <div className="grid gap-3 rounded-2xl border border-line bg-white/5 p-4 sm:grid-cols-[64px_1fr_auto]" key={product.id}>
                <ProductImage className="h-16 w-16 rounded-2xl object-cover" src={product.image_url} alt={product.titre} />
                <div>
                  <p className="font-bold">{product.titre}</p>
                  <p className="text-sm text-slate-400">{Number(product.prix).toLocaleString('fr-FR')} Ar · {product.statut}</p>
                  {product.localisation && <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><FiMapPin /> {product.localisation}</p>}
                </div>
                <div className="flex items-center gap-2 self-center">
                  <button className="rounded-full border border-cyan-200/30 p-3 text-cyan-100 transition hover:bg-cyan-300/15" onClick={() => openEditProduct(product)} title="Modifier le produit">
                    <FiEdit2 />
                  </button>
                  <button className="rounded-full border border-rose-300/30 p-3 text-rose-200 transition hover:bg-rose-400/15" onClick={() => removeProduct(product)} title="Supprimer le produit">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-line bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-black">Ventes récentes</h3>
              <Link className="text-xs font-semibold text-cyan-200" to="/orders">Tout voir</Link>
            </div>
            <div className="space-y-3">
              {recentSales.length === 0 && <p className="text-sm text-slate-400">Aucune vente pour l'instant.</p>}
              {recentSales.map((order) => (
                <div className="rounded-xl bg-white/5 p-3" key={order.id}>
                  <p className="line-clamp-1 font-semibold">{order.titre}</p>
                  <p className="text-xs text-slate-400">#{order.id} · {order.statut} · {Number(order.total).toLocaleString('fr-FR')} Ar</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-black">Achats récents</h3>
              <Link className="text-xs font-semibold text-cyan-200" to="/orders">Tout voir</Link>
            </div>
            <div className="space-y-3">
              {recentPurchases.length === 0 && <p className="text-sm text-slate-400">Aucun achat pour l'instant.</p>}
              {recentPurchases.map((order) => (
                <div className="rounded-xl bg-white/5 p-3" key={order.id}>
                  <p className="line-clamp-1 font-semibold">{order.titre}</p>
                  <p className="text-xs text-slate-400">#{order.id} · {order.statut} · {Number(order.total).toLocaleString('fr-FR')} Ar</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      {isProductModalOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <form className="card max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto" onSubmit={submit}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-2xl font-black">
                {editingProduct ? <FiEdit2 /> : <FiPlus />} {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
              </h2>
              <button className="rounded-full border border-line p-3 text-slate-200 transition hover:bg-white/10" type="button" onClick={closeProductModal} title="Fermer">
                <FiX />
              </button>
            </div>
          <input className="input" placeholder="Titre" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required />
          <textarea className="input min-h-28" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <select className="input" value={form.categorie_id} onChange={(e) => setForm({ ...form, categorie_id: e.target.value })}>
            <option value="">Catégorie</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>{category.nom}</option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Prix" value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} required />
            <input className="input" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div className="rounded-2xl border border-line bg-white/5 p-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-200/30 bg-white/5 px-4 py-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10">
              <FiImage />
              <span>{imageFiles.length ? `${imageFiles.length} nouvelle${imageFiles.length > 1 ? 's' : ''} image${imageFiles.length > 1 ? 's' : ''} sélectionnée${imageFiles.length > 1 ? 's' : ''}` : editingProduct ? 'Remplacer les images' : 'Choisir des images'}</span>
              <input
                key={imageFiles.map((file) => file.name).join('-') || 'empty-images'}
                className="sr-only"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImageFiles(Array.from(e.target.files || []).slice(0, 6))}
              />
            </label>
            {editingProduct && imageFiles.length === 0 && currentImages.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-slate-400">Images actuelles</p>
                <div className="flex flex-wrap items-center gap-3">
                  {currentImages.map((image, index) => (
                    <img className="h-20 w-20 rounded-2xl object-cover" src={image} alt={`Image actuelle ${index + 1}`} key={`${image.slice(0, 48)}-${index}`} />
                  ))}
                </div>
              </div>
            )}
            {imagePreviews.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {imagePreviews.map((previewUrl, index) => (
                  <img className="h-20 w-20 rounded-2xl object-cover" src={previewUrl} alt={`Apercu du produit ${index + 1}`} key={previewUrl} />
                ))}
                <button className="rounded-full border border-line p-3 text-slate-200 transition hover:bg-white/10" type="button" onClick={() => setImageFiles([])} title="Retirer les images">
                  <FiX />
                </button>
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="input" value={form.etat} onChange={(e) => setForm({ ...form, etat: e.target.value })}><option value="neuf">Neuf</option><option value="occasion">Occasion</option></select>
            <input className="input" placeholder="Localisation" value={form.localisation} onChange={(e) => setForm({ ...form, localisation: e.target.value })} />
          </div>
          {editingProduct && (
            <select className="input" value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
              <option value="disponible">Disponible</option>
              <option value="vendu">Vendu</option>
              <option value="suspendu">Suspendu</option>
            </select>
          )}
          <button className="btn btn-primary w-full">{editingProduct ? 'Enregistrer les modifications' : 'Publier'}</button>
        </form>
        </div>
      )}
    </div>
  );
}
