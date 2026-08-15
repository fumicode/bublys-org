'use client';

/**
 * ShiftCommandsBar — 勤務表に効く「シフトコマンド」を並べるパネル。
 *
 * 制約一覧（ScheduleConstraintsBar）の右に置き、制約を見ながらコマンドを打てるようにする。
 * 制約が「どうあるべきか（宣言）」なら、こちらは「それを満たすために何をするか（操作）」。
 *
 * 表示はステップ一覧（AutoShiftStep[]）のリスト駆動で、2行に分けて並べる:
 *   - 1行目 … group を持たない単独ステップ（例: 希望を叶える）＋ 解決案生成
 *   - 2行目 … 同じ group のステップ群＝「戦略トグル ＋ 実行」の1組
 *             （例: 必要人数を埋める＝早番から順に/まんべんなく）
 * 新しいコマンドが増えてもここは変更不要（単独なら1行目、戦略つきなら2行目に並ぶ）。
 *
 * コマンドの対象は「選択中のスタッフ（無ければ全員）」。解決案生成のラベルには、いま対象に
 * なっている制約の名前がそのまま入る（例:「早責」解決案生成）ので、何を解こうとしているのかが
 * ボタンから読み取れる。
 */
import { FC, useMemo, useState } from "react";
import styled from "styled-components";
import type { AutoShiftStep } from "../domain/index.js";

/** 単独ボタン or 「戦略トグル＋実行」の1組 */
type CommandItem =
  | { kind: "single"; step: AutoShiftStep }
  | { kind: "group"; key: string; label: string; variants: AutoShiftStep[] };

/** ステップ一覧を、単独ボタン／グループ（同 group = 切り替えて使う別戦略）へ畳む */
const toItems = (steps: AutoShiftStep[]): CommandItem[] => {
  const items: CommandItem[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    if (!step.group) {
      items.push({ kind: "single", step });
      continue;
    }
    if (seen.has(step.group)) continue;
    seen.add(step.group);
    items.push({
      kind: "group",
      key: step.group,
      label: step.groupLabel ?? step.group,
      variants: steps.filter((s) => s.group === step.group),
    });
  }
  return items;
};

type ShiftCommandsBarProps = {
  /** 対象スタッフ数（選択が無ければ全員の人数） */
  targetCount: number;
  /** 選択中のスタッフ数（0 なら「全員」表示） */
  selectedCount: number;
  /** 選択を解除する（選択があるときだけ出す） */
  onClearSelection?: () => void;

  /** 実行できる自動シフトのステップ一覧（同 group はトグルで切り替える1組になる） */
  steps: AutoShiftStep[];
  /** ステップを1つ実行する */
  onRunStep: (step: AutoShiftStep) => void;

  /** 解決案（複数案）を世界線に生成する */
  onGenerateCandidates: () => void;
  /** 解決案ボタンのラベル（例:「早責」解決案生成）。対象ルール名を含める。 */
  candidateLabel: string;
  /** 解決案ボタンの説明（ツールチップ） */
  candidateTitle?: string;

  /** コマンドの実行結果メッセージ（ボタンのすぐ下に出す）。null なら出さない。 */
  message?: string | null;
  /** 実行結果メッセージを閉じる */
  onCloseMessage?: () => void;
};

