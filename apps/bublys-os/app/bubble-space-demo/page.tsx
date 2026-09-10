"use client";
/**
 * bubble-space（新しい空間モデル）を memo バブリで試すデモ。
 *
 * 見どころ:
 *   - メモ一覧（リスト）からメモを開くと、エディタが**リストのすぐ右に、手前で大きく**出る。
 *     隣接はホストの座標系に入らないので、隣り合ったまま奥行きだけ別にできる。
 *   - リンクの帯が、リスト側のリンク位置からエディタへ伸びる（現行 LinkBubbleView 相当）。
 *   - 泡を他の泡へ近づけてドロップすると結合する（中へ=含む／辺の外=隣り合う）。
 *   - 軸に刺す次元とレンズを差し替えると、同じ泡の集合が別の見え方になる。
 */
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { addMemo, selectMemos } from "@bublys-org/memo-state";
import { MemoList, MemoEditor } from "@bublys-org/memo-feature";
import {
  BubbleSpaceView,
  Space,
  useBubbleSpace,
  defaultView,
  dimensions,
  LENSES,
  relationKind,
  beside,
  hole,
  type BubbleNode,
  type Placement,
} from "@bublys-org/bubble-space";

const LIST_ID = "memo-list";

/** リストの中の「リンクの居場所」。帯はここから伸びる。 */
const LINK_ANCHOR = hole(0.06, 0.8, 0.5, 0.1);

const seedMemo = (title: string, lines: string[]) => {
  const blocks: Record<string, { id: string; type: string; content: string }> = {};
  const ids: string[] = [];
  [title, ...lines].forEach((content, i) => {
    const id = `${title}-${i}`;
    blocks[id] = { id, type: "text", content };
    ids.push(id);
  });
  return { id: `memo-${title}`, blocks, lines: ids };
};

function initialSpace(): Space {
  return Space.empty().add({
    id: LIST_ID,
    title: "メモ一覧",
    ownSize: { w: 300, h: 260 },
    free: { x: -260, y: 0, z: 1 },
    hue: 205,
  });
}

