'use client';

import { useEffect, useRef, useState } from 'react';
import { SmartRect, Direction, CornerPosition, Side } from '@bublys-org/bubbles-ui';

type RectItem = {
  id: string;
  rect: SmartRect;
  label: string;
  color: string;
};

// ランダムな色を生成
const getRandomColor = () => {
  const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#ff8787', '#94d82d', '#845ef7', '#ff6b9d'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// 矩形を描画する関数
const drawRectItem = (
  ctx: CanvasRenderingContext2D,
  item: RectItem,
  isSelected: boolean
) => {
  const { rect, color, label } = item;

  // 塗りつぶし
  ctx.fillStyle = color + '40'; // 半透明
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  // 枠線（選択中は太く）
  ctx.strokeStyle = color;
  ctx.lineWidth = isSelected ? 4 : 2;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

  // ラベル
  ctx.fillStyle = color;
  ctx.font = isSelected ? 'bold 14px monospace' : '14px monospace';
  ctx.fillText(label, rect.x + 10, rect.y + 25);
  ctx.font = '11px monospace';
  ctx.fillText(
    `(${Math.round(rect.x)}, ${Math.round(rect.y)})`,
    rect.x + 10,
    rect.y + 45
  );
  ctx.fillText(
    `${Math.round(rect.width)}×${Math.round(rect.height)}`,
    rect.x + 10,
    rect.y + 60
  );
};

export default function SmartRectTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rects, setRects] = useState<RectItem[]>([]);
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [nextId, setNextId] = useState(1);

  // 初期矩形の調整用
  const [initialX, setInitialX] = useState(0);
  const [initialY, setInitialY] = useState(0);
  const [initialWidth, setInitialWidth] = useState(100);
  const [initialHeight, setInitialHeight] = useState(100);

  // Canvasのサイズを設定
  useEffect(() => {
    const updateCanvasSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setCanvasSize({ width, height });

      // 初回のみ初期値を設定
      if (initialX === 0 && initialY === 0) {
        setInitialX(width / 2 - 50);
        setInitialY(height / 2 - 50);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // 初期矩形を更新
  useEffect(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return;

    const rect = new SmartRect(
      new DOMRect(initialX, initialY, initialWidth, initialHeight),
      { width: canvasSize.width, height: canvasSize.height }
    );

    // 初期矩形が存在する場合は更新、存在しない場合は作成
    if (rects.find(r => r.id === '0')) {
      setRects(rects.map(r => r.id === '0' ? { ...r, rect } : r));
    } else if (initialX > 0 || initialY > 0) {
      setRects([{
        id: '0',
        rect,
        label: '初期矩形',
        color: '#ffaa00',
      }]);
      setSelectedRectId('0');
    }
  }, [initialX, initialY, initialWidth, initialHeight, canvasSize]);

  // ランダムな色を生成
  const getRandomColor = () => {
    const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#ff8787', '#94d82d', '#845ef7', '#ff6b9d'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // 選択中の矩形を取得
  const getSelectedRect = () => {
    return rects.find(r => r.id === selectedRectId) || null;
  };

  // 隣の矩形を作成
  const createNeighborRect = (direction: Direction) => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.rect.getNeighbor(direction);
    const directionLabel = { top: '上', right: '右', bottom: '下', left: '左' }[direction];

    setRects([...rects, {
      id: String(nextId),
      rect: newRect,
      label: `${selected.label}の${directionLabel}隣`,
      color: getRandomColor(),
    }]);
    setSelectedRectId(String(nextId));
    setNextId(nextId + 1);
  };

  // 角の矩形を作成
  const createCornerRect = (position: CornerPosition) => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.rect.getCorner(position);
    const positionLabel = {
      topLeft: '左上',
      topRight: '右上',
      bottomLeft: '左下',
      bottomRight: '右下'
    }[position];

    setRects([...rects, {
      id: String(nextId),
      rect: newRect,
      label: `${selected.label}の${positionLabel}角`,
      color: getRandomColor(),
    }]);
    setSelectedRectId(String(nextId));
    setNextId(nextId + 1);
  };

  // 側の矩形を作成
  const createSideRect = (side: Side) => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.rect.getSide(side);
    const sideLabel = { top: '上', right: '右', bottom: '下', left: '左' }[side];

    setRects([...rects, {
      id: String(nextId),
      rect: newRect,
      label: `${selected.label}の${sideLabel}側`,
      color: getRandomColor(),
    }]);
    setSelectedRectId(String(nextId));
    setNextId(nextId + 1);
  };

  // 矩形を削除
  const deleteRect = (id: string) => {
    setRects(rects.filter(r => r.id !== id));
    if (selectedRectId === id) {
      setSelectedRectId(rects.length > 1 ? rects[0].id : null);
    }
  };

  // 矩形を描画する関数
  const drawRectItem = (
    ctx: CanvasRenderingContext2D,
    item: RectItem,
    isSelected: boolean
  ) => {
    const { rect, color, label } = item;

    // 塗りつぶし
    ctx.fillStyle = color + '40'; // 半透明
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    // 枠線（選択中は太く）
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    // ラベル
    ctx.fillStyle = color;
    ctx.font = isSelected ? 'bold 14px monospace' : '14px monospace';
    ctx.fillText(label, rect.x + 10, rect.y + 25);
    ctx.font = '11px monospace';
    ctx.fillText(
      `(${Math.round(rect.x)}, ${Math.round(rect.y)})`,
      rect.x + 10,
      rect.y + 45
    );
    ctx.fillText(
      `${Math.round(rect.width)}×${Math.round(rect.height)}`,
      rect.x + 10,
      rect.y + 60
    );
  };

  // 描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // 背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // すべての矩形を描画
    rects.forEach(item => {
      drawRectItem(ctx, item, item.id === selectedRectId);
    });
  }, [rects, selectedRectId, canvasSize]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ display: 'block' }}
      />

      {/* コントロールパネル */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '20px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '14px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>SmartRect テスト</h2>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '5px', color: '#888' }}>画面サイズ:</div>
          <div>{canvasSize.width} × {canvasSize.height}</div>
        </div>

        {/* 初期矩形の調整 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888' }}>初期矩形の調整:</div>

          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
              X: {Math.round(initialX)}
            </label>
            <input
              type="range"
              min="0"
              max={Math.max(0, canvasSize.width - initialWidth)}
              value={initialX}
              onChange={(e) => setInitialX(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
              Y: {Math.round(initialY)}
            </label>
            <input
              type="range"
              min="0"
              max={Math.max(0, canvasSize.height - initialHeight)}
              value={initialY}
              onChange={(e) => setInitialY(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
              幅: {Math.round(initialWidth)}
            </label>
            <input
              type="range"
              min="10"
              max={Math.min(500, canvasSize.width)}
              value={initialWidth}
              onChange={(e) => setInitialWidth(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
              高さ: {Math.round(initialHeight)}
            </label>
            <input
              type="range"
              min="10"
              max={Math.min(500, canvasSize.height)}
              value={initialHeight}
              onChange={(e) => setInitialHeight(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* 矩形リスト */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888' }}>矩形リスト ({rects.length}):</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {rects.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedRectId(item.id)}
                style={{
                  padding: '6px 8px',
                  background: item.id === selectedRectId ? item.color + '80' : '#333',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      background: item.color,
                      borderRadius: '2px',
                    }}
                  />
                  <span>{item.label}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRect(item.id);
                  }}
                  style={{
                    padding: '2px 6px',
                    background: '#ff4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 隣の矩形を作成 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888' }}>隣を作成:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            <div></div>
            <button
              onClick={() => createNeighborRect('top')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↑上
            </button>
            <div></div>
            <button
              onClick={() => createNeighborRect('left')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ←左
            </button>
            <div></div>
            <button
              onClick={() => createNeighborRect('right')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右→
            </button>
            <div></div>
            <button
              onClick={() => createNeighborRect('bottom')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↓下
            </button>
            <div></div>
          </div>
        </div>

        {/* 角の矩形を作成 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888' }}>角を作成:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
            <button
              onClick={() => createCornerRect('topLeft')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↖左上
            </button>
            <button
              onClick={() => createCornerRect('topRight')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右上↗
            </button>
            <button
              onClick={() => createCornerRect('bottomLeft')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↙左下
            </button>
            <button
              onClick={() => createCornerRect('bottomRight')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右下↘
            </button>
          </div>
        </div>

        {/* 側の矩形を作成 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888' }}>側を作成:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
            <button
              onClick={() => createSideRect('top')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ⬆上側
            </button>
            <button
              onClick={() => createSideRect('right')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右側⮕
            </button>
            <button
              onClick={() => createSideRect('bottom')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ⬇下側
            </button>
            <button
              onClick={() => createSideRect('left')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ⬅左側
            </button>
          </div>
        </div>

        {/* 説明 */}
        <div style={{ marginTop: '20px', fontSize: '11px', color: '#888', lineHeight: 1.6 }}>
          <div>選択した矩形から新しい矩形を作成できます。</div>
          <div>例: 初期矩形 → 右隣 → 左隣 のように連鎖できます。</div>
        </div>
      </div>
    </div>
  );
}
