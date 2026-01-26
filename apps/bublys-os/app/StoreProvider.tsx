'use client'
import { useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore, AppStore, injectSlice, injectMiddleware, addToBlacklist } from "@bublys-org/state-management";
import { PersistGate } from 'redux-persist/integration/react'
import { Persistor } from 'redux-persist/lib/types';
import {
  bubblesSlice,
  bubblesListener,
  shellBubbleListener,
  shellDeletionListener,
} from "@bublys-org/bubbles-ui";
import { registerAppObjectTypes } from "./object-type-registration";

// アプリケーション初期化（Store作成前に実行）
let appInitialized = false;
function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;

  // オブジェクト型を登録
  registerAppObjectTypes();

  // bubbles-uiのsliceとmiddlewareを注入
  injectSlice(bubblesSlice);
  injectMiddleware(bubblesListener.middleware);
  injectMiddleware(shellBubbleListener.middleware);
  injectMiddleware(shellDeletionListener.middleware);
  addToBlacklist(bubblesSlice.reducerPath);
}

export default function StoreProvider({
  children
}: {
  children: React.ReactNode
}) {
  const storePersistorRef = useRef<{ store: AppStore; persistor: Persistor }>(null);

  if (!storePersistorRef.current) {
    // アプリケーション初期化してからStore作成
    initializeApp();
    storePersistorRef.current = makeStore();
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