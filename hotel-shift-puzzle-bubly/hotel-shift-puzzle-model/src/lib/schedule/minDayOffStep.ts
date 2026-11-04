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
 *   - 前月とつないでいれば、前月末から続く出勤を月初の区間の前に足して長さを測る
 *     （前月末に5日働いた人は、月初の区間がその5日ぶん長いのと同じ）。割る位置もその
 *     つながった区間の真ん中にする。前月側には休みを置けないので、置けるのは今月側だけ。
 *   - 休める日数（minDayOff）を優先し、それでも割り切れない区間が残る場合は連勤が残りうる
 *     （＝日数ちょうどを最優先）。可能勤務帯の都合等で休めない日ばかりの区間は割れない。
 *
 * 休みの形（人ごと。ctx.dayOffStyleOf）:
 *   - 分散型（既定）… 上の置き方。ただし休みの隣（＝連休になる日）には、ほかに置ける日が
 *     無いときだけ置く（連勤上限を超える区間を割るときは隣でも割る）。
 *   - 連休型 … 休みを2日続けてまとめる。まとめるほど出勤の塊は長くなるので、
 *     ① 続けてよい日数（その人の目標と全体の連勤上限の小さい方）を超える区間があれば、
 *        まず区間の端（休みの隣）に置いて縮める。置いた日がそのまま連休になる。ただし残りの
 *        休みで長すぎる区間を区切りきれるときだけ。できなければ区間の頭からその日数だけ
 *        出勤させた次の日を休みにする（4連1休・5連1休の区別はここ）
 *     ② 超える区間が無ければ、単発の休みの隣に足して2連休にする（3連休は狙わない）
 *     ③ どちらもできなければ、分散型と同じく一番長い区間の中央を割る
 *     休みの日数（minDayOff）は形より強い。目標を守るために休みを増やすことはしない。
 *
 * 月を跨いでもリセットしない。前月の確定版の末尾（schedule.precedingTail）を今月の前に
 * ひと続きの日として読む:
 *   - 前月末から続く出勤は、月初の区間の長さに足す（前月から5連勤なら1日目が割られる）
 *   - 前月末日が単発の休みなら、連休型の人は1日目を相方にできる（前月末からの連休）
 *
 * オプション:
 *   - maxPerDay : 1日に休んでよい人数の上限。これに達している日には休みを入れない（崩さない）。
 *   - phase     : 区間を割る位置のズラし。スタッフごとにも (phase + 並び順) でずらすため、
 *                 phase を変えると別の有効解になる（複数案＝世界線の生成に使う）。
 *
 * 大原則は他ステップと同じ:
 *   - 人間が入力済みのセル（出勤・休み）は上書きしない（未定セルのみ触る）
 *   - 出勤したい希望（work 指定）の日は休みにしない
 *   - 置いても勤務表の制約に新しい違反が出ない日にだけ休みを置く（canPlace）
 *
 * 純粋・不変。乱数は使わず、phase で決定的に解を変える。
 */
