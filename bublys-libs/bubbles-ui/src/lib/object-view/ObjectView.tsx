import { FC, ReactNode, useCallback } from 'react';
import { UrledPlace } from '../components/UrledPlace.js';
import { DragDataType, setDragPayload } from '../utils/drag-types.js';
import { ObjectType, getDragType } from './ObjectTypeRegistry.js';

type ObjectViewProps = {
  /** オブジェクトの型 */
  type: ObjectType;
  /** オブジェクトのURL（例: 'users/123'） */
  url: string;
  /** ドラッグ時に表示するラベル */
  label?: string;
  /** 子要素 */
  children: ReactNode;
  /** クリック時のコールバック */
  onClick?: () => void;
  /** ドラッグ可能にするか（デフォルト: true） */
  draggable?: boolean;
  /** 幅を100%にするか（デフォルト: false） */
  fullWidth?: boolean;
};

/**
 * オブジェクトビューの統一コンポーネント
 *
 * 以下の機能を提供:
 * - UrledPlace: LinkBubbleの対象となる
 * - draggable: ドラッグ可能（型情報を自動設定）
 * - onClick: クリックでバブルを開く（openBubbleは呼び出し側で実装）
 */
export const ObjectView: FC<ObjectViewProps> = ({
  type,
  url,
  label,
  children,
  onClick,
  draggable = true,
  fullWidth = false,
}) => {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      setDragPayload(e, {
        type: getDragType(type) as DragDataType,
        url,
        label,
      });
    },
    [type, url, label]
  );

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <UrledPlace url={url}>
      <span
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        style={{
          display: fullWidth ? 'flex' : 'inline-flex',
          width: fullWidth ? '100%' : undefined,
          cursor: onClick ? 'pointer' : undefined,
        }}
        draggable={draggable}
        onDragStart={draggable ? handleDragStart : undefined}
        onClick={onClick ? handleClick : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick();
                }
              }
            : undefined
        }
      >
        {children}
      </span>
    </UrledPlace>
  );
};
