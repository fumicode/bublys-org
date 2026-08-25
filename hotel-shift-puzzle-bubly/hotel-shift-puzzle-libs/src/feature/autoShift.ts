/**
 * 自動シフト（段階的ステップ）の feature 層アダプタ。
 *
 * ドメインの各ステップ（model 層の AutoShiftStep）は希望の「オプションキー」の意味を知らない。
 * ここで shiftWishOptions の規約に従って希望をデコードし、可能勤務帯（ScheduleAvailability）を
 * 述語に変換して AutoShiftContext を組み、ステップへ渡す。希望キーの解釈はこの層が持つ。
 *
 * UI へはステップ一覧（AUTO_SHIFT_STEPS）をそのまま見せ、選ばれたステップを runAutoShiftStep で
 * 実行する。新しいコマンドが増えても UI は変更不要（リスト駆動）。
 */
import {
  MonthlyStaffSchedule,
  StaffMonthlyShiftWish,
  ScheduleAvailability,
  WorkShift,
  Staff,
  AUTO_SHIFT_STEPS,
  type AutoShiftStep,
  type AutoShiftContext,
  type AutoShiftStepResult,
  type DecodedWish,
  type WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  DAY_OFF_WISH,
  isWorkWish,
  workWishKey,
  workWishName,
} from "../ui/shiftWishOptions.js";

export { AUTO_SHIFT_STEPS };
export type { AutoShiftStep, AutoShiftStepResult };

/**
 * その日のその人の希望を、自動シフトが扱える形にデコードする。
 *
 * 入力仕様（#74）は「休」か「勤務帯×の集合」のどちらか一方なので、× は**その日に入れる帯を
 * 絞り込むもの**として読む:
 *   - 休みたい                     → day-off
 *   - × を除いた残りが1帯だけ       → work（その帯に決まる）
 *   - × を除いた残りが2帯以上       → neutral（需要充足ステップが残りから選ぶ）
 *   - × で全帯が消えた             → day-off（入れる帯が無い＝休みたい。入力表と同じ扱い）
 *   - 希望なし                     → neutral
 *
 * 旧データに残る「勤務帯○（want）」は、その帯を希望していると読み、○以外を×と同じ扱いにする
 * （＝「早番○」と「中番×・遅番×」が同じ結論になる）。ただし○の帯がこの勤務表に無い場合は
 * 休みたいという意味ではないので ambiguous（人間へ）。
 */
/** その日のその人の希望をデコードする（シフト提案ポリシー等からも利用） */
export const decodeWishForStaff = (
  wish: StaffMonthlyShiftWish | undefined,
  day: WorkingDay,
  shiftIdByName: Map<string, string>
): DecodedWish => {
  if (!wish) return { kind: "neutral" };
  const wishes = wish.wishesOn(day);
  const keys = Object.keys(wishes);
  if (keys.length === 0) return { kind: "neutral" };

  if (wishes[DAY_OFF_WISH] === "want") return { kind: "day-off" };

  const wantShiftNames = keys
    .filter((k) => isWorkWish(k) && wishes[k] === "want")
    .map(workWishName);
  const avoidShiftNames = keys
    .filter((k) => isWorkWish(k) && wishes[k] === "avoid")
    .map(workWishName);

  // ○が付いていればそれだけが候補、無ければ × を除いた残りが候補。
  const wantedOnly = wantShiftNames.length > 0;
  const allowedNames = (
    wantedOnly ? wantShiftNames : [...shiftIdByName.keys()]
  ).filter((name) => !avoidShiftNames.includes(name));

  // ×で全帯が消えたのなら「入れる帯が無い＝休みたい」（入力表が自動でそう畳むのと同じ）。
  // ○の帯がこの勤務表に無いだけのときは休みたいという意味ではないので人間へ。
  if (allowedNames.length === 0) {
    return wantedOnly ? { kind: "ambiguous" } : { kind: "day-off" };
  }
  if (allowedNames.length === 1) {
    const shiftId = shiftIdByName.get(allowedNames[0]);
    return shiftId ? { kind: "work", shiftId } : { kind: "ambiguous" };
  }
  // 候補は絞れたが1つには決まらない。どの帯にするかは需要充足ステップに委ねる
  // （×の帯を選ばせないのは AutoShiftContext.isAvailable が担う）。
  return { kind: "neutral" };
};

/**
 * その日その人が、その勤務帯に入れるか（希望の×を見る）。
 * 可能勤務帯（ScheduleAvailability）と AND して AutoShiftContext.isAvailable にする。
 */
const isNotAvoided = (
  wish: StaffMonthlyShiftWish | undefined,
  day: WorkingDay,
  shiftName: string | undefined
): boolean => {
  if (!wish || !shiftName) return true;
  return wish.preferenceFor(day, workWishKey(shiftName)) !== "avoid";
};

export type AutoShiftParams = {
  schedule: MonthlyStaffSchedule;
  staffList: Staff[];
  workShifts: WorkShift[];
  /** staffId → その月のシフト希望 */
  wishByStaff: Map<string, StaffMonthlyShiftWish>;
  /** 可能勤務帯（無ければ全可） */
  availability?: ScheduleAvailability;
  /** 連勤上限（既定 5） */
  maxConsecutive?: number;
  /**
   * 月の最低休日数。渡すと「必要人数を埋める」は先にこの日数の休みを確保してから埋める
   * （先に需要で埋め切ると空きセルが無くなって月◯日休めなくなるため）。
   */
  minDayOff?: number;
  /** 1日に休んでよい人数の上限（休みを入れるときに超えない） */
  maxDayOffPerDay?: number;
};

/** params から各ステップ共通の文脈を組む（希望のデコード・可能勤務帯の述語化） */
const buildContext = (params: AutoShiftParams): AutoShiftContext => {
  const {
    staffList,
    workShifts,
    wishByStaff,
    availability,
    maxConsecutive,
    minDayOff,
    maxDayOffPerDay,
  } = params;

  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
  // 勤務帯名 → 実体ID。同名が複数あれば最初の1つ（需要は名前粒度なので代表IDで埋める）
  const shiftIdByName = new Map<string, string>();
  for (const w of workShifts) {
    if (!shiftIdByName.has(w.name)) shiftIdByName.set(w.name, w.id);
  }

  return {
    staffIds: staffList.map((s) => s.id),
    shiftIdByName,
    shiftNameById,
    preferenceOf: (staffId, day) =>
      decodeWishForStaff(wishByStaff.get(staffId), day, shiftIdByName),
    // 「入れるか」は 可能勤務帯（人ごと・月通し） AND その日の希望×（日ごと） で決まる。
    isAvailable: (staffId, shiftId, day) =>
      (!availability || availability.isAllowed(staffId, shiftId)) &&
      isNotAvoided(wishByStaff.get(staffId), day, shiftNameById.get(shiftId)),
    maxConsecutive,
    minDayOff,
    maxDayOffPerDay,
  };
};

/** 指定の自動シフトステップを1つ実行し、新しい勤務表と結果を返す */
export const runAutoShiftStep = (
  step: AutoShiftStep,
  params: AutoShiftParams
): AutoShiftStepResult => step.run(params.schedule, buildContext(params));
