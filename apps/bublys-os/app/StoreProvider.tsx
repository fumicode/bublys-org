'use client'
import React, { useRef } from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import * as ReactRedux from 'react-redux'
import * as Redux from '@reduxjs/toolkit'
import styled from 'styled-components'
import { makeStore, AppStore, injectSlice, injectMiddleware, addToBlacklist } from "@bublys-org/state-management";
import * as StateManagement from "@bublys-org/state-management";
import { PersistGate } from 'redux-persist/integration/react'
import { Persistor } from 'redux-persist/lib/types';
import {
  bubblesSlice,
  bubblesListener,
  shellBubbleListener,
  shellDeletionListener,
} from "@bublys-org/bubbles-ui";
import * as BubblesUI from "@bublys-org/bubbles-ui";
import * as MuiMaterial from "@mui/material";
import * as MuiIcons from "@mui/icons-material";
import { registerAppObjectTypes } from "./object-type-registration";
import { initWorldLineGraph } from '@bublys-org/world-line-graph';
import * as WorldLineGraph from '@bublys-org/world-line-graph';
import * as DomainRegistry from '@bublys-org/domain-registry';

// プラグイン用共有ライブラリをセットアップ
function setupSharedLibraries() {
  if (typeof window === 'undefined') return;

  // グローバルReact（IIFE直接参照用）
  (window as { React?: typeof React }).React = React;
  (window as { ReactDOM?: typeof ReactDOM }).ReactDOM = ReactDOM;
  (window as { styled?: typeof styled }).styled = styled;

  // 共有ライブラリオブジェクト（window.__BUBLYS_SHARED__経由）
  window.__BUBLYS_SHARED__ = {
    React,
    ReactDOM,
    Redux,
    ReactRedux,
    styled: styled as unknown as typeof import("styled-components"),
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

  // オブジェクト型を登録
  registerAppObjectTypes();

  // world-line-graph のsliceとmiddlewareを注入
  initWorldLineGraph();

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