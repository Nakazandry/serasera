import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiEdit2, FiSend, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';

export default function Messages() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirmDialog, inputDialog } = useDialog();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(location.state || null);
  const [content, setContent] = useState('');

  const load = () => api.get('/messages').then(({ data }) => setMessages(data)).catch(() => null);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (location.state?.recipientId) setSelected(location.state);
  }, [location.state]);

  const submit = async (event) => {
    event.preventDefault();

    if (!selected?.recipientId) {
      showToast('Choisissez une personne avant d’envoyer le message.', 'error');
      return;
    }

    try {
      await api.post('/messages', {
        destinataire_id: selected.recipientId,
        produit_id: selected.productId || null,
        contenu: content,
      });
      setContent('');
      load();
      showToast('Message envoyé.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Message impossible à envoyer.', 'error');
    }
  };

  const editMessage = async (message) => {
    const contenu = await inputDialog({
      title: 'Modifier le message',
      message: 'Changez le contenu de votre message.',
      defaultValue: message.contenu,
      confirmLabel: 'Enregistrer',
    });
    if (!contenu?.trim()) return;

    try {
      await api.patch(`/messages/${message.id}`, { contenu });
      await load();
      showToast('Message modifié.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Modification impossible.', 'error');
    }
  };

  const removeMessage = async (message) => {
    const confirmed = await confirmDialog({
      title: 'Supprimer le message',
      message: 'Supprimer ce message de votre messagerie ?',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/messages/${message.id}`);
      await load();
      showToast('Message supprimé.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Suppression impossible.', 'error');
    }
  };

  const removeConversation = async (contact) => {
    const confirmed = await confirmDialog({
      title: 'Supprimer la conversation',
      message: `Supprimer la conversation avec ${contact.recipientName || 'ce contact'} de votre messagerie ?`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/messages/conversation/${contact.recipientId}`);
      setSelected((current) => (Number(current?.recipientId) === Number(contact.recipientId) ? null : current));
      await load();
      showToast('Conversation supprimée de votre messagerie.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Suppression impossible.', 'error');
    }
  };

  const contacts = messages.reduce((list, message) => {
    const otherId = Number(message.expediteur_id) === Number(user?.id) ? message.destinataire_id : message.expediteur_id;
    if (!otherId || list.some((contact) => Number(contact.recipientId) === Number(otherId))) return list;

    const isSender = Number(message.expediteur_id) === Number(otherId);
    list.push({
      recipientId: otherId,
      recipientName: isSender
        ? `${message.expediteur_prenom || ''} ${message.expediteur_nom || ''}`.trim()
        : `${message.destinataire_prenom || ''} ${message.destinataire_nom || ''}`.trim(),
      productId: message.produit_id,
      productTitle: message.produit_titre,
    });
    return list;
  }, []);

  const selectedMessages = selected?.recipientId
    ? messages.filter((message) => {
      const participants = [Number(message.expediteur_id), Number(message.destinataire_id)];
      return participants.includes(Number(user?.id)) && participants.includes(Number(selected.recipientId));
    })
    : messages.slice(0, 8);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-3">
        <h1 className="text-4xl font-black">Messages</h1>
        {selected?.recipientId && !contacts.some((contact) => Number(contact.recipientId) === Number(selected.recipientId)) && (
          <button className="w-full rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4 text-left" onClick={() => setSelected(selected)}>
            <p className="font-bold">{selected.recipientName}</p>
            {selected.productTitle && <p className="text-sm text-slate-300">{selected.productTitle}</p>}
          </button>
        )}
        {contacts.length === 0 && !selected?.recipientId && (
          <p className="rounded-2xl border border-line bg-white/5 p-4 text-sm text-slate-300">
            Ouvrez une fiche produit puis cliquez sur “Contacter vendeur”.
          </p>
        )}
        {contacts.map((contact) => (
          <div
            className={`grid grid-cols-[1fr_auto] gap-2 rounded-2xl border p-4 transition ${Number(selected?.recipientId) === Number(contact.recipientId) ? 'border-cyan-300 bg-cyan-300/10' : 'border-line bg-white/5 hover:bg-white/10'}`}
            key={contact.recipientId}
          >
            <button className="min-w-0 text-left" onClick={() => setSelected(contact)}>
              <p className="truncate font-bold">{contact.recipientName || 'Contact'}</p>
              {contact.productTitle && <p className="line-clamp-1 text-sm text-slate-300">{contact.productTitle}</p>}
            </button>
            <button className="self-start rounded-full border border-rose-300/30 p-2 text-rose-200 transition hover:bg-rose-400/15" onClick={() => removeConversation(contact)} title="Supprimer la conversation">
              <FiTrash2 />
            </button>
          </div>
        ))}
      </aside>
      <section className="rounded-3xl border border-line bg-white/10 p-5">
        <div className="mb-5 rounded-2xl border border-line bg-white/5 p-4">
          <p className="text-sm text-slate-400">Conversation</p>
          <p className="font-bold">{selected?.recipientName || 'Choisissez une personne'}</p>
          {selected?.productTitle && <p className="mt-1 text-sm text-cyan-200">{selected.productTitle}</p>}
        </div>
        <div className="mb-5 min-h-[420px] space-y-3">
          {selectedMessages.map((message) => {
            const isMine = Number(message.expediteur_id) === Number(user?.id);
            return (
            <div className={`max-w-xl rounded-3xl p-4 ${isMine ? 'ml-auto bg-cyan-300/15' : 'bg-white/10'}`} key={message.id}>
              <p className="text-sm text-slate-400">
                {Number(message.expediteur_id) === Number(user?.id) ? 'Vous' : `${message.expediteur_prenom || ''} ${message.expediteur_nom || ''}`.trim()} · {new Date(message.date_envoi).toLocaleString('fr-FR')}
                {message.modifie_le && ' · modifié'}
              </p>
              <p>{message.contenu}</p>
              <div className="mt-3 flex justify-end gap-2">
                {isMine && (
                  <button className="rounded-full border border-line p-2 text-cyan-100 transition hover:bg-cyan-300/15" onClick={() => editMessage(message)} title="Modifier le message">
                    <FiEdit2 />
                  </button>
                )}
                <button className="rounded-full border border-rose-300/30 p-2 text-rose-200 transition hover:bg-rose-400/15" onClick={() => removeMessage(message)} title="Supprimer le message">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          );
          })}
        </div>
        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={submit}>
          <input className="input" placeholder={selected?.recipientName ? `Message à ${selected.recipientName}` : 'Choisissez une personne'} value={content} onChange={(e) => setContent(e.target.value)} required />
          <button className="btn btn-primary"><FiSend /></button>
        </form>
      </section>
    </div>
  );
}
