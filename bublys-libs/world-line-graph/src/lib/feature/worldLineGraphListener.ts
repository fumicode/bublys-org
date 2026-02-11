import { createListenerMiddleware } from '@reduxjs/toolkit';
import { setGraph, setLoadedStates } from './worldLineGraphSlice';
import { saveStatesToIDB, saveGraphToIDB } from './IndexedDBStore';
import type { RootState } from '@bublys-org/state-management';

export const worldLineGraphListenerMiddleware = createListenerMiddleware();

// setGraph: グラフDAGをIndexedDBに保存
worldLineGraphListenerMiddleware.startListening({
  actionCreator: setGraph,
  effect: async (action, listenerApi) => {
    const { scopeId } = action.payload;
    const state = listenerApi.getState() as RootState;
    const graphJson = state.worldLineGraph?.graphs[scopeId]?.graph;
    if (!graphJson) return;

    await saveGraphToIDB(scopeId, graphJson);
  },
});

// setLoadedStates: 状態データをIndexedDBに保存
worldLineGraphListenerMiddleware.startListening({
  actionCreator: setLoadedStates,
  effect: async (action) => {
    const { entries } = action.payload;
    if (entries.length > 0) {
      await saveStatesToIDB(entries);
    }
  },
});
