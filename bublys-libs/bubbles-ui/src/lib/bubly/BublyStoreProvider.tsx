'use client';
import React, { useRef, useEffect } from 'react';
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
} from '../state/index.js';

/**
 * BublyStoreProvider のプロパティ
 */
export type BublyStoreProviderProps = {
  /** 永続化キー（localStorageのキー名） */
  persistKey: string;
  /** 初期バブルのURL配列 */
  initialBubbleUrls: string[];
  /** 子コンポーネント */
  children: React.ReactNode;
};

// アプリケーション初期化フラグ
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

/**
 * Bubly スタンドアロンアプリ用の Redux Store Provider
 */
export function BublyStoreProvider({
  persistKey,
  initialBubbleUrls,
  children
}: BublyStoreProviderProps) {
  const storePersistorRef = useRef<{ store: AppStore; persistor: Persistor }>(null);

  // 初期バブルURLを設定
  useEffect(() => {
    setInitialBubbleUrls(initialBubbleUrls);
  }, [initialBubbleUrls]);

  if (!storePersistorRef.current) {
    // 初期バブルURLを同期的に設定（store作成前に必要）
    setInitialBubbleUrls(initialBubbleUrls);
    initializeApp();
    storePersistorRef.current = makeStore({ persistKey });
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
