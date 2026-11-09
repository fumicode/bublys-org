'use client';

import { FC } from "react";
import { css } from "styled-components";
import type { ProfileItem, ProfileValue } from "../domain/index.js";

/** 値の表示（記号があれば前に付ける。例: 「🔰 新人」） */
export const profileValueText = (v: ProfileValue): string =>
  v.symbol ? `${v.symbol} ${v.label}` : v.label;

const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

type Props = {
  /** 辞書の項目 */
  item: ProfileItem;
  /**
   * 自分の値。inherited を渡したとき（勤務表での上書き）は上書きの値で、undefined なら
   * 上書きしていない（＝既定値のまま）。渡さないとき（店舗での既定）は undefined も空も「未設定」
   */
  value: readonly string[] | undefined;
  /** 渡すと勤務表での上書きとして扱う。既定値（その人の店舗での値） */
  inherited?: readonly string[];
  /** undefined は上書きを外す（既定値に戻す）。空配列は「何も無い」 */
  onChange: (valueIds: readonly string[] | undefined) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * スタッフプロファイルの辞書の項目1つぶんの値を選ぶ（#236）。
 * スタッフ詳細と勤務スタッフバブルが共有する。
 *
 *   - 1つ選ぶ項目 … 値を並べたボタン（ラジオと同じ）。選んでいる値をもう一度押すと外れる
 *   - 複数選ぶ項目 … チェックの並び
 *
 * 勤務表での上書き（inherited を渡す）のルール:
 *   - 選択肢は値だけ。「既定（◯◯）」という選択肢は作らない（既定と同じ結果の入力が2つになる）。
 *     既定の値には小さく「既定」と印を付けて見せる
 *   - **既定と同じ値を選んだら、上書きを外す**（同じ結果になる状態を2通り持たない）
 *   - 上書きしているときだけ、色を変えて「既定に戻す」を出す
 */
export const ProfileItemSelect: FC<Props> = ({
  item,
  value,
  inherited,
  onChange,
  disabled,
  className,
}) => {
  const overriding = inherited !== undefined;
  const overridden = overriding && value !== undefined;
  const current = value ?? inherited ?? [];

  const commit = (next: readonly string[]) =>
    onChange(overriding && sameIds(next, inherited) ? undefined : next);
  const choose = (id: string) => {
    if (item.choice === "one") commit(current.includes(id) ? [] : [id]);
    else commit(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  return (
    <span className={`${className ?? ""}${overridden ? " is-overridden" : ""}`}>
      {item.values.map((v) => {
        const on = current.includes(v.id);
        const isDefault = overriding && inherited.includes(v.id);
        return item.choice === "one" ? (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`e-profile-choice${on ? " is-on" : ""}`}
            disabled={disabled}
            title={on ? `${v.label}（もう一度押すと外れる）` : v.label}
            onClick={() => choose(v.id)}
          >
            {profileValueText(v)}
            {isDefault && <span className="e-profile-default">既定</span>}
          </button>
        ) : (
          <label key={v.id} className="e-profile-check">
            <input type="checkbox" checked={on} disabled={disabled} onChange={() => choose(v.id)} />
            {profileValueText(v)}
            {isDefault && <span className="e-profile-default">既定</span>}
          </label>
        );
      })}
      {overridden && (
        <button
          type="button"
          className="e-profile-inherit"
          disabled={disabled}
          title="この勤務表での上書きをやめて、スタッフの既定値に戻す"
          onClick={() => onChange(undefined)}
        >
          既定に戻す
        </button>
      )}
    </span>
  );
};

/**
 * ProfileItemSelect の見た目。置き場所（スタッフ詳細・勤務スタッフの表）の styled に差し込む。
 * 上書きしている欄は緑（休みの形の上書きと同じ色）。
 */
export const profileItemSelectStyles = css`
  .e-profile-select {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 3px 6px;
    font-size: 0.85em;
  }
  .e-profile-choice {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    border: 1px solid #cfd8dc;
    border-radius: 999px;
    background: #fff;
    color: #546e7a;
    font: inherit;
    padding: 1px 8px;
    cursor: pointer;
    white-space: nowrap;
    &:hover:not(:disabled) {
      border-color: #90a4ae;
    }
    &.is-on {
      border-color: #546e7a;
      background: #eceff1;
      color: #263238;
      font-weight: bold;
    }
  }
  .e-profile-select.is-overridden .e-profile-choice.is-on {
    border-color: #00897b;
    background: #e0f2f1;
    color: #00695c;
  }
  .e-profile-check {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
  }
  .e-profile-select.is-overridden .e-profile-check {
    color: #00695c;
  }
  /* 既定の値の印（勤務表での上書きのときだけ） */
  .e-profile-default {
    font-size: 0.75em;
    font-weight: normal;
    color: #90a4ae;
    border: 1px solid #cfd8dc;
    border-radius: 3px;
    padding: 0 2px;
  }
  .e-profile-inherit {
    border: none;
    background: none;
    color: #00695c;
    font-size: 0.9em;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }
`;
