import { FC } from 'react';
import { RectItem } from './CanvasDebugView';

type RectListProps = {
  rects: RectItem[];
  selectedRectIndex: number | null;
  onSelectRect: (index: number) => void;
  onToggleGrid: (index: number) => void;
  onDeleteRect: (index: number) => void;
};

export const RectList: FC<RectListProps> = ({
  rects,
  selectedRectIndex,
  onSelectRect,
  onToggleGrid,
  onDeleteRect,
}) => {
  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ marginBottom: '8px', color: '#888' }}>矩形リスト ({rects.length}):</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
        {rects.map((item, index) => (
          <div
            key={index}
            onClick={() => onSelectRect(index)}
            style={{
              padding: '6px 8px',
              background: index === selectedRectIndex ? item.color + '80' : '#333',
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
              <span>{item.label || `Rect ${index + 1}`}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleGrid(index);
                }}
                style={{
                  padding: '2px 6px',
                  background: item.showGrid ? '#00ff88' : '#555',
                  color: item.showGrid ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                グリッド
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRect(index);
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
          </div>
        ))}
      </div>
    </div>
  );
};
