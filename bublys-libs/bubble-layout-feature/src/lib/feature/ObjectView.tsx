/**
 * ObjectView ── オブジェクトを指す UI。泡ではないが、**泡を開く起点になりうる**。
 *
 * 既存 `bubbles-ui/object-view/ObjectView.tsx` の写しだが、**3つ落とした**（DECISIONS.md）：
 *
 * | 旧 | ここ |
 * |---|---|
 * | `openingPosition`（どこに置くか） | **無い。** 親の View が決める（規則①④） |
 * | `canOpenBubble`（url ＋ 位置指定 or 登録） | **url が route に当たるかどうかだけ** |
 * | 膜を出す条件に位置指定が混ざる | **掴めるか・開けるかだけ** |
 *
 * ★ ここは `bubble-layout`（domain）に入らない。domain へ行くのは動詞（`openAt`）だけ。
 */
import { useCallback } from 'react';
import type { CSSProperties, DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useBubbleSpace, useCurrentBubble } from './context.js';

export interface ObjectViewProps {
  /** オブジェクトの url（`"csv-importer/sheets/s1/objects/r3"`） */
  readonly url?: string;
  /** 掴んだとき・開いたときの名前 */
  readonly label?: string;
  readonly children: ReactNode;
  readonly onClick?: () => void;
  /** 明示すると「開く」より優先 */
  readonly onDoubleClick?: () => void;
  readonly draggable?: boolean;
  readonly fullWidth?: boolean;
  readonly className?: string;
  /**
   * @deprecated **受け取るが、何もしない。** 旧 bubbles-ui からの移行のためだけに残してある口。
   *
   * どこに置くかは**親の View が決める**（規則①④）ので、使う側が位置を指定する道はもう無い。
   * これがあることで、バブリ側の画面を1文字も変えずに載せ替えられる
   * （検証：docs/bubble-space-prototype/v6-bubly）。移行が済んだら消す。
   */
  readonly openingPosition?: string;
  /** @deprecated 旧 bubbles-ui の口。url が route に当たるかどうかで決まるので要らない */
  readonly type?: string;
  /** @deprecated 旧 bubbles-ui の口。url を直接渡す */
  readonly object?: unknown;
  /** @deprecated 旧 bubbles-ui の口 */
  readonly id?: string;
}

export function ObjectView({
  url, label, children, onClick, onDoubleClick,
  draggable = true, fullWidth = false, className,
}: ObjectViewProps) {
  const space = useBubbleSpace();
  const here = useCurrentBubble();

  // ★ 開けるかどうかは「url が route に当たるか」だけ。位置の指定は要らない
  const canOpenBubble = !!url && space.canOpen(url);
  const hasDoubleClickAction = !!onDoubleClick || canOpenBubble;
  const canDrag = draggable && !!url;
  /** 膜は「掴める・開ける」の合図。出たら必ず何かできる、を守る */
  const showFilm = canDrag || hasDoubleClickAction;
  const isInteractive = !!onClick || hasDoubleClickAction;

  const open = useCallback(() => {
    if (onDoubleClick) { onDoubleClick(); return; }
    if (canOpenBubble && url) space.openBubble(url, here, label);
  }, [onDoubleClick, canOpenBubble, url, space, here, label]);

  const onDragStart = useCallback(
    (e: ReactDragEvent) => {
      if (!url) return;
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/uri-list', url);
      e.dataTransfer.setData('application/x-bubble-url', url);
      if (label) e.dataTransfer.setData('text/plain', label);
      if (here) e.dataTransfer.setData('application/x-bubble-opener', here);
    },
    [url, label, here],
  );

  const style: CSSProperties = {
    display: fullWidth ? 'flex' : 'inline-flex',
    width: fullWidth ? '100%' : undefined,
    cursor: isInteractive ? 'pointer' : undefined,
    userSelect: hasDoubleClickAction ? 'none' : undefined,
  };

  return (
    <span
      data-object-view=""
      data-film={showFilm ? 'on' : 'off'}
      className={'bl-object' + (className ? ' ' + className : '')}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      style={style}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onClick={onClick}
      /**
       * ObjectView は入れ子になる（行の中のバッジ、セルの中のチップ）。
       * 開くべきなのは「指した本人」なので、内側で止めて外側へ渡さない。
       */
      onDoubleClick={hasDoubleClickAction ? (e) => { e.stopPropagation(); open(); } : undefined}
      /**
       * キーボードには「ダブルクリック」に当たる打鍵が無い。
       * `role="button"` を名乗っている以上、Enter で無反応なほうが不具合。
       */
      onKeyDown={
        isInteractive
          ? (e: ReactKeyboardEvent) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              if (hasDoubleClickAction) open(); else onClick?.();
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
