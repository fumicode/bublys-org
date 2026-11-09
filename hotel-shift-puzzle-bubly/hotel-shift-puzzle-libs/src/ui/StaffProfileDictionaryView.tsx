'use client';

import { FC, useEffect, useState, type KeyboardEvent } from "react";
import styled from "styled-components";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { IconButton } from "@mui/material";
import {
  DEFAULT_BUILT_IN_PROFILE_MARKS,
  PROFILE_CATEGORIES,
  type BuiltInProfileItemKey,
  type ProfileCategoryKey,
  type ProfileChoice,
  type ProfileMarkStyle,
  type ProfileValue,
  type StaffProfileDictionary,
} from "../domain/index.js";
import { profileMarkStyles } from "./ProfileMarks.js";

type Props = {
  /** 辞書。まだ無ければ undefined（最初の項目を足したときに作られる） */
  dictionary: StaffProfileDictionary | undefined;
  /** 状態が揃うまでは編集させない（読めないだけの辞書を空で作り直さないため） */
  editable?: boolean;
  onAddItem: (category: ProfileCategoryKey) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onChangeChoice: (itemId: string, choice: ProfileChoice) => void;
  onRemoveItem: (itemId: string) => void;
  onAddValue: (itemId: string) => void;
  onChangeValue: (
    itemId: string,
    valueId: string,
    edit: { label?: string; symbol?: string; markStyle?: ProfileMarkStyle }
  ) => void;
  onRemoveValue: (itemId: string, valueId: string) => void;
  /** 組み込みの項目（所属・責任者・休みの形）を名前の横に出すか */
  onChangeBuiltInMark: (key: BuiltInProfileItemKey, shown: boolean) => void;
};

/**
 * 組み込みの項目（辞書には載らず、値の出所が別にあるもの）。分類の中に辞書の項目と並べ、
 * 見せ方だけをここで決める。値は人ごとにスタッフ詳細で決める。
 */
const BUILT_IN_ITEMS: {
  key: BuiltInProfileItemKey;
  category: ProfileCategoryKey;
  name: string;
  shown: string;
  hidden: string;
  note: string;
}[] = [
  {
    key: "department",
    category: "basic",
    name: "所属",
    shown: "文字を囲む",
    hidden: "出さない",
    note: "値（部署）はスタッフ詳細で決めます。",
  },
  {
    key: "leaderRoles",
    category: "role",
    name: "責任者（早責・予責・夜責）",
    shown: "役割の色で囲む",
    hidden: "出さない",
    note: "誰が担うかは勤務表ごと（勤務表から開いたスタッフ詳細・制約バブル）。役割そのもの（足す・担当勤務帯・人数）は制約バブルで決めます。",
  },
  {
    key: "dayOffStyle",
    category: "workStyle",
    name: "休みの形",
    shown: "アイコン",
    hidden: "出さない",
    note: "値はスタッフ詳細で決めます（勤務表から開くと、その勤務表だけ変えられます）。",
  },
];

const MARK_STYLE_LABEL: Record<ProfileMarkStyle, string> = {
  none: "出さない",
  plain: "そのまま",
  framed: "文字を囲む",
};

/** 名前の横にどう見えるかの見本（出さないなら「出ない」と書く） */
const MarkPreview: FC<{ value: ProfileValue }> = ({ value }) => {
  const text = value.markText;
  if (!text) return <span className="e-preview is-none">名前の横に出ない</span>;
  return (
    <span className="e-preview" title="勤務表の名前の横にこう出ます">
      <span className={value.markStyle === "framed" ? "e-profile-badge" : "e-profile-symbol"}>
        {text}
      </span>
    </span>
  );
};

/**
 * スタッフプロファイルの辞書を編集する（#236）。分類ごとに項目を並べ、項目の中に値を並べる。
 * 値ごとに名前の横の見せ方（出さない／そのまま／文字を囲む）を選び、見本をその場で見せる。
 * 組み込みの項目（所属・責任者・休みの形）も、その分類の中に並べて見せ方だけ決める。
 *
 * 文字の入力は、確定したとき（フォーカスが外れた・Enter）に1回だけ保存する
 * （1文字ごとに保存すると、辞書の記録が打った文字の数だけ増える）。
 */
