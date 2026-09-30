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
 */
import { FC } from "react";
import { isCommitKey } from "@bublys-org/bubbles-ui";
import type { SpotQuery } from "../domain/spotSearch.js";

export type SpotSearchBarProps = {
  readonly query: SpotQuery;
  readonly onChange: (next: SpotQuery) => void;
  /** いま出ている数と、見つかった数 */
  readonly shown: number;
  readonly total: number;
  /** 押して絞れる目印（多い順・上から少しだけ） */
  readonly tags: ReadonlyArray<{ tag: string; count: number }>;
  readonly cities: readonly string[];
};

const bar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "0 8px",
  height: "100%",
  font: "12px/1.4 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif",
  color: "#2d3748",
};

const field: React.CSSProperties = {
  flex: "1 1 120px",
  minWidth: 80,
  padding: "3px 7px",
  border: "1px solid #cbd5e0",
  borderRadius: 6,
  font: "inherit",
  background: "#fff",
};

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
  query, onChange, shown, total, tags, cities,
}) => {
  const toggleTag = (tag: string) => {
    const have = query.tags ?? [];
    const next = have.includes(tag) ? have.filter((t) => t !== tag) : [...have, tag];
    onChange({ ...query, tags: next });
  };

  return (
    <div style={bar} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
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
      {/* ★ いちばん右。**数は最後まで見えている所に置く** */}
      <span style={{ marginLeft: "auto", color: "#718096", whiteSpace: "nowrap" }}>
        {total === 0 ? "見つかりません" : shown < total ? `${total} 件のうち ${shown} 件` : `${total} 件`}
      </span>
    </div>
  );
};
