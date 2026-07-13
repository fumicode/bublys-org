import { FC, Fragment, useContext } from "react";
import { urlProps, BubblesContext, CurrentBubbleContext } from "@bublys-org/bubbles-ui";
import { DailyReservationInfo, type WorkingDay } from "../../domain/index.js";

/**
 * 稼働日ごとの予約・稼働情報を、勤務表の「日付ヘッダの上」に出す読み取り専用の行群。
 *
 * 元 Excel の並び（中 / 夕 / 泊 の宿泊人数・部屋数 / 備考 / 婚礼）をそのまま行にする。ここは表示だけで、
 * 入力は専用バブル（ScheduleReservationInfoView）で行う。備考は複数行テキストをそのまま折り返して出す。
 * 各セルは ObjectView で予約バブルの URL を持ち、ダブルクリックでそのバブルを開く。
 *
 * 【店ごとの付け替え】この行の並び（何を稼働日ごとに出すか）は店固有。別の店では
 * この定義ごと差し替える。汎用フィールド設定にはしない（制約付きの貧しい汎用を避ける）。
 */
const numStr = (n: number | undefined): string => (n === undefined ? "" : String(n));

type RoRow = {
  key: string;
  label: string;
  kind: "number" | "text";
  /** その日のセルに出す文字（数値 or 備考本文） */
  text: (r: DailyReservationInfo | undefined, day: WorkingDay) => string;
};

const RESERVATION_INFO_FIELDS: RoRow[] = [
  { key: "naka.guests", label: "中 人数", kind: "number", text: (r, d) => numStr(r?.numberOn(d, "naka", "guests")) },
  { key: "naka.rooms", label: "中 部屋数", kind: "number", text: (r, d) => numStr(r?.numberOn(d, "naka", "rooms")) },
  { key: "yu.guests", label: "夕 人数", kind: "number", text: (r, d) => numStr(r?.numberOn(d, "yu", "guests")) },
  { key: "yu.rooms", label: "夕 部屋数", kind: "number", text: (r, d) => numStr(r?.numberOn(d, "yu", "rooms")) },
  { key: "haku.guests", label: "泊 人数", kind: "number", text: (r, d) => numStr(r?.numberOn(d, "haku", "guests")) },
  { key: "haku.rooms", label: "泊 部屋数", kind: "number", text: (r, d) => numStr(r?.numberOn(d, "haku", "rooms")) },
  { key: "note", label: "備考", kind: "text", text: (r, d) => r?.noteOn(d) ?? "" },
  { key: "weddings", label: "婚礼", kind: "text", text: (r, d) => r?.weddingsOn(d) ?? "" },
];

type ReservationInfoRowsProps = {
  days: WorkingDay[];
  /** その勤務表の予約・稼働情報。未作成なら undefined（全セル空表示） */
  reservationInfo?: DailyReservationInfo;
  /** 予約・稼働情報の編集バブル URL。ダブルクリックで開く（無ければ開けない） */
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
  const { openBubble } = useContext(BubblesContext);
  const currentBubbleId = useContext(CurrentBubbleContext);

  // セル全体のダブルクリックで予約バブルを開く（空セルでも掴めるよう div 側で拾う）。
  const openEdit = reservationInfoUrl
    ? () => openBubble(reservationInfoUrl, currentBubbleId, "origin-side")
    : undefined;
  // data-url は実際のボックスを持つセル div に付ける。link bubble の起点はこの矩形から取られる
  // （display:contents の UrledPlace だと数値セルの直下がテキストノードで子要素が無く、0,0 になる）。
  const anchor = reservationInfoUrl ? urlProps(reservationInfoUrl) : {};

  return (
    <>
      {RESERVATION_INFO_FIELDS.map((field) => (
        <Fragment key={`res:${field.key}`}>
          <div
            className={`e-res-head${openEdit ? " is-clickable" : ""}`}
            title="ダブルクリックで予約・稼働情報を編集"
            onDoubleClick={openEdit}
            {...anchor}
          >
            {field.label}
          </div>

          {days.map((day) => {
            const wd = day.weekday; // 0=日 6=土
            const text = field.text(reservationInfo, day);
            const cls =
              `e-res-cell${text === "" ? " is-empty" : ""}` +
              `${wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""}` +
              `${field.kind === "text" ? " is-note" : ""}`;
            const inner =
              field.kind === "text" ? (
                <span className="e-res-note">{text}</span>
              ) : (
                text
              );
            return (
              <div
                key={`res:${field.key}:${day.key}`}
                className={cls}
                title={`${field.label} ${day.label}${
                  text === "" ? "（未入力）" : `: ${text}`
                } — ダブルクリックで編集`}
                onDoubleClick={openEdit}
                {...anchor}
              >
                {inner}
              </div>
            );
          })}

          <div className="e-res-filler" />
        </Fragment>
      ))}
    </>
  );
};
