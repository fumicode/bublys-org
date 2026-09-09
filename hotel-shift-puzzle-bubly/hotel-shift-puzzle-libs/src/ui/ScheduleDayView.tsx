'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  Staff,
  MonthlyStaffSchedule,
  ScheduleCandidates,
  WorkShift,
  WorkingDay,
  ScheduleAvailability,
  ShiftLeaderRule,
  StaffMonthlyShiftWish,
  type ShiftCell,
} from "../domain/index.js";
import { SHIFT_BG, SHIFT_FG, WEEKDAY_LABELS } from "./schedule-grid/constants.js";
import { LeaderBadges, leaderRoleStyle } from "./LeaderBadges.js";
import { wishEntriesFor, wishText, type WishEntry } from "./schedule-grid/wishSummary.js";
import { DAY_OFF_WISH } from "./shiftWishOptions.js";

type ScheduleDayViewProps = {
  /** 表示する稼働日 */
  day: WorkingDay;
  /** その日の割当を引く勤務表 */
  schedule: MonthlyStaffSchedule;
  staffList: Staff[];
  /** この勤務表で使える勤務帯（早番・中番・遅番）。横方向に並べる */
  workShifts: WorkShift[];
  /** 可能勤務帯。あれば入れない勤務帯セルを無効化する */
  availability?: ScheduleAvailability;
  /** 責任者ルール（解決済み）。名前横に早責/夜責バッジを出す */
  leaderRules?: ShiftLeaderRule[];
  /** この年月のシフト希望（staffId 別）。希望した勤務帯のセルに円で出す */
  wishByStaff?: Map<string, StaffMonthlyShiftWish>;
  /**
   * まだ決まっていないセルに入れられる値（候補集合）。渡すと、候補が1つに絞られたセル
   * （＝制約から一意に決まる手）だけを破線で示す（勤務表グリッドの確定提案と同じ見せ方）。
   */
  candidates?: ScheduleCandidates;
  /** セルの勤務割当を変更する */
  onChangeCell: (staffId: string, to: ShiftCell) => void;
};

/**
 * 稼働日 1 日ぶんの詳細ビュー。
 * 縦にスタッフ、横に勤務帯（早番・中番・遅番）＋休みを並べた表。各スタッフのその日の割当を
 * 立て、クリックでその勤務帯へ割当（再クリックで未定へ）。可能勤務帯外のセルは無効。
 * 表の下部に、勤務帯ごとの「現在/必要」を出して必要人数が満たされているかを示す。
 *
 * セルの中身は「中央＝値 / 左上＝希望」の 2 レイヤーで読む:
 *   - 中央 … 確定した割当は勤務表グリッドと同じ表現（開始時刻の「時」＋勤務帯の背景色、
 *            休みは「休」）。同じものを別の記号で描くと読み替えが要るので揃える。
 *            まだ決まっていないセルのうち、候補が1つに絞られた＝制約から一意に決まる手だけ、
 *            その値を破線で薄く置く（＝確定提案。承認すればこうなる）。
 *            候補が複数残っているうちは何も出さない。
 *   - 左上 … 本人がその勤務帯（休み）を希望しているかの円。グリッドの希望円と同じ語彙で、
 *            ×（避けたい）希望は破線＋取り消し線。列が勤務帯を表すので円の中の文字は補助。
 */
