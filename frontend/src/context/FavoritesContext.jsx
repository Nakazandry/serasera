import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);

  const refreshFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      return [];
    }

    try {
      const { data } = await api.get('/products/favorites/mine');
      setFavorites(data);
      return data;
    } catch {
      setFavorites([]);
      return [];
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const isFavorite = useCallback(
    (productId) => favorites.some((item) => Number(item.produit_id) === Number(productId)),
    [favorites]
  );

  const toggleFavorite = useCallback(async (product) => {
    if (!product?.id || !isAuthenticated) return false;

    if (isFavorite(product.id)) {
      await api.delete(`/products/favorites/${product.id}`);
      setFavorites((current) => current.filter((item) => Number(item.produit_id) !== Number(product.id)));
      return false;
    }

    const { data } = await api.post('/products/favorites/add', { produit_id: product.id });
    setFavorites((current) => {
      if (current.some((item) => Number(item.produit_id) === Number(product.id))) return current;
      return [{ ...product, ...data, produit_id: product.id }, ...current];
    });
    return true;
  }, [isAuthenticated, isFavorite]);

  const value = useMemo(
    () => ({ favorites, count: favorites.length, refreshFavorites, isFavorite, toggleFavorite }),
    [favorites, refreshFavorites, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => useContext(FavoritesContext);
