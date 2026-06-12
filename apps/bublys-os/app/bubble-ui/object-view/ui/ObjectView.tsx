import { FC, ReactNode, useCallback, useContext } from 'react';
import { UrledPlace } from '../../components/UrledPlace';
import {
  DragDataType,
  setDragPayload,
  ObjectType,
  getDragType,
  getObjectBubbleConfig,
  BubblesContext,
  CurrentBubbleContext,
} from '@bublys-org/bubbles-ui';

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
  /** ダブルクリック時のコールバック（明示指定時はレジストリより優先） */
  onDoubleClick?: () => void;
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
 * - ダブルクリック: registerObjectBubble で登録された設定に基づき自動でバブルを開く
 *   （onDoubleClick prop が渡された場合はそちらを優先）
 */
export const ObjectView: FC<ObjectViewProps> = ({
  type,
  url,
  label,
  children,
  onClick,
  onDoubleClick,
  draggable = true,
  fullWidth = false,
}) => {
  const { openBubble } = useContext(BubblesContext);
  const currentBubbleId = useContext(CurrentBubbleContext);
  const bubbleConfig = getObjectBubbleConfig(type);

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

  const handleDoubleClick = useCallback(() => {
    if (onDoubleClick) {
      onDoubleClick();
    } else if (bubbleConfig) {
      openBubble(url, currentBubbleId, bubbleConfig.openingPosition);
    }
  }, [onDoubleClick, bubbleConfig, openBubble, url, currentBubbleId]);

  const isInteractive = !!onClick || !!onDoubleClick || !!bubbleConfig;
  const hasDoubleClickAction = !!onDoubleClick || !!bubbleConfig;

  return (
    <UrledPlace url={url}>
      <span
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        style={{
          display: fullWidth ? 'flex' : 'inline-flex',
          width: fullWidth ? '100%' : undefined,
          cursor: isInteractive ? 'pointer' : undefined,
        }}
        draggable={draggable}
        onDragStart={draggable ? handleDragStart : undefined}
        onClick={onClick ? handleClick : undefined}
        onDoubleClick={hasDoubleClickAction ? handleDoubleClick : undefined}
        onKeyDown={
          isInteractive
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
