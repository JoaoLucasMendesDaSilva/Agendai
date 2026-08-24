import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // O PWA continua funcionando como site comum se o registro falhar.
    });
  });
} else if ('serviceWorker' in navigator) {
  // O cache-first esconde atualizacoes do Vite porque as URLs dos modulos nao mudam.
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => registration?.unregister())
    .catch(() => {});
}
