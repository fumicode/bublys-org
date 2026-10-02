"use client";
/**
 * **地点を探す口** ── 一覧の上に出る 1 本の帯。
 *
 * > 何件あって、いま何件出ているのかを**必ず言う**。
 *
 * ★ 黙って切らない。793 件のうち 40 件しか出していないことを言わないと、
 *   「探しても出てこない」と読まれる。
 * ★ **目印は手元から数えて出す**（`countTags`）。決め打ちの一覧を持つと、
 *   調べ物を足したときにここだけ古くなる。
 * ★ 変換の最中の Enter で閉じない（`isCommitKey`）── 日本語で探すので。
 *
 * ★ **どんな幅でも見切れない。** 1 本に詰めると、窓を細くしたときに右から順に
 *   隠れていく ── いちばん右に置いた「何件中 何件」が真っ先に消えるので、
 *   いちばん消えてほしくないものから消えていた。**折り返して段を増やす**。
 * ★ 段が増えれば背が伸びる。並びの器（`ListSpace`）は口の高さを**測らない**
 *   （「置く側が言う」決まり）ので、**帯が自分の背丈を申告する**（`onHeightChange`）。
 *   器が中身を測ると箱と追いかけ合うが、こちらは一方通行なので回らない
 *   ── 帯の幅は箱の幅だけで決まり、帯の背丈には依らない。
 */
import { FC, useEffect, useRef } from "react";
import { getDragType, isCommitKey, setDragPayload } from "@bublys-org/bubbles-ui";
import type { SpotQuery } from "../domain/spotSearch.js";
import {
  FOUND_SPOTS_TYPE,
  describeSpotQuery,
  encodeSpotQuery,
  foundSpotsUrl,
} from "../domain/foundSpots.js";

export type SpotSearchBarProps = {
  readonly query: SpotQuery;
  readonly onChange: (next: SpotQuery) => void;
  /** いま出ている数と、見つかった数 */
  readonly shown: number;
  readonly total: number;
  /** 押して絞れる目印（多い順・上から少しだけ） */
  readonly tags: ReadonlyArray<{ tag: string; count: number }>;
  readonly cities: readonly string[];
  /** 何件目から出しているか（0 始まり）と、一度に出す数 */
  readonly offset: number;
  readonly limit: number;
  /** 頁を送る（渡す値は「何件目から」） */
  readonly onOffsetChange: (next: number) => void;
  /** 折り返して背が変わったら知らせる（器の `headHeight` になる） */
  readonly onHeightChange?: (height: number) => void;
};

const bar: React.CSSProperties = {
  display: "flex",
  /** ★ **折り返す。** これが「どんな幅でも見切れない」の本体 */
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  width: "100%",
  boxSizing: "border-box",
  /**
   * ★ **器の引き伸ばしから外れる**（親は `alignItems: "stretch"`）。
   *   外さないと帯は「器が決めた高さ」になり、**自分の背丈を измерить できない**
   *   ── 申告する値がいつも器の高さと同じになって、折り返しても広がらない
   *   （実測：中身は 86 要るのに 30 と申告し続けた）。外しておけば中身なりの背丈になり、
   *   狭くなれば伸び、広くなれば縮む。
   */
  alignSelf: "flex-start",
  font: "12px/1.4 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif",
  color: "#2d3748",
};

const field: React.CSSProperties = {
  flex: "1 1 120px",
  /** ★ **0 まで縮んでよい。** 縮めないと、入らない幅で箱から溢れて切れる */
  minWidth: 0,
  padding: "3px 7px",
  border: "1px solid #cbd5e0",
  borderRadius: 6,
  font: "inherit",
  background: "#fff",
};

/**
 * **探した結果そのものを掴む札。**
 *
 * > 探した結果を掴んで地図へ落とせば、当たったものが全部ピンになる。
 *
 * ★ 1 件ずつ運ばせない ── 243 件を地図に出したい人に 243 回掴ませることになる。
 * ★ **この帯の中に置く**。帯は自分の背丈を申告していて、器はその高さぶん
 *   並びを下げる（`reserveFor`）。外に置くと、札のぶんだけ並びに被る。
 */