export const StaffProfileDictionaryView: FC<Props> = ({
  dictionary,
  editable = true,
  onAddItem,
  onRenameItem,
  onChangeChoice,
  onRemoveItem,
  onAddValue,
  onChangeValue,
  onRemoveValue,
  onChangeBuiltInMark,
}) => (
  <StyledWrap>
    {PROFILE_CATEGORIES.map(({ key, label }) => {
      const items = dictionary?.itemsIn(key) ?? [];
      return (
        <section key={key} className="e-category">
          <h4>{label}</h4>
          {BUILT_IN_ITEMS.filter((b) => b.category === key).map((b) => {
            const shown = dictionary?.showsBuiltIn(b.key) ?? DEFAULT_BUILT_IN_PROFILE_MARKS[b.key];
            return (
              <div key={b.key} className="e-item is-built-in">
                <div className="e-item-head">
                  <span className="e-built-in-name">{b.name}</span>
                  <span className="e-built-in-tag" title="値の出所が別にある項目です">
                    組み込み
                  </span>
                  <select
                    className="e-choice"
                    value={shown ? "shown" : "hidden"}
                    disabled={!editable}
                    title="勤務表の名前の横にどう出すか"
                    onChange={(e) => onChangeBuiltInMark(b.key, e.target.value === "shown")}
                  >
                    <option value="hidden">{b.hidden}</option>
                    <option value="shown">{b.shown}</option>
                  </select>
                </div>
                <p className="e-note">{b.note}</p>
              </div>
            );
          })}

          {items.map((item) => (
            <div key={item.id} className="e-item">
              <div className="e-item-head">
                <CommitInput
                  className="e-item-name"
                  value={item.name}
                  placeholder="項目名"
                  disabled={!editable}
                  onCommit={(name) => onRenameItem(item.id, name || item.name)}
                />
                <select
                  className="e-choice"
                  value={item.choice}
                  disabled={!editable}
                  onChange={(e) => onChangeChoice(item.id, e.target.value as ProfileChoice)}
                  title="1つ選ぶ：経験・雇用形態など／複数選ぶ：資格・得意分野など"
                >
                  <option value="one">1つ選ぶ</option>
                  <option value="many">複数選ぶ</option>
                </select>
                <IconButton
                  size="small"
                  disabled={!editable}
                  title="この項目を消す（人が選んだ値は残りますが、表示されなくなります）"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </div>

              <ul className="e-values">
                {item.values.map((v) => (
                  <li key={v.id} className="e-value">
                    <select
                      className="e-mark-style"
                      value={v.markStyle}
                      disabled={!editable}
                      title="勤務表の名前の横にどう出すか"
                      onChange={(e) =>
                        onChangeValue(item.id, v.id, {
                          markStyle: e.target.value as ProfileMarkStyle,
                        })
                      }
                    >
                      {(["none", "plain", "framed"] as const).map((style) => (
                        <option key={style} value={style}>
                          {MARK_STYLE_LABEL[style]}
                        </option>
                      ))}
                    </select>
                    <CommitInput
                      className="e-symbol"
                      value={v.symbol ?? ""}
                      placeholder={v.markStyle === "none" ? "記号" : v.label}
                      maxLength={8}
                      disabled={!editable || v.markStyle === "none"}
                      title="名前の横に出す文字（🔰 など）。空なら値の名前を出します"
                      onCommit={(symbol) => onChangeValue(item.id, v.id, { symbol })}
                    />
                    <CommitInput
                      className="e-value-label"
                      value={v.label}
                      placeholder="値の名前"
                      disabled={!editable}
                      onCommit={(text) => onChangeValue(item.id, v.id, { label: text || v.label })}
                    />
                    <MarkPreview value={v} />
                    <IconButton
                      size="small"
                      disabled={!editable}
                      title="この値を消す"
                      onClick={() => onRemoveValue(item.id, v.id)}
                    >
                      <DeleteOutlineIcon fontSize="inherit" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="e-add e-add-value"
                disabled={!editable}
                onClick={() => onAddValue(item.id)}
              >
                <AddIcon fontSize="inherit" /> 値を足す
              </button>
            </div>
          ))}

          <button
            type="button"
            className="e-add"
            disabled={!editable}
            onClick={() => onAddItem(key)}
          >
            <AddIcon fontSize="inherit" /> {label}に項目を足す
          </button>
        </section>
      );
    })}
  </StyledWrap>
);

/** 確定したときだけ onCommit を呼ぶ入力欄（フォーカスが外れた・Enter）。Escape で元に戻す */
const CommitInput: FC<{
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  title?: string;
}> = ({ value, onCommit, ...rest }) => {
  const [draft, setDraft] = useState(value);
  // 外から値が変わったら（別の画面で直した・時間移動）入力欄も追従する
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.trim();
    if (next !== value) onCommit(next);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
    if (e.key === "Escape") setDraft(value);
  };
  return (
    <input
      {...rest}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
};

const StyledWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  .e-category {
    h4 {
      margin: 0 0 4px;
      font-size: 0.9em;
      color: #455a64;
    }
  }
  .e-note {
    margin: 0 0 6px;
    font-size: 0.78em;
    color: #78909c;
  }
  .e-item {
    margin: 0 0 8px;
    padding: 6px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fafafa;
  }
  .e-item-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  input {
    border: 1px solid #cfd8dc;
    border-radius: 4px;
    padding: 2px 6px;
    font: inherit;
    background: #fff;
  }
  .e-item-name {
    flex: 1;
    min-width: 0;
    font-weight: bold;
  }
  .e-choice {
    font-size: 0.85em;
  }
  .e-values {
    list-style: none;
    margin: 6px 0 4px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .e-value {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .e-symbol {
    width: 3.2em;
    text-align: center;
  }
  .e-value-label {
    flex: 1;
    min-width: 0;
  }
  .e-mark-style {
    font-size: 0.8em;
  }
  /* 名前の横にどう見えるかの見本 */
  .e-preview {
    flex-shrink: 0;
    min-width: 2.5em;
    display: inline-flex;
    justify-content: center;
    font-size: 1.1em;
    &.is-none {
      font-size: 0.68em;
      color: #b0bec5;
      white-space: nowrap;
    }
  }
  ${profileMarkStyles}
  /* 組み込みの項目（値の出所が別にある。見せ方だけ決める） */
  .e-item.is-built-in {
    background: #f5f7f8;
    border-style: dashed;
  }
  .e-built-in-name {
    flex: 1;
    min-width: 0;
    font-weight: bold;
    color: #455a64;
  }
  .e-built-in-tag {
    font-size: 0.7em;
    color: #78909c;
    border: 1px solid #cfd8dc;
    border-radius: 3px;
    padding: 0 3px;
  }
  .e-item.is-built-in .e-note {
    margin: 4px 0 0;
  }
  .e-add {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border: 1px dashed #b0bec5;
    border-radius: 999px;
    background: #fff;
    color: #546e7a;
    font-size: 0.8em;
    padding: 2px 10px;
    cursor: pointer;
    &:hover:not(:disabled) {
      background: #eceff1;
    }
  }
`;