import type {
  AutoShiftStep,
  AutoShiftContext,
  AutoShiftStepResult,
} from "./autoShiftStep.js";
import { canPlace } from "./autoShiftStep.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";
import { DayOffStyle } from "../staff/DayOffStyle.js";

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

    const style = ctx.dayOffStyleOf?.(staffId) ?? DayOffStyle.DEFAULT;

    // 前月末から持ち越した出勤日数。月初（s=0）の区間は、その日数ぶん前へ伸びているとみなす
    const tail = result.precedingTail;
    const carried = tail?.trailingWorkdays(staffId) ?? 0;
    const startOf = (s: number): number => (s === 0 ? -carried : s);
    const lengthOf = (r: { s: number; e: number }): number => r.e - startOf(r.s) + 1;

    // その日が休みか。負の添字は前月の末尾（-1 が前月末日）。写していない日は休みでない
    const offAt = (idx: number): boolean => {
      if (idx >= days.length) return false;
      if (idx >= 0) return result.isDayOff(staffId, days[idx]);
      const tailDay = tail?.days[tail.days.length + idx];
      return tailDay !== undefined && tail?.cellOf(staffId, tailDay)?.value.kind === "day-off";
    };

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

    // 休みを入れられる = 未定 かつ 出勤希望でない かつ maxPerDay 未満 かつ
    // 勤務表の制約に新しい違反が出ない（休み×の希望など）
    const eligible = (idx: number): boolean => {
      const d = days[idx];
      if (!d) return false;
      return (
        result.isUndecided(staffId, d) &&
        ctx.preferenceOf(staffId, d).kind !== "work" &&
        (maxPerDay === undefined || result.countDayOffOn(d) < maxPerDay) &&
        canPlace(ctx, result, staffId, d, { kind: "day-off" })
      );
    };

    // その日の隣（前日か翌日）が休みか。前月末日も数える
    const besideOff = (idx: number): boolean => offAt(idx - 1) || offAt(idx + 1);

    // 区間 [s, e] の中で、target に近い順に休める日を探す（巻回しない）。
    // preferEarlier なら同じ距離では手前を先に見る（区間を目標より長くしないため）。
    // avoidBeside なら休みの隣の日は選ばない（分散型が自分から連休を作らないため）。
    const nearest = (
      s: number,
      e: number,
      target: number,
      preferEarlier: boolean,
      avoidBeside = false
    ): number | null => {
      const center = Math.max(s, Math.min(e, target));
      for (let dist = 0; dist <= e - s; dist++) {
        const cands =
          dist === 0
            ? [center]
            : preferEarlier
              ? [center - dist, center + dist]
              : [center + dist, center - dist];
        for (const idx of cands) {
          if (idx < s || idx > e) continue;
          if (avoidBeside && besideOff(idx)) continue;
          if (eligible(idx)) return idx;
        }
      }
      return null;
    };

    const globalLimit = ctx.maxConsecutiveWorkdays ?? Infinity;

    // 区間 [s, e] の中央を割る（最長の連勤を半分にして最大連勤を最小化する）。案ごとの差は
    // 中央から ±1 の小さなズラしに留める（端まで飛ばすと区間が偏って長い連勤が残るため）。
    // ズラし量は (phase + 並び順) から {-1,0,+1} を作り、案の違い＋スタッフ間の分散に使う。
    // 中央が休めない日（出勤希望・確定・maxPerDay 上限）なら、中央の近い順に外へ探す。
    //
    // ただし割った両側のどちらかが連勤上限を超える日は、両側が上限以内に収まる日より後に回す。
    // 確定した出勤が偏っていると、真ん中に近い日で割っても片側に上限超えが残り、休みを
    // 1日余計に使う（その分、別の区間を割る休みが足りなくなる）。
    const splitMiddle = (s: number, e: number, avoidBeside = false): number | null => {
      const start = startOf(s);
      const mid = Math.floor((start + e) / 2);
      const bias = (((phase + i) % 3) + 3) % 3 - 1; // -1, 0, +1
      const target = Math.max(s, Math.min(e, mid + bias));
      const order: Array<{ idx: number; excess: number; dist: number; before: number }> = [];
      for (let idx = s; idx <= e; idx++) {
        if (avoidBeside && besideOff(idx)) continue;
        const longerSide = Math.max(idx - start, e - idx);
        order.push({
          idx,
          excess: Math.max(0, longerSide - globalLimit),
          dist: Math.abs(idx - target),
          before: idx < target ? 1 : 0, // 同じ距離なら後ろ側を先に（従来の探し方と同じ）
        });
      }
      order.sort((a, b) => a.excess - b.excess || a.dist - b.dist || a.before - b.before);
      for (const { idx } of order) if (eligible(idx)) return idx;
      return null;
    };
    const splitMiddleApart = (s: number, e: number) => splitMiddle(s, e, true);

    // 連休型：区間の頭から「続けてよい日数」だけ出勤させ、その次の日を休みにする。
    // 中央で割ると塊が必要以上に短くなり、連休に回す休みが残らない。
    // 案ごとの差は 0 / -1 日のズラし（目標より長くはしない）。
    const runLimit = style.runLimitWithin(ctx.maxConsecutiveWorkdays ?? Infinity);
    const splitAtLimit = (s: number, e: number): number | null => {
      const shift = (((phase + i) % 2) + 2) % 2; // 0, 1
      return nearest(s, e, startOf(s) + runLimit - shift, true);
    };

    // 連休型：単発の休み（両隣が休みでない）の隣に休みを足して2連休にする。前月末日の休みも
    // 相方になる。3連休にはしない（もう片側の隣が休みなら置かない）。
    // 隣のうち、続く出勤の塊が長い側を先に選ぶ（塊を縮める方へ寄せる）。
    const pairDay = (): number | null => {
      const runs = nonOffRuns();
      const runLengthAt = (idx: number): number => {
        const r = runs.find((r) => r.s <= idx && idx <= r.e);
        return r ? lengthOf(r) : 0;
      };
      const options: Array<{ idx: number; run: number }> = [];
      for (let p = -1; p < days.length; p++) {
        if (!offAt(p) || offAt(p - 1) || offAt(p + 1)) continue;
        for (const q of [p - 1, p + 1]) {
          if (q < 0 || q >= days.length) continue;
          const beyond = q < p ? q - 1 : q + 1;
          if (offAt(beyond) || !eligible(q)) continue;
          options.push({ idx: q, run: runLengthAt(q) });
        }
      }
      if (options.length === 0) return null;
      options.sort((a, b) => b.run - a.run || a.idx - b.idx);
      return options[0].idx;
    };

    // 一番長い区間から（同長は暦の早い方から）
    const byLength = (runs: Array<{ s: number; e: number }>) =>
      runs.sort((a, b) => lengthOf(b) - lengthOf(a) || a.s - b.s);

    const firstIn = (
      runs: Array<{ s: number; e: number }>,
      split: (s: number, e: number) => number | null
    ): number | null => {
      for (const r of runs) {
        const idx = split(r.s, r.e);
        if (idx !== null) return idx;
      }
      return null;
    };

    // 区間を runLimit 以内に区切りきるのに要る休みの日数
    const daysToSplit = (length: number): number =>
      Math.max(0, Math.ceil((length - runLimit) / (runLimit + 1)));

    // 連休型：長すぎる区間を、端（休みの隣）に置いて縮める。置いたその日が連休になる。
    // ただし、残りの休みで長すぎる区間を区切りきれるときだけ（連休より目標の日数を守る）。
    const shortenBesideOff = (
      over: Array<{ s: number; e: number }>,
      all: Array<{ s: number; e: number }>,
      remaining: number
    ): number | null => {
      for (const r of over) {
        const ends = [
          { idx: r.e, ok: offAt(r.e + 1) && !offAt(r.e + 2) },
          { idx: r.s, ok: offAt(r.s - 1) && !offAt(r.s - 2) },
        ];
        for (const { idx, ok } of ends) {
          if (!ok || !eligible(idx)) continue;
          const stillNeeded = all.reduce(
            (sum, x) => sum + daysToSplit(lengthOf(x) - (x === r ? 1 : 0)),
            0
          );
          if (stillNeeded <= remaining - 1) return idx;
        }
      }
      return null;
    };

    // 次に休みを置く日。
    // 分散型は「一番長い区間の中央」。ただし休みの隣（＝連休になる日）は、ほかに置ける日が
    // 無いときだけ。連勤上限を超える区間があれば、そちらを割るのが先（隣でも割る）。
    // 連休型は
    //   ① 続けてよい日数を超える区間があれば、まず休みの隣に置いて縮める（残りの休みで
    //      区切りきれるときだけ）。それができなければ目標の位置で区切る
    //   ② 単発の休みの隣に足して連休にする
    //   ③ どちらもできなければ、分散型と同じく一番長い区間の中央を割る（次の回で②の相方になる）
    const nextDay = (remaining: number): number | null => {
      const runs = byLength(nonOffRuns());
      if (!style.isClustered) {
        const over = runs.filter((r) => lengthOf(r) > globalLimit);
        const apartOrBeside = (pool: Array<{ s: number; e: number }>) =>
          firstIn(pool, splitMiddleApart) ?? firstIn(pool, splitMiddle);
        return (over.length > 0 ? apartOrBeside(over) : null) ?? apartOrBeside(runs);
      }
      const over = runs.filter((r) => lengthOf(r) > runLimit);
      return (
        shortenBesideOff(over, runs, remaining) ??
        firstIn(over, splitAtLimit) ??
        pairDay() ??
        firstIn(runs, splitMiddle)
      );
    };

    let placed = 0;
    while (placed < need) {
      const idx = nextDay(need - placed);
      if (idx === null) break; // どの区間にも休める日が無い → これ以上置けない
      result = result.assignDayOff(staffId, days[idx]);
      assigned++;
      placed++;
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
    grantsDayOffInStaffOrder: true,
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
