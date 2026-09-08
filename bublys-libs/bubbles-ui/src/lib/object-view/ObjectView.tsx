import { FC, ReactNode, useCallback, useContext } from 'react';
import { UrledPlace } from '../components/UrledPlace.js';
import { DragDataType, setDragPayload } from '../utils/drag-types.js';
import {
  ObjectType,
  getDragType,
  getObjectBubbleConfig,
  getObjectUrl,
  resolveObjectType,
  getObjectId,
} from './ObjectTypeRegistry.js';
import { BubblesContext } from '../bubble-routing/BubbleRouting.js';
import { CurrentBubbleContext } from '../context/CurrentBubbleContext.js';
import type { OpeningPosition } from '../state/bubbles-slice.js';

type ObjectViewProps = {
  /**
   * ドメインオブジェクトそのもの。これを渡すと型・id・URL をレジストリから自動解決する
   * （registerObjectIdentity / registerObjectUrl）。type/id/url を個別に渡す必要がなくなる。
   */
  object?: unknown;
  /** オブジェクトの型（object を渡さない場合に指定） */
  type?: ObjectType;
  /** オブジェクトのURL（例: 'users/123'）。省略時は type+id 登録のデフォルトURLから導出 */
  url?: string;
  /** オブジェクトID。url 省略時に型のデフォルトURL（registerObjectUrl）を導出するのに使う */
  id?: string;
  /** ドラッグ時に表示するラベル */
  label?: string;
  /** 子要素 */
  children: ReactNode;
  /** クリック時のコールバック */
  onClick?: () => void;
  /** ダブルクリック時のコールバック（明示指定時はレジストリより優先） */
  onDoubleClick?: () => void;
  /**
   * ダブルクリックでバブルを開く際の展開位置。
   * 展開位置は「型」ではなく「使う場所（シチュエーション）」で決まるため、
   * 使用箇所でここに指定する。未指定時はレジストリ設定（registerObjectBubble）にフォールバック。
   */
  openingPosition?: OpeningPosition;
  /** ドラッグ可能にするか（デフォルト: true） */
  draggable?: boolean;
  /** 幅を100%にするか（デフォルト: false） */
  fullWidth?: boolean;
  /**
   * ラッパ span に付けるクラス。
   * 包む相手が flex/grid の子で `flex: 1` などを持っているとき、その指定はラッパ側に
   * 移らないとレイアウトが崩れる。中身のクラスをラッパへ引き上げるための口。
   */
  className?: string;
};

/**
 * オブジェクトビューの統一コンポーネント
 *
 * 以下の機能を提供:
 * - UrledPlace: LinkBubbleの対象となる
 * - draggable: ドラッグ可能（型情報を自動設定）
 * - ダブルクリック: バブルを開く（onDoubleClick prop が渡された場合はそちらを優先）
 * - Enter / Space: ダブルクリックと同じ「開く」
 *
 * 開けるかどうかは `canOpenBubble` が決める。URL があるだけでは足りず、使用箇所で
 * `openingPosition` を渡すか、型に `registerObjectBubble` を登録しておく必要がある。
 * どちらも無いと、ダブルクリックのハンドラ自体が付かない（＝黙って開かない）。
 */
export const ObjectView: FC<ObjectViewProps> = ({
  object,
  type,
  url,
  id,
  label,
  children,
  onClick,
  onDoubleClick,
  openingPosition,
  draggable = true,
  fullWidth = false,
  className,
}) => {
  const { openBubble } = useContext(BubblesContext);
  const currentBubbleId = useContext(CurrentBubbleContext);

  // object を渡された場合は型・id をレジストリから解決（instanceof / getId）
  const effectiveType = object !== undefined ? resolveObjectType(object) : type;
  const effectiveId =
    id ??
    (object !== undefined && effectiveType !== undefined
      ? getObjectId(effectiveType, object)
      : undefined);

  const bubbleConfig = effectiveType !== undefined ? getObjectBubbleConfig(effectiveType) : undefined;
  // url 明示指定を優先し、無ければ型登録のデフォルトURL（type+id）を導出
  const resolvedUrl =
    url ??
    (effectiveType !== undefined && effectiveId !== undefined
      ? getObjectUrl(effectiveType, effectiveId)
      : undefined);
  // 展開位置は使用箇所の指定を優先し、無ければレジストリ設定にフォールバック
  const resolvedPosition = openingPosition ?? bubbleConfig?.openingPosition;
  const canOpenBubble =
    !!resolvedUrl && (openingPosition !== undefined || bubbleConfig !== undefined);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!effectiveType) return;
      setDragPayload(e, {
        type: getDragType(effectiveType) as DragDataType,
        url: resolvedUrl ?? '',
        label,
        // 宇宙に落ちたときの opener。ダブルクリックで開くときと同じバブルを指す
        sourceBubbleId: currentBubbleId,
      });
    },
    [effectiveType, resolvedUrl, label, currentBubbleId]
  );

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  /** このオブジェクトを開く（ダブルクリックの動作）。onDoubleClick が渡っていればそちらが優先 */
  const openObject = useCallback(() => {
    if (onDoubleClick) {
      onDoubleClick();
      return;
    }
    if (canOpenBubble && resolvedUrl) {
      openBubble(resolvedUrl, currentBubbleId, resolvedPosition);
    }
  }, [onDoubleClick, canOpenBubble, resolvedUrl, resolvedPosition, openBubble, currentBubbleId]);

  /**
   * ObjectView は入れ子になる（行の中のバッジ、セルの中のチップ、図のノード…）。
   * そのとき開くべきなのは「指した本人」なので、内側で止めて外側へ渡さない。
   * 各使用箇所で stopPropagation を書いて回ると必ず抜けが出るので、ここを規則にする。
   */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openObject();
    },
    [openObject]
  );

  const isInteractive = !!onClick || !!onDoubleClick || canOpenBubble;
  const hasDoubleClickAction = !!onDoubleClick || canOpenBubble;

  /**
   * キーボードの主アクション（Enter / Space）。
   *
   * キーボードには「ダブルクリック」に当たる打鍵が無いので、開けるなら Enter は「開く」に
   * 割り当てる。マウスでは単クリックが何もしないのに Enter では開く、という非対称は意図的で、
   * `role="button"` と `tabIndex=0` を名乗っている以上、キーボードで無反応なほうが不具合。
   * 開けないときだけ onClick（選択など、開く以外の仕事）へ落とす。
   */
  const handlePrimaryKey = useCallback(() => {
    if (hasDoubleClickAction) {
      openObject();
      return;
    }
    onClick?.();
  }, [hasDoubleClickAction, openObject, onClick]);

  return (
    <UrledPlace url={resolvedUrl ?? ''}>
      <span
        className={className}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        style={{
          display: fullWidth ? 'flex' : 'inline-flex',
          width: fullWidth ? '100%' : undefined,
          cursor: isInteractive ? 'pointer' : undefined,
          // ダブルクリックでラベルの文字が選択されてチラつくのを防ぐ
          userSelect: hasDoubleClickAction ? 'none' : undefined,
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
                  handlePrimaryKey();
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
