/**
 * 化ゲーム ドメインモデル
 *
 * 守っていること（CLAUDE.md）:
 *  - 純粋 TypeScript。React も Redux も import しない
 *  - 状態は `readonly state` 1 つ。更新は**新しいインスタンス**を返す
 *  - plain 化は `toPlain()` / `static fromPlain()` の 1 箇所だけ
 *
 * ★ **変形の履歴をここに持たない。**
 *   履歴は世界線（WorldLineGraph）そのものが持つ。囲碁は `moveHistory` を
 *   ゲーム内にも抱えているが、同じことを 2 箇所に持つと必ずズレる。
 *   戻る・枝分かれは世界線の仕事なので、このゲームは**いまの姿だけ**を持つ。
 */

/** いまの姿。中身は仕様が決まってから入れる。 */
export type HengeGameState_化ゲーム状態 = {
  id: string;
  /**
   * 仮。**世界線が伸びることを確かめるためだけの数。**
   * 本物の状態が決まったら消す。
   */
  revision: number;
};

/**
 * 保存の形。
 *
 * いまは state と同じ形だが、別の型として置いておく。`state` が子のインスタンスを
 * 持つようになったとき、plain を知るのはここだけにしたいため（CLAUDE.md）。
 */
export type HengeGamePlain_化ゲーム記録 = {
  id: string;
  revision: number;
};

export class HengeGame_化ゲーム {
  constructor(readonly state: HengeGameState_化ゲーム状態) {}

  /** まっさらなゲームを 1 つ作る */
  static create(id: string): HengeGame_化ゲーム {
    return new HengeGame_化ゲーム({ id, revision: 0 });
  }

  get id(): string {
    return this.state.id;
  }

  get revision(): number {
    return this.state.revision;
  }

  /**
   * 仮。1 つ進める。
   *
   * これを呼ぶと世界線に節が 1 つ増える。戻ってからもう一度呼べば、そこから枝が割れる。
   * 本物の変形が決まったら、このメソッドごと差し替える。
   */
  advance(): HengeGame_化ゲーム {
    return new HengeGame_化ゲーム({ ...this.state, revision: this.state.revision + 1 });
  }

  toPlain(): HengeGamePlain_化ゲーム記録 {
    return { id: this.state.id, revision: this.state.revision };
  }

  static fromPlain(plain: HengeGamePlain_化ゲーム記録): HengeGame_化ゲーム {
    return new HengeGame_化ゲーム({ id: plain.id, revision: plain.revision });
  }
}
