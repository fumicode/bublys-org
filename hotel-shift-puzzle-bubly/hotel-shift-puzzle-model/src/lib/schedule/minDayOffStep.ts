/**
 * makeMinDayOffStep — 自動シフトのステップ「月◯日休む」
 *
 * 「スタッフは月に最低 minDayOff 日休む」を満たすコマンド。各スタッフについて現在の休み日数を
 * 数え、足りない分だけ空き（未定）セルに休みを入れる。
 *
 * 休みの入れ方（連勤を作らない配置）:
 *   休みは「暦の上で “休みでない日”（＝出勤 or 未定）が一番長く連続している区間」から順に、
 *   その区間の真ん中を割るように入れていく。これを月◯日ぶん置き切るまで繰り返す。
 *   - 未定セルは将来 出勤で埋まる前提なので「休みでない日」として連勤に数える。ここで休みを
 *     等間隔に割っておかないと、残りを出勤で埋めた瞬間に連勤（休みと休みの間の出勤が続きすぎ）
 *     が生まれてしまう。それを防ぐのがこのステップの役割。
 *   - 既にある休み（人間入力・休み希望・前のステップで確定）も区切りとして数える。区間はそれらで
 *     途切れる。
 *   - 一番長い区間から割るので、置くたびに「最長の連勤」が縮む。minDayOff が十分あれば（例: 30日の
 *     月に8日）休み間隔は自然に短くなり、連勤上限を超える区間は残らない。
 *   - 休める日数（minDayOff）を優先し、それでも割り切れない区間が残る場合は連勤が残りうる
 *     （＝日数ちょうどを最優先）。可能勤務帯の都合等で休めない日ばかりの区間は割れない。
 *
 * オプション:
 *   - maxPerDay : 1日に休んでよい人数の上限。これに達している日には休みを入れない（崩さない）。
 *   - phase     : 区間を割る位置のズラし。スタッフごとにも (phase + 並び順) でずらすため、
 *                 phase を変えると別の有効解になる（複数案＝世界線の生成に使う）。
 *
 * 大原則は他ステップと同じ:
 *   - 人間が入力済みのセル（出勤・休み）は上書きしない（未定セルのみ触る）
 *   - 出勤したい希望（work 指定）の日は休みにしない
 *
 * 純粋・不変。乱数は使わず、phase で決定的に解を変える。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

export type MinDayOffOptions = {
  /** 1日に休んでよい人数の上限（未指定なら無制限） */
  maxPerDay?: number;
  /** 区間を割る位置のズラし（複数案の生成に使う。既定 0） */
  phase?: number;
};

/**
 * 各スタッフに「月 minDayOff 日の休み」が入るよう、足りない分を空きセルへ置く（純粋・不変）。
 *
 * ステップ本体（makeMinDayOffStep）と、「必要人数を埋める」（fillDemand 系が埋める前に休みを
 * 先に確保するため）の両方から使う共有ロジック。置き方の方針は上のドキュメントコメントの通り。
 */
export function placeMinDayOffs(
  schedule: MonthlyStaffSchedule,
  ctx: AutoShiftContext,
  minDayOff: number,
  opts: MinDayOffOptions = {}
): { schedule: MonthlyStaffSchedule; assigned: number } {
  const { maxPerDay, phase = 0 } = opts;
  const days = schedule.workingDays();
  let result = schedule;
  let assigned = 0;

  ctx.staffIds.forEach((staffId, i) => {
    const need = minDayOff - result.countDayOffForStaff(staffId);
    if (need <= 0) return;

    // 「休みでない日」（出勤 or 未定＝将来 出勤になる）が連続する区間を、暦順に列挙する。
    // 既にある休みで区間は途切れる。区間 = [s, e]（days の添字）。
    const nonOffRuns = (): Array<{ s: number; e: number }> => {
      const out: Array<{ s: number; e: number }> = [];
      let s = -1;
      days.forEach((d, idx) => {
        const off = result.isDayOff(staffId, d);
        if (!off && s === -1) s = idx;
        if (off && s !== -1) {
          out.push({ s, e: idx - 1 });
          s = -1;
        }
      });
      if (s !== -1) out.push({ s, e: days.length - 1 });
      return out;
    };

    // 区間 [s, e] の中で休みを入れられる日を1つ選ぶ。
    // 必ず「区間の中央」を割る（最長の連勤を半分にして最大連勤を最小化する）。案ごとの差は
    // 中央から ±1 の小さなズラしに留める（端まで飛ばすと区間が偏って長い連勤が残るため）。
    // ズラし量は (phase + 並び順) から {-1,0,+1} を作り、案の違い＋スタッフ間の分散に使う。
    // 中央が休めない日（出勤希望・確定・maxPerDay 上限）なら、中央の近い順に外へ探す（巻回しない）。
    // 休みを入れられる = 未定 かつ 出勤希望でない かつ maxPerDay 未満。無ければ null。
    const splitDay = (s: number, e: number): number | null => {
      const len = e - s + 1;
      const mid = Math.floor((s + e) / 2);
      const bias = (((phase + i) % 3) + 3) % 3 - 1; // -1, 0, +1
      let center = mid + bias;
      if (center < s) center = s;
      if (center > e) center = e;
      const eligible = (idx: number): boolean => {
        const d = days[idx];
        return (
          result.isUndecided(staffId, d) &&
          ctx.preferenceOf(staffId, d).kind !== "work" &&
          (maxPerDay === undefined || result.countDayOffOn(d) < maxPerDay)
        );
      };
      for (let dist = 0; dist <= len; dist++) {
        const cands = dist === 0 ? [center] : [center + dist, center - dist];
        for (const idx of cands) {
          if (idx < s || idx > e) continue; // 区間外は捨てる（巻回しない）
          if (eligible(idx)) return idx;
        }
      }
      return null;
    };

    let placed = 0;
    while (placed < need) {
      // 一番長い区間から割る（＝最長の連勤を優先して縮める）。同長は暦の早い方から。
      const runs = nonOffRuns().sort((a, b) => b.e - b.s - (a.e - a.s) || a.s - b.s);
      let didPlace = false;
      for (const r of runs) {
        const idx = splitDay(r.s, r.e);
        if (idx !== null) {
          result = result.assignDayOff(staffId, days[idx]);
          assigned++;
          placed++;
          didPlace = true;
          break;
        }
      }
      if (!didPlace) break; // どの区間にも休める日が無い → これ以上置けない
    }
  });

  return { schedule: result, assigned };
}

export function makeMinDayOffStep(
  minDayOff: number,
  opts: MinDayOffOptions = {}
): AutoShiftStep {
  const { maxPerDay, phase = 0 } = opts;
  return {
    key: phase === 0 ? `min-day-off:${minDayOff}` : `min-day-off:${minDayOff}:p${phase}`,
    label: `月${minDayOff}日休む`,
    description: `各スタッフが月に最低${minDayOff}日休めるよう、足りない分だけ空きセルに休みを入れます${
      maxPerDay !== undefined ? `（1日${maxPerDay}人を超えない範囲で）` : ""
    }。連勤を作らないよう、休みでない日が一番長く続く区間から順に休みを割り込みます（人間入力・出勤希望は尊重）。`,

    run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult {
      const { schedule: result, assigned } = placeMinDayOffs(schedule, ctx, minDayOff, opts);
      return {
        schedule: result,
        assigned,
        message: `休みを ${assigned}件入れました（目標: 各自月${minDayOff}日${
          maxPerDay !== undefined ? ` / 1日${maxPerDay}人まで` : ""
        }）。`,
      };
    },
  };
}
