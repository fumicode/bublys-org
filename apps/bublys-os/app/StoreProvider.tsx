'use client'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import * as ReactRedux from 'react-redux'
import * as Redux from '@reduxjs/toolkit'
import styled from 'styled-components'
import * as StyledComponents from 'styled-components'
import { makeStore, AppStore, injectSlice, injectMiddleware, addToBlacklist } from "@bublys-org/state-management";
import * as StateManagement from "@bublys-org/state-management";
import { PersistGate } from 'redux-persist/integration/react'
import { Persistor } from 'redux-persist/lib/types';
import {
  restoreSavedBublies,
  bubblesSlice,
  bubblesListener,
  shellBubbleListener,
  shellDeletionListener,
  bubbleSelectorCacheListener,
} from "@bublys-org/bubbles-ui";
import * as BubblesUI from "@bublys-org/bubbles-ui";
import * as MuiMaterial from "@mui/material";
import * as MuiIcons from "@mui/icons-material";
import { BootScreen } from './BootScreen';
import { EditionPrompt } from './edition/EditionPrompt';
import { EditionSnapshot, prepareEditionOnBoot, useEditionCheck } from './edition/useEditionCheck';
import { initWorldLineGraph, IntentBoundary } from '@bublys-org/world-line-graph';
import * as WorldLineGraph from '@bublys-org/world-line-graph';
import * as DomainRegistry from '@bublys-org/domain-registry';

/**
 * バブリ（IIFE バンドル）に渡す styled-components。
 *
 * バブリ側は `styled-components` モジュール全体を単一のグローバル `styled` として
 * 参照するため、default export（styled 関数）だけを渡すと
 * `keyframes` / `css` などの名前付きエクスポートが取れずロード時に落ちる。
 * default に名前空間をマージして「関数でもあり名前空間でもある」形で共有する。
 */
const StyledShared = Object.assign(styled, StyledComponents) as typeof styled &
  typeof StyledComponents;

// プラグイン用共有ライブラリをセットアップ
function setupSharedLibraries() {
  if (typeof window === 'undefined') return;

  // グローバルReact（IIFE直接参照用）
  (window as { React?: typeof React }).React = React;
  (window as { ReactDOM?: typeof ReactDOM }).ReactDOM = ReactDOM;
  (window as { styled?: typeof StyledShared }).styled = StyledShared;

  // 共有ライブラリオブジェクト（window.__BUBLYS_SHARED__経由）
  window.__BUBLYS_SHARED__ = {
    React,
    ReactDOM,
    Redux,
    ReactRedux,
    styled: StyledShared,
    StateManagement,
    BubblesUI,
    MuiMaterial,
    MuiIcons,
    WorldLineGraph,
    DomainRegistry,
  };

  console.log('[StoreProvider] Shared libraries initialized');
}

// アプリケーション初期化（Store作成前に実行）
let appInitialized = false;
function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;

  // プラグイン用共有ライブラリをセットアップ
  setupSharedLibraries();

  /**
   * ★ **オブジェクト型と形は、各バブリが自分で名乗る**（`*-libs/src/object-type-registration.ts`）。
   *   ここに全バブリぶんを手書きで並べていたころは、モデルに項目を足しても申告だけが
   *   古いまま残った（実測：タスクの担当者が変換エディタから繋げなかった）。
   *   バブリの lib を import した時点で登録が走るので、OS からの呼び出しは要らない。
   */

  // world-line-graph のsliceとmiddlewareを注入
  initWorldLineGraph();

  // bubbles-uiのsliceとmiddlewareを注入
  injectSlice(bubblesSlice);
  injectMiddleware(bubblesListener.middleware);
  injectMiddleware(shellBubbleListener.middleware);
  injectMiddleware(shellDeletionListener.middleware);
  injectMiddleware(bubbleSelectorCacheListener.middleware);
  addToBlacklist(bubblesSlice.reducerPath);
}

export default function StoreProvider({
  children
}: {
  children: React.ReactNode
}) {
  /**
   * **store は 1 回だけ作る。**
   *
   * ★ 覚え書き（`useRef`）で作って描くたびに読んでいたが、それは**描いている最中に
   *   覚え書きを読む**ことなので React の決まりに反する（`react-hooks/refs`）。
   *   1 回だけ作るための口は `useState` の初期化式のほうで、こちらは描画から切れている。
   * ★ モジュールの変数にはしない ── この部品はサーバでも描かれるので、
   *   置いたら**別の人の store が混ざる**。1 つの画面につき 1 つ。
   * ★ 開発中の二度がけ（StrictMode）では初期化式が 2 回走り、store も 2 つ出来るが、
   *   使われるのは 1 つで、捨てられたほうへは誰も書かない。`initializeApp` は
   *   自分で 1 回に絞っている。
   */
  const [{ store, persistor, editionSnapshot }] = useState<{
    store: AppStore;
    persistor: Persistor;
    editionSnapshot: EditionSnapshot | null;
  }>(() => {
    // 保存係が動き出す前に、版を確かめる支度をする（`edition/useEditionCheck.ts`）
    const editionSnapshot = prepareEditionOnBoot();
    initializeApp();
    return { ...makeStore(), editionSnapshot };
  });

  // 前回ロードしたバブリを復元してから中身を描く。
  // 逆順だと、永続化されたバブルがルート未登録のまま描かれて
  // `Unknown bubble type` になってしまう。
  const [bubliesRestored, setBubliesRestored] = useState(false);
  useEffect(() => {
    let cancelled = false;
    restoreSavedBublies()
      .catch((error) => {
        console.error('[StoreProvider] Failed to restore bublies:', error);
      })
      .finally(() => {
        if (!cancelled) setBubliesRestored(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * ★ **待っているあいだは「最初の画面」を出す。**
   *   前はどちらも `null` だったので、サーバが配る HTML に文字が 1 つも無く、
   *   JS が走り終わるまで**完全な白画面**だった（`BootScreen` の註）。
   *   出す所は 2 つ ── 保存の読み戻し（`PersistGate`）と、バブリの復元。
   */
  // 前の版で使っていた端末には、初期状態で見直すか訊く（`edition/edition.ts`）
  const edition = useEditionCheck(persistor, editionSnapshot);

  return (
    <Provider store={store}>
      {/* ユーザー入力の瞬間に「1 意図」を開く。世界線のノードはこの単位で 1 つになる */}
      <IntentBoundary />
      <PersistGate loading={<BootScreen />} persistor={persistor}>
        {bubliesRestored && edition.ready ? children : <BootScreen />}
        <EditionPrompt
          open={edition.asking}
          busy={edition.busy}
          onReset={edition.reset}
          onKeep={edition.keep}
        />
      </PersistGate>
    </Provider>
  );
}