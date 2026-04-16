import { setupWorker } from 'msw/browser';
import { http, passthrough } from 'msw';
import { handlers } from './handlers';

// Passa direto qualquer requisição ao Vite dev server (localhost:5173)
// Evita "TypeError: Failed to fetch" no passthrough de navegações HTML
const devServerHandlers = [
  http.get('http://localhost:5173/*', () => passthrough()),
  http.get('http://127.0.0.1:5173/*', () => passthrough()),
];

// Passa direto imagens externas (Unsplash, pravatar, etc.)
// Evita erros de rede no console quando MSW intercepta requests de imagem
const externalImageHandlers = [
  http.get('https://images.unsplash.com/*', () => passthrough()),
  http.get('https://i.pravatar.cc/*', () => passthrough()),
];

export const worker = setupWorker(...devServerHandlers, ...externalImageHandlers, ...handlers);
