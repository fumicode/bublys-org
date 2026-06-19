import { FC } from "react";
import type { WorkingDay } from "../../domain/index.js";
import type { SummaryRow as SummaryRowModel } from "./summaryModel.js";
import type { EditingRequired } from "./types.js";

type SummaryRowProps = {
  row: SummaryRowModel;
  days: WorkingDay[];
  /** 集計ブロック内での行番号（先頭行だけ区切り罫線） */
  rowIndex: number;
  /** 必要人数を編集できる行か（勤務帯行のみ） */
  editable: boolean;
  /** 必要人数編集メニューを開く */
  onEditRequired: (params: EditingRequired) => void;
};

/**
 * 集計行 1 行（勤務帯ごと or 休み）。
 * 勤務帯行は「現在/必要」を分母付きで表示し、充足率を背景バーで描く（達成=緑/不足=赤）。
 * 必要数なしの行は人数のみ。休み行の右端には月内の総休み数（＝休列の合計）を出す。
 */
export const SummaryRow: FC<SummaryRowProps> = ({
  row,
  days,
  rowIndex,
  editable,
  onEditRequired,
}) => {
  const isFirst = rowIndex === 0;
  const firstCls = isFirst ? " is-first" : "";
  const isDayOff = row.key === "day-off";

  return (
    <>
      <div
        className={`e-sum-head${firstCls}${editable ? " is-editable" : ""}`}
        style={{ background: row.bg, color: row.fg }}
        role={editable ? "button" : undefined}
        title={editable ? `${row.label}の必要人数を全日まとめて設定` : undefined}
        onClick={
          editable
            ? (e) =>
                onEditRequired({
                  anchor: e.currentTarget,
                  shiftName: row.label,
                  day: null,
                  current: row.required?.(0) ?? 0,
                })
            : undefined
        }
      >
        {row.label}
      </div>

      {days.map((day, i) => {
        const n = row.count(i);
        const req = row.required?.(i) ?? 0;

        // 必要数あり: 「現在/必要」を分母付きで表示。色は勤務帯ではなく「満たされているか」で
        // 決める（達成=緑 / 不足=赤）。背景バーは充足率ぶんを下から上に伸ばす。
        if (req > 0) {
          const pct = Math.min(100, Math.round((n / req) * 100));
          const met = n >= req;
          const fill = met ? "#c8e6c9" : "#ffcdd2"; // 達成=緑 / 不足=赤
          const track = "#f7f7f7"; // 未充足ぶん（上側）
          return (
            <div
              key={`sum:${row.key}:${day.key}`}
              className={`e-sum-cell is-ratio${firstCls}${met ? " is-met" : " is-under"}${
                editable ? " is-editable" : ""
              }`}
              style={{
                background: `linear-gradient(to top, ${fill} ${pct}%, ${track} ${pct}%)`,
              }}
              title={`${row.label} ${day.label}: ${n}/${req}名（${
                met ? "達成" : "不足"
              }）${editable ? " — クリックで必要人数を変更" : ""}`}
              role={editable ? "button" : undefined}
              onClick={
                editable
                  ? (e) =>
                      onEditRequired({
                        anchor: e.currentTarget,
                        shiftName: row.label,
                        day,
                        current: req,
                      })
                  : undefined
              }
            >
              <span className="e-cur">{n}</span>
              <span className="e-den">/{req}</span>
            </div>
          );
        }

        // 必要数なし: 人数のみ（時間帯色は付けない）。
        // 勤務帯行（editable）なら、まだ必要数 0 の日もクリックで設定できる。
        return (
          <div
            key={`sum:${row.key}:${day.key}`}
            className={`e-sum-cell${firstCls}${n === 0 ? " is-zero" : ""}${
              editable ? " is-editable" : ""
            }`}
            role={editable ? "button" : undefined}
            title={editable ? `${row.label} ${day.label}: 必要人数を設定` : undefined}
            onClick={
              editable
                ? (e) =>
                    onEditRequired({
                      anchor: e.currentTarget,
                      shiftName: row.label,
                      day,
                      current: 0,
                    })
                : undefined
            }
          >
            {n}
          </div>
        );
      })}

      {/* 右端: 休み行だけ月内の総休み数（＝休列の合計）。他行は空 */}
      {isDayOff ? (
        <div className={`e-off-total e-off-sum${firstCls}`} title="全スタッフの休み合計">
          {days.reduce((sum, _day, i) => sum + row.count(i), 0)}
        </div>
      ) : (
        <div className={`e-off-total e-off-filler${firstCls}`} />
      )}
    </>
  );
};
