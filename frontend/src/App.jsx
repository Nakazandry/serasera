import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Messages from './pages/Messages';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import { useAuth } from './context/AuthContext';

const Private = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminPrivate = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="login" element={<Auth mode="login" />} />
        <Route path="register" element={<Auth mode="register" />} />
        <Route path="dashboard" element={<Private><Dashboard /></Private>} />
        <Route path="profile" element={<Private><Profile /></Private>} />
        <Route path="favorites" element={<Private><Favorites /></Private>} />
        <Route path="cart" element={<Private><Cart /></Private>} />
        <Route path="orders" element={<Private><Orders /></Private>} />
        <Route path="messages" element={<Private><Messages /></Private>} />
        <Route path="admin" element={<AdminPrivate><Admin /></AdminPrivate>} />
      </Route>
    </Routes>
  );
}