export const ShiftCommandsBar: FC<ShiftCommandsBarProps> = ({
  targetCount,
  selectedCount,
  onClearSelection,
  steps,
  onRunStep,
  onGenerateCandidates,
  candidateLabel,
  candidateTitle,
  message,
  onCloseMessage,
}) => {
  const items = useMemo(() => toItems(steps), [steps]);
  // 1行目＝単独コマンド（＋解決案生成）、2行目＝戦略トグルを持つグループ、に分けて並べる。
  const singles = useMemo(
    () => items.filter((i): i is Extract<CommandItem, { kind: "single" }> => i.kind === "single"),
    [items]
  );
  const groups = useMemo(
    () => items.filter((i): i is Extract<CommandItem, { kind: "group" }> => i.kind === "group"),
    [items]
  );
  // グループ（同目的の別戦略）ごとに、選択中の戦略キーを保持する
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});

  return (
    <StyledBar>
      <span className="e-group-label">
        シフトコマンド
        <span className="e-target">
          対象:{" "}
          {selectedCount > 0 ? (
            <>
              選択 {selectedCount} 名
              {onClearSelection && (
                <button
                  type="button"
                  className="e-clear"
                  onClick={onClearSelection}
                  title="選択を解除"
                >
                  解除
                </button>
              )}
            </>
          ) : (
            `全員 ${targetCount} 名`
          )}
        </span>
      </span>

      {/* 1行目: 単独コマンド（希望を叶える）＋ 解決案生成 */}
      <div className="e-cmds">
        {singles.map((item) => (
          <button
            key={item.step.key}
            type="button"
            className="e-cmd"
            title={item.step.description}
            onClick={() => onRunStep(item.step)}
          >
            {item.step.label}
          </button>
        ))}

        <button
          type="button"
          className="e-cmd e-candidate"
          title={candidateTitle}
          onClick={onGenerateCandidates}
        >
          🌱 {candidateLabel}
        </button>
      </div>

      {/* 2行目: 戦略を切り替えて使うコマンド（必要人数を埋める＝トグル＋実行） */}
      {groups.length > 0 && (
        <div className="e-cmds">
          {groups.map((item) => {
            const selectedKey = selectedVariant[item.key] ?? item.variants[0].key;
            const selectedStep =
              item.variants.find((v) => v.key === selectedKey) ?? item.variants[0];
            return (
              <div key={item.key} className="e-cmd-group">
                <span className="e-cmd-glabel">{item.label}</span>
                <div className="e-seg" role="group" aria-label={`${item.label}の方式`}>
                  {item.variants.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className={"e-seg-btn" + (v.key === selectedKey ? " is-on" : "")}
                      title={v.description}
                      onClick={() =>
                        setSelectedVariant((prev) => ({ ...prev, [item.key]: v.key }))
                      }
                    >
                      {v.variantLabel ?? v.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="e-cmd e-run"
                  title={selectedStep.description}
                  onClick={() => onRunStep(selectedStep)}
                >
                  実行
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* コマンドの実行結果。押したボタンのすぐ下に出す（表の下ではなく手元で読めるように） */}
      {message && (
        <div className="e-cmd-message">
          {message}
          {onCloseMessage && (
            <button
              type="button"
              className="e-cmd-message-close"
              aria-label="閉じる"
              onClick={onCloseMessage}
            >
              ×
            </button>
          )}
        </div>
      )}
    </StyledBar>
  );
};

const StyledBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: #faf7ff;
  border: 1px solid #e4dcf5;
  border-radius: 8px;
  flex: 1; /* 制約一覧の右で、残りの幅いっぱいに広がる */
  min-width: 0;

  .e-group-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72em;
    font-weight: 700;
    color: #5e35b1;
  }
  .e-target {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
    color: #7e57c2;
  }
  .e-clear {
    border: 1px solid #d1c4e9;
    border-radius: 999px;
    background: #fff;
    color: #7e57c2;
    font-size: 0.9em;
    line-height: 1;
    padding: 1px 6px;
    cursor: pointer;

    &:hover {
      background: #ede7f6;
      border-color: #b39ddb;
    }
  }

  .e-cmds {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .e-cmd {
    border: 1px solid #b39ddb;
    border-radius: 6px;
    background: #fff;
    color: #5e35b1;
    font-size: 0.8em;
    font-weight: 600;
    padding: 5px 10px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.1s, border-color 0.1s;

    &:hover {
      background: #ede7f6;
      border-color: #9575cd;
    }
  }

  /* group: 戦略トグル ＋ 実行ボタン */
  .e-cmd-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #d1c4e9;
    border-radius: 8px;
    background: #fff;
    padding: 3px 6px;

    .e-cmd-glabel {
      font-size: 0.8em;
      font-weight: 600;
      color: #5e35b1;
      white-space: nowrap;
    }
  }
  /* セグメント（戦略の切り替え）。選択中を塗りで示す */
  .e-seg {
    display: inline-flex;
    border: 1px solid #b39ddb;
    border-radius: 6px;
    overflow: hidden;

    .e-seg-btn {
      border: none;
      border-left: 1px solid #d1c4e9;
      background: #fff;
      color: #6a4bb0;
      font-size: 0.78em;
      padding: 4px 8px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.1s, color 0.1s;

      &:first-child {
        border-left: none;
      }
      &:hover {
        background: #ede7f6;
      }
      &.is-on {
        background: #7e57c2;
        color: #fff;
        font-weight: 600;
      }
    }
  }
  .e-run {
    background: #ede7f6;
  }

  /* コマンドの実行結果メッセージ（ボタンのすぐ下） */
  .e-cmd-message {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    padding: 5px 8px;
    background: #ede7f6;
    border: 1px solid #d1c4e9;
    border-radius: 6px;
    color: #4527a0;
    font-size: 0.78em;
    line-height: 1.4;
  }
  .e-cmd-message-close {
    margin-left: auto;
    border: none;
    background: transparent;
    color: #7e57c2;
    font-size: 1.1em;
    line-height: 1;
    cursor: pointer;
    padding: 0 2px;
    flex-shrink: 0;

    &:hover {
      color: #4527a0;
    }
  }

  /* 完成案（世界線に複数案を書く）は結果が大きいので緑で区別する */
  .e-candidate {
    border-color: #a5d6a7;
    background: #e8f5e9;
    color: #2e7d32;

    &:hover {
      background: #c8e6c9;
      border-color: #66bb6a;
    }
  }
`;
