/**
 * Tightness — 制約のきつさ（違反に近づいている度合い・違反している度合い）の量
 *
 * ルール: **量は単位つき。比べてよいのは同じ単位どうしだけ。**
 * 連勤1日と責任者1人のあいだに交換レートは無いので、違う制約（違う段階）の量は比べない。
 * どの段階をどれだけ重く見るかは、制約レシピの優先度で現場ごとに決める（#229）。
 *
 * 単位は制約の「段階」ごとに1つ。例：連勤（上限 N）なら
 *   上限ちょうど（N日・守っている）／1日超え（N+1日・違反）／2日以上超え（N+2日以上・違反）
 * 同じ段階の1件は同じ意味なので、件数で数えてよい。
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

/**
 * 1件ごとの測った値を段階に振り分け、単位ごとの件数にする。
 * 宣言した単位はすべて返す（0件の段階も「0件」として比べられるように）。
 */
export const countByUnit = <M>(
  units: readonly TightnessUnit[],
  measurements: readonly M[],
  unitOf: (measurement: M) => TightnessUnit | undefined
): TightnessAmount[] => {
  const counts = new Map(units.map((u) => [u.key, 0]));
  for (const m of measurements) {
    const unit = unitOf(m);
    if (!unit) continue;
    if (!counts.has(unit.key)) {
      throw new Error(`宣言していない単位: ${unit.key}`);
    }
    counts.set(unit.key, (counts.get(unit.key) ?? 0) + 1);
  }
  return units.map((unit) => new TightnessAmount({ amount: counts.get(unit.key) ?? 0, unit }));
};
