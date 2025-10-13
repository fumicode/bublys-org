'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { WorldLineGitContext, WorldLineGitContextType } from '../domain/WorldLineGitContext';
import { WorldLineGit } from '../domain/WorldLineGit';
import { World } from '../domain/World';
import { Counter } from '../domain/Counter';

interface WorldLineGitManagerProps {
  children: React.ReactNode;
}

export function WorldLineGitManager({ children }: WorldLineGitManagerProps) {
  const [worldLineGit, setWorldLineGit] = useState<WorldLineGit>(() => {
    // 初期状態でルート世界を作成
    const rootWorld = new World(crypto.randomUUID(), null, new Counter());
    return new WorldLineGit(new Map([[rootWorld.worldId, rootWorld]]), rootWorld.worldId, rootWorld.worldId);
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentWorld = worldLineGit.getHeadWorld();
  const currentWorldId = worldLineGit.headWorldId;

  // カウンターを更新して新しい世界を作成
  const updateCounter = useCallback((newCounter: Counter) => {
    if (!currentWorld) return;
    
    // 現在の世界に子要素があるかチェック
    const worldTree = worldLineGit.getWorldTree();
    const hasChildren = worldTree[currentWorld.worldId] && worldTree[currentWorld.worldId].length > 0;
    
    if (hasChildren) {
      // 子要素がある場合：新しい世界線IDを生成して新しい世界を作成
      const newWorldLineId = crypto.randomUUID();
      const newWorld = new World(
        crypto.randomUUID(),
        currentWorld.worldId,
        newCounter,
        newWorldLineId
      );
      setWorldLineGit(prev => prev.addWorld(newWorld));
    } else {
      // 子要素がない場合：同じ世界線IDを維持して新しい世界を作成
      const newWorld = new World(
        crypto.randomUUID(),
        currentWorld.worldId,
        newCounter,
        currentWorld.currentWorldLineId // 同じ世界線IDを維持
      );
      setWorldLineGit(prev => prev.addWorld(newWorld));
    }
  }, [currentWorld, worldLineGit]);

  // 指定された世界にチェックアウト（単純に移動するだけ）
  const checkout = useCallback((worldId: string) => {
    try {
      setWorldLineGit(prev => prev.checkout(worldId));
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  }, []);

  // 指定された世界から新しいブランチを作成
  const createBranch = useCallback((fromWorldId: string) => {
    try {
      setWorldLineGit(prev => prev.createBranch(fromWorldId));
    } catch (error) {
      console.error('Create branch failed:', error);
    }
  }, []);

  // 現在の世界線で子要素に移動（Ctrl+Shift+Z）
  const undo = useCallback(() => {
    if (!currentWorld) return;
    
    // 現在の世界の子世界を探す
    const worldTree = worldLineGit.getWorldTree();
    const children = worldTree[currentWorld.worldId];
    
    if (!children || children.length === 0) {
      return;
    }
    
    // 目的の世界IDを示す
    let targetChildId: string;
    
    // 複数の子要素がある場合、現在の世界線IDと同じcurrentWorldLineIdを持つ子要素を探す
    const currentWorldLineId = currentWorld.currentWorldLineId;
    
    // 同じ世界線IDを持つ子要素を探す
    let sameWorldLineChild = children.find(childId => {
      const childWorld = worldLineGit.getWorld(childId);
      return childWorld?.currentWorldLineId === currentWorldLineId;
    });
    
    if (sameWorldLineChild) {
      targetChildId = sameWorldLineChild;
    } else {
      // 同じ世界線IDの子要素が見つからない場合は、undoを使えない
      return;
    }
    
    // undoの場合は同じ世界線IDを維持してチェックアウト
    setWorldLineGit(prev => prev.checkoutForUndo(targetChildId));
  }, [currentWorld, worldLineGit]);

  // 全ての世界線を表示（Ctrl+Z）
  const showAllWorldLines = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // モーダルを閉じる
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // ルート世界にリセット
  const resetToRoot = useCallback(() => {
    if (!worldLineGit.rootWorldId) return;
    
    setWorldLineGit(prev => prev.checkout(prev.rootWorldId!));
  }, [worldLineGit.rootWorldId]);

  // ヘルパー関数
  const getAllWorlds = useCallback(() => {
    return worldLineGit.getAllWorlds();
  }, [worldLineGit]);

  const getWorldHistory = useCallback((worldId: string) => {
    return worldLineGit.getWorldHistory(worldId);
  }, [worldLineGit]);

  const getWorldTree = useCallback(() => {
    return worldLineGit.getWorldTree();
  }, [worldLineGit]);

  // キーボードショートカットの処理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+Z の検出（Zは大文字）
      // Shiftの影響で大文字のZが検出される
      if (event.ctrlKey && event.shiftKey && event.key === 'Z') {
        event.preventDefault();
        undo();
      } 
      // Ctrl+Z の検出（zは小文字）
      else if (event.ctrlKey && !event.shiftKey && event.key === 'z') {
        event.preventDefault();
        showAllWorldLines();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [undo, showAllWorldLines]);

  const contextValue: WorldLineGitContextType = {
    worldLineGit,
    currentWorld,
    currentWorldId,
    updateCounter,
    checkout,
    createBranch,
    undo,
    showAllWorldLines,
    resetToRoot,
    getAllWorlds,
    getWorldHistory,
    getWorldTree,
    isModalOpen,
    closeModal,
  };

  return (
    <WorldLineGitContext.Provider value={contextValue}>
      {children}
    </WorldLineGitContext.Provider>
  );
}
