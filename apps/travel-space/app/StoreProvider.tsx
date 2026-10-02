'use client';
/**
 * この空間の store。
 *
 * ★ **OS のものより軽い。** OS は外からバブリを読み込む（プラグイン）ので、
 *   共有ライブラリを `window` に出して、前回読み込んだバブリを復元してから描く。
 *   この空間は**載せるバブリが決まっている**（3 つとも import 済み）ので、
 *   どちらも要らない ── 要らないものを写すと、何が本当に要るのか判らなくなる。
 * ★ `persistKey` は OS と別（`persist:travel-space`）。同じ名前にすると、
 *   同じブラウザで OS を開いたときに保存が混ざる。
 */
import { useState } from 'react';
import { Provider } from 'react-redux';
import {
  makeStore,
  injectSlice,
  injectMiddleware,
  addToBlacklist,
  type AppStore,
} from '@bublys-org/state-management';
import { PersistGate } from 'redux-persist/integration/react';
import type { Persistor } from 'redux-persist/lib/types';
import {
  bubblesSlice,
  bubblesListener,
  shellBubbleListener,
  shellDeletionListener,
  bubbleSelectorCacheListener,
} from '@bublys-org/bubbles-ui';
import { initWorldLineGraph, IntentBoundary } from '@bublys-org/world-line-graph';
import { BootScreen } from './BootScreen';

/**
 * ★ **バブリの lib を import した時点で、型と形と入れ物の登録が走る**
 *   （各 lib の `object-type-registration.ts` と slice の `injectSlice`）。
 *   ここから名指しで登録して回る必要はない。
 */
import '@bublys-org/map-libs';
import '@bublys-org/itinerary-libs';
import '@bublys-org/lodging-libs';

let appInitialized = false;
function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;

  // 世界線の slice と middleware
  initWorldLineGraph();

  // 泡の slice と middleware
  injectSlice(bubblesSlice);
  injectMiddleware(bubblesListener.middleware);
  injectMiddleware(shellBubbleListener.middleware);
  injectMiddleware(shellDeletionListener.middleware);
  injectMiddleware(bubbleSelectorCacheListener.middleware);
  addToBlacklist(bubblesSlice.reducerPath);
}

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  /**
   * **store は 1 回だけ作る。**（OS の `StoreProvider` と同じ理由）
   * モジュールの変数にはしない ── サーバでも描かれるので、置くと別の人の store が混ざる。
   */
  const [{ store, persistor }] = useState<{ store: AppStore; persistor: Persistor }>(() => {
    initializeApp();
    return makeStore();
  });

  return (
    <Provider store={store}>
      {/* ユーザー入力の瞬間に「1 意図」を開く。世界線のノードはこの単位で 1 つになる */}
      <IntentBoundary />
      <PersistGate loading={<BootScreen />} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
