'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import {
  useAppDispatch,
  useAppSelector,
} from '@bublys-org/state-management';
import { WorldLineGraph } from '../domain/WorldLineGraph';
import type { StateRef } from '../domain/StateRef';
import {
  setGraph,
  setLoadedStates,
  selectWorldLineGraph,
  selectLoadedStates,
} from './worldLineGraphSlice';

// ============================================================================
// Context
// ============================================================================

interface WorldLineGraphContextValue {
  scopeId: string;
  graph: WorldLineGraph;
  grow(
    changedRefs: StateRef[],
    stateEntries: { hash: string; data: unknown }[]
  ): void;
  moveBack(): void;
  moveForward(): void;
  moveTo(nodeId: string): void;
  getLoadedState<T>(hash: string): T | undefined;
  getCurrentStates(): Record<string, unknown>;
}

const WorldLineGraphContext =
  createContext<WorldLineGraphContextValue | null>(null);

// ============================================================================
// Provider — ドメインロジックのオーケストレーション
// ============================================================================

interface WorldLineGraphProviderProps {
  scopeId: string;
  children: React.ReactNode;
}

export function WorldLineGraphProvider({
  scopeId,
  children,
}: WorldLineGraphProviderProps) {
  const dispatch = useAppDispatch();
  const graph = useAppSelector((state) => selectWorldLineGraph(state, scopeId));
  const loadedStates = useAppSelector((state) =>
    selectLoadedStates(state, scopeId)
  );

  const grow = useCallback(
    (
      changedRefs: StateRef[],
      stateEntries: { hash: string; data: unknown }[]
    ) => {
      const updated = graph.grow(changedRefs);
      dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
      if (stateEntries.length > 0) {
        dispatch(setLoadedStates({ scopeId, entries: stateEntries }));
      }
    },
    [dispatch, scopeId, graph]
  );

  const moveBack = useCallback(() => {
    const updated = graph.moveBack();
    dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
  }, [dispatch, scopeId, graph]);

  const moveForward = useCallback(() => {
    const updated = graph.moveForward();
    dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
  }, [dispatch, scopeId, graph]);

  const moveTo = useCallback(
    (nodeId: string) => {
      const updated = graph.moveTo(nodeId);
      dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
    },
    [dispatch, scopeId, graph]
  );

  const getLoadedState = useCallback(
    <T,>(hash: string): T | undefined => {
      return loadedStates[hash] as T | undefined;
    },
    [loadedStates]
  );

  const getCurrentStates = useCallback((): Record<string, unknown> => {
    const refs = graph.getCurrentStateRefs();
    const result: Record<string, unknown> = {};
    for (const ref of refs) {
      const key = `${ref.type}:${ref.id}`;
      if (loadedStates[ref.hash] !== undefined) {
        result[key] = loadedStates[ref.hash];
      }
    }
    return result;
  }, [graph, loadedStates]);

  const value = useMemo<WorldLineGraphContextValue>(
    () => ({
      scopeId,
      graph,
      grow,
      moveBack,
      moveForward,
      moveTo,
      getLoadedState,
      getCurrentStates,
    }),
    [scopeId, graph, grow, moveBack, moveForward, moveTo, getLoadedState, getCurrentStates]
  );

  return (
    <WorldLineGraphContext.Provider value={value}>
      {children}
    </WorldLineGraphContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useWorldLineGraph(): WorldLineGraphContextValue {
  const context = useContext(WorldLineGraphContext);
  if (!context) {
    throw new Error(
      'useWorldLineGraph must be used within a WorldLineGraphProvider'
    );
  }
  return context;
}
