import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const root = createRoot(document.getElementById('root')!);

if (window.location.pathname.startsWith('/forms/')) {
  import('./components/forms/FormPage').then(({ FormPage }) => {
    root.render(
      <StrictMode>
        <FormPage />
      </StrictMode>,
    );
  });
} else {
  import('./App').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
