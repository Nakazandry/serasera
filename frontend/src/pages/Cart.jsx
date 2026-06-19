import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiMessageCircle, FiPhone, FiTrash2, FiTruck, FiUser } from 'react-icons/fi';
import ProductImage from '../components/ProductImage';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const { user } = useAuth();
  const { items, refreshCart, removeFromCart, checkout } = useCart();
  const { showToast } = useToast();
  const [delivery, setDelivery] = useState({
    adresse_livraison: user?.adresse || '',
    note_vendeur: '',
  });

  useEffect(() => { refreshCart(); }, [refreshCart]);
  useEffect(() => {
    setDelivery((current) => ({ ...current, adresse_livraison: current.adresse_livraison || user?.adresse || '' }));
  }, [user?.adresse]);

  const total = items.reduce((sum, item) => sum + Number(item.prix) * Number(item.quantite), 0);

  const submitCheckout = async () => {
    try {
      await checkout(delivery);
      showToast('Commande validée. Le vendeur a reçu votre adresse et votre message.', 'success');
      setDelivery((current) => ({ ...current, note_vendeur: '' }));
    } catch (err) {
      showToast(err.response?.data?.message || 'Commande impossible.', 'error');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <h1 className="text-3xl font-black sm:text-4xl">Panier</h1>
        {items.length === 0 && <p className="rounded-3xl border border-line bg-white/5 p-8 text-center text-slate-300">Votre panier est vide.</p>}
        {items.map((item) => (
          <div className="grid gap-4 rounded-3xl border border-line bg-white/5 p-4 md:grid-cols-[96px_1fr_auto]" key={item.id}>
            <ProductImage className="h-24 w-24 rounded-2xl object-cover" src={item.image_url} alt={item.titre} />
            <div className="min-w-0">
              <h2 className="font-bold">{item.titre}</h2>
              <p className="text-sm text-slate-400">Quantité {item.quantite}</p>
              <p className="mt-2 font-black">{Number(item.prix).toLocaleString('fr-FR')} Ar</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-300">
                <p className="flex items-center gap-2"><FiUser className="text-cyan-200" /> Vendeur: {item.vendeur_prenom || ''} {item.vendeur_nom || ''}</p>
                {item.vendeur_telephone && <p className="flex items-center gap-2"><FiPhone className="text-cyan-200" /> {item.vendeur_telephone}</p>}
                {item.vendeur_adresse && <p className="flex items-center gap-2"><FiMapPin className="text-cyan-200" /> {item.vendeur_adresse}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col md:items-end">
              <Link
                className="btn btn-ghost w-full"
                to="/messages"
                state={{
                  recipientId: item.vendeur_id,
                  recipientName: `${item.vendeur_prenom || ''} ${item.vendeur_nom || 'Vendeur'}`.trim(),
                  productId: item.produit_id,
                  productTitle: item.titre,
                }}
              >
                <FiMessageCircle /> Contacter
              </Link>
              <button className="grid h-11 w-full place-items-center rounded-full border border-rose-300/30 p-3 text-rose-200 transition hover:bg-rose-400/15 sm:w-11" onClick={() => removeFromCart(item.id)} title="Retirer du panier"><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </section>
      <aside className="h-fit rounded-2xl border border-line bg-white/10 p-4 sm:rounded-3xl sm:p-5">
        <div className="mb-5 space-y-3">
          <p className="flex items-center gap-2 text-sm font-bold"><FiTruck className="text-cyan-200" /> Livraison avant confirmation</p>
          <label>
            <span className="mb-2 block text-sm text-slate-400">Adresse de livraison</span>
            <textarea
              className="input min-h-24"
              value={delivery.adresse_livraison}
              onChange={(event) => setDelivery({ ...delivery, adresse_livraison: event.target.value })}
              placeholder="Votre adresse complète"
              required
            />
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-400">Message pour le vendeur</span>
            <textarea
              className="input min-h-24"
              value={delivery.note_vendeur}
              onChange={(event) => setDelivery({ ...delivery, note_vendeur: event.target.value })}
              placeholder="Ex: horaire de livraison, point de repère, question..."
            />
          </label>
        </div>
        <p className="text-sm text-slate-400">Total</p>
        <p className="mt-2 break-words text-3xl font-black text-cyan-200 sm:text-4xl">{total.toLocaleString('fr-FR')} Ar</p>
        <button className="btn btn-primary mt-5 w-full" onClick={submitCheckout} disabled={items.length === 0}>Valider commande</button>
      </aside>
    </div>
  );
}
