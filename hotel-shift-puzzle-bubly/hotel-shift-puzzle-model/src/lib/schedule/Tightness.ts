/**
 * Tightness — 制約のきつさ（違反に近づいている度合い・違反している度合い）の量
 *
 * ルール: **量は単位つき。比べてよいのは同じ単位どうしだけ。**
 * 連勤1日と責任者1人のあいだに交換レートは無いので、違う制約（違う段階）の量は比べない。
 * どの段階をどれだけ重く見るかは、制約レシピの優先度で現場ごとに決める（#229）。
 *
 * 単位は制約の「段階」ごとに1つ。例：連勤（上限 N）なら
 *   上限ちょうど（件・守っている）／上限超え（超えた日数・違反）
 * 量は件数でも、超えた分・足りない分でもよい（単位が何を数えるかを決める）。
 * いまは段階を細かく分けず、量で数える（6連勤と7連勤の重さの違いは、超えた日数の差として出る）。
 * 1日超えと2日以上超えのように意味の違う段階に分けたくなったら、単位を分けて足す。
 *
 * **違反かどうかは単位が決める。** 量そのものには印を持たない（持つと単位と量の2か所に真実ができる）。
 * 向きは「大きいほど悪い」にそろえる（余裕のように逆向きの量は持たない）。
 */

export type TightnessUnitState = {
  /** 見分けるためのキー（比べ方はこれで決まる。label を変えても比べ方は変わらない） */
  key: string;
  /** 人が読む名前（例: "連勤1日超え"） */
  label: string;
  /** この段階が違反か（違反の段階だけが check() の違反になる） */
  violating: boolean;
  /**
   * 制約レシピに載っていないときの重み（ConstraintRecipe.weightOf）。省略時は違反かどうかで決まる。
   * 違反ではないが目標として重く見たい単位（必要人数の不足など）が指定する。
   */
  defaultWeight?: { hard: boolean; priority: number };
};

/** きつさの単位。制約の段階ごとに定数で宣言する（その場で書かない＝表記揺れで別の単位にならない） */
export class TightnessUnit {
  constructor(readonly state: TightnessUnitState) {}

  get key(): string {
    return this.state.key;
  }

  get label(): string {
    return this.state.label;
  }

  get isViolating(): boolean {
    return this.state.violating;
  }

  equals(other: TightnessUnit): boolean {
    return this.state.key === other.state.key;
  }
}

/** きつさの量（単位つき） */
export class TightnessAmount {
  constructor(readonly state: { amount: number; unit: TightnessUnit }) {}

  get amount(): number {
    return this.state.amount;
  }

  get unit(): TightnessUnit {
    return this.state.unit;
  }

  /** 違反の量か（単位が決める） */
  get isViolating(): boolean {
    return this.state.unit.isViolating;
  }

  /** 同じ単位どうしで比べる（小さいほうが良い）。単位が違えば例外 */
  compare(other: TightnessAmount): number {
    if (!this.unit.equals(other.unit)) {
      throw new Error(`単位が違う量は比べられない: ${this.unit.key} と ${other.unit.key}`);
    }
    return this.amount - other.amount;
  }
}

/** 測った1件ぶんの量：どの単位に、いくつ */
export type Tally = { unit: TightnessUnit; amount: number };

/**
 * 1件ごとの測った値を単位に振り分け、単位ごとに量を合計する。
 * 宣言した単位はすべて返す（0 の単位も「0」として比べられるように）。
 */
export const sumByUnit = <M>(
  units: readonly TightnessUnit[],
  measurements: readonly M[],
  tallyOf: (measurement: M) => Tally | undefined
): TightnessAmount[] => {
  const sums = new Map(units.map((u) => [u.key, 0]));
  for (const m of measurements) {
    const tally = tallyOf(m);
    if (!tally) continue;
    if (!sums.has(tally.unit.key)) {
      throw new Error(`宣言していない単位: ${tally.unit.key}`);
    }
    sums.set(tally.unit.key, (sums.get(tally.unit.key) ?? 0) + tally.amount);
  }
  return units.map((unit) => new TightnessAmount({ amount: sums.get(unit.key) ?? 0, unit }));
};

/**
 * 段階が1つ（破ったかどうかだけ）の制約の単位。key は制約の type（制約ごとに1つ）。
 * 遅番明け・可能勤務帯・希望のように、破り方に重さの違いが無い制約が使う。
 */
export const singleStageUnit = (type: string, label: string): TightnessUnit =>
  new TightnessUnit({ key: type, label, violating: true });

/** 段階が1つの制約のきつさ＝違反の件数 */
export const violationCount = (
  unit: TightnessUnit,
  violations: readonly unknown[]
): TightnessAmount[] => [new TightnessAmount({ amount: violations.length, unit })];
