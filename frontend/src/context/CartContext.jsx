import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return [];
    }

    try {
      const { data } = await api.get('/cart');
      setItems(data);
      return data;
    } catch {
      setItems([]);
      return [];
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(async (product, quantite = 1) => {
    if (!product?.id || !isAuthenticated) return null;

    const { data } = await api.post('/cart', { produit_id: product.id, quantite });
    await refreshCart();
    return data;
  }, [isAuthenticated, refreshCart]);

  const removeFromCart = useCallback(async (itemId) => {
    await api.delete(`/cart/${itemId}`);
    await refreshCart();
  }, [refreshCart]);

  const checkout = useCallback(async (payload = {}) => {
    const { data } = await api.post('/cart/checkout', payload);
    await refreshCart();
    return data;
  }, [refreshCart]);

  const count = items.reduce((sum, item) => sum + Number(item.quantite || 0), 0);

  const value = useMemo(
    () => ({ items, count, refreshCart, addToCart, removeFromCart, checkout }),
    [items, count, refreshCart, addToCart, removeFromCart, checkout]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
