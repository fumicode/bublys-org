/**
 * constraintRibbon — 責任者制約のリボンを「どう描くか」を決める
 *
 * ホバー時のオーバーレイ（ConstraintHoverOverlay）は、担当勤務帯のノードから各候補者の
 * セルへリボンを伸ばす。その1本1本を、濃く出すのか・薄く出すのか・点滅させるのかを決める。
 *
 * 肝は「その日まだ入れる人」だけを点滅させること。休みや別の勤務帯で確定している人は
 * もう入れないので、点滅させると「誰か入って」を入れない人にまで言うことになる。
 * 入れる人が1人まで絞られたら、巡回させず静的に点灯する（制約バブルの図・アイコンが
 * 候補1人のときに静的点灯するのと同じ見せ方に揃える）。
 *
 * 描画から切り離した純粋関数にしてあるので、DOM を用意せずに振る舞いを固定できる。
 */

/**
 * リボンの描き方。
 *   solid = 実際に入っている人（太く濃く）
 *   only  = 入れるのがこの人だけ（静的に濃く。巡回しない）
 *   blink = 入れる候補が複数（巡回点灯で「誰か入って」）
 *   faint = 入っていない／もう入れない（薄く）
 *   sync  = 誰も入れない日の警告（黄色・全体同時点滅）
 */
export type RibbonMode = "solid" | "only" | "blink" | "faint" | "sync";

/** リボン1本を決めるのに要る、その人のその日の状態。 */
export type RibbonMember = {
  /** 担当勤務帯に実際に入っている（＝充足に寄与している）か。 */
  covering: boolean;
  /** その日まだ未定で、これから担当勤務帯に入れるか。 */
  available: boolean;
};

export type RibbonPlan = {
  mode: RibbonMode;
  /** blink 用: グループ内の点灯順。 */
  index: number;
  /** blink 用: 巡回する本数。 */
  count: number;
};

export type RibbonContext = {
  /** その日、このルールが満たされているか。 */
  satisfied: boolean;
  /** 入れる人が誰も残っていない＝この日は絶対に満たせない。 */
  unfillable: boolean;
};

/**
 * 候補者ごとのリボンの描き方を、渡された順に返す。
 *
 * unfillable のときは全員 sync（黄色の警告）にする。満たせないことを一目で出すのが先で、
 * 個々の内訳はその次だから。
 */
export function planRibbons(
  members: readonly RibbonMember[],
  { satisfied, unfillable }: RibbonContext
): RibbonPlan[] {
  if (unfillable) {
    return members.map(() => ({ mode: "sync" as const, index: 0, count: 0 }));
  }

  // 点滅させるのは「まだ入れる人」だけ。入っている人・もう入れない人は対象外。
  const invitable = satisfied
    ? 0
    : members.filter((m) => !m.covering && m.available).length;
  // 1人しか入れないなら巡回する意味がない。静的に点灯して「この人しかいない」を出す。
  const single = invitable === 1;

  let blinkIndex = 0;
  return members.map((m) => {
    if (m.covering) return { mode: "solid" as const, index: 0, count: 0 };
    if (satisfied || !m.available) return { mode: "faint" as const, index: 0, count: 0 };
    if (single) return { mode: "only" as const, index: 0, count: 0 };
    return { mode: "blink" as const, index: blinkIndex++, count: invitable };
  });
}