const grab: React.CSSProperties = {
  padding: "2px 8px",
  border: "1px dashed #2f7fd6",
  borderRadius: 10,
  background: "#eef5fd",
  color: "#2f7fd6",
  cursor: "grab",
  whiteSpace: "nowrap",
  font: "inherit",
  userSelect: "none",
};

/** 頁を送る口。送れないときは押せないと分かる見た目にする */
const step = (can: boolean): React.CSSProperties => ({
  padding: "1px 6px",
  border: "1px solid #cbd5e0",
  borderRadius: 4,
  background: "#fff",
  color: can ? "#4a5568" : "#cbd5e0",
  cursor: can ? "pointer" : "default",
  font: "inherit",
  lineHeight: 1.4,
});

const chip = (on: boolean): React.CSSProperties => ({
  padding: "2px 7px",
  border: `1px solid ${on ? "#2f7fd6" : "#cbd5e0"}`,
  borderRadius: 10,
  background: on ? "#2f7fd6" : "#fff",
  color: on ? "#fff" : "#4a5568",
  cursor: "pointer",
  whiteSpace: "nowrap",
  font: "inherit",
});

export const SpotSearchBar: FC<SpotSearchBarProps> = ({
  query, onChange, shown, total, tags, cities, offset, limit, onOffsetChange, onHeightChange,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  /** 背丈が変わったら申告する。幅の変化（折り返し）で呼ばれる */
  useEffect(() => {
    const el = ref.current;
    if (!el || !onHeightChange) return;
    const tell = () => onHeightChange(Math.ceil(el.getBoundingClientRect().height));
    tell();
    const ro = new ResizeObserver(tell);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeightChange]);

  const toggleTag = (tag: string) => {
    const have = query.tags ?? [];
    const next = have.includes(tag) ? have.filter((t) => t !== tag) : [...have, tag];
    onChange({ ...query, tags: next });
  };

  return (
    <div ref={ref} style={bar} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <input
        style={field}
        value={query.text ?? ""}
        placeholder="名前・住所・目印で探す"
        onChange={(e) => onChange({ ...query, text: e.target.value })}
        onKeyDown={(e) => { if (isCommitKey(e)) e.currentTarget.blur(); }}
      />
      <select
        style={{ ...field, flex: "0 0 auto", minWidth: 0 }}
        value={query.city ?? ""}
        onChange={(e) => onChange({ ...query, city: e.target.value || undefined })}
      >
        <option value="">市町村</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {tags.map(({ tag, count }) => (
        <button
          key={tag}
          style={chip((query.tags ?? []).includes(tag))}
          title={`${tag}（${count} 件）`}
          onClick={() => toggleTag(tag)}
        >{tag}</button>
      ))}
      {/*
        ★ **数と頁送りは 1 かたまりにして、最後の段へ回す**（`marginLeft: auto`）。
          広ければ右端、狭ければ次の段へ丸ごと落ちる ── 数だけが千切れて消えない。
      */}
      {total > 0 && (
        <span
          style={grab}
          draggable
          title={`この結果 ${total} 件をまとめて掴む（地図に落とすと全部出ます）`}
          onDragStart={(e) => {
            const id = encodeSpotQuery(query);
            setDragPayload(e, {
              type: getDragType(FOUND_SPOTS_TYPE),
              url: foundSpotsUrl(id),
              label: `${describeSpotQuery(query)}（${total} 件）`,
              objectId: id,
            });
          }}
        >
          ⊞ この結果 {total} 件
        </span>
      )}

      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
        <button
          style={step(offset > 0)}
          disabled={offset <= 0}
          title="前の 40 件"
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >◀</button>
        <span style={{ color: "#718096" }}>
          {total === 0
            ? "見つかりません"
            : total <= limit
              ? `${total} 件`
              : `${offset + 1}–${offset + shown} / ${total} 件`}
        </span>
        <button
          style={step(offset + limit < total)}
          disabled={offset + limit >= total}
          title="次の 40 件"
          onClick={() => onOffsetChange(offset + limit)}
        >▶</button>
      </span>
    </div>
  );
};
