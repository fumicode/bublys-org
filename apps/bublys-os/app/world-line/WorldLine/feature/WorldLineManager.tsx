'use client';
import { useState, useCallback, useEffect } from 'react';
import { WorldLineContext, WorldLineContextType } from '../domain/WorldLineContext';
import { useFocusedObject } from '../domain/FocusedObjectContext';
import {
  initialize,
  updateState,
  selectWorldLine,
  useAppDispatch,
  useAppSelector,
  type WorldLineState,
  selectApexWorld,
} from '@bublys-org/state-management';
import { World } from '../domain/World';
import { WorldLine } from '../domain/WorldLine';

interface WorldLineManagerProps<TWorldState> {
  children: React.ReactNode;
  objectId: string;  // Counter1, Counter2, Timer1などを識別
  serialize: (state: TWorldState) => any;
  deserialize: (data: any) => TWorldState;
  createInitialWorldState: () => TWorldState;
}

export function WorldLineManager<TWorldState>({ 
  children,
  objectId,
  serialize,
  deserialize,
  createInitialWorldState,
}: WorldLineManagerProps<TWorldState>) {
  const dispatch = useAppDispatch();
  const { focusedObjectId } = useFocusedObject();
  
  // Reduxから状態を取得（objectIdを指定）
  const worldLineState = useAppSelector(selectWorldLine(objectId));
  const apexWorldState = useAppSelector(selectApexWorld(objectId));
  
  // ドメインオブジェクトに変換
  const worldLine = worldLineState ? WorldLine.fromJson<TWorldState>(worldLineState, deserialize) : null;
  const apexWorld = apexWorldState ? World.fromJson<TWorldState>(apexWorldState, deserialize) : null;

  const [isInitializing, setIsInitializing] = useState(false);
  const [isShowing3DView, setIsShowing3DView] = useState(false);

  // 初期化ハンドラー
  const initializeHandler = useCallback(async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    
    try {
      // 初期状態でルート世界を作成
      const initialWorldState = createInitialWorldState();
      const rootWorld = new World<TWorldState>(
        crypto.randomUUID(),
        null,
        initialWorldState,
        crypto.randomUUID()
      );
      const initialWorldLine = new WorldLine<TWorldState>(
        new Map([[rootWorld.worldId, rootWorld]]),
        rootWorld.worldId,
        rootWorld.worldId
      );
      
      // シリアライズ可能な形式に変換してReduxに送信
      const serializedState = initialWorldLine.toJson(serialize) as WorldLineState;
      dispatch(initialize({ objectId, worldLine: serializedState }));
    } catch (error) {
      console.error('Initialization failed:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, dispatch, serialize, createInitialWorldState, objectId]);

  const apexWorldId = worldLine?.apexWorldId || null;

  // 汎用的な状態更新ヘルパー
  const updateWorldLine = useCallback((newWorldLine: WorldLine<TWorldState>, operation: string) => {
    const serializedState = newWorldLine.toJson(serialize) as WorldLineState;
    dispatch(updateState({ objectId, newWorldLine: serializedState, operation }));
  }, [dispatch, serialize, objectId]);

  // WorldStateを更新して新しい世界を作成（grow: commit相当）
  const growHandler = useCallback((newWorldState: TWorldState) => {
    if (!apexWorld || !worldLine) return;
    // 現在の世界に子要素が存在するかチェック
    const worldTree = worldLine.getWorldTree();
    const hasChildren = worldTree[apexWorld.worldId]?.length > 0;
    
    let newWorld: World<TWorldState>;
    
    if (hasChildren) {
      const newWorldLineId = crypto.randomUUID();
      newWorld = apexWorld
        .updateCurrentWorldLineId(newWorldLineId)
        .updateWorldState(newWorldState);
    } else {
      newWorld = apexWorld.updateWorldState(newWorldState);
    }
    
    // 新しい世界を追加してWorldLineを更新
    const newWorldLine = worldLine.grow(newWorld);
    updateWorldLine(newWorldLine, 'grow');
  }, [apexWorld, worldLine, updateWorldLine]);

  // 指定された世界にAPEXを移動（setApex: checkout相当）
  const setApexHandler = useCallback((worldId: string) => {
    if (!worldLine) return;
    
    try {
      const newWorldLine = worldLine.setApex(worldId);
      updateWorldLine(newWorldLine, 'setApex');
    } catch (error) {
      console.error('SetApex failed:', error);
    }
  }, [worldLine, updateWorldLine]);


  // 現在の世界線で子要素に移動（regrow: redo相当 - Ctrl+Shift+Z）
  const regrowHandler = useCallback(() => {
    if (!apexWorld || !worldLine) return;
    
    const worldTree = worldLine.getWorldTree();
    const children = worldTree[apexWorld.worldId];
    
    if (!children || children.length === 0) return;
    
    const apexWorldLineId = apexWorld.apexWorldLineId;
    const sameWorldLineChild = children.find((childId: string) => {
      const childWorld = worldLine.getWorld(childId);
      return childWorld?.apexWorldLineId === apexWorldLineId;
    });
    
    if (sameWorldLineChild) {
      const newWorldLine = worldLine.setApexForRegrow(sameWorldLineChild);
      updateWorldLine(newWorldLine, 'regrow');
    }
  }, [apexWorld, worldLine, updateWorldLine]);

  // 全ての世界線を表示（Ctrl+Z）
  const showAllWorldLinesHandler = useCallback(() => {
    if (!worldLine) return;
    setIsShowing3DView(true);
  }, [worldLine, isShowing3DView]);

  // 3Dビューを閉じる
  const closeModal = useCallback(() => {
    setIsShowing3DView(false);
  }, []);

  // ヘルパー関数
  const getAllWorlds = useCallback(() => {
    return worldLine?.getAllWorlds() || [];
  }, [worldLine]);

  const getWorldTree = useCallback(() => {
    return worldLine?.getWorldTree() || {};
  }, [worldLine]);

  // キーボードショートカットの処理（フォーカスしているオブジェクトのみ反応）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // このオブジェクトがフォーカスされていない場合は無視
      if (focusedObjectId !== objectId) return;
      
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
  }, [regrowHandler, showAllWorldLinesHandler, focusedObjectId, objectId]);

  const contextValue: WorldLineContextType<TWorldState> = {
    apexWorld,
    apexWorldId,
    grow: growHandler,
    setApex: setApexHandler,
    regrow: regrowHandler,
    showAllWorldLines: showAllWorldLinesHandler,
    getAllWorlds,
    getWorldTree,
    closeModal,
    initialize: initializeHandler,
    isInitializing,
    isInitialized: !!worldLineState,
    isShowing3DView,
  };

  return (
    <WorldLineContext.Provider value={contextValue}>
      {children}
    </WorldLineContext.Provider>
  );
}
