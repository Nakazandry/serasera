import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import { PreferencesProvider } from './context/PreferencesContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { DialogProvider } from './context/DialogContext.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PreferencesProvider>
        <ToastProvider>
          <DialogProvider>
            <AuthProvider>
              <CartProvider>
                <FavoritesProvider>
                  <App />
                </FavoritesProvider>
              </CartProvider>
            </AuthProvider>
          </DialogProvider>
        </ToastProvider>
      </PreferencesProvider>
    </BrowserRouter>
  </React.StrictMode>
);
