import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { initializeAppearance } from './appearance.js';

initializeAppearance().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  requestAnimationFrame(() => window.study.appearanceReady());
});
