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
import { CSSProperties, FC, useContext, useMemo } from "react";
import { IconButton, Tooltip } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { BubblesContext, useBubbleBox } from "@bublys-org/bubbles-ui";
import { WorldLineScopeView, useScopeNodeSummaries, moveToSiblingBranch } from "@bublys-org/bubbles-ui";
import { useCasScope } from "@bublys-org/world-line-graph";
import {
  SEA_ARRANGEMENT_ID,
  SEA_ARRANGEMENT_TYPE,
  toSeaSeed,
  type SeaArrangement,
} from "@bublys-org/bubble-space-shell";
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
 *
 * ★ **畳むのは、縦も横も足りないときだけ**（ランチャーと同じ「かつ」）。片方に余地が
 *   あるなら中身を出して、はみ出すぶんは転がして見る ── 箱が短いことと、中身が多い
 *   ことは別の話で、短い箱に合わせて姿を落としても中身の数は減らない。
 *   （木は箱に合わせて描かれるので、細長ければ細長いなりに映る）
 */
const COMPACT = { width: 170, height: 120 };

export const WorldLineHomeBubble: FC = () => {
  const { openBubble } = useContext(BubblesContext);
  /** 開いた先が「どこから出たか」を辿れるように、自分を親として渡す */
  const me = useCurrentBubble() ?? "root";

  /**
   * 描ける大きさは**海が測って配る**（`BubbleBoxContext`）── 自分では測らない。
   * 配られる前（`null`）は広いものとして扱う ── 一瞬アイコンが見えて消える、を避ける。
   */
  const box = useBubbleBox();
  const compact = !!box && box.width < COMPACT.width && box.height < COMPACT.height;

  return (
    <div style={{ width: "100%", height: "100%" }}>
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
 * **世界線の板** ── 暗いすりガラスに淡い縁。世界線は自分で地を持つ（海は地を敷かない）。
 *
 * ★ 地を持たないと、皮を着た海では木だけが背景の絵の上に浮いて、どこまでが世界線か分からない。
 *   ほかの泡（地図・囲碁）は枠が無くても中身が形を持つが、世界線は線と点だけなので、
 *   窓として枠を着る。
 * ★ 暗いほうに寄せるのは、木の線を明るい色で描いているから（明るい板だと読みにくい）。
 */
const WORLD_LINE_PANEL: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  borderRadius: "inherit",
  overflow: "hidden",
  background: "linear-gradient(180deg,rgba(22,27,46,.86) 0%,rgba(16,20,36,.9) 100%)",
  backdropFilter: "blur(12px) saturate(1.2)",
  WebkitBackdropFilter: "blur(12px) saturate(1.2)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.22), 0 8px 28px rgba(10,14,30,.35)",
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
  return (
    <div style={WORLD_LINE_PANEL}>
      <WorldLineScopeView scope={scope} getNodeSummary={getNodeSummary} keyBindings={keyBindings} />
      <ExportSeedButton />
    </div>
  );
};

/**
 * **いまの節の姿を、ファイルに書き出す口。**
 *
 * > **ブラウザの中にある姿を、外へ持ち出せるようにする。**
 *
 * ★ 書き出すのは**いま居る節**の姿（世界線で戻っていれば、戻った先）。
 *   画面に見えているものと、書き出したものが同じになる。
 * ★ ここに置くのは、世界線の泡が「いまどの節か」を映すものだから ── 何を書き出すかが
 *   目の前に見えている。
 */
const ExportSeedButton: FC = () => {
  const scope = useCasScope(ROOT_SEA_SCOPE);
  const there = scope.getShell<SeaArrangement>(SEA_ARRANGEMENT_TYPE, SEA_ARRANGEMENT_ID)?.object ?? null;
  const exportSeed = () => {
    if (!there) return;
    const seed = toSeaSeed(there, { w: window.innerWidth, h: window.innerHeight });
    const blob = new Blob([JSON.stringify(seed, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sea-seed.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <Tooltip title={there ? "いまの節の姿を書き出す（sea-seed.json）" : "まだ記録が無い"} placement="left">
      {/* 押せないときも Tooltip が出るように span で包む */}
      <span style={{ position: "absolute", top: 4, right: 4 }}>
        <IconButton size="small" disabled={!there} onClick={exportSeed} sx={{ color: "#9ec1ff" }}>
          <FileDownloadIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default WorldLineHomeBubble;
