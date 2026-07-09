'use client';

import { FC, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Staff,
  WorkShiftSet,
  MonthlyStaffSchedule,
  ScheduleAvailability,
  StaffMonthlyShiftWish,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useObjects, useObject, useObjectShell } from "../objects/repository.js";
import { useSeedHotelData } from "../objects/seed.js";
import { AUTO_SHIFT_STEPS, runAutoShiftStep, type AutoShiftStep } from "./autoShift.js";
import {
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
  SCHEDULE_TYPE,
  SCHEDULE_AVAILABILITY_TYPE,
  STAFF_SHIFT_WISH_TYPE,
} from "../objects/hotelObjects.js";

/**
 * 自動シフトのツールバー項目。group を持たないステップは単独ボタン、
 * 同じ group のステップ群は「戦略を切り替えるトグル＋実行ボタン」の1組にまとめる。
 * AUTO_SHIFT_STEPS は定数なので一度だけ組み立てる。
 */
type AutoBarItem =
  | { kind: "single"; step: AutoShiftStep }
  | { kind: "group"; key: string; label: string; variants: AutoShiftStep[] };

const AUTO_BAR_ITEMS: AutoBarItem[] = (() => {
  const items: AutoBarItem[] = [];
  const seen = new Set<string>();
  for (const step of AUTO_SHIFT_STEPS) {
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
      variants: AUTO_SHIFT_STEPS.filter((s) => s.group === step.group),
    });
  }
  return items;
})();

type AutoShiftPanelProps = {
  scheduleId?: string;
};

/**
 * 自動シフト パネル（独立バブル）。
 * 勤務表グリッドから切り出した段階的な自動シフトのコマンド群。実行はシェル経由：
 * update(() => result.schedule) を呼ぶだけで、その勤務表を監視している世界線すべて
 * （アプリ全体＋ローカル）へ自動保存され、グリッド側の表示にも反映される。
 */
export const AutoShiftPanel: FC<AutoShiftPanelProps> = ({ scheduleId }) => {
  useSeedHotelData();
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  // グループ（同目的の別戦略）ごとに、選択中の戦略キーを保持する
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});

  const staffList = useObjects<Staff>(STAFF_TYPE);
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const workShifts = useMemo(() => workShiftSet?.shifts ?? [], [workShiftSet]);
  const availability = useObject<ScheduleAvailability>(
    SCHEDULE_AVAILABILITY_TYPE,
    scheduleId
  );
  const allWishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);
  const { object: schedule, update } = useObjectShell<MonthlyStaffSchedule>(
    SCHEDULE_TYPE,
    scheduleId
  );

  // この勤務表と同じ年月のシフト希望を staffId 別に引けるようにする
  const wishByStaff = useMemo(() => {
    const map = new Map<string, StaffMonthlyShiftWish>();
    if (schedule) {
      for (const w of allWishes) {
        if (w.year === schedule.year && w.month === schedule.month) {
          map.set(w.staffId, w);
        }
      }
    }
    return map;
  }, [allWishes, schedule]);

  if (!schedule) {
    return <div style={{ padding: 16, color: "#666" }}>勤務表を読み込み中…</div>;
  }

  // 段階的な自動シフト：選んだステップ（コマンド）を1つ実行する。
  // 人間入力済みのセルは上書きしない／休み希望の人は勤務させない（各ステップ共通の原則）。
  const handleRunStep = (step: AutoShiftStep) => {
    const result = runAutoShiftStep(step, {
      schedule,
      staffList,
      workShifts,
      wishByStaff,
      availability,
    });
    update(() => result.schedule);
    setAutoMessage(`${step.label}: ${result.message}`);
  };

  return (
    <StyledContainer>
      <div className="e-header">
        <h3>
          🪄 自動シフト{" "}
          <span className="e-sub">
            {schedule.year}年{schedule.month}月 / {schedule.storeId}
          </span>
        </h3>
        <p className="e-note">
          上から順に実行すると埋まっていきます。人間が入力済みのセルは上書きしません。
        </p>
      </div>

      <div className="e-auto-bar">
        {AUTO_BAR_ITEMS.map((item, i) => {
          const num = <span className="e-auto-num">{i + 1}</span>;
          if (item.kind === "single") {
            return (
              <button
                key={item.step.key}
                type="button"
                className="e-link e-auto"
                title={item.step.description}
                onClick={() => handleRunStep(item.step)}
              >
                {num}
                {item.step.label}
              </button>
            );
          }
          // group: 戦略トグル ＋ 実行ボタン（切り替えて使う代替アルゴリズム）
          const selectedKey = selectedVariant[item.key] ?? item.variants[0].key;
          const selectedStep =
            item.variants.find((v) => v.key === selectedKey) ?? item.variants[0];
          return (
            <div key={item.key} className="e-auto-group">
              {num}
              <span className="e-auto-glabel">{item.label}</span>
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
                className="e-link e-auto e-run"
                title={selectedStep.description}
                onClick={() => handleRunStep(selectedStep)}
              >
                実行
              </button>
            </div>
          );
        })}
      </div>

      {autoMessage && (
        <div className="e-auto-message">
          {autoMessage}
          <button
            type="button"
            className="e-auto-close"
            aria-label="閉じる"
            onClick={() => setAutoMessage(null)}
          >
            ×
          </button>
        </div>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 8px;

  .e-header {
    margin-bottom: 8px;
    h3 {
      margin: 0;
    }
    .e-sub {
      font-weight: normal;
      font-size: 0.8em;
      color: #777;
    }
    .e-note {
      margin: 4px 0 0;
      font-size: 0.78em;
      color: #888;
    }
  }

  .e-auto-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;

    .e-auto {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #b39ddb;
      border-radius: 6px;
      background: #fff;
      color: #5e35b1;
      font-size: 0.8em;
      font-weight: 600;
      padding: 4px 10px;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s;

      &:hover {
        background: #ede7f6;
        border-color: #9575cd;
      }
    }
    .e-auto-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ede7f6;
      color: #5e35b1;
      font-size: 0.85em;
      line-height: 1;
    }

    /* group: 戦略トグル ＋ 実行ボタン */
    .e-auto-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #d1c4e9;
      border-radius: 8px;
      background: #faf7ff;
      padding: 3px 6px;

      .e-auto-glabel {
        font-size: 0.8em;
        font-weight: 600;
        color: #5e35b1;
      }
      .e-auto-num {
        background: #fff;
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
        padding: 4px 10px;
        cursor: pointer;
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
  }

  .e-auto-message {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 6px 10px;
    background: #ede7f6;
    border: 1px solid #d1c4e9;
    border-radius: 6px;
    color: #4527a0;
    font-size: 0.82em;

    .e-auto-close {
      margin-left: auto;
      border: none;
      background: transparent;
      color: #7e57c2;
      font-size: 1.1em;
      line-height: 1;
      cursor: pointer;
      padding: 0 2px;

      &:hover {
        color: #4527a0;
      }
    }
  }
`;