export default function BubbleSpaceDemoPage() {
  const dispatch = useDispatch();
  const memos = useSelector(selectMemos);

  // 初回だけ、中身のあるメモを用意する
  useEffect(() => {
    if (memos.length > 0) return;
    [
      seedMemo("買い物", ["牛乳", "卵", "コーヒー豆"]),
      seedMemo("設計メモ", ["関係は意味、結合は配置", "隣接は画面上の接触"]),
      seedMemo("次にやること", ["DOM版を試す", "世界線とつなぐ"]),
    ].forEach((memo) => dispatch(addMemo({ memo })));
  }, [dispatch, memos.length]);

  const {
    space, setSpace, view, setView, resolved,
    containerRef, selectedId, magnetHint, dragging,
    onBubblePointerDown, onBubbleSelect, onResizePointerDown, onBackgroundPointerDown, onWheel,
    focusOnFront, focusOn,
  } = useBubbleSpace({ initialSpace: useMemo(initialSpace, []), initialView: defaultView() });

  const [showAnchors, setShowAnchors] = useState(true);

  /**
   * メモを開く。
   *   1. open() で最前面に置き、opened 関係（＝帯）を1本張る
   *   2. adjacent でリストの右隣に置く（縮尺は継承しないので、手前で大きいまま隣に並ぶ）
   */
  const openMemo = useCallback(
    (memoId: string) => {
      const id = `editor-${memoId}`;
      setSpace((s) => {
        if (s.bubble(id)) return s.relate({ kind: "adjacent", from: LIST_ID, to: id, anchor: beside("e") });
        const title = s.bubble(LIST_ID) ? memoId.replace(/^memo-/, "") : memoId;
        return s
          .open(LIST_ID, {
            id,
            title: `${title}`,
            ownSize: { w: 380, h: 300 },
            hue: 150,
            data: { view: "memo-editor", memoId },
          }, LINK_ANCHOR)
          .relate({ kind: "adjacent", from: LIST_ID, to: id, anchor: beside("e") });
      });
      setTimeout(focusOnFront, 0);
    },
    [setSpace, focusOnFront]
  );

  const renderBubble = useCallback(
    (node: BubbleNode, _p: Placement) => {
      if (node.id === LIST_ID) {
        return (
          <StyledPad>
            <MemoList onSelectMemo={openMemo} />
          </StyledPad>
        );
      }
      if (node.data?.["view"] === "memo-editor") {
        return (
          <StyledPad>
            <MemoEditor memoId={String(node.data["memoId"])} />
          </StyledPad>
        );
      }
      return null;
    },
    [openMemo]
  );

  const setAxis = (axis: "x" | "y" | "z", dimId: string) =>
    setView((v) => ({ ...v, axes: { ...v.axes, [axis]: dimId } }));

  const selected = selectedId ? space.bubble(selectedId) : undefined;
  const rels = selectedId
    ? space.relations.filter((r) => r.from === selectedId || r.to === selectedId)
    : [];

  return (
    <StyledPage>
      <StyledBar>
        <span className="e-label">軸</span>
        {(["x", "y", "z"] as const).map((axis) => (
          <select key={axis} value={view.axes[axis]} onChange={(e) => setAxis(axis, e.target.value)}>
            {Object.values(dimensions()).map((d) => (
              <option key={d.id} value={d.id}>
                {axis.toUpperCase()}: {d.label}
              </option>
            ))}
          </select>
        ))}
        <select value={view.lensId} onChange={(e) => setView((v) => ({ ...v, lensId: e.target.value }))}>
          {Object.values(LENSES).map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
        <span className="e-sep" />
        <button onClick={() => setView((v) => ({ ...v, quantize: !v.quantize }))} className={view.quantize ? "on" : ""}>
          Z量子化
        </button>
        <button onClick={() => setShowAnchors((s) => !s)} className={showAnchors ? "on" : ""}>
          アンカー
        </button>
        <button onClick={focusOnFront}>最前面を見る</button>
        {selectedId && <button onClick={() => focusOn(selectedId)}>選択に焦点</button>}
        <span className="e-sep" />
        <span className="e-status">
          泡 {space.bubbles.length} / 関係 {space.relations.length}
          {selected && (
            <>
              {" ｜ "}
              <b>{selected.title}</b>{" "}
              {rels.map((r) => `${r.from === selectedId ? "→" : "←"}${relationKind(r.kind).label}`).join(" ")}
            </>
          )}
        </span>
      </StyledBar>

      <StyledStage onWheel={onWheel}>
        <BubbleSpaceView
          space={space}
          resolved={resolved}
          renderBubble={renderBubble}
          containerRef={containerRef}
          selectedId={selectedId}
          magnet={magnetHint ? { rect: magnetHint.rect, label: magnetHint.label } : null}
          showAnchors={showAnchors}
          dragging={dragging}
          onBubblePointerDown={onBubblePointerDown}
          onBubbleSelect={onBubbleSelect}
          onResizePointerDown={onResizePointerDown}
          onBackgroundPointerDown={onBackgroundPointerDown}
          onBubbleDoubleClick={focusOn}
        />
      </StyledStage>

      <StyledHelp>
        メモをクリック … リストの右隣に手前で開く（帯でつながる）　ヘッダをドラッグ … 移動<br />
        他の泡へ近づけてドロップ … 結合（中へ=含む／辺の外=隣り合う）　引き剥がすと外れる<br />
        右下の角 … 大きさ　背景をドラッグ … 焦点　ホイール … 焦点のZ
      </StyledHelp>
    </StyledPage>
  );
}

// styled-components v5 + React 19 の型回避（リポジトリの他ライブラリと同じ流儀）
type DivProps = React.HTMLAttributes<HTMLDivElement>;

const StyledPage = styled.div<DivProps>`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #0b0d14;
  color: #e6ebf5;
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif;
`;

const StyledBar = styled.div<DivProps>`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: #141824;
  border-bottom: 1px solid #2a3145;
  font-size: 12px;

  .e-label { color: #8b95ad; letter-spacing: 0.05em; }
  .e-sep { width: 1px; height: 18px; background: #2a3145; }
  .e-status { color: #8b95ad; }
  .e-status b { color: #6ee7ff; }

  select, button {
    background: #1d2334;
    color: #e6ebf5;
    border: 1px solid #2a3145;
    border-radius: 6px;
    padding: 3px 8px;
    font: inherit;
    cursor: pointer;
  }
  button.on { background: #6ee7ff; color: #07202a; border-color: #6ee7ff; font-weight: 600; }
`;

const StyledStage = styled.div<DivProps>`
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
`;

const StyledHelp = styled.div<DivProps>`
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 100000;
  pointer-events: none;
  background: rgba(10, 12, 20, 0.86);
  border: 1px solid #2a3145;
  border-radius: 8px;
  padding: 8px 11px;
  color: #8b95ad;
  font-size: 11px;
  line-height: 1.7;
  text-align: right;
`;

/** memo バブリの中身は白背景前提なので、泡の中で読めるように器を用意する */
const StyledPad = styled.div<DivProps>`
  min-height: 100%;
  padding: 8px 10px;
  background: #f7f8fa;
  color: #1a1d24;
  font-size: 13px;
`;
