'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { WorldLineGitContext, WorldLineGitContextType } from '../domain/WorldLineGitContext';
import {
  initialize,
  updateState,
  selectWorldLineGit,
  selectHeadWorld,
  useAppDispatch,
  useAppSelector,
  type WorldLineGitState,
} from '@bublys-org/state-management';
import { Counter } from '../domain/Counter';
import { World } from '../domain/World';
import { WorldLineGit } from '../domain/WorldLineGit';

interface WorldLineGitManagerProps {
  children: React.ReactNode;
}

export function WorldLineGitManager({ children }: WorldLineGitManagerProps) {
  const dispatch = useAppDispatch();
  
  // Reduxから状態を取得
  const worldLineGitState = useAppSelector(selectWorldLineGit);
  const currentWorldState = useAppSelector(selectHeadWorld);
  
  // ドメインオブジェクトに変換
  const worldLineGit = worldLineGitState ? WorldLineGit.fromJson(worldLineGitState) : null;
  const currentWorld = currentWorldState ? World.fromJson(currentWorldState) : null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // 初期化ハンドラー
  const initializeHandler = useCallback(async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    
    try {
      // 初期状態でルート世界を作成
      const rootWorld = new World(
        crypto.randomUUID(),
        null,
        new Counter(100),
        crypto.randomUUID()
      );
      const initialWorldLineGit = new WorldLineGit(
        new Map([[rootWorld.worldId, rootWorld]]),
        rootWorld.worldId,
        rootWorld.worldId
      );
      
      // シリアライズ可能な形式に変換してReduxに送信
      const serializedState = initialWorldLineGit.toJson() as WorldLineGitState;
      dispatch(initialize(serializedState));
    } catch (error) {
      console.error('Initialization failed:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, dispatch]);

  const currentWorldId = worldLineGit?.headWorldId || null;

  // 汎用的な状態更新ヘルパー
  const updateWorldLineGit = useCallback((newWorldLineGit: WorldLineGit, operation: string) => {
    const serializedState = newWorldLineGit.toJson() as WorldLineGitState;
    dispatch(updateState({ newWorldLineGit: serializedState, operation }));
  }, [dispatch]);

  // カウンターを更新して新しい世界を作成
  const updateCounterHandler = useCallback((newCounter: Counter) => {
    if (!currentWorld || !worldLineGit) return;
    // 現在の世界に子要素が存在するかチェック
    const worldTree = worldLineGit.getWorldTree();
    const hasChildren = worldTree[currentWorld.worldId]?.length > 0;
    
    let newWorld: World;
    
    if (hasChildren) {
      // 子要素が存在する場合：新しい世界線IDを生成してカウンターを更新
      const newWorldLineId = crypto.randomUUID();
      newWorld = currentWorld
        .updateCurrentWorldLineId(newWorldLineId)
        .updateCounter(newCounter);
    } else {
      // 子要素が存在しない場合：現在の世界線でカウンターを更新
      newWorld = currentWorld.updateCounter(newCounter);
    }
    
    // 新しい世界を追加してWorldLineGitを更新
    const newWorldLineGit = worldLineGit.addWorld(newWorld);
    updateWorldLineGit(newWorldLineGit, 'updateCounter');
  }, [currentWorld, worldLineGit, updateWorldLineGit]);

  // 指定された世界にチェックアウト
  const checkoutHandler = useCallback((worldId: string) => {
    if (!worldLineGit) return;
    
    try {
      const newWorldLineGit = worldLineGit.checkout(worldId);
      updateWorldLineGit(newWorldLineGit, 'checkout');
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  }, [worldLineGit, updateWorldLineGit]);


  // 現在の世界線で子要素に移動（Ctrl+Shift+Z）
  const undoHandler = useCallback(() => {
    if (!currentWorld || !worldLineGit) return;
    
    const worldTree = worldLineGit.getWorldTree();
    const children = worldTree[currentWorld.worldId];
    
    if (!children || children.length === 0) return;
    
    const currentWorldLineId = currentWorld.currentWorldLineId;
    const sameWorldLineChild = children.find((childId: string) => {
      const childWorld = worldLineGit.getWorld(childId);
      return childWorld?.currentWorldLineId === currentWorldLineId;
    });
    
    if (sameWorldLineChild) {
      const newWorldLineGit = worldLineGit.checkoutForUndo(sameWorldLineChild);
      updateWorldLineGit(newWorldLineGit, 'undo');
    }
  }, [currentWorld, worldLineGit, updateWorldLineGit]);

  // 全ての世界線を表示（Ctrl+Z）
  const showAllWorldLinesHandler = useCallback(() => {
    if (!worldLineGit) return;
    
    updateWorldLineGit(worldLineGit, 'showAllWorldLines');
    setIsModalOpen(true);
  }, [worldLineGit, updateWorldLineGit]);

  // モーダルを閉じる
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);


  // ヘルパー関数
  const getAllWorlds = useCallback(() => {
    return worldLineGit?.getAllWorlds() || [];
  }, [worldLineGit]);

  const getWorldTree = useCallback(() => {
    return worldLineGit?.getWorldTree() || {};
  }, [worldLineGit]);

  // キーボードショートカットの処理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+Z の検出（Zは大文字）
      // Shiftの影響で大文字のZが検出される
      if (event.ctrlKey && event.shiftKey && event.key === 'Z') {
        event.preventDefault();
        undoHandler();
      } 
      // Ctrl+Z の検出（zは小文字）
      else if (event.ctrlKey && !event.shiftKey && event.key === 'z') {
        event.preventDefault();
        showAllWorldLinesHandler();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [undoHandler, showAllWorldLinesHandler]);

  const contextValue: WorldLineGitContextType = {
    currentWorld,
    currentWorldId,
    updateCounter: updateCounterHandler,
    checkout: checkoutHandler,
    undo: undoHandler,
    showAllWorldLines: showAllWorldLinesHandler,
    getAllWorlds,
    getWorldTree,
    isModalOpen,
    closeModal,
    initialize: initializeHandler,
    isInitializing,
    isInitialized: !!worldLineGitState,
  };

  return (
    <WorldLineGitContext.Provider value={contextValue}>
      {children}
    </WorldLineGitContext.Provider>
  );
}
