import { SmartRect, GLOBAL_COORDINATE_SYSTEM, Point2, Size2 } from '@bublys-org/bubbles-ui';
import { RectItem } from './types';

/**
 * ランダムな色を生成
 */
export const getRandomColor = () => {
  const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#ff8787', '#94d82d', '#845ef7', '#ff6b9d'];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * 座標系のグリッドを描画する関数（矩形の周辺のみ、消失点を起点に）
 */
export const drawCoordinateSystemGrid = (
  ctx: CanvasRenderingContext2D,
  rect: SmartRect,
  color: string
) => {
  const coordinateSystem = rect.coordinateSystem;
  const { scale, offset, vanishingPoint } = coordinateSystem;
  const gridSize = 100; // グリッドの間隔（ローカル座標系）
  const dotRadius = 2;
  const surroundingArea = 300; // 矩形の周辺300px

  // 矩形のグローバル座標での位置を取得
  const globalRect = rect.coordinateSystem === GLOBAL_COORDINATE_SYSTEM
    ? rect
    : rect.toGlobal();
  const minX = globalRect.x - surroundingArea;
  const maxX = globalRect.right + surroundingArea;
  const minY = globalRect.y - surroundingArea;
  const maxY = globalRect.bottom + surroundingArea;

  ctx.fillStyle = color + '40'; // より薄く（ぼやっと）

  // 消失点を起点としたグリッドの範囲を計算
  // 消失点からの距離を100の倍数で計算
  const localMinX = Math.floor((minX - offset.x - vanishingPoint.x) / scale / gridSize) * gridSize + vanishingPoint.x;
  const localMaxX = Math.ceil((maxX - offset.x - vanishingPoint.x) / scale / gridSize) * gridSize + vanishingPoint.x;
  const localMinY = Math.floor((minY - offset.y - vanishingPoint.y) / scale / gridSize) * gridSize + vanishingPoint.y;
  const localMaxY = Math.ceil((maxY - offset.y - vanishingPoint.y) / scale / gridSize) * gridSize + vanishingPoint.y;

  // グリッド点を描画（消失点を起点に）
  for (let localX = localMinX; localX <= localMaxX; localX += gridSize) {
    for (let localY = localMinY; localY <= localMaxY; localY += gridSize) {
      // ローカル座標からグローバル座標に変換
      const globalX = vanishingPoint.x + (localX - vanishingPoint.x) * scale + offset.x;
      const globalY = vanishingPoint.y + (localY - vanishingPoint.y) * scale + offset.y;

      // 矩形の周辺範囲内の点のみ描画
      if (globalX >= minX && globalX <= maxX && globalY >= minY && globalY <= maxY) {
        ctx.beginPath();
        ctx.arc(globalX, globalY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
};

/**
 * 矩形を描画する関数
 */
export const drawRectItem = (
  ctx: CanvasRenderingContext2D,
  item: RectItem,
  isSelected: boolean
) => {
  const { rect, color, label } = item;

  // ローカル座標系の矩形は、グローバル座標に変換して描画
  const displayRect = rect.coordinateSystem === GLOBAL_COORDINATE_SYSTEM
    ? rect
    : rect.toGlobal();

  // 塗りつぶし
  ctx.fillStyle = color + '40'; // 半透明
  ctx.fillRect(displayRect.x, displayRect.y, displayRect.width, displayRect.height);

  // 枠線（選択中は太く）
  ctx.strokeStyle = color;
  ctx.lineWidth = isSelected ? 4 : 2;
  ctx.strokeRect(displayRect.x, displayRect.y, displayRect.width, displayRect.height);

  // テキスト情報の背景を描画（選択中は白背景で読みやすく）
  if (isSelected) {
    const padding = 5;
    const lineHeight = 18;
    const lines = rect.coordinateSystem !== GLOBAL_COORDINATE_SYSTEM ? 4 : 3;
    const bgWidth = 280;
    const bgHeight = lineHeight * lines + padding * 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(
      displayRect.x + 5,
      displayRect.y + 5,
      bgWidth,
      bgHeight
    );

    // 影をつける
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      displayRect.x + 5,
      displayRect.y + 5,
      bgWidth,
      bgHeight
    );
  }

  // ラベル
  ctx.fillStyle = isSelected ? '#000' : color;
  ctx.font = isSelected ? 'bold 14px monospace' : '14px monospace';
  ctx.fillText(label, displayRect.x + 10, displayRect.y + 25);
  ctx.font = '11px monospace';

  // ローカル座標の場合は、元のローカル座標も表示
  if (rect.coordinateSystem !== GLOBAL_COORDINATE_SYSTEM) {
    ctx.fillText(
      `Local: (${Math.round(rect.x)}, ${Math.round(rect.y)})`,
      displayRect.x + 10,
      displayRect.y + 45
    );
    ctx.fillText(
      `Global: (${Math.round(displayRect.x)}, ${Math.round(displayRect.y)})`,
      displayRect.x + 10,
      displayRect.y + 60
    );
    ctx.fillText(
      `${Math.round(rect.width)}×${Math.round(rect.height)} → ${Math.round(displayRect.width)}×${Math.round(displayRect.height)}`,
      displayRect.x + 10,
      displayRect.y + 75
    );
  } else {
    ctx.fillText(
      `(${Math.round(displayRect.x)}, ${Math.round(displayRect.y)})`,
      displayRect.x + 10,
      displayRect.y + 45
    );
    ctx.fillText(
      `${Math.round(displayRect.width)}×${Math.round(displayRect.height)}`,
      displayRect.x + 10,
      displayRect.y + 60
    );
  }
};

/**
 * Canvasに全体を描画する関数
 */
export const renderCanvas = (
  ctx: CanvasRenderingContext2D,
  rects: RectItem[],
  selectedRectId: string | null,
  canvasSize: Size2,
  vanishingPoint: Point2,
  offset: Point2
) => {
  // キャンバスをクリア
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

  // 背景
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  // グリッドを描画（矩形の下に描画）
  rects.forEach(item => {
    if (item.showGrid) {
      drawCoordinateSystemGrid(ctx, item.rect, item.color);
    }
  });

  // 選択されていない矩形を先に描画
  rects.forEach(item => {
    if (item.id !== selectedRectId) {
      drawRectItem(ctx, item, false);
    }
  });

  // 選択された矩形を最後に描画（手前に表示）
  const selectedRect = rects.find(item => item.id === selectedRectId);
  if (selectedRect) {
    drawRectItem(ctx, selectedRect, true);
  }

  // vanishingPointを描画
  ctx.fillStyle = '#00ffff';
  ctx.beginPath();
  ctx.arc(vanishingPoint.x, vanishingPoint.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#00ffff';
  ctx.font = '12px monospace';
  ctx.fillText('消失点', vanishingPoint.x + 12, vanishingPoint.y + 5);

  // offsetを描画
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(offset.x, offset.y, canvasSize.width - offset.x, canvasSize.height - offset.y);
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffff00';
  ctx.font = '12px monospace';
  ctx.fillText(`オフセット(${offset.x}, ${offset.y})`, offset.x + 10, offset.y - 10);
};
