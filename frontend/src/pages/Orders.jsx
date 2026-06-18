import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiMessageCircle, FiShoppingBag, FiStar, FiTrash2, FiTruck } from 'react-icons/fi';
import api from '../services/api';
import ProductImage from '../components/ProductImage';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';

const statuses = ['En attente', 'Confirmée', 'Expédiée', 'Livrée'];

export default function Orders() {
  const { showToast } = useToast();
  const { confirmDialog, inputDialog } = useDialog();
  const [orders, setOrders] = useState([]);
  const [rating, setRating] = useState({ commande_id: '', note: 5, commentaire: '' });
  const [tab, setTab] = useState('achats');

  const load = () => api.get('/orders').then(({ data }) => setOrders(data)).catch(() => null);

  useEffect(() => { load(); }, []);

  const rate = async (event) => {
    event.preventDefault();
    try {
      await api.post('/ratings', rating);
      await load();
      setRating({ commande_id: '', note: 5, commentaire: '' });
      showToast('Note enregistrée.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Impossible de noter cette commande.', 'error');
    }
  };

  const updateStatus = async (orderId, statut) => {
    const raison_annulation = statut === 'Annulée'
      ? await inputDialog({
        title: 'Annuler la commande',
        message: 'Expliquez la raison. Le client recevra ce message.',
        placeholder: 'Exemple: produit indisponible, problème de livraison...',
        confirmLabel: 'Annuler la commande',
        danger: true,
      })
      : '';
    if (statut === 'Annulée' && !raison_annulation?.trim()) {
      showToast('Raison d’annulation requise.', 'error');
      return;
    }

    try {
      await api.patch(`/orders/${orderId}/status`, { statut, raison_annulation });
      await load();
      showToast(statut === 'Annulée'
        ? 'Commande annulée. L’autre personne a été avertie.'
        : 'Statut de commande mis à jour.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Impossible de modifier cette commande.', 'error');
    }
  };

  const removeOrder = async (order) => {
    const confirmed = await confirmDialog({
      title: 'Supprimer de ma liste',
      message: `Supprimer la commande #${order.id} de votre liste ? Cette action ne supprime pas l’historique de l’autre personne.`,
      confirmLabel: 'Supprimer',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/orders/${order.id}`);
      await load();
      showToast('Commande supprimée de votre liste.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Suppression impossible.', 'error');
    }
  };

  const cancelOrder = async (order) => {
    const confirmed = await confirmDialog({
      title: 'Annuler la commande',
      message: `Annuler la commande #${order.id} ? Le produit sera remis en vente.`,
      confirmLabel: 'Continuer',
      danger: true,
    });
    if (!confirmed) return;
    const raison_annulation = await inputDialog({
      title: 'Raison d’annulation',
      message: 'Expliquez la raison. Le vendeur recevra ce message.',
      placeholder: 'Exemple: erreur de commande, changement d’avis...',
      confirmLabel: 'Envoyer',
      danger: true,
    });
    if (!raison_annulation?.trim()) {
      showToast('Raison d’annulation requise.', 'error');
      return;
    }

    try {
      await api.patch(`/orders/${order.id}/status`, { statut: 'Annulée', raison_annulation });
      await load();
      showToast('Commande annulée. Le vendeur a été averti et le produit est à nouveau disponible.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Annulation impossible.', 'error');
    }
  };

  const cancelSaleOrder = async (order) => {
    const confirmed = await confirmDialog({
      title: 'Annuler la commande',
      message: `Annuler la commande #${order.id} ? Le client recevra la raison.`,
      confirmLabel: 'Continuer',
      danger: true,
    });
    if (!confirmed) return;

    const raison_annulation = await inputDialog({
      title: 'Raison d’annulation',
      message: 'Expliquez la raison. Le client recevra ce message.',
      placeholder: 'Exemple: produit indisponible, problème de livraison...',
      confirmLabel: 'Envoyer',
      danger: true,
    });
    if (!raison_annulation?.trim()) {
      showToast('Raison d’annulation requise.', 'error');
      return;
    }

    const remettre_disponible = await confirmDialog({
      title: 'Remettre en vente ?',
      message: 'Si le produit a été vendu ailleurs, choisissez “Non”. Si le produit est toujours disponible, choisissez “Oui”.',
      confirmLabel: 'Oui',
      cancelLabel: 'Non',
    });

    try {
      await api.patch(`/orders/${order.id}/status`, { statut: 'Annulée', raison_annulation, remettre_disponible });
      await load();
      showToast(remettre_disponible
        ? 'Commande annulée. Le client a été averti et le produit est à nouveau disponible.'
        : 'Commande annulée. Le client a été averti et le produit reste hors vente.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Annulation impossible.', 'error');
    }
  };

  const purchases = orders.filter((order) => order.est_acheteur);
  const sales = orders.filter((order) => order.est_vendeur);
  const visibleOrders = tab === 'achats' ? purchases : sales;
  const cancellationLabel = (order) => {
    if (order.statut !== 'Annulée') return '';
    if (order.annule_par === 'client') return 'Annulée par le client';
    if (order.annule_par === 'vendeur') return 'Annulée par le vendeur';
    return 'Commande annulée';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="badge">Commandes</span>
          <h1 className="mt-3 text-4xl font-black">Achats et ventes</h1>
        </div>
        <div className="inline-flex rounded-full border border-line bg-white/5 p-1">
          <button className={`btn ${tab === 'achats' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('achats')}>
            <FiShoppingBag /> Mes achats ({purchases.length})
          </button>
          <button className={`btn ${tab === 'ventes' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('ventes')}>
            <FiTruck /> Mes ventes ({sales.length})
          </button>
        </div>
      </div>

      <section className="grid gap-4">
        {visibleOrders.length === 0 && (
          <div className="rounded-3xl border border-line bg-white/5 p-8 text-center text-slate-300">
            Aucune commande dans cette section.
          </div>
        )}
        {visibleOrders.map((order) => (
          <div className="grid gap-4 rounded-3xl border border-line bg-white/5 p-4 md:grid-cols-[80px_1fr_260px]" key={order.id}>
            <ProductImage className="h-20 w-20 rounded-2xl object-cover" src={order.image_url} alt={order.titre} />
            <div>
              <p className="font-bold">{order.titre}</p>
              <p className="text-sm text-slate-400">Commande #{order.id} · Qté {order.quantite}</p>
              <p className="mt-2 text-sm text-slate-300">
                {tab === 'achats'
                  ? `Vendeur: ${order.vendeur_prenom || ''} ${order.vendeur_nom || ''}`
                  : `Acheteur: ${order.acheteur_prenom || ''} ${order.acheteur_nom || ''}`}
              </p>
              {order.note_commande && (
                <p className="mt-2 flex items-center gap-1 text-sm text-amber-200">
                  <FiStar /> {tab === 'achats' ? 'Note donnée' : 'Note reçue'}: {order.note_commande}/5
                </p>
              )}
              {order.statut === 'Annulée' && (
                <div className="mt-3 rounded-2xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-100">
                  <p className="font-bold">{cancellationLabel(order)}</p>
                  {order.raison_annulation && <p className="mt-1 text-rose-100/85">Raison: {order.raison_annulation}</p>}
                </div>
              )}
            </div>
            <div className="space-y-3 text-right">
              <span className="badge">{order.statut}</span>
              <p className="mt-2 font-black">{Number(order.total).toLocaleString('fr-FR')} Ar</p>
              {tab === 'achats' && order.statut === 'Livrée' && (
                <button className="btn btn-ghost mt-3" onClick={() => setRating((current) => ({ ...current, commande_id: order.id }))}>
                  <FiStar /> Noter
                </button>
              )}
              <Link
                className="btn btn-ghost w-full"
                to="/messages"
                state={{
                  recipientId: tab === 'achats' ? order.vendeur_id : order.acheteur_id,
                  recipientName: tab === 'achats'
                    ? `${order.vendeur_prenom || ''} ${order.vendeur_nom || 'Vendeur'}`.trim()
                    : `${order.acheteur_prenom || ''} ${order.acheteur_nom || 'Client'}`.trim(),
                  productId: order.produit_id,
                  productTitle: order.titre,
                }}
              >
                <FiMessageCircle /> {tab === 'achats' ? 'Contacter vendeur' : 'Contacter client'}
              </Link>
              {tab === 'ventes' && (
                <select className="input" value={order.statut} onChange={(event) => updateStatus(order.id, event.target.value)}>
                  {order.statut === 'Annulée' && <option value="Annulée">Annulée</option>}
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              )}
              {tab === 'ventes' && !['Annulée', 'Livrée'].includes(order.statut) && (
                <button className="btn btn-ghost w-full text-rose-100 hover:bg-rose-400/15" onClick={() => cancelSaleOrder(order)}>
                  <FiTrash2 /> Annuler
                </button>
              )}
              {tab === 'achats' && !['Annulée', 'Expédiée', 'Livrée'].includes(order.statut) ? (
                <button className="btn btn-ghost w-full text-rose-100 hover:bg-rose-400/15" onClick={() => cancelOrder(order)}>
                  <FiTrash2 /> Annuler
                </button>
              ) : (
                <button className="btn btn-ghost w-full text-rose-100 hover:bg-rose-400/15" onClick={() => removeOrder(order)}>
                  <FiTrash2 /> Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
      {tab === 'achats' && (
        <form className="card grid gap-3 md:grid-cols-[1fr_160px_2fr_auto]" onSubmit={rate}>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold"><FiCheckCircle className="text-cyan-200" /> Noter le vendeur</p>
            <input className="input" placeholder="ID commande livrée" value={rating.commande_id} onChange={(e) => setRating({ ...rating, commande_id: e.target.value })} required />
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">Note</p>
            <select className="input" value={rating.note} onChange={(e) => setRating({ ...rating, note: e.target.value })}>
              {[5, 4, 3, 2, 1].map((note) => <option key={note} value={note}>{note} étoiles</option>)}
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">Commentaire</p>
            <input className="input" placeholder="Commentaire optionnel" value={rating.commentaire} onChange={(e) => setRating({ ...rating, commentaire: e.target.value })} />
          </div>
          <button className="btn btn-primary self-end"><FiStar /> Noter</button>
        </form>
      )}
    </div>
  );
}
