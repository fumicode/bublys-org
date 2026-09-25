"use client";
/**
 * **このデモの読み方** ── 1 つのバブルとして。ただし**大きさで姿が変わる**
 * （ポケット・世界線と同じ決まり）。
 *
 * > **大きければ説明の一覧を映し、小さければアイコンになる。**
 *
 * ★ ふちに貼ってある 48×48 のときはアイコン。押すと**新しいバブル**（自分の複製）が
 *   開いて、広いそちらが一覧を映す ── 世界線と同じ手ざわりにしてある。
 * ★ 一覧は**並びの空間**（`ListSpace`）。ほかの一覧と同じく札が 1 枚ずつバブルなので、
 *   7 つの並べ方がそのまま効く ── 説明の画面だけ並べ替えられないのは、
 *   ここで説明していることと食い違う。
 */
import { FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { LIST_CARD_WIDTH, ListSpace, useCurrentBubble } from "@bublys-org/bubble-layout-feature";
import { GUIDE_ENTRIES } from "./guideEntries";

/** この泡の url。押して開く先も同じ（自分の複製） */
export const GUIDE_URL = "guide";

/** 札 1 枚の中身の大きさ（見出し ＋ 1 行なので、ほかの一覧の札と同じ丈） */
export const GUIDE_CARD = { w: LIST_CARD_WIDTH, h: 54 } as const;

/**
 * アイコンだけにする大きさ。**「見出しと 1 行が読めないなら、映す意味がない」**で決める。
 *
 *   横: 並びの余白 14×2 ＋ 札が読める幅 ＝ おおよそ 200
 *   縦: 並びの余白 14×2 ＋ 札 54 ＋ 口の段 40 ＝ おおよそ 120
 */
const COMPACT = { width: 200, height: 120 };

export const GuideHomeBubble: FC = () => {
  const { openBubble } = useContext(BubblesContext);
  const me = useCurrentBubble() ?? "root";

  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 大きさは**レイアウトの px**で見る（バブルに掛かる倍率の影響を受けない側。ポケットと同じ）
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
  const compact = size.width > 0 && (size.width < COMPACT.width || size.height < COMPACT.height);

  const members = useMemo(() => GUIDE_ENTRIES.map((e) => `guide/${e.id}/card`), []);

  return (
    <div ref={ref} style={{ width: "100%", height: "100%" }}>
      {compact ? (
        <Tooltip title="このデモの読み方" placement="left">
          <IconButton
            size="small"
            sx={{ width: "100%", height: "100%", color: "#9ec1ff" }}
            onClick={() => openBubble(GUIDE_URL, me)}
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <ListSpace members={members} itemWidth={GUIDE_CARD.w} itemHeight={GUIDE_CARD.h} />
      )}
    </div>
  );
};

export default GuideHomeBubble;
