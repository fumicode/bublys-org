'use client';
import React, { FC, useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore, injectSlice, injectMiddleware, addToBlacklist } from '@bublys-org/state-management';
import { PersistGate } from 'redux-persist/integration/react';
import { Persistor } from 'redux-persist/lib/types';
import { initWorldLineGraph } from '@bublys-org/world-line-graph';
import { DomainRegistryProvider, type DomainRegistry } from '@bublys-org/domain-registry';
import {
  bubblesSlice,
  bubblesListener,
  shellBubbleListener,
  shellDeletionListener,
  setInitialBubbleUrls,
} from '../state/index.js';
import type { SnapshotCodec } from '../bubble-routing/SnapshotCodec.js';
import { useBrowserRootArrangementWorldLine } from '../world-line/useBrowserRootArrangementWorldLine.js';

/**
 * BublyStoreProvider のプロパティ
 */
export type BublyStoreProviderProps = {
  /** 永続化キー（localStorage のキー名） */
  persistKey: string;
  /** 初期バブルの URL 配列 */
  initialBubbleUrls: string[];
  /**
   * 世界線（world-line-graph）の slice / middleware を注入する。
   * universe 単位の commit/rehydrate（{@link useUniverseArrangementWorldLine}）と
   * `/<codec.encode(node)>` 駆動の URL バインドを使う場合は true にする。
   */
  enableWorldLine?: boolean;
  /**
   * DomainRegistry。指定すると {@link DomainRegistryProvider} で内側を包む。
   * `BUBBLE_ARRANGEMENT_DOMAIN` を渡せば、世界線 hook が BubbleArrangement を
   * CAS shell として扱えるようになる。
   */
  domainRegistry?: DomainRegistry;
  /**
   * 指定すると root universe の apex をブラウザ URL に同期する
   * （{@link useBrowserRootArrangementWorldLine}）。`makeSnapshotCodec("universe")`
   * を渡すのが標準。`enableWorldLine` も true である必要がある。
   *
   * Plugin としてロードされて OS の URL に乗ってる場合は undefined にする
   * （OS 側のバインドが既に動いてるので競合させない）。
   */
  urlBinding?: SnapshotCodec;
  /** 子コンポーネント */
  children: React.ReactNode;
};

// アプリケーション初期化フラグ（process 単位）
let appInitialized = false;
let worldLineInitialized = false;

function initializeApp(enableWorldLine: boolean) {
  if (!appInitialized) {
    appInitialized = true;
    injectSlice(bubblesSlice);
    injectMiddleware(bubblesListener.middleware);
    injectMiddleware(shellBubbleListener.middleware);
    injectMiddleware(shellDeletionListener.middleware);
    addToBlacklist(bubblesSlice.reducerPath);
  }
  if (enableWorldLine && !worldLineInitialized) {
    worldLineInitialized = true;
    initWorldLineGraph();
  }
}

/**
 * URL binding を有効化するときの内側コンポーネント。
 * DomainRegistryProvider の中で 1 回だけ呼ぶ必要があるため Provider 内に置く。
 */
const UrlBindingHost: FC<{ codec: SnapshotCodec; children: React.ReactNode }> = ({
  codec,
  children,
}) => {
  useBrowserRootArrangementWorldLine(codec);
  return <>{children}</>;
};

/**
 * Bubly スタンドアロンアプリ用の Redux Store Provider。
 *
 * 単に Redux を立てるだけでも使えるが、`enableWorldLine` / `domainRegistry` /
 * `urlBinding` を指定すると `bublys-os` と同等の「URL 駆動の view 遷移」一式を
 * セットアップする。
 */
export function BublyStoreProvider({
  persistKey,
  initialBubbleUrls,
  enableWorldLine = false,
  domainRegistry,
  urlBinding,
  children,
}: BublyStoreProviderProps) {
  const storePersistorRef = useRef<{ store: AppStore; persistor: Persistor }>(null);

  // 初期バブル URL を設定
  useEffect(() => {
    setInitialBubbleUrls(initialBubbleUrls);
  }, [initialBubbleUrls]);

  if (!storePersistorRef.current) {
    // 初期バブル URL を同期的に設定（store 作成前に必要）
    setInitialBubbleUrls(initialBubbleUrls);
    initializeApp(enableWorldLine);
    storePersistorRef.current = makeStore({ persistKey });
  }

  const { store, persistor } = storePersistorRef.current;

  // 内側を組み立てる: PersistGate > [DomainRegistryProvider] > [UrlBindingHost] > children
  let inner: React.ReactNode = children;
  if (urlBinding) {
    inner = <UrlBindingHost codec={urlBinding}>{inner}</UrlBindingHost>;
  }
  if (domainRegistry) {
    inner = <DomainRegistryProvider registry={domainRegistry}>{inner}</DomainRegistryProvider>;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {inner}
      </PersistGate>
    </Provider>
  );
}
