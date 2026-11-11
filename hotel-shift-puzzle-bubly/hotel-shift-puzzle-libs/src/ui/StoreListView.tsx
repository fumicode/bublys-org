'use client';

import { FC, useEffect, useState } from "react";
import styled from "styled-components";
import { Button, IconButton, MenuItem, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StorefrontIcon from "@mui/icons-material/Storefront";
import {
  FourWeekRule,
  PeriodRule,
  StoreFormat,
  WorkingDay,
  type PeriodRuleKind,
  type Store,
} from "../domain/index.js";

type StoreListViewProps = {
  stores: readonly Store[];
  /** 選べる形態（作りかけの形態はアプリが出さない） */
  formats: readonly StoreFormat[];
  /** 選べる区切り方 */
  ruleKinds: readonly PeriodRuleKind[];
  /** 今日（起算日の初期値を決める） */
  today: WorkingDay;
  onCreate: (name: string, format: StoreFormat) => void;
  onSave: (store: Store) => void;
  /** その店舗を使っている勤務表の数（削除の前に確認する） */
  scheduleCountOf: (storeId: string) => number;
  onRemove: (id: string) => void;
};

const RULE_KIND_LABEL: Record<PeriodRuleKind, string> = {
  "calendar-month": "暦月（1日〜月末）",
  "four-week": "4週（起算日から28日ずつ）",
};

/**
 * 店舗の一覧と編集（プレゼンテーショナル）。
 *
 * 店舗は勤務表の外のデータ。ここで変えた区切り方・起算日は、これから作る勤務表にだけ効く
 * （できている勤務表は自分の期を持つので動かない）。
 */
export const StoreListView: FC<StoreListViewProps> = ({
  stores,
  formats,
  ruleKinds,
  today,
  onCreate,
  onSave,
  scheduleCountOf,
  onRemove,
}) => {
  const [name, setName] = useState("");
  const [formatId, setFormatId] = useState(formats[0]?.id ?? "hotel");
  // 組織の呼び方は形態が決める（行政だけのデプロイなら「課」）
  const noun = StoreFormat.nounFor(formats);

  const handleCreate = () => {
    const trimmed = name.trim();
    const format = formats.find((f) => f.id === formatId) ?? formats[0];
    if (!trimmed || !format) return;
    onCreate(trimmed, format);
    setName("");
  };

  return (
    <StyledContainer>
      <p className="e-note">
        区切り方・起算日を変えると、これから作る勤務表に効きます。できている勤務表の期は変わりません。
      </p>
      <ul className="e-list">
        {stores.length === 0 ? (
          <li className="e-empty">{noun}がありません</li>
        ) : (
          stores.map((store) => (
            <StoreRow
              key={store.id}
              store={store}
              formats={formats}
              ruleKinds={ruleKinds}
              today={today}
              onSave={onSave}
              noun={noun}
              scheduleCount={scheduleCountOf(store.id)}
              onRemove={onRemove}
            />
          ))
        )}
      </ul>

      <div className="e-create">
        <h4>新しい{noun}</h4>
        <div className="e-fields">
          <TextField
            variant="standard"
            size="small"
            label="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") handleCreate();
            }}
          />
          {formats.length > 1 && (
            <TextField
              select
              variant="standard"
              size="small"
              label="形態"
              value={formatId}
              onChange={(e) => setFormatId(e.target.value as StoreFormat["id"])}
            >
              {formats.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </div>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          作成
        </Button>
      </div>
    </StyledContainer>
  );
};

const StoreRow: FC<{
  store: Store;
  formats: readonly StoreFormat[];
  ruleKinds: readonly PeriodRuleKind[];
  today: WorkingDay;
  onSave: (store: Store) => void;
  /** 組織の呼び方（"店舗" / "課"） */
  noun: string;
  scheduleCount: number;
  onRemove: (id: string) => void;
}> = ({ store, formats, ruleKinds, today, onSave, noun, scheduleCount, onRemove }) => {
  // 勤務表が使っている店舗は、削除の前に確認する（使っていなければすぐ削除）
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const requestRemove = () => {
    if (scheduleCount > 0) setConfirmingRemove(true);
    else onRemove(store.id);
  };
  // 名前は打ち終えたとき（blur / Enter）に保存する。1文字ごとに保存しない
  const [nameDraft, setNameDraft] = useState(store.name);
  useEffect(() => setNameDraft(store.name), [store.name]);
  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== store.name) onSave(store.rename(trimmed));
    else setNameDraft(store.name);
  };

  const rule = store.periodRule;
  const changeRuleKind = (kind: PeriodRuleKind) => {
    if (kind === rule.kind) return;
    onSave(
      store.withPeriodRule(
        kind === "four-week"
          ? PeriodRule.fourWeek(store.format.defaultAnchor(today))
          : PeriodRule.calendarMonth()
      )
    );
  };
  const changeAnchor = (key: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
    onSave(store.withPeriodRule(PeriodRule.fourWeek(WorkingDay.fromKey(key))));
  };

  return (
    <li className="e-item">
      <StorefrontIcon fontSize="small" className="e-icon" />
      <div className="e-body">
        <TextField
          variant="standard"
          size="small"
          className="e-name"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <div className="e-settings">
          {formats.length > 1 ? (
            <TextField
              select
              variant="standard"
              size="small"
              label="形態"
              value={store.format.id}
              onChange={(e) => {
                const next = formats.find((f) => f.id === e.target.value);
                if (next) onSave(store.withFormat(next));
              }}
            >
              {formats.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.label}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <span className="e-fixed">形態：{store.format.label}</span>
          )}
          {ruleKinds.length > 1 ? (
            <TextField
              select
              variant="standard"
              size="small"
              label="区切り方"
              value={rule.kind}
              onChange={(e) => changeRuleKind(e.target.value as PeriodRuleKind)}
            >
              {ruleKinds.map((k) => (
                <MenuItem key={k} value={k}>
                  {RULE_KIND_LABEL[k]}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <span className="e-fixed">区切り方：{rule.label}</span>
          )}
          {rule instanceof FourWeekRule && (
            <TextField
              variant="standard"
              size="small"
              type="date"
              label="起算日"
              value={rule.anchor.key}
              onChange={(e) => changeAnchor(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          )}
        </div>
        {confirmingRemove && (
          <div className="e-confirm" role="alert">
            <p>
              この{noun}は勤務表 {scheduleCount} 件で使われています。削除すると、それらの勤務表には
              「（削除された店舗）」と出ます。勤務表そのものは消えません。
            </p>
            <div className="e-confirm-actions">
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={() => {
                  setConfirmingRemove(false);
                  onRemove(store.id);
                }}
              >
                削除する
              </Button>
              <Button size="small" onClick={() => setConfirmingRemove(false)}>
                やめる
              </Button>
            </div>
          </div>
        )}
      </div>
      <IconButton size="small" aria-label={`${noun}を削除`} onClick={requestRemove}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </li>
  );
};

const StyledContainer = styled.div`
  padding: 8px;
  min-width: 320px;

  .e-note {
    margin: 0 0 8px;
    font-size: 0.8em;
    color: #777;
  }

  .e-list {
    list-style: none;
    padding: 0;
    margin: 0 0 12px;
  }

  .e-empty {
    padding: 12px;
    text-align: center;
    color: #999;
  }

  .e-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 4px;
    border-bottom: 1px solid #eee;

    &:last-child {
      border-bottom: none;
    }
  }

  .e-icon {
    color: #666;
    margin-top: 4px;
  }

  .e-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-name input {
    font-weight: bold;
  }

  .e-settings {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: flex-end;

    .MuiTextField-root {
      min-width: 120px;
    }
  }

  .e-confirm {
    margin-top: 4px;
    padding: 6px 8px;
    border: 1px solid #f5c2c0;
    background: #fdecea;
    border-radius: 4px;
    font-size: 0.85em;

    p {
      margin: 0 0 4px;
    }
  }

  .e-confirm-actions {
    display: flex;
    gap: 8px;
  }

  .e-fixed {
    font-size: 0.85em;
    color: #555;
  }

  .e-create {
    border-top: 1px solid #ddd;
    padding-top: 8px;

    h4 {
      margin: 0 0 6px;
    }
  }

  .e-fields {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
`;