export const ScheduleDayView: FC<ScheduleDayViewProps> = ({
  day,
  schedule,
  staffList,
  workShifts,
  availability,
  leaderRules = [],
  wishByStaff,
  candidates,
  onChangeCell,
}) => {
  const countByShift = schedule.countWorkingByShift(day);
  const dayOffCount = schedule.countDayOffOn(day);

  // 責任者制約（早責/予責/夜責）のこの日の充足。担当勤務帯名 → 勤務帯ID群。
  const shiftIdsByName = new Map<string, string[]>();
  for (const w of workShifts) {
    const arr = shiftIdsByName.get(w.name) ?? [];
    arr.push(w.id);
    shiftIdsByName.set(w.name, arr);
  }
  const nameOf = (id: string) => staffList.find((s) => s.id === id)?.name ?? id;
  // 希望を「実際の割当と同じ1文字」で出すために、勤務帯名から勤務帯を引けるようにする
  const shiftOf = (shiftName: string) => workShifts.find((w) => w.name === shiftName);

  const toggle = (staffId: string, selected: boolean, to: ShiftCell) =>
    onChangeCell(staffId, selected ? { kind: "undecided" } : to);

  /**
   * 希望の円。セルの左上に小さく置く（中央は値＝割当・候補のためのゾーン）。
   * 色・文字はグリッドの希望円と同じ WishEntry から取る。
   */
  const wishMark = (wish: WishEntry) => (
    <span
      className={`e-wish-badge${wish.pref === "avoid" ? " is-avoid" : ""}`}
      style={{ ["--wish-color" as string]: wish.color } as React.CSSProperties}
      title={`希望: ${wishText(wish)}`}
    >
      <span className="e-wish-char">{wish.char}</span>
    </span>
  );

  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-corner">スタッフ</th>
          {workShifts.map((w) => (
            <th
              key={w.id}
              className="e-shift"
              style={{ background: SHIFT_BG[w.id] ?? "#fafafa", color: SHIFT_FG[w.id] ?? "#455a64" }}
            >
              {w.name}
              <span className="e-time">{w.startTimeLabel}</span>
            </th>
          ))}
          <th className="e-shift e-off-col">休</th>
        </tr>
      </thead>

      <tbody>
        {staffList.map((staff) => {
          const status = schedule.statusOf(staff.id, day);
          const isOff = status.kind === "day-off";
          const wishes = wishEntriesFor(wishByStaff, staff.id, day, shiftOf);
          // 候補が1つに絞られた未定セルの、その値（確定提案）。候補が複数・0件のときは
          // 出さない（まだ人の判断に委ねる／どうやっても埋まらない、を提案として描かない）。
          const cellCandidates = candidates?.candidatesOf(staff.id, day);
          const forcedCell = cellCandidates?.length === 1 ? cellCandidates[0] : undefined;
          return (
            <tr key={staff.id}>
              <td className="e-staff">
                <span className="e-staff-name">{staff.name}</span>
                <LeaderBadges rules={leaderRules} staffId={staff.id} />
              </td>

              {workShifts.map((w) => {
                const selected = status.kind === "work" && status.shiftId === w.id;
                const allowed = !availability || availability.isAllowed(staff.id, w.id);
                // 入れない勤務帯は無効（ただし既に入っている場合は外せるよう操作可）
                const disabled = !allowed && !selected;
                const forced =
                  forcedCell?.kind === "work" && forcedCell.shiftId === w.id;
                const wish = wishes.find((e) => e.shiftId === w.id);
                const title = [
                  disabled
                    ? `${staff.name} は ${w.name} に入れません`
                    : `${staff.name} を ${w.name} に${selected ? "から外す" : "割り当てる"}`,
                  wish && `希望: ${wishText(wish)}`,
                  forced && `候補は${w.name}だけ（ここは一意に決まります）`,
                ]
                  .filter(Boolean)
                  .join("\n");
                return (
                  <td
                    key={w.id}
                    className={`e-cell${selected ? " is-on" : ""}${
                      disabled ? " is-disabled" : ""
                    }`}
                    style={selected ? { background: SHIFT_BG[w.id], color: SHIFT_FG[w.id] } : undefined}
                    role={disabled ? undefined : "button"}
                    title={title}
                    onClick={
                      disabled
                        ? undefined
                        : () => toggle(staff.id, selected, { kind: "work", shiftId: w.id })
                    }
                  >
                    {selected ? (
                      <span className="e-shift-hour">{w.startHour}</span>
                    ) : forced ? (
                      <span className="e-forced-value">{w.startHour}</span>
                    ) : null}
                    {wish && wishMark(wish)}
                  </td>
                );
              })}

              {(() => {
                const forced = forcedCell?.kind === "day-off";
                const offWish = wishes.find((e) => e.key === DAY_OFF_WISH);
                const title = [
                  `${staff.name} を${isOff ? "休みから戻す" : "休みにする"}`,
                  offWish && `希望: ${wishText(offWish)}`,
                  forced && "候補は休みだけ（ここは一意に決まります）",
                ]
                  .filter(Boolean)
                  .join("\n");
                return (
                  <td
                    className={`e-cell e-off-col${isOff ? " is-off" : ""}`}
                    role="button"
                    title={title}
                    onClick={() => toggle(staff.id, isOff, { kind: "day-off" })}
                  >
                    {isOff ? "休" : forced ? <span className="e-forced-value">休</span> : null}
                    {offWish && wishMark(offWish)}
                  </td>
                );
              })()}
            </tr>
          );
        })}
      </tbody>

      {/* 必要人数の充足（現在/必要）。達成=緑 / 不足=赤 */}
      <tfoot>
        <tr>
          <td className="e-foot-label">必要人数</td>
          {workShifts.map((w) => {
            const n = countByShift.get(w.id) ?? 0;
            const req = schedule.requiredFor(day, w.name);
            const met = n >= req;
            return (
              <td
                key={w.id}
                className={`e-foot${req > 0 ? (met ? " is-met" : " is-under") : ""}`}
                title={`${w.name}: ${n}/${req}名（${met ? "達成" : "不足"}）`}
              >
                <span className="e-cur">{n}</span>
                <span className="e-den">/{req}</span>
              </td>
            );
          })}
          <td className="e-foot e-off-col" title="休みの人数">
            {dayOffCount}
          </td>
        </tr>

        {/* 責任者制約（早責/予責/夜責）のこの日の充足。担当勤務帯の列に ◯/✕ */}
        {leaderRules.map((rule) => {
          const shiftIds = shiftIdsByName.get(rule.shiftName) ?? [];
          const covering = rule.leaderStaffIds.filter((id) => {
            const sid = schedule.getShiftIdFor(id, day);
            return sid !== undefined && shiftIds.includes(sid);
          });
          const present = covering.length >= rule.minCount;
          return (
            <tr key={`leader:${rule.key}`}>
              <td className="e-foot-label">
                <span className="e-leader-chip" style={leaderRoleStyle(rule.key)}>
                  {rule.label}
                </span>
              </td>
              {workShifts.map((w) =>
                w.name === rule.shiftName ? (
                  <td
                    key={w.id}
                    className={`e-foot e-leader-cell ${present ? "is-present" : "is-absent"}`}
                    title={
                      present
                        ? `${rule.label}: ${covering.map(nameOf).join("・")} が${rule.shiftName}を担当`
                        : `${rule.label}: ${rule.shiftName}に不在`
                    }
                  >
                    {present ? "◯" : "✕"}
                  </td>
                ) : (
                  <td key={w.id} className="e-foot e-leader-cell" />
                )
              )}
              <td className="e-foot e-off-col" />
            </tr>
          );
        })}
      </tfoot>
    </StyledTable>
  );
};

