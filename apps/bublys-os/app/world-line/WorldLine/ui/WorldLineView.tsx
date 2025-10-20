import { useContext, useMemo, useState } from 'react';
import { WorldLineContext } from '../domain/WorldLineContext';
import { CreateTreeView } from './CreateTreeView';
import { World } from '../domain/World';

// InitializeButtonコンポーネントを直接定義
function InitializeButton({ onInitialize, disabled = false }: { onInitialize: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onInitialize}
      disabled={disabled}
      style={{
        cursor: 'pointer',
        backgroundColor: 'transparent',
        width: '100px',
      }}
    >
      {disabled ? '初期化中...' : '🚀 初期化'}
    </button>
  );
}

// 3D WorldView コンポーネント
interface WorldView3DProps<TWorldState> {
  worlds: World<TWorldState>[];
  apexWorldId: string | null;
  onWorldSelect: (worldId: string) => void;
  renderWorldState: (
    worldState: TWorldState,
    onWorldStateChange: (newWorldState: TWorldState) => void
  ) => React.ReactNode;
}

function WorldView3D<TWorldState>({
  worlds,
  apexWorldId,
  onWorldSelect,
  renderWorldState,
}: WorldView3DProps<TWorldState>) {
  // クリックされた世界を一番手前に表示するためのstate（初期値はapexWorld）
  const [focusedWorldId, setFocusedWorldId] = useState<string | null>(apexWorldId);
  
  // 消失点（バニシングポイント）- 画面左上寄り
  const vanishingPoint = { x: 100, y: 100 };
  // 現在の世界の位置（画面やや右下）
  const apexPosition = { 
    x: window.innerWidth * 0.65, 
    y: window.innerHeight * 0.65 
  };
  
  // 各世界の3D位置を計算
  const worldsWithPosition = useMemo(() => {
    if (!apexWorldId || worlds.length === 0) return [];

    // 世界間の親子関係からグラフを構築
    const worldMap = new Map(worlds.map((w) => [w.worldId, w]));
    
    // apexWorldIdから各世界への距離を計算
    const distances = new Map<string, number>();
    const queue: { id: string; distance: number }[] = [{ id: apexWorldId, distance: 0 }];
    distances.set(apexWorldId, 0);
    
    while (queue.length > 0) {
      const { id, distance } = queue.shift()!;
      const world = worldMap.get(id);
      
      if (!world) continue;
      
      // 親方向へ探索（過去の世界）
      if (world.parentWorldId && !distances.has(world.parentWorldId)) {
        distances.set(world.parentWorldId, distance + 1);
        queue.push({ id: world.parentWorldId, distance: distance + 1 });
      }
      
      // 子方向へ探索（未来の分岐世界）
      const children = worlds.filter((w) => w.parentWorldId === id);
      for (const child of children) {
        if (!distances.has(child.worldId)) {
          distances.set(child.worldId, distance + 1);
          queue.push({ id: child.worldId, distance: distance + 1 });
        }
      }
    }

    // 各世界の位置を計算（消失点に向かって配置）
    return worlds
      .map((world) => {
        const distance = distances.get(world.worldId) ?? 999;
        
        // 距離に応じて消失点との間の位置を計算
        // distance=0(apex): apexPosition
        // distance=∞: vanishingPoint
        const ratio = distance === 0 ? 1 : 1 / (distance + 1);
        
        const x = vanishingPoint.x + (apexPosition.x - vanishingPoint.x) * ratio;
        const y = vanishingPoint.y + (apexPosition.y - vanishingPoint.y) * ratio;
        
        // 同じ距離の世界は横にずらす（分岐を表現）
        const siblingsAtSameDistance = worlds.filter(w => 
          distances.get(w.worldId) === distance
        );
        const indexInSiblings = siblingsAtSameDistance.findIndex(w => w.worldId === world.worldId);
        const totalSiblings = siblingsAtSameDistance.length;
        const xSpread = totalSiblings > 1 
          ? (indexInSiblings - (totalSiblings - 1) / 2) * x * ratio
          : 0;
        
        // Z軸: 距離による奥行き（数値が大きいほど手前）- 小さめの値で画面内に収める
        const z = distance * -80;
        
        // 基本のzIndex（距離が近いほど手前）
        const baseZIndex = 100 - distance;
        
        return {
          world,
          distance,
          x: x + xSpread,
          y,
          z,
          baseZIndex,
        };
      });
  }, [worlds, apexWorldId]);

  const handleWorldClick = (worldId: string) => {
    setFocusedWorldId(worldId);
  };

  const handleWorldDoubleClick = (worldId: string) => {
    onWorldSelect(worldId);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        perspective: '2000px',
        perspectiveOrigin: '100px 100px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          transformStyle: 'preserve-3d',
          position: 'absolute',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {worldsWithPosition.map(({ world, distance, x, y, z, baseZIndex }) => {
          const isApexWorld = world.worldId === apexWorldId;
          const isFocused = world.worldId === focusedWorldId;
          const opacity = Math.max(0.5, 1 - distance * 0.1);
          const scale = Math.max(0.4, 1 - distance * 0.12);
          
          // focusedな世界はわずかに手前に（画面内に収める）
          const adjustedZ = isFocused ? z + 50 : z;

          return (
            <div
              key={world.worldId}
              onClick={(e) => {
                e.stopPropagation();
                handleWorldClick(world.worldId);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleWorldDoubleClick(world.worldId);
              }}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                transform: `translateZ(${adjustedZ}px) scale(${scale})`,
                transformOrigin: '0 0',
                transformStyle: 'preserve-3d',
                width: '320px',
                minHeight: '100px',
                padding: '1rem',
                backgroundColor: isApexWorld
                  ? 'rgba(255, 255, 255, 0.98)'
                  : 'rgba(255, 255, 255, 0.85)',
                border: isFocused
                  ? '3px solid rgba(0, 123, 255, 0.7)'
                  : '2px solid rgba(150, 150, 200, 0.5)',
                borderRadius: '12px',
                cursor: 'pointer',
                opacity,
                pointerEvents: 'auto',
              }}
            >
              {renderWorldState(world.worldState as TWorldState, () => {})}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * WorldLineViewのプロップス
 * TWorldState: 管理する状態の型（ジェネリック）
 */
interface WorldLineViewProps<TWorldState> {
  /** 世界の状態を表示するレンダー関数 */
  renderWorldState: (
    worldState: TWorldState,
    onWorldStateChange: (newWorldState: TWorldState) => void
  ) => React.ReactNode;
}

export function WorldLineView<TWorldState>({ renderWorldState }: WorldLineViewProps<TWorldState>) {
  const {
    apexWorld,
    apexWorldId,
    grow,
    setApex,
    getAllWorlds,
    // getWorldTree,
    isModalOpen,
    closeModal,
    initialize,
    isInitializing,
    isInitialized,
  } = useContext(WorldLineContext);

  const handleWorldSelect = (worldId: string) => {
    setApex(worldId);
    closeModal();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 初期化ボタン（未初期化時のみ表示） */}
      {!isInitialized && (
        <InitializeButton 
          onInitialize={initialize}
          disabled={isInitializing}
        />
      )}

      {/* 通常表示: 現在の世界のみ */}
      {isInitialized && apexWorld && !isModalOpen && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', width: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginTop: '1rem' }}>
              {renderWorldState(apexWorld.worldState as TWorldState, grow)}
            </div>
          </div>
        </div>
      )}

      {/* 3D世界線ビュー（Ctrl+Zで表示） */}
      {isInitialized && isModalOpen && (
        <div style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <WorldView3D
              worlds={getAllWorlds()}
              apexWorldId={apexWorldId}
              onWorldSelect={handleWorldSelect}
              renderWorldState={renderWorldState}
            />
          </div>
        </div>
      )}

      {/* デバッグ用: ツリー表示（コメントアウト） */}
      {/* {isInitialized && isModalOpen && (
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          border: '2px solid #007bff'
        }}>
          <CreateTreeView
            creates={getAllWorlds()}
            currentCreateId={apexWorldId}
            onCreateSelect={handleWorldSelect}
            createTree={getWorldTree()}
          />
        </div>
      )} */}
    </div>
  );
}