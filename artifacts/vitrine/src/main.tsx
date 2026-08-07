import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => {
      // Check for a new worker whenever the installed app is opened.
      registration.update().catch(() => {});
    }).catch(() => {
      // SW registration failed silently — app still works
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
