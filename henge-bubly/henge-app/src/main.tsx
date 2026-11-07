import 'modern-normalize';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { configureAI } from '@bublys-org/henge-libs';
import App from './app/app';

// 鍵は vite.config.mts が .env.local から埋め込む
declare const __HENGE_OPENAI_API_KEY__: string;
declare const __HENGE_AI_MODEL__: string;
configureAI({ apiKey: __HENGE_OPENAI_API_KEY__, model: __HENGE_AI_MODEL__ });

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
