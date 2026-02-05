'use client';
import React, { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore, injectSlice, injectMiddleware, addToBlacklist } from '@bublys-org/state-management';
import { PersistGate } from 'redux-persist/integration/react';
import { Persistor } from 'redux-persist/lib/types';
import {
  bubblesSlice,
  bubblesListener,
  shellBubbleListener,
  shellDeletionListener,
  setInitialBubbleUrls,
} from '@bublys-org/bubbles-ui';

// ekikyo-libs（ルート登録のため）
import '@bublys-org/ekikyo-libs';

// ekikyo-app用の初期バブルを設定
setInitialBubbleUrls(['ekikyo/kyuseis/五黄']);

// アプリケーション初期化
let appInitialized = false;
function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;

  // bubbles-uiのsliceとmiddlewareを注入
  injectSlice(bubblesSlice);
  injectMiddleware(bubblesListener.middleware);
  injectMiddleware(shellBubbleListener.middleware);
  injectMiddleware(shellDeletionListener.middleware);
  addToBlacklist(bubblesSlice.reducerPath);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storePersistorRef = useRef<{ store: AppStore; persistor: Persistor }>(null);

  if (!storePersistorRef.current) {
    initializeApp();
    // ekikyo-app専用のpersistKeyを使用してOSとのlocalStorage競合を防ぐ
    storePersistorRef.current = makeStore({ persistKey: 'ekikyo-standalone' });
  }

  const { store, persistor } = storePersistorRef.current;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
