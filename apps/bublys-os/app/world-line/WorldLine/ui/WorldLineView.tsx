import { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { WorldLineContext } from '../domain/WorldLineContext';
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
  containerSize: { width: number; height: number };
  worlds: World<TWorldState>[];
  apexWorldId: string | null;
  apexWorld: World<TWorldState> | null;
  onWorldSelect: (worldId: string) => void;
  onSetApex: (worldId: string) => void;
  onRegrow: () => void;
  renderWorldState: (
    worldState: TWorldState,
    onWorldStateChange: (newWorldState: TWorldState) => void,
    isPreview?: boolean
  ) => React.ReactNode;
}

function WorldView3D<TWorldState>({
  containerSize,
  worlds,
  apexWorldId,
  apexWorld,
  onWorldSelect,
  onSetApex,
  onRegrow,
  renderWorldState,
}: WorldView3DProps<TWorldState>) {
  // クリックされた世界を一番手前に表示するためのstate（初期値はapexWorld）
  const [focusedWorldId, setFocusedWorldId] = useState<string | null>(apexWorldId);
  // ホバーされている世界のID
  const [hoveredWorldId, setHoveredWorldId] = useState<string | null>(null);
  
  // apexWorldIdが変更されたらfocusedWorldIdも更新
  useEffect(() => {
    setFocusedWorldId(apexWorldId);
  }, [apexWorldId]);
  
  // キーボードイベント処理（世界線ビューが開いている時のみ）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Z または Command+Z（Mac）で親世界に移動
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === 'z') {
        event.preventDefault();
        if (apexWorld?.parentWorldId) {
          onSetApex(apexWorld.parentWorldId);
        }
      }
      // Ctrl+Shift+Z または Command+Shift+Z（Mac）で子世界に移動
      else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') {
        event.preventDefault();
        onRegrow();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [apexWorld, onSetApex, onRegrow]);
  
  // 消失点（バニシングポイント）- 画面中央上部に配置
  const vanishingPoint = { x: containerSize.width * 0.5, y: containerSize.height * 0.2 };
  // 現在の世界の位置（画面中央やや下）
  const apexPosition = { 
    x: containerSize.width * 0.5, 
    y: containerSize.height * 0.7 
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

    // ===== apexを中心に歪める曲線 =====
    // 距離はHEADからの距離で測られているので、apex自身の距離を引いて
    // 「apexからの符号付き深さ e」に変換する（apex=0が常に最前面・最も疎）。
    //   e > 0 : apexより過去（祖先方向）→ 上の消失点へ後退
    //   e < 0 : apexより未来（子孫方向）→ 下へ後退
    const apexDepth = distances.get(apexWorldId) ?? 0;

    // apexから遠ざかるほど飽和する曲線 g(t) = (2/π)·atan(t/k)。
    // 曲率kは「apex近傍の隣り合うノード間隔が最低 minGapPx になる」よう逆算する。
    // これにより世界線がどれだけ長くても apex 付近の間隔は一定（≒重ならない）に保たれ、
    // 圧縮は遠方（消失点側）に寄る。
    const minGapPx = 28; // ⭕️(16px)が重ならない中心間距離（余白込み）
    const pastSpan = Math.max(1, apexPosition.y - vanishingPoint.y); // 過去側の振れ幅
    const futureSpan = Math.max(1, containerSize.height * 0.95 - apexPosition.y); // 未来側の振れ幅
    // span·(g(1)-g(0)) = minGapPx を満たす k を解く（apex隣接の最小間隔を保証）。
    // 過去側/未来側で振れ幅が違うため、それぞれ別の k を使い両側で間隔を担保する。
    const solveK = (span: number) => {
      const th = Math.min((Math.PI / 2) * 0.9, (Math.PI / 2) * (minGapPx / span));
      return 1 / Math.tan(th);
    };
    const kPast = solveK(pastSpan);
    const kFuture = solveK(futureSpan);
    const sat = (t: number, k: number) => (2 / Math.PI) * Math.atan(t / k);

    // 各世界の位置を計算（apexを最前面に、両方向へ後退）
    return worlds
      .map((world) => {
        const distance = distances.get(world.worldId) ?? 999;
        const worldLineHeadId = worldLineMap.get(world.worldId);
        const headPos = worldLineHeadId ? headPositions.get(worldLineHeadId) : null;

        // apexからの符号付き深さと、その絶対値（偏心）
        const depth = distance - apexDepth;
        const ecc = Math.abs(depth);
        const g = sat(ecc, depth >= 0 ? kPast : kFuture); // 0(apex) → 1(無限遠)
        const conv = 1 - g;          // apexで1、遠方で0（横の収束・スケール用）

        // 縦位置: apexを基準に過去は上、未来は下へ。apex近傍ほど間隔が広い。
        const y = depth >= 0
          ? apexPosition.y - pastSpan * g
          : apexPosition.y + futureSpan * g;

        // 横位置: 遠方ほど中央（消失点）へ収束
        let x = vanishingPoint.x + (apexPosition.x - vanishingPoint.x) * conv;

        // 各世界線を横に広げる（中央を基準に均等配置、遠方ほど狭まる）
        if (headPos && headPos.total > 1) {
          const spreadWidth = Math.min(containerSize.width * 0.4, containerSize.width);
          const offset = ((headPos.index - (headPos.total - 1) / 2) / headPos.total) * spreadWidth * conv;
          x += offset;
        }

        // Z軸: apexから離れるほど奥へ後退（apexが最も手前）
        const z = -ecc * 120;

        // 基本のzIndex（apexに近いほど手前）
        const baseZIndex = 100 - ecc;

        return {
          world,
          ecc,
          x,
          y,
          z,
          baseZIndex,
          worldLineHeadId,
          isHead: worldLineHeads.has(world.worldId),
        };
      });
  }, [worlds, apexWorldId, worldLineHeads, containerSize.width, containerSize.height]);

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
          height: '100%',
          perspective: '1500px',
          perspectiveOrigin: '50% 20%',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'transparent',
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

        {/* フォーカスがHEADにあるかどうかを判定 */}
        {(() => {
          const focusedIsHead = worldsWithPosition.some(w => w.world.worldId === focusedWorldId && w.isHead);

          return worldsWithPosition.map(({ world, ecc, x, y, z, baseZIndex, isHead, worldLineHeadId }) => {
            const isFocused = world.worldId === focusedWorldId;
            const baseOpacity = Math.max(0.3, 1 - ecc * 0.15);
            // フォーカスがHEAD以外にある場合、HEADを薄く表示
            const opacity = (isHead && !isFocused && !focusedIsHead) ? 0.3 : baseOpacity;
            const scale = Math.max(0.3, 1 - ecc * 0.15);

            // focusedな世界はわずかに手前に
            const adjustedZ = isFocused ? z + 50 : z;

            // 世界線の色を取得
            const worldLineColor = worldLineHeadId ? worldLineColors.get(worldLineHeadId) : null;

            // HEADまたはフォーカスされた世界はフルカード表示、それ以外はドット表示
            const isHovered = hoveredWorldId === world.worldId;
            const showFullCard = isHead || isFocused;

            if (showFullCard) {
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
                    width: `${containerSize.width * 0.4}px`,
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
                    zIndex: isHovered ? 3000 : (isFocused ? 1000 : baseZIndex + 50),
                  }}
                >
                  {renderWorldState(world.worldState as TWorldState, () => {}, true)}
                </div>
              );
            } else {
            // ドット表示（ホバー時にカード表示）
            const dotColor = worldLineColor?.border || 'rgba(150, 150, 200, 0.7)';
            
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
                  zIndex: isHovered ? 3000 : (isFocused ? 1000 : baseZIndex),
                }}
              >
                {/* ドット - ホバー領域を32px × 32pxに拡張 */}
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
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {/* 実際のドット（16px × 16px） */}
                  <div
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
                      opacity,
                      boxShadow: isFocused
                        ? '0 0 10px rgba(0, 123, 255, 0.5)'
                        : 'none',
                    }}
                  />
                </div>
                
                {/* ホバー時のカード表示 */}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) rotateX(20deg)`,
                      width: `${containerSize.width * 0.4}px`,
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
                    {renderWorldState(world.worldState as TWorldState, () => {}, true)}
                  </div>
                )}
              </div>
            );
            }
          });
        })()}
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
    onWorldStateChange: (newWorldState: TWorldState) => void,
    isPreview?: boolean
  ) => React.ReactNode;
}

export function WorldLineView<TWorldState>({ renderWorldState }: WorldLineViewProps<TWorldState>) {
  const {
    apexWorld,
    apexWorldId,
    grow,
    setApex,
    regrow,
    getAllWorlds,
    // getWorldTree,
    isModalOpen,
    closeModal,
    initialize,
    isInitializing,
    isInitialized,
  } = useContext(WorldLineContext);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isModalOpen]);

  const handleWorldSelect = (worldId: string) => {
    setApex(worldId);
    closeModal();
  };

  return (
    <div style={{ display: 'flex', height: "100%", flexDirection: 'column' }}>
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
              {renderWorldState(apexWorld.worldState, grow)}
            </div>
          </div>
        </div>
      )}

      {/* 3D世界線ビュー（Ctrl+Zで表示） */}
      {isInitialized && isModalOpen && (
        <div 
          ref={containerRef}
          style={{ 
            width: `100%`,
            height: `100%`,
            backgroundColor: 'transparent',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
            <WorldView3D
              containerSize={containerSize}
              worlds={getAllWorlds()}
              apexWorldId={apexWorldId}
              apexWorld={apexWorld}
              onWorldSelect={handleWorldSelect}
              onSetApex={setApex}
              onRegrow={regrow}
              renderWorldState={renderWorldState}
            />
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