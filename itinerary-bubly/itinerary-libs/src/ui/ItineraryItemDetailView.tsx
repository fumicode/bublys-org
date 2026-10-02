'use client';
/**
 * 予定 1 件の詳細 ── **直すのはここ**。
 *
 * ★ 札から開く。札には打てる所を置かない（掴むものと打つものを同じ面に置かない）。
 *   そのぶんここは**広く取れる**ので、時刻も金額も種類も、窮屈でない大きさで出せる。
 * ★ **剥がすのと消すのは別**。もとがあるもの（メモから来た予定）を外すのは盤へ戻すこと、
 *   もとが無いものを外すのはそれきり ── 口の字も色も変える。
 */
import { ComponentPropsWithoutRef, FC, ReactNode, useEffect, useState } from "react";
import styled from "styled-components";
import {
  ItineraryItem_予定,
  formatMin,
  parseMin,
  type ItineraryKind_種類,
} from "../domain/ItineraryItem.domain.js";

export type ItineraryItemDetailViewProps = {
  item: ItineraryItem_予定;
  /** 何日の予定か（読むだけ） */
  date?: string;
  /** 立ち寄り先（掴める札。作るのは feature 層） */
  place?: ReactNode;
  onTitleChange?: (title: string) => void;
  onStartChange?: (startMin: number) => void;
  onEndChange?: (endMin: number) => void;
  onCostChange?: (cost: number) => void;
  onKindChange?: (kind: ItineraryKind_種類) => void;
  /** 外す。もとがあれば盤へ戻り、無ければそれきり */
  onRemove?: () => void;
};

const KINDS: ItineraryKind_種類[] = ["move", "meal", "sightseeing", "stay", "other"];

export const ItineraryItemDetailView: FC<ItineraryItemDetailViewProps> = ({
  item,
  date,
  place,
  onTitleChange,
  onStartChange,
  onEndChange,
  onCostChange,
  onKindChange,
  onRemove,
}) => {
  const [title, setTitle] = useState(item.title);
  const [cost, setCost] = useState(String(item.cost));
  useEffect(() => setTitle(item.title), [item.title]);
  useEffect(() => setCost(String(item.cost)), [item.cost]);

  const commitTitle = () => {
    const next = title.trim();
    // 名の無い予定は作らない。空にしたら元へ戻す
    if (!next) return setTitle(item.title);
    if (next !== item.title) onTitleChange?.(next);
  };
  const commitCost = () => {
    const next = Number(cost);
    if (!Number.isFinite(next)) return setCost(String(item.cost));
    if (next !== item.cost) onCostChange?.(next);
  };

  return (
    <StyledDetail>
      <header className="e-head">
        <span className="e-kind" style={{ background: ItineraryItem_予定.kindColor(item.kind) }} />
        <input
          className="e-field e-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setTitle(item.title);
          }}
        />
      </header>

      <dl className="e-rows">
        <dt>いつ</dt>
        <dd className="e-when">
          <input
            type="time"
            className="e-field"
            value={formatMin(item.startMin)}
            title="始まり（動かすと予定ごと動く）"
            onChange={(e) => {
              const v = parseMin(e.target.value);
              if (v !== undefined) onStartChange?.(v);
            }}
          />
          <span className="e-dash">〜</span>
          <input
            type="time"
            className="e-field"
            value={formatMin(item.endMin)}
            title="終わり（動かすと長さが変わる）"
            onChange={(e) => {
              const v = parseMin(e.target.value);
              if (v !== undefined) onEndChange?.(v);
            }}
          />
          {date && <span className="e-date">{date}</span>}
        </dd>

        <dt>種類</dt>
        <dd>
          <div className="e-kinds">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                className={`e-kind-btn ${k === item.kind ? "is-on" : ""}`}
                style={k === item.kind ? { background: ItineraryItem_予定.kindColor(k), borderColor: ItineraryItem_予定.kindColor(k) } : undefined}
                onClick={() => onKindChange?.(k)}
              >
                {ItineraryItem_予定.kindLabel(k)}
              </button>
            ))}
          </div>
        </dd>

        <dt>費用</dt>
        <dd className="e-money">
          {item.costNote ? (
            <span className="e-note" title="別勘定">{item.costNote}</span>
          ) : (
            <>
              <span className="e-yen">¥</span>
              <input
                type="number"
                min={0}
                step={10}
                className="e-field e-cost"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                onBlur={commitCost}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setCost(String(item.cost));
                }}
              />
            </>
          )}
        </dd>

        <dt>立ち寄り先</dt>
        <dd>{place ?? <span className="e-none">—</span>}</dd>
      </dl>

      {onRemove && (
        <footer className="e-foot">
          <button
            type="button"
            className={`e-remove ${item.from ? "is-peel" : ""}`}
            onClick={onRemove}
          >
            {item.from ? "↩ 剥がして盤に戻す" : "✕ この予定を消す"}
          </button>
        </footer>
      )}
    </StyledDetail>
  );
};

const StyledDetail = styled.div<ComponentPropsWithoutRef<'div'>>`
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font: 13px/1.7 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  /* 欄は触れるまで欄に見えない（旅程の一覧と同じ決まり） */
  .e-field {
    font: inherit;
    color: inherit;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 1px 4px;
    min-width: 0;
  }
  .e-field:hover { border-color: rgba(0, 0, 0, 0.18); }
  .e-field:focus { outline: none; border-color: #1f6fd0; background: #fff; }

  .e-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .e-kind { width: 5px; height: 22px; border-radius: 3px; flex-shrink: 0; }
  .e-title { flex: 1; font-size: 15px; font-weight: bold; }

  .e-rows { display: grid; grid-template-columns: 5.5em 1fr; gap: 6px 10px; margin: 0; align-items: center; }
  dt { color: #6b7280; }
  dd { margin: 0; min-width: 0; }

  .e-when { display: flex; align-items: center; gap: 2px; font-variant-numeric: tabular-nums; }
  .e-when .e-field { width: 84px; }
  .e-dash { color: #9aa1ab; }
  .e-date { margin-left: 8px; color: #9aa1ab; font-size: 0.85em; }

  .e-kinds { display: flex; gap: 4px; flex-wrap: wrap; }
  .e-kind-btn {
    padding: 2px 8px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    border-radius: 11px;
    background: #fff;
    font-size: 11px;
    color: #4a5568;
    cursor: pointer;
  }
  .e-kind-btn.is-on { color: #fff; font-weight: bold; }

  .e-money { display: flex; align-items: center; gap: 2px; }
  .e-yen { color: #9aa1ab; }
  .e-cost { width: 90px; text-align: right; -moz-appearance: textfield; }
  .e-cost::-webkit-outer-spin-button,
  .e-cost::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .e-note { color: #6b7280; }
  .e-none { color: #b6bcc5; }

  .e-foot { margin-top: auto; padding-top: 12px; }
  .e-remove {
    padding: 4px 12px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    border-radius: 13px;
    background: #fff;
    font-size: 12px;
    color: #c0392b;
    cursor: pointer;
  }
  /* 剥がすのは戻すことなので、消す色にしない */
  .e-remove.is-peel { color: #3d6ea8; }
`;
