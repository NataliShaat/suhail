import { createRoot } from 'react-dom/client';
import './i18n';
import './styles.css';
import './ui.css';
import { App } from './App';
import { applyDeepLink, useStore } from './store';

applyDeepLink();
// ?debug=1 exposes the store for rehearsal and automated checks.
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __store: typeof useStore }).__store = useStore;

createRoot(document.getElementById('root')!).render(
  // No StrictMode: drei Html mounts its own roots and warns on the double mount.
  <App />,
);
