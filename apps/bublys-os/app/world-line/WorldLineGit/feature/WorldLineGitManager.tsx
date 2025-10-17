'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { WorldLineGitContext, WorldLineGitContextType } from '../domain/WorldLineGitContext';
import {
  initialize,
  updateState,
  selectWorldLineGit,
  useAppDispatch,
  useAppSelector,
  type WorldLineGitState,
  selectApexWorld,
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
  const apexWorldState = useAppSelector(selectApexWorld);
  
  // ドメインオブジェクトに変換
  const worldLineGit = worldLineGitState ? WorldLineGit.fromJson(worldLineGitState) : null;
  const apexWorld = apexWorldState ? World.fromJson(apexWorldState) : null;

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

  const apexWorldId = worldLineGit?.apexWorldId || null;

  // 汎用的な状態更新ヘルパー
  const updateWorldLineGit = useCallback((newWorldLineGit: WorldLineGit, operation: string) => {
    const serializedState = newWorldLineGit.toJson() as WorldLineGitState;
    dispatch(updateState({ newWorldLineGit: serializedState, operation }));
  }, [dispatch]);

  // カウンターを更新して新しい世界を作成（grow: commit相当）
  const growHandler = useCallback((newCounter: Counter) => {
    if (!apexWorld || !worldLineGit) return;
    // 現在の世界に子要素が存在するかチェック
    const worldTree = worldLineGit.getWorldTree();
    const hasChildren = worldTree[apexWorld.worldId]?.length > 0;
    
    let newWorld: World;
    
    if (hasChildren) {
      // 子要素が存在する場合：新しい世界線IDを生成してカウンターを更新
      const newWorldLineId = crypto.randomUUID();
      newWorld = apexWorld
        .updateCurrentWorldLineId(newWorldLineId)
        .updateCounter(newCounter);
    } else {
      // 子要素が存在しない場合：現在の世界線でカウンターを更新
      newWorld = apexWorld.updateCounter(newCounter);
    }
    
    // 新しい世界を追加してWorldLineGitを更新
    const newWorldLineGit = worldLineGit.grow(newWorld);
    updateWorldLineGit(newWorldLineGit, 'grow');
  }, [apexWorld, worldLineGit, updateWorldLineGit]);

  // 指定された世界にAPEXを移動（setApex: checkout相当）
  const setApexHandler = useCallback((worldId: string) => {
    if (!worldLineGit) return;
    
    try {
      const newWorldLineGit = worldLineGit.setApex(worldId);
      updateWorldLineGit(newWorldLineGit, 'setApex');
    } catch (error) {
      console.error('SetApex failed:', error);
    }
  }, [worldLineGit, updateWorldLineGit]);


  // 現在の世界線で子要素に移動（regrow: redo相当 - Ctrl+Shift+Z）
  const regrowHandler = useCallback(() => {
    if (!apexWorld || !worldLineGit) return;
    
    const worldTree = worldLineGit.getWorldTree();
    const children = worldTree[apexWorld.worldId];
    
    if (!children || children.length === 0) return;
    
    const apexWorldLineId = apexWorld.apexWorldLineId;
    const sameWorldLineChild = children.find((childId: string) => {
      const childWorld = worldLineGit.getWorld(childId);
      return childWorld?.apexWorldLineId === apexWorldLineId;
    });
    
    if (sameWorldLineChild) {
      const newWorldLineGit = worldLineGit.setApexForRegrow(sameWorldLineChild);
      updateWorldLineGit(newWorldLineGit, 'regrow');
    }
  }, [apexWorld, worldLineGit, updateWorldLineGit]);

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
        regrowHandler();
      } 
      // Ctrl+Z の検出（zは小文字）
      else if (event.ctrlKey && !event.shiftKey && event.key === 'z') {
        event.preventDefault();
        showAllWorldLinesHandler();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [regrowHandler, showAllWorldLinesHandler]);

  const contextValue: WorldLineGitContextType = {
    apexWorld,
    apexWorldId,
    grow: growHandler,
    setApex: setApexHandler,
    regrow: regrowHandler,
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
