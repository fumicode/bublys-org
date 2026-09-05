/**
 * candidateRequest — 候補集合の計算依頼（plain）と、その実行
 *
 * 候補集合の計算は制約オブジェクト（メソッドを持つクラス）を必要とするが、worker へは
 * plain しか送れない。そこで「制約を組み立て直すのに必要な素材」だけを plain で運び、
 * 受け取った側（worker でも main thread でも）で組み立て直して計算する。
 *
 * 同期フォールバックと worker が同じ computeCandidatesFor を通るので、どちらで走っても
 * 結果は同じになる。
 */
import {
  MonthlyStaffSchedule,
  ScheduleCandidates,
  ScheduleConstraints,
  StaffMonthlyShiftWish,
  WorkShift,
  WorkingDay,
  computeAllCandidates,
  deadCellDiagnosisToPlain,
  findRepairsForDeadCell,
  recomputeCandidates,
  type CandidateComputationInput,
  type MonthlyStaffSchedulePlain,
  type DeadCellDiagnosisPlain,
  type ScheduleCandidatesPlain,
  type ScheduleConstraintsState,
  type StaffMonthlyShiftWishPlain,
  type WorkShiftState,
} from "@bublys-org/hotel-shift-puzzle-model";
import { buildScheduleConstraints } from "../scheduleConstraints.js";

/** セル座標の plain 形（WorkingDay はキー文字列で運ぶ） */
export type CandidateCellRefPlain = {
  staffId: string;
  dayKey: string;
};

export type CandidateRequest = {
  schedule: MonthlyStaffSchedulePlain;
  /** 候補を計算する対象スタッフ（勤務表の行） */
  staffIds: string[];
  workShifts: WorkShiftState[];
  /** 勤務表ごとの制約集約。未作成なら null（希望チェックだけになる） */
  constraints: ScheduleConstraintsState | null;
  /** 希望との食い違いも制約として見るか */
  checkShiftWish: boolean;
  wishes: StaffMonthlyShiftWishPlain[];
  /**
   * 差分計算するときだけ渡す。previous（前回の候補集合）と changed（変わったセル）が
   * 揃っているときは影響範囲だけ計算し、揃っていなければ全計算する。
   */
  previous?: ScheduleCandidatesPlain;
  changed?: CandidateCellRefPlain[];
};

/** plain の素材から、計算に使うドメインオブジェクト一式を組み立て直す。 */
function rebuildInput(request: CandidateRequest): CandidateComputationInput {
  const schedule = MonthlyStaffSchedule.fromPlain(request.schedule);
  const workShifts = request.workShifts.map((state) => new WorkShift(state));
  const shiftIdsOf = (shiftName: string) =>
    workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
  const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));

  const wishByStaff = new Map<string, StaffMonthlyShiftWish>();
  for (const plain of request.wishes) {
    const wish = StaffMonthlyShiftWish.fromPlain(plain);
    wishByStaff.set(wish.staffId, wish);
  }

  const aggregate = request.constraints
    ? ScheduleConstraints.fromPlain(request.constraints)
    : undefined;

  return {
    schedule,
    workShifts,
    staffIds: request.staffIds,
    constraints: buildScheduleConstraints({
      modelConstraints: aggregate?.modelConstraints(shiftIdsOf),
      wish: request.checkShiftWish ? { wishByStaff, shiftNameById } : undefined,
    }),
  };
}

/** 依頼を実行して候補集合を返す（worker でも main thread でも同じ経路を通る） */
export function computeCandidatesFor(
  request: CandidateRequest
): ScheduleCandidatesPlain {
  const input = rebuildInput(request);

  if (request.previous && request.changed) {
    return recomputeCandidates(
      ScheduleCandidates.fromPlain(request.previous),
      input,
      request.changed.map((cell) => ({
        staffId: cell.staffId,
        day: WorkingDay.fromKey(cell.dayKey),
      }))
    ).toPlain();
  }

  return computeAllCandidates(input).toPlain();
}

/**
 * 詰みセルの診断（なぜどの値も入らないのか・どこを書き換えれば入るのか）を実行する。
 * 候補集合の計算と同じ素材（CandidateRequest）から文脈を組み立て直すので、
 * worker でも main thread でも同じ結果になる。
 */
export function diagnoseDeadCellFor(
  request: CandidateRequest,
  deadCell: CandidateCellRefPlain
): DeadCellDiagnosisPlain {
  return deadCellDiagnosisToPlain(
    findRepairsForDeadCell(rebuildInput(request), {
      staffId: deadCell.staffId,
      day: WorkingDay.fromKey(deadCell.dayKey),
    })
  );
}
