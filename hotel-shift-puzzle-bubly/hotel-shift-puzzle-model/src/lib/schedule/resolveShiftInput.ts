/**
 * resolveShiftInput — キーボード入力から勤務割当（ShiftCell）を解決する
 *
 * 勤務表のセルを選んだ状態で打ち込まれた文字列を、その勤務表で使える勤務帯
 * （WorkShift[]）に照らして ShiftCell に変換する純粋関数。
 *
 * 対応する入力:
 *   - 数字（"7" / "9" / "13" …）      → 開始時刻(startHour)が一致する勤務帯で出勤
 *   - 休みの語（"yasumi" / "kyuu" …） → 休み（day-off）
 *   - ローマ字別名（"hayaban" …）     → WorkShift.aliases に一致する勤務帯で出勤
 *   - 勤務帯ID / 名前（"early" / "早番"）→ その勤務帯で出勤
 *
 * 未定（undecided）への変更は「打ち込み」ではなく Backspace 操作なので、ここでは扱わない。
 * どのルールにも当てはまらない入力は undefined を返す（＝確定しない）。
 */
import type { WorkShift } from "./WorkShift.js";
import type { ShiftCell } from "./MonthlyStaffSchedule.js";

/** 休みを表す入力語（大文字小文字は無視） */
const DAY_OFF_WORDS = ["yasumi", "kyuu", "kyu", "kyuujitsu", "off", "休", "やすみ"];

export function resolveShiftInput(
  raw: string,
  shifts: WorkShift[]
): ShiftCell | undefined {
  const trimmed = raw.trim();
  const input = trimmed.toLowerCase();
  if (input === "") return undefined;

  // 休み
  if (DAY_OFF_WORDS.includes(input)) return { kind: "day-off" };

  // 数字 → 開始時刻(時)が一致する勤務帯
  if (/^\d{1,2}$/.test(input)) {
    const hour = Number(input);
    const byHour = shifts.find((w) => w.startHour === hour);
    return byHour ? { kind: "work", shiftId: byHour.id } : undefined;
  }

  // 別名 / ID / 名前 で一致する勤務帯
  const byName = shifts.find(
    (w) =>
      w.id.toLowerCase() === input ||
      w.name === trimmed ||
      w.aliases.some((a) => a.toLowerCase() === input)
  );
  return byName ? { kind: "work", shiftId: byName.id } : undefined;
}

/**
 * 入力候補（打ち込み中に見せるセレクトボックス用）。
 * work は勤務帯インスタンスをそのまま持ち、表示（名前・開始時刻）は UI 側に委ねる。
 * undecided は「未定（クリア）」= セルを未割当に戻す選択肢。
 */
export type ShiftSuggestion =
  | { kind: "work"; shift: WorkShift }
  | { kind: "day-off" }
  | { kind: "undecided" };

/** その勤務帯が入力（前方一致）の候補になるか */
function shiftMatchesPrefix(w: WorkShift, input: string): boolean {
  if (/^\d+$/.test(input)) {
    // 数字は開始時刻(時)の前方一致（"1" は 13:00 の遅番にも当たる）
    return String(w.startHour).startsWith(input);
  }
  return (
    w.id.toLowerCase().startsWith(input) ||
    w.name.startsWith(input) ||
    w.aliases.some((a) => a.toLowerCase().startsWith(input))
  );
}

/**
 * 打ち込み中のバッファに対する入力候補を、前方一致で絞って返す。
 * 空文字なら全候補（全勤務帯 + 休み）を返す＝セレクトボックスの初期表示。
 * resolveShiftInput が「確定（完全一致）」なのに対し、こちらは「候補（前方一致）」。
 */
export function suggestShiftInputs(
  raw: string,
  shifts: WorkShift[]
): ShiftSuggestion[] {
  const input = raw.trim().toLowerCase();
  const out: ShiftSuggestion[] = [];

  for (const w of shifts) {
    if (input === "" || shiftMatchesPrefix(w, input)) {
      out.push({ kind: "work", shift: w });
    }
  }

  const dayOffMatches =
    input === "" || DAY_OFF_WORDS.some((word) => word.toLowerCase().startsWith(input));
  if (dayOffMatches) out.push({ kind: "day-off" });

  // 「未定（クリア）」は初期表示（空文字）のときだけ末尾に出す。
  // 何か打ち込んでいる最中は勤務帯を選びに来ているので候補に混ぜない。
  if (input === "") out.push({ kind: "undecided" });

  return out;
}
