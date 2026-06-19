import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiClipboard, FiGrid, FiHeart, FiLogOut, FiMessageCircle, FiSearch, FiShoppingCart, FiUser } from 'react-icons/fi';
import api from '../services/api';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';

const nav = [
  { to: '/products', label: 'Produits', icon: FiGrid },
  { to: '/favorites', label: 'Favoris', icon: FiHeart },
  { to: '/cart', label: 'Panier', icon: FiShoppingCart },
  { to: '/orders', label: 'Commandes', icon: FiClipboard },
  { to: '/dashboard', label: 'Espace', icon: FiUser },
  { to: '/messages', label: 'Messages', icon: FiMessageCircle },
];

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const { count } = useCart();
  const { count: favoriteCount } = useFavorites();
  const { showToast } = useToast();
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [seenCartCount, setSeenCartCount] = useState(0);
  const [seenFavoriteCount, setSeenFavoriteCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const latestSaleIdRef = useRef(0);
  const latestMessageIdRef = useRef(0);
  const lastToastCountRef = useRef(0);
  const lastMessageToastCountRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setSeenCartCount(0);
      setSeenFavoriteCount(0);
      return;
    }

    setSeenCartCount(Number(localStorage.getItem(`sera_seen_cart_${user.id}`) || 0));
    setSeenFavoriteCount(Number(localStorage.getItem(`sera_seen_favorites_${user.id}`) || 0));
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNewOrderCount(0);
      return undefined;
    }

    const storageKey = `sera_seen_sales_${user.id}`;
    let cancelled = false;

    const checkSales = async () => {
      try {
        const { data } = await api.get('/orders');
        if (cancelled) return;

        const sales = data.filter((order) => order.est_vendeur && order.statut !== 'Annulée');
        const latestSaleId = sales.reduce((max, order) => Math.max(max, Number(order.id)), 0);
        latestSaleIdRef.current = latestSaleId;

        const stored = Number(localStorage.getItem(storageKey) || 0);
        const unread = sales.filter((order) => Number(order.id) > stored).length;
        setNewOrderCount(unread);

        if (unread > 0 && unread !== lastToastCountRef.current) {
          lastToastCountRef.current = unread;
          showToast(unread === 1 ? 'Vous avez reçu une nouvelle commande.' : `Vous avez reçu ${unread} nouvelles commandes.`, 'info');
        }
      } catch {
        if (!cancelled) setNewOrderCount(0);
      }
    };

    checkSales();
    const interval = window.setInterval(checkSales, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, showToast, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNewMessageCount(0);
      return undefined;
    }

    const storageKey = `sera_seen_messages_${user.id}`;
    let cancelled = false;

    const checkMessages = async () => {
      try {
        const { data } = await api.get('/messages');
        if (cancelled) return;

        const incoming = data.filter((message) => Number(message.destinataire_id) === Number(user.id));
        const latestMessageId = incoming.reduce((max, message) => Math.max(max, Number(message.id)), 0);
        latestMessageIdRef.current = latestMessageId;

        const stored = Number(localStorage.getItem(storageKey) || 0);
        if (!stored) {
          localStorage.setItem(storageKey, String(latestMessageId));
          setNewMessageCount(0);
          return;
        }

        const unread = incoming.filter((message) => Number(message.id) > stored).length;
        setNewMessageCount(unread);

        if (unread > 0 && unread !== lastMessageToastCountRef.current) {
          lastMessageToastCountRef.current = unread;
          showToast(unread === 1 ? 'Nouveau message reçu.' : `${unread} nouveaux messages reçus.`, 'info');
        }
      } catch {
        if (!cancelled) setNewMessageCount(0);
      }
    };

    checkMessages();
    const interval = window.setInterval(checkMessages, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, showToast, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || location.pathname !== '/orders') return;

    localStorage.setItem(`sera_seen_sales_${user.id}`, String(latestSaleIdRef.current));
    setNewOrderCount(0);
    lastToastCountRef.current = 0;
  }, [isAuthenticated, location.pathname, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || location.pathname !== '/messages') return;

    localStorage.setItem(`sera_seen_messages_${user.id}`, String(latestMessageIdRef.current));
    setNewMessageCount(0);
    lastMessageToastCountRef.current = 0;
  }, [isAuthenticated, location.pathname, user?.id]);

  const signOut = () => {
    logout();
    navigate('/');
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
  };

  const markOrdersSeen = () => {
    if (!isAuthenticated || !user?.id) return;

    localStorage.setItem(`sera_seen_sales_${user.id}`, String(latestSaleIdRef.current));
    setNewOrderCount(0);
    lastToastCountRef.current = 0;
  };

  const markMessagesSeen = () => {
    if (!isAuthenticated || !user?.id) return;

    localStorage.setItem(`sera_seen_messages_${user.id}`, String(latestMessageIdRef.current));
    setNewMessageCount(0);
    lastMessageToastCountRef.current = 0;
  };

  const markCartSeen = () => {
    if (!isAuthenticated || !user?.id) return;

    localStorage.setItem(`sera_seen_cart_${user.id}`, String(count));
    setSeenCartCount(count);
  };

  const markFavoritesSeen = () => {
    if (!isAuthenticated || !user?.id) return;

    localStorage.setItem(`sera_seen_favorites_${user.id}`, String(favoriteCount));
    setSeenFavoriteCount(favoriteCount);
  };

  const getBadgeValue = (item) => {
    if (item.to === '/cart') return Math.max(count - seenCartCount, 0);
    if (item.to === '/favorites') return Math.max(favoriteCount - seenFavoriteCount, 0);
    if (item.to === '/orders') return newOrderCount;
    if (item.to === '/messages') return newMessageCount;
    return 0;
  };

  const getNavClick = (item) => {
    if (item.to === '/cart') return markCartSeen;
    if (item.to === '/favorites') return markFavoritesSeen;
    if (item.to === '/orders') return markOrdersSeen;
    if (item.to === '/messages') return markMessagesSeen;
    return undefined;
  };

  const mobileNav = isAuthenticated
    ? [...nav, { to: '/profile', label: 'Profil', icon: FiUser }]
    : nav;

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
          <Link to="/" className="mr-auto flex min-w-0 items-center gap-3 font-black tracking-wide">
            <Logo showText markClassName="h-9 w-9 sm:h-10 sm:w-10" />
          </Link>
          <form className="hidden flex-1 items-center rounded-full border border-line bg-white/10 px-4 py-2 md:flex" onSubmit={submitSearch}>
            <FiSearch className="text-cyan-200" />
            <input className="w-full bg-transparent px-3 text-sm outline-none placeholder:text-slate-400" placeholder="Rechercher produits, catégories, vendeurs" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </form>
          <nav className="ml-auto hidden items-center gap-2 lg:flex">
            {nav.map((item) => {
              const Icon = item.icon;
              const badgeValue = getBadgeValue(item);
              return (
                <NavLink key={item.to} to={item.to} onClick={getNavClick(item)} className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}>
                  <span className="relative inline-flex">
                    <Icon />
                    {badgeValue > 0 && (
                      <span className="absolute -right-3 -top-3 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-400 px-1 text-[10px] font-black text-white">
                        {badgeValue}
                      </span>
                    )}
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
            {user?.role === 'admin' && <NavLink to="/admin" className="btn btn-ghost">Admin</NavLink>}
          </nav>
          {isAuthenticated && (
            <Link to="/profile" className="hidden max-w-[180px] items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-2 text-sm text-slate-100 md:flex">
              {user?.avatar_url ? (
                <img className="h-8 w-8 shrink-0 rounded-full object-cover" src={user.avatar_url} alt={user?.prenom || 'Profil'} />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-300 font-black text-slate-950">
                  {(user?.prenom?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </span>
              )}
              <span className="truncate">{user?.prenom || user?.nom || user?.email}</span>
            </Link>
          )}
          {isAuthenticated ? (
            <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white/5 text-slate-100 transition hover:bg-white/10 sm:h-auto sm:w-auto sm:px-4 sm:py-2" onClick={signOut} title="Déconnexion" aria-label="Déconnexion"><FiLogOut /></button>
          ) : (
            <Link className="btn btn-primary shrink-0 px-3 sm:px-4" to="/login">Connexion</Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
      <nav className={`fixed bottom-3 left-3 right-3 z-40 grid ${mobileNav.length === 7 ? 'grid-cols-7' : 'grid-cols-6'} gap-1 rounded-3xl border border-line bg-ink/90 p-2 backdrop-blur-xl sm:bottom-4 sm:left-4 sm:right-4 sm:gap-2 lg:hidden`}>
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const badgeValue = getBadgeValue(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={getNavClick(item)}
              className={({ isActive }) => `grid h-12 min-w-0 place-items-center rounded-2xl text-lg transition sm:h-14 ${isActive ? 'bg-cyan-300 text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}
              title={item.label}
              aria-label={item.label}
            >
              <span className="relative">
                <Icon />
                {badgeValue > 0 && (
                  <span className="absolute -right-3 -top-3 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-400 px-1 text-[10px] font-black text-white">
                    {badgeValue}
                  </span>
                )}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
