import { Buffer } from 'buffer';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Wallet/connect SDKs sometimes expect Node-style globals in the browser.
if (!(globalThis as { global?: typeof globalThis }).global) {
  (globalThis as { global?: typeof globalThis }).global = globalThis;
}
if (!(globalThis as { Buffer?: typeof Buffer }).Buffer) {
  (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
