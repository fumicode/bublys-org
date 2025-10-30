import { useContext, useMemo, useState } from 'react';
import { WorldLineContext } from '../domain/WorldLineContext';
import { World } from '../domain/World';

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
  // ホバーされている世界のID
  const [hoveredWorldId, setHoveredWorldId] = useState<string | null>(null);
  
  // 消失点（バニシングポイント）- 画面中央上部に配置
  const vanishingPoint = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.2 };
  // 現在の世界の位置（画面中央やや下）
  const apexPosition = { 
    x: window.innerWidth * 0.5, 
    y: window.innerHeight * 0.7 
  };
  
  // 各世界線のHEAD（子を持たない世界）を特定
  const worldLineHeads = useMemo(() => {
    const worldsWithChildren = new Set(worlds.filter(w => w.parentWorldId).map(w => w.parentWorldId));
    
    // 子を持たない世界 = 各世界線のHEAD
    const heads = worlds.filter(w => !worldsWithChildren.has(w.worldId));
    return new Set(heads.map(h => h.worldId));
  }, [worlds]);

  // 各世界線に色を割り当て
  const worldLineColors = useMemo(() => {
    const colors = [
      { bg: 'rgba(200, 255, 200, 0.92)', border: 'rgba(100, 200, 100, 0.8)' }, // 緑
      { bg: 'rgba(255, 200, 230, 0.92)', border: 'rgba(255, 100, 180, 0.8)' }, // ピンク
      { bg: 'rgba(255, 255, 200, 0.92)', border: 'rgba(200, 200, 100, 0.8)' }, // 黄色
      { bg: 'rgba(200, 230, 255, 0.92)', border: 'rgba(100, 180, 255, 0.8)' }, // 青
      { bg: 'rgba(255, 220, 200, 0.92)', border: 'rgba(255, 150, 100, 0.8)' }, // オレンジ
      { bg: 'rgba(230, 200, 255, 0.92)', border: 'rgba(180, 100, 255, 0.8)' }, // 紫
    ];
    
    const colorMap = new Map<string, { bg: string; border: string }>();
    const headsList = Array.from(worldLineHeads);
    headsList.forEach((headId, index) => {
      colorMap.set(headId, colors[index % colors.length]);
    });
    
    return colorMap;
  }, [worldLineHeads]);
  
  // 各世界の3D位置を計算
  const worldsWithPosition = useMemo(() => {
    if (!apexWorldId || worlds.length === 0) return [];

    // 世界間の親子関係からグラフを構築
    const worldMap = new Map(worlds.map((w) => [w.worldId, w]));
    
    // 各世界線のHEADから遡って距離を計算
    const distances = new Map<string, number>();
    const worldLineMap = new Map<string, string>(); // worldId -> worldLineId (HEAD)
    
    // 各HEADから親方向へ遡る
    for (const headId of worldLineHeads) {
      const queue: { id: string; distance: number }[] = [{ id: headId, distance: 0 }];
      
      while (queue.length > 0) {
        const { id, distance } = queue.shift()!;
        
        // この世界線での距離を記録（より短い距離で上書きしない）
        if (!distances.has(id) || distances.get(id)! > distance) {
          distances.set(id, distance);
          worldLineMap.set(id, headId);
        }
        
        const world = worldMap.get(id);
        if (!world) continue;
        
        // 親方向へ探索（過去の世界）
        if (world.parentWorldId && (!distances.has(world.parentWorldId) || distances.get(world.parentWorldId)! > distance + 1)) {
          queue.push({ id: world.parentWorldId, distance: distance + 1 });
        }
      }
    }
    
    // 各世界線のHEADの数を数えて、横方向の配置を計算
    const headsList = Array.from(worldLineHeads);
    const headPositions = new Map<string, { index: number; total: number }>();
    headsList.forEach((headId, index) => {
      headPositions.set(headId, { index, total: headsList.length });
    });

    // 各世界の位置を計算（消失点に向かって配置）
    return worlds
      .map((world) => {
        const distance = distances.get(world.worldId) ?? 999;
        const worldLineHeadId = worldLineMap.get(world.worldId);
        const headPos = worldLineHeadId ? headPositions.get(worldLineHeadId) : null;
        
        // 距離に応じて消失点との間の位置を計算
        // distance=0(HEAD): apexPosition
        // distance=∞: vanishingPoint
        const ratio = distance === 0 ? 1 : 1 / (distance + 1);
        
        let x = vanishingPoint.x + (apexPosition.x - vanishingPoint.x) * ratio;
        const y = vanishingPoint.y + (apexPosition.y - vanishingPoint.y) * ratio;
        
        // 各世界線を横に広げる（中央を基準に均等配置）
        if (headPos && headPos.total > 1) {
          const spreadWidth = Math.min(window.innerWidth * 0.6, 800);
          const offset = ((headPos.index - (headPos.total - 1) / 2) / headPos.total) * spreadWidth * ratio;
          x += offset;
        }
        
        // Z軸: 距離による奥行き（数値が大きいほど手前）
        const z = distance * -120;
        
        // 基本のzIndex（距離が近いほど手前）
        const baseZIndex = 100 - distance;
        
        return {
          world,
          distance,
          x,
          y,
          z,
          baseZIndex,
          worldLineHeadId,
          isHead: worldLineHeads.has(world.worldId),
        };
      });
  }, [worlds, apexWorldId, worldLineHeads]);

  // 世界間の接続線を計算
  const connections = useMemo(() => {
    const lines: Array<{
      from: { x: number; y: number; z: number };
      to: { x: number; y: number; z: number };
      color: string;
    }> = [];
    
    const posMap = new Map(worldsWithPosition.map(w => [w.world.worldId, { x: w.x, y: w.y, z: w.z, worldLineHeadId: w.worldLineHeadId }]));
    
    for (const { world, worldLineHeadId } of worldsWithPosition) {
      if (world.parentWorldId) {
        const childPos = posMap.get(world.worldId);
        const parentPos = posMap.get(world.parentWorldId);
        
        if (childPos && parentPos) {
          // 世界線の色を使用
          const worldLineColor = worldLineHeadId ? worldLineColors.get(worldLineHeadId) : null;
          const lineColor = worldLineColor?.border || 'rgba(150, 150, 200, 0.4)';
          
          lines.push({
            from: parentPos,
            to: childPos,
            color: lineColor.replace(/[\d.]+\)$/, '0.5)'), // 透明度を調整
          });
        }
      }
    }
    
    return lines;
  }, [worldsWithPosition, worldLineColors]);

  const handleWorldClick = (worldId: string) => {
    setFocusedWorldId(worldId);
  };

  const handleWorldDoubleClick = (worldId: string) => {
    onWorldSelect(worldId);
  };

  return (
    <>
      {/* ホバーカードのフェードインアニメーション用スタイル */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) rotateX(20deg) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) rotateX(20deg) scale(1);
          }
        }
      `}</style>
      
      <div
        style={{
          width: '100%',
          height: '100vh',
          perspective: '1500px',
          perspectiveOrigin: '50% 20%',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'rgba(240, 245, 250, 0.3)',
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
        {/* 接続線を描画 */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {connections.map((conn, index) => (
            <line
              key={index}
              x1={conn.from.x}
              y1={conn.from.y}
              x2={conn.to.x}
              y2={conn.to.y}
              stroke={conn.color}
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          ))}
        </svg>

        {/* 世界を描画 */}
        {worldsWithPosition.map(({ world, distance, x, y, z, baseZIndex, isHead, worldLineHeadId }) => {
          const isFocused = world.worldId === focusedWorldId;
          const opacity = Math.max(0.3, 1 - distance * 0.15);
          const scale = Math.max(0.3, 1 - distance * 0.15);
          
          // focusedな世界はわずかに手前に
          const adjustedZ = isFocused ? z + 50 : z;

          // 世界線の色を取得
          const worldLineColor = worldLineHeadId ? worldLineColors.get(worldLineHeadId) : null;

          // HEADはフルカード表示、それ以外はドット表示
          if (isHead) {
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
                  transform: `translate(-50%, -50%) translateZ(${adjustedZ}px) scale(${scale}) rotateX(20deg)`,
                  transformOrigin: 'center center',
                  transformStyle: 'preserve-3d',
                  width: '380px',
                  minHeight: '120px',
                  padding: '1.5rem',
                  backgroundColor: isFocused
                    ? 'rgba(255, 255, 255, 0.98)'
                    : (worldLineColor?.bg || 'rgba(255, 255, 255, 0.92)'),
                  border: isFocused
                    ? '3px solid rgba(0, 123, 255, 0.8)'
                    : `3px solid ${worldLineColor?.border || 'rgba(150, 150, 200, 0.6)'}`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  opacity,
                  pointerEvents: 'auto',
                  boxShadow: isFocused
                    ? '0 10px 40px rgba(0, 123, 255, 0.3)'
                    : '0 8px 24px rgba(0, 0, 0, 0.15)',
                  zIndex: isFocused ? 1000 : baseZIndex + 50,
                }}
              >
                {renderWorldState(world.worldState as TWorldState, () => {})}
              </div>
            );
          } else {
            // ドット表示（ホバー時にカード表示）
            const dotColor = worldLineColor?.border || 'rgba(150, 150, 200, 0.7)';
            const isHovered = hoveredWorldId === world.worldId;
            
            return (
              <div
                key={world.worldId}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: `translate(-50%, -50%) translateZ(${adjustedZ}px)`,
                  transformOrigin: 'center center',
                  transformStyle: 'preserve-3d',
                  pointerEvents: 'auto',
                  zIndex: isHovered ? 2000 : (isFocused ? 1000 : baseZIndex),
                }}
              >
                {/* ドット */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWorldClick(world.worldId);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleWorldDoubleClick(world.worldId);
                  }}
                  onMouseEnter={() => setHoveredWorldId(world.worldId)}
                  onMouseLeave={() => setHoveredWorldId(null)}
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: isFocused
                      ? 'rgba(0, 123, 255, 0.9)'
                      : dotColor,
                    border: isFocused
                      ? '2px solid rgba(0, 123, 255, 1)'
                      : `2px solid ${dotColor}`,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    opacity,
                    boxShadow: isFocused
                      ? '0 0 10px rgba(0, 123, 255, 0.5)'
                      : 'none',
                    position: 'relative',
                    zIndex: 1,
                  }}
                />
                
                {/* ホバー時のカード表示 */}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) rotateX(20deg)`,
                      width: '380px',
                      minHeight: '120px',
                      padding: '1.5rem',
                      backgroundColor: worldLineColor?.bg || 'rgba(255, 255, 255, 0.98)',
                      border: `3px solid ${worldLineColor?.border || 'rgba(150, 150, 200, 0.6)'}`,
                      borderRadius: '16px',
                      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.25)',
                      pointerEvents: 'none',
                      zIndex: 2,
                      animation: 'fadeIn 0.2s ease-out',
                    }}
                  >
                    {renderWorldState(world.worldState as TWorldState, () => {})}
                  </div>
                )}
              </div>
            );
          }
        })}
        </div>
      </div>
    </>
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
  } = useContext(WorldLineContext);

  const handleWorldSelect = (worldId: string) => {
    setApex(worldId);
    closeModal();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {apexWorld && !isModalOpen && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', width: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginTop: '1rem' }}>
              {renderWorldState(apexWorld.worldState as TWorldState, grow)}
            </div>
          </div>
        </div>
      )}

      {/* 3D世界線ビュー（Ctrl+Zで表示） */}
      {isModalOpen && (
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