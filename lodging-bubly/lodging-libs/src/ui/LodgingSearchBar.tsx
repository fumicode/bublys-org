"use client";
/**
 * **宿を探す口** ── 一覧の上に出る 1 本の帯。
 *
 * > 何軒あって、いま何軒出ているのかを**必ず言う**。
 *
 * ★ 黙って切らない。1,516 軒のうち 40 軒しか出していないことを言わないと、
 *   「探しても出てこない」と読まれる。
 * ★ **選択肢は手元から数えて出す**。決め打ちの一覧を持つと、調べ物を足したときに
 *   ここだけ古くなる。
 * ★ 変換の最中の Enter で閉じない（`isCommitKey`）── 日本語で探すので。
 */
import { FC } from "react";
import { isCommitKey } from "@bublys-org/bubbles-ui";
import type { LodgingQuery } from "../domain/lodgingSearch.js";

export type LodgingSearchBarProps = {
  readonly query: LodgingQuery;
  readonly onChange: (next: LodgingQuery) => void;
  readonly shown: number;
  readonly total: number;
  readonly kinds: ReadonlyArray<{ value: string; count: number }>;
  readonly areas: ReadonlyArray<{ value: string; count: number }>;
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
  padding: "3px 7px",
  border: "1px solid #cbd5e0",
  borderRadius: 6,
  font: "inherit",
  background: "#fff",
};

export const LodgingSearchBar: FC<LodgingSearchBarProps> = ({
  query, onChange, shown, total, kinds, areas, cities,
}) => (
  <div style={bar} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
    <input
      style={{ ...field, flex: "1 1 120px", minWidth: 80 }}
      value={query.text ?? ""}
      placeholder="宿の名前・エリア・住所で探す"
      onChange={(e) => onChange({ ...query, text: e.target.value })}
      onKeyDown={(e) => { if (isCommitKey(e)) e.currentTarget.blur(); }}
    />
    <select
      style={field}
      value={query.kind ?? ""}
      onChange={(e) => onChange({ ...query, kind: e.target.value || undefined })}
    >
      <option value="">区分</option>
      {kinds.map(({ value, count }) => (
        <option key={value} value={value}>{value}（{count}）</option>
      ))}
    </select>
    <select
      style={field}
      value={query.area ?? ""}
      onChange={(e) => onChange({ ...query, area: e.target.value || undefined })}
    >
      <option value="">エリア・温泉地</option>
      {areas.map(({ value, count }) => (
        <option key={value} value={value}>{value}（{count}）</option>
      ))}
    </select>
    <select
      style={field}
      value={query.city ?? ""}
      onChange={(e) => onChange({ ...query, city: e.target.value || undefined })}
    >
      <option value="">市町村</option>
      {cities.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
    {/* ★ いちばん右。**数は最後まで見えている所に置く** */}
    <span style={{ marginLeft: "auto", color: "#718096", whiteSpace: "nowrap" }}>
      {total === 0 ? "見つかりません" : shown < total ? `${total} 軒のうち ${shown} 軒` : `${total} 軒`}
    </span>
  </div>
);
