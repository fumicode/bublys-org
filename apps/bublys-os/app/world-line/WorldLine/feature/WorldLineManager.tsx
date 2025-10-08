"use client";

import { FC, useState, useMemo } from "react";
import { WorldLineContext } from "../domain/WorldLineContext";
import { AkashicRecord } from "../domain/AkashicRecord";
import { WorldLine } from "../domain/WorldLine";
import { World } from "../domain/World";
import { Counter } from "../domain/Counter";

type WorldLineManagerProps = {
  children: React.ReactNode;
};

/**
 * WorldLineManager
 * WorldLine機能全体を管理するProviderコンポーネント
 */
export const WorldLineManager: FC<WorldLineManagerProps> = ({ children }) => {
  // 状態管理
  const [akashicRecord, setAkashicRecord] = useState<AkashicRecord>(
    new AkashicRecord()
  );
  const [currentWorldId, setCurrentWorldId] = useState<string>('');

  // 現在の世界を取得
  const currentWorld = useMemo(() => {
    if (!currentWorldId) return null;
    const result = akashicRecord.findWorldByWorldId(currentWorldId);
    return result?.world || null;
  }, [akashicRecord, currentWorldId]);

  // アクション関数
  const addWorldLine = (worldLine: WorldLine) => {
    setAkashicRecord(prev => prev.addWorldLine(worldLine));
  };

  const updateWorldLine = (worldLineId: string, worldLine: WorldLine) => {
    setAkashicRecord(prev => prev.updateWorldLine(worldLineId, worldLine));
  };

  const setCurrentWorld = (worldId: string) => {
    setCurrentWorldId(worldId);
  };

  const getNextWorldChoices = (worldId: string) => {
    return akashicRecord.getNextWorldChoices(worldId);
  };

  // 現在の世界が属する世界線を取得
  const getCurrentWorldLine = () => {
    if (!currentWorldId) return null;
    
    // 現在の世界が属する世界線を検索
    for (const worldLine of akashicRecord.worldLines) {
      const world = worldLine.getWorld(currentWorldId);
      if (world) {
        return worldLine;
      }
    }
    return null;
  };

  // カウンター更新時に新しい世界を作成
  const updateCounterAndCreateWorld = (worldId: string, newCounter: Counter) => {
    // 現在の世界が属する世界線を取得
    const currentWorldLine = getCurrentWorldLine();
    if (!currentWorldLine) return;

    // 現在の世界線に新しい世界を追加
    const newWorldId = `${worldId}-${Date.now()}`;
    const newWorld = new World(newWorldId, newCounter);
    const updatedWorldLine = currentWorldLine.addWorld(newWorld);
    
    // アカシックレコードを更新
    setAkashicRecord(prev => 
      prev.updateWorldLine(currentWorldLine.worldLineId, updatedWorldLine)
    );
    
    // 新しい世界に移動
    setCurrentWorldId(newWorldId);
  };

  // 世界の切り替え時に新しい世界線を作成
  const switchToWorldAndCreateBranch = (targetWorldId: string) => {
    const result = akashicRecord.findWorldByWorldId(targetWorldId);
    if (!result) return;

    const { world } = result;
    
    // 分岐した世界線が既に存在するかチェック
    const existingBranch = akashicRecord.worldLines.find(wl => 
      wl.parentWorldId === currentWorldId && 
      wl.worlds.some(w => w.worldId === targetWorldId)
    );
    
    if (existingBranch) {
      // 既存の分岐世界線に移動
      setCurrentWorldId(targetWorldId);
      return;
    }
    
    // 新しい世界線を作成（独立した新しい世界を作成）
    const newWorldLineId = `branch-${Date.now()}`;
    const newWorldId = `${targetWorldId}-branch-${Date.now()}`;
    
    // 独立した新しい世界を作成（前の世界線のカウンター値を参照しない）
    const newWorld = new World(newWorldId, new Counter(world.counter.value));
    const newWorldLine = new WorldLine(currentWorldId, newWorldLineId, [newWorld]);
    
    // アカシックレコードに新しい世界線を追加
    setAkashicRecord(prev => prev.addWorldLine(newWorldLine));
    
    // 新しい世界に移動
    setCurrentWorldId(newWorldId);
  };

  // 全ての世界を削除してルート世界を作成
  const resetToRootWorld = () => {
    // ルート世界を作成
    const rootWorld = new World('root-world', new Counter(0));
    
    // ルート世界線を作成
    const rootWorldLine = new WorldLine('', 'root-worldline', [rootWorld]);
    
    // アカシックレコードをリセット
    const newAkashicRecord = new AkashicRecord([rootWorldLine]);
    
    setAkashicRecord(newAkashicRecord);
    setCurrentWorldId('root-world');
  };

  return (
    <WorldLineContext.Provider
      value={{
        akashicRecord,
        currentWorldId,
        currentWorld,
        addWorldLine,
        updateWorldLine,
        setCurrentWorld,
        getNextWorldChoices,
        updateCounterAndCreateWorld,
        switchToWorldAndCreateBranch,
        resetToRootWorld,
      }}
    >
      <div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button 
            onClick={resetToRootWorld}
            style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}
          >
            🔄 世界リセット
          </button>
        </div>
        {children}
      </div>
    </WorldLineContext.Provider>
  );
};