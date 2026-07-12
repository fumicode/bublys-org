import { FC, Fragment } from "react";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { DailyReservationInfo, type WorkingDay } from "../../domain/index.js";

/**
 * 稼働日ごとの予約状況を、勤務表の「日付ヘッダの上」に出す読み取り専用の行群。
 *
 * ホテルの具体項目（宿泊人数・部屋数）をそのまま行にする。ここは表示だけで、
 * 入力は専用バブル（ScheduleReservationInfoView）で行う（狭い日列に詰め込まない）。
 * 各セルは ObjectView で予約バブルの URL を持ち、ダブルクリックでそのバブルを開く。
 *
 * 【店ごとの付け替え】この行の並び（何を稼働日ごとに出すか）は店固有。別の店では
 * この定義ごと差し替える。汎用フィールド設定にはしない（制約付きの貧しい汎用を避ける）。
 */
const RESERVATION_INFO_FIELDS: Array<{
  key: string;
  label: string;
  valueOf: (r: DailyReservationInfo | undefined, day: WorkingDay) => number | undefined;
}> = [
  { key: "guests", label: "宿泊人数", valueOf: (r, day) => r?.guestsOn(day) },
  { key: "rooms", label: "部屋数", valueOf: (r, day) => r?.roomsOn(day) },
];

type ReservationInfoRowsProps = {
  days: WorkingDay[];
  /** その勤務表の予約状況。未作成なら undefined（全セル空表示） */
  reservationInfo?: DailyReservationInfo;
  /** 予約状況の編集バブル URL。ダブルクリックで開く（無ければ開けない） */
  reservationInfoUrl?: string;
};

/**
 * grid の直接の子として「見出し + 日ごとのセル + 右端フィラー」を各項目ぶん emit する。
 * span で包むと grid が崩れるため Fragment で展開する（部署ヘッダ行と同じ流儀）。
 */
export const ReservationInfoRows: FC<ReservationInfoRowsProps> = ({
  days,
  reservationInfo,
  reservationInfoUrl,
}) => {
  return (
    <>
      {RESERVATION_INFO_FIELDS.map((field) => (
        <Fragment key={`res:${field.key}`}>
          <div className="e-res-head" title="ダブルクリックで予約状況を編集">
            {reservationInfoUrl ? (
              <ObjectView
                url={reservationInfoUrl}
                openingPosition="origin-side"
                draggable={false}
                fullWidth
              >
                {field.label}
              </ObjectView>
            ) : (
              field.label
            )}
          </div>

          {days.map((day) => {
            const wd = day.weekday; // 0=日 6=土
            const value = field.valueOf(reservationInfo, day);
            const cls = `e-res-cell${value === undefined ? " is-empty" : ""}${
              wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""
            }`;
            const text = value === undefined ? "" : String(value);
            return (
              <div
                key={`res:${field.key}:${day.key}`}
                className={cls}
                title={`${field.label} ${day.label}${
                  value === undefined ? "（未入力）" : `: ${value}`
                } — ダブルクリックで編集`}
              >
                {reservationInfoUrl ? (
                  <ObjectView
                    url={reservationInfoUrl}
                    openingPosition="origin-side"
                    draggable={false}
                    fullWidth
                  >
                    {text}
                  </ObjectView>
                ) : (
                  text
                )}
              </div>
            );
          })}

          <div className="e-res-filler" />
        </Fragment>
      ))}
    </>
  );
};
