/**
 * cellViolationMarks — セルにかかる違反を、どの印で描くかに振り分ける
 *
 * ルールは描き方ごとに1つ:
 *   - 希望の食い違い     … 希望の円をオレンジにする（希望が無ければ食い違いも出ない）
 *   - 勤務間インターバル … 2日の境目の印（違反しているのはセルではなく2日の間隔）
 *   - 日をまたぐ違反     … 下端の赤帯（連勤など。帯が日をつないで範囲に見える）
 *   - 1セルで完結する違反 … 右上の角の赤い三角（可能勤務帯の外に入れた、など）
 *
 * 帯と角は場所が違うので、連勤の範囲の中に可能勤務帯の違反があっても両方見える。
 * 以前は「1日の違反＝希望の食い違い」と決め打ちしていたので、希望以外の1日の違反は
 * 希望の円が無いセルでは何も描かれなかった（#216）。
 */
import {
  ConstraintViolation,
  isShiftIntervalConstraintType,
} from "../../domain/index.js";
import { SHIFT_WISH_MISMATCH } from "../shiftWishOptions.js";

export type CellViolationMarks = {
  /** 下端の赤帯で描く違反（日をまたぐもの） */
  bar?: ConstraintViolation;
  /** 右上の角で描く違反（1セルで完結するもの） */
  corner?: ConstraintViolation;
  /** 希望の円で描く違反 */
  wish?: ConstraintViolation;
  /** 勤務間インターバル（境目の印）。どちら側の境目かは呼び出し側が日付で決める */
  interval: ConstraintViolation[];
};

export function cellViolationMarks(covering: ConstraintViolation[]): CellViolationMarks {
  const interval = covering.filter((v) => isShiftIntervalConstraintType(v.constraintType));
  const wish = covering.find((v) => v.constraintType === SHIFT_WISH_MISMATCH);
  const rest = covering.filter(
    (v) =>
      !isShiftIntervalConstraintType(v.constraintType) &&
      v.constraintType !== SHIFT_WISH_MISMATCH
  );
  return {
    bar: rest.find((v) => v.days.length > 1),
    corner: rest.find((v) => v.days.length === 1),
    wish,
    interval,
  };
}
