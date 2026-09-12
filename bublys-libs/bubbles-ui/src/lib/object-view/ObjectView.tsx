import { ComponentPropsWithoutRef, FC, ReactNode, useCallback, useContext } from 'react';
import styled, { css } from 'styled-components';
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

  /**
   * 実際に掴めるか。draggable でも型が無いとドラッグのペイロードが載らない
   * （handleDragStart が早期 return する）ので、その場合は「掴める」と言わない。
   */
  const canDrag = draggable && effectiveType !== undefined;

  /**
   * 泡の膜を出すか。
   * 膜は「掴める・開ける」の合図なので、どちらもできないものには出さない。
   * 出たら必ず何かできる、を守る。
   */
  const showFilm = canDrag || hasDoubleClickAction;

  return (
    <UrledPlace url={resolvedUrl ?? ''}>
      <ObjectSurface
        data-object-view=""
        data-film={showFilm ? 'on' : 'off'}
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
      </ObjectSurface>
    </UrledPlace>
  );
};

/**
 * ObjectView の見た目の土台。
 *
 * hover / フォーカスすると、中身の前面に半透明の泡の膜が出る。
 * この膜が「これは掴める・ダブルクリックで開ける」の唯一の合図。
 * 逆に、掴めも開けもしないものには出さない（`data-film="off"`）。
 *
 * ## 実装メモ
 *
 * - **箱はこの span が持つ。** 外側の UrledPlace は `display: contents` で箱を持たないので、
 *   膜の基準にはできない。ここは inline-flex（fullWidth なら flex）なので、
 *   中身を囲む実体のある矩形になる。
 *   例外は中身が `position: absolute` のとき。それだと子が親の大きさに寄与せず
 *   この span が潰れるので、使う側で「位置を持つ枠」と「見た目」を分けて、
 *   見た目のほうを包むこと（ekikyo の九星タイルがその形）。
 * - **JS の状態を持たない。** ObjectView は表のセルに何百個も並ぶ（学会シフトの配置表、
 *   イベントの84タスク）。hover を useState で持つとマウスが動くたびに再レンダリングが
 *   走るので、CSS の :hover だけで完結させる。
 * - **レイアウトには触らない。** display / width / cursor / user-select は今までどおり
 *   インラインスタイルのまま。ここが足すのは position/isolation と ::after だけなので、
 *   既存の見た目は変わらない。
 * - 丸みは `--object-view-film-radius` で使う側が変えられる（既定 12px）。
 *   ekikyo の円形タイルは 50% を指定している。
 */
/**
 * 泡の膜の「見た目」だけを切り出したもの。
 *
 * ObjectView の ::after が使うのと同じ定義を、ObjectView で包めない要素
 * （例: 表の <tr>。span で包むと table fixup で表の外へ叩き出される）にも
 * 当てられるように export している。「膜が出る ＝ 掴める・開ける」という合図を
 * 1つの定義に保つため、色や影をコピーせずこれを使うこと。
 *
 * 使う側は ::after に `content: ''; position: absolute; inset; z-index;
 * pointer-events: none;` と、出し入れの opacity / transform を自分で持つ。
 */
export const objectFilmLook = css`
  border-radius: var(--object-view-film-radius, 12px);
  background:
    /* 左上の光沢。シャボン玉の反射 */
    radial-gradient(
      115% 85% at 22% 16%,
      rgba(255, 255, 255, 0.6) 0%,
      rgba(255, 255, 255, 0) 58%
    ),
    /* 右下のほのかな色だまり */
    radial-gradient(
      90% 70% at 82% 88%,
      rgba(255, 228, 246, 0.5) 0%,
      rgba(255, 228, 246, 0) 60%
    ),
    /* 膜そのもの。桃 → 藤 → 水 → 若草 */
    linear-gradient(
      135deg,
      rgba(255, 158, 214, 0.44) 0%,
      rgba(190, 173, 255, 0.4) 34%,
      rgba(138, 219, 255, 0.36) 66%,
      rgba(178, 255, 231, 0.34) 100%
    );
  box-shadow:
    /* 膜のふち */
    inset 0 0 0 1px rgba(255, 255, 255, 0.6),
    inset 0 1px 6px rgba(255, 255, 255, 0.5),
    /* わずかに浮いて見せる */
    0 2px 12px rgba(122, 138, 214, 0.18);
`;

const ObjectSurface = styled.span<ComponentPropsWithoutRef<'span'>>`
  position: relative;
  /* 膜を必ず中身より前に出す。子が z-index を持っていても勝てるよう文脈を作る */
  isolation: isolate;

  &::after {
    content: '';
    position: absolute;
    /* 中身より一回り大きく張り出させる ＝「泡に包まれた」感じ */
    inset: -4px;
    z-index: 1;
    /* 膜は見えるだけ。クリックもドラッグも透かして中身に届かせる */
    pointer-events: none;
    opacity: 0;
    transform: scale(0.97);
    transition: opacity 160ms ease-out, transform 160ms ease-out;
    ${objectFilmLook}
  }

  &[data-film='on']:hover::after,
  &[data-film='on']:focus-visible::after {
    opacity: 1;
    transform: scale(1);
  }

  /*
   * 入れ子のとき（行の中のバッジ、セルの中のチップ）は内側が勝つ。
   * 開くときの stopPropagation と同じ決まりを見た目にも通す。
   * :has() が無いブラウザではこの規則だけ落ちて両方に膜が出る（膜が消えるより安全）。
   */
  &[data-film='on']:has([data-object-view]:hover)::after {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      transition: none;
    }
  }
`;