/** 曜日つきの見出し（"9月6日（日）"）。バブルの見出しで使う。 */
export const dayHeadingLabel = (day: WorkingDay): string =>
  `${day.month}月${day.day}日（${WEEKDAY_LABELS[day.weekday]}）`;

const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: 0.85em;

  th,
  td {
    border: 1px solid #eee;
    padding: 4px 8px;
    text-align: center;
    box-sizing: border-box;
  }

  .e-corner {
    background: #fafafa;
    font-weight: bold;
    color: #555;
    text-align: left;
    white-space: nowrap;
  }

  .e-shift {
    font-weight: bold;
    min-width: 56px;

    .e-time {
      display: block;
      font-size: 0.78em;
      opacity: 0.8;
      font-weight: normal;
    }
  }
  .e-off-col {
    min-width: 40px;
  }
  .e-shift.e-off-col {
    background: #fafafa;
    color: #9e9e9e;
  }

  .e-staff {
    text-align: left;
    white-space: nowrap;

    .e-staff-name {
      font-weight: bold;
    }
    /* 責任者バッジ。配色は leaderRoleStyle（ロールキー→色）を inline で当てる */
    .e-leader-badge {
      margin-left: 4px;
      font-size: 0.72em;
      font-weight: bold;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      white-space: nowrap;
    }
  }

  .e-cell {
    position: relative; /* 左上の希望円を置く基準 */
    cursor: pointer;
    font-weight: bold;
    min-width: 56px;
    height: 28px;
    transition: box-shadow 0.1s;

    &:hover {
      box-shadow: inset 0 0 0 2px #90caf9;
    }
    &.is-off {
      background: #f5f5f5;
      color: #9e9e9e;
    }
    &.is-disabled {
      cursor: default;
      background: repeating-linear-gradient(
        45deg,
        #fafafa,
        #fafafa 4px,
        #f0f0f0 4px,
        #f0f0f0 8px
      );
    }
    &.is-disabled:hover {
      box-shadow: none;
    }
  }

  /* 割当の「時」。勤務表グリッドのセル（.e-shift-hour）と同じ見せ方に揃える。 */
  .e-shift-hour {
    font-weight: bold;
    font-size: 1.15em;
    font-variant-numeric: tabular-nums;
  }

  /* 確定提案セル: 候補が1つに絞られた＝制約から一意に決まる値。勤務表グリッドと同じく、
     確定済みと同じ形（「時」/「休」）を破線で薄く描いて「承認すればこうなる」と読ませる。 */
  .e-forced-value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.6em;
    padding: 0 3px;
    border: 1px dashed rgba(0, 0, 0, 0.35);
    border-radius: 4px;
    opacity: 0.5;
    font-weight: bold;
    font-variant-numeric: tabular-nums;
  }

  /* 希望の円（左上）。中央は値のゾーンなので、希望はここに退避させる。
     色は WishEntry.color（勤務帯色 / 休みはグレー）を --wish-color で受け取る。
     ×（避けたい）希望は破線の円＋取り消し線で区別する（グリッドと同じ語彙）。 */
  .e-wish-badge {
    position: absolute;
    left: 2px;
    top: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    box-sizing: border-box;
    border: 1.5px solid var(--wish-color, #607d8b);
    border-radius: 50%;
    background: #fff;
    color: var(--wish-color, #607d8b);
    pointer-events: none; /* セルのクリックを邪魔しない */

    &.is-avoid {
      border-style: dashed;
    }
  }
  .e-wish-char {
    font-size: 0.62em;
    font-weight: 400;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .e-wish-badge.is-avoid .e-wish-char {
    text-decoration: line-through;
  }

  /* 必要人数フッタ */
  .e-foot-label {
    text-align: right;
    font-weight: bold;
    color: #607d8b;
    background: #fafafa;
    white-space: nowrap;
  }
  .e-foot {
    font-weight: bold;
    font-variant-numeric: tabular-nums;
    background: #fbfbfb;

    .e-cur {
      font-size: 1em;
    }
    .e-den {
      font-size: 0.75em;
      opacity: 0.7;
    }
    &.is-met {
      color: #2e7d32;
      background: #e8f5e9;
    }
    &.is-under {
      color: #c62828;
      background: #ffebee;
    }
  }
  .e-foot.e-off-col {
    color: #616161;
  }

  /* 責任者制約行（早責/予責/夜責）: 担当勤務帯の列に ◯（緑）/✕（赤） */
  .e-leader-chip {
    display: inline-block;
    font-weight: bold;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
  }
  .e-leader-cell {
    font-weight: bold;
    background: #fbfbfb;
    &.is-present {
      color: #2e7d32;
      background: #e8f5e9;
    }
    &.is-absent {
      color: #c62828;
      background: #ffebee;
    }
  }
`;
