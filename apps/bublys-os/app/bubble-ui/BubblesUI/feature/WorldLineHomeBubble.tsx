"use client";
/**
 * **この空間の世界線** ── 1 つの泡として。ただし**大きさで姿が変わる**（ポケットと同じ決まり）。
 *
 * > **大きければ自分が世界線を映し、小さければアイコンになる。**
 *
 * ★ 岸に貼ってあるときは 48×48 なのでアイコン。押すと**新しい泡**が開いて、そちらが
 *   世界線を映す ── ポケットは押すと面が浮かび上がる（泡ではない）が、世界線は
 *   **開いた先も泡**にする。世界線は見ながら他のことをするものなので、
 *   置き場所も大きさも海の決まりに従えたほうがよい。
 * ★ 開く先は**同じ url**（`world-lines`）── つまり出てくるのは自分の複製で、
 *   そちらは広いので世界線を映す。姿の違いは大きさだけで、別の作りは要らない。
 */
import { FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { WorldLineScopeView, useScopeNodeSummaries, moveToSiblingBranch } from "@bublys-org/bubbles-ui";
import { useCasScope } from "@bublys-org/world-line-graph";
import { SEA_ARRANGEMENT_ID, SEA_ARRANGEMENT_TYPE, type SeaArrangement } from "@bublys-org/bubble-space-shell";
import { useCurrentBubble } from "@bublys-org/bubble-layout-feature";

/** この泡の url。押して開く先も同じ（自分の複製） */
export const WORLD_LINES_URL = "world-lines";

/** 大元の海の世界線を置く名前（`BubblesUINext` が記録に使うのと同じ） */
export const ROOT_SEA_SCOPE = "root";

/** 節目の要約 ── その時点で海に浮かんでいた泡の数 */
const countBubbles = (v: unknown) => `${(v as SeaArrangement).state.snapshot.urls.length}`;

/**
 * アイコンだけにする大きさ。**「木が 2 段ぶん見えないなら、映す意味がない」**で決める。
 *
 *   横: 余白 28×2 ＋ 世代 2 つぶん 70（`COL_DX`）  ＝ 126 → 余裕を見て 170
 *   縦: 余白 28×2 ＋ 分岐 2 本ぶん 40（`ROW_DY`）  ＝ 96  → 余裕を見て 120
 *
 * （数は `WorldLinesCanvasView` の COL_DX / ROW_DY / MARGIN から）
 */
const COMPACT = { width: 170, height: 120 };

export const WorldLineHomeBubble: FC = () => {
  const { openBubble } = useContext(BubblesContext);
  /** 開いた先が「どこから出たか」を辿れるように、自分を親として渡す */
  const me = useCurrentBubble() ?? "root";

  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 大きさは**レイアウトの px**で見る（泡に掛かる倍率の影響を受けない側。ポケットと同じ）
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** 測る前（0）は広いものとして扱う ── 一瞬アイコンが見えて消える、を避ける */
  const compact =
    size.width > 0 && (size.width < COMPACT.width || size.height < COMPACT.height);

  return (
    <div ref={ref} style={{ width: "100%", height: "100%" }}>
      {compact ? (
        <Tooltip title="この空間の世界線" placement="left">
          <IconButton
            size="small"
            sx={{ width: "100%", height: "100%", color: "#9ec1ff" }}
            onClick={() => openBubble(WORLD_LINES_URL, me)}
          >
            <AccountTreeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <SeaWorldLineView />
      )}
    </div>
  );
};

/**
 * 海の世界線そのもの。
 *
 * ★ `bubbles-ui` の `WorldLinesBubble` は**旧い海の並び**（`BubbleArrangement`）を読むので、
 *   いまの海の節目は映らない。読む型が違うだけなので、同じ見本（`WorldLineScopeView`）に
 *   こちらの型を渡す。
 */
const SeaWorldLineView: FC = () => {
  const scope = useCasScope(ROOT_SEA_SCOPE);
  const getNodeSummary = useScopeNodeSummaries(
    scope,
    SEA_ARRANGEMENT_TYPE,
    SEA_ARRANGEMENT_ID,
    countBubbles,
  );
  const keyBindings = useMemo(
    () => [
      { keys: "mod+z", run: scope.moveBack },
      { keys: "mod+shift+z", run: scope.moveForward },
      { keys: "ArrowLeft", run: scope.moveBack },
      { keys: "ArrowRight", run: scope.moveForward },
      { keys: "ArrowUp", run: () => moveToSiblingBranch(scope, -1) },
      { keys: "ArrowDown", run: () => moveToSiblingBranch(scope, 1) },
    ],
    [scope],
  );
  return <WorldLineScopeView scope={scope} getNodeSummary={getNodeSummary} keyBindings={keyBindings} />;
};

export default WorldLineHomeBubble;
