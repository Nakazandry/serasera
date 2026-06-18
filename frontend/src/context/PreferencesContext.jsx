import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PreferencesContext = createContext(null);

export const PreferencesProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('sera_theme') || 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem('sera_language') || 'fr');

  useEffect(() => {
    localStorage.setItem('sera_theme', theme);
    document.body.classList.toggle('theme-light', theme === 'light');
    document.body.classList.toggle('theme-dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sera_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({ theme, setTheme, language, setLanguage }), [language, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => useContext(PreferencesContext);
