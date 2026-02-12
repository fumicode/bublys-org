/**
 * Counter ドメインモデル（immutable）
 *
 * object-shell に依存しないシンプル版。
 * CLAUDE.md の `readonly state` パターン準拠。
 */
export class Counter {
  constructor(readonly state: { id: string; value: number }) {}

  countUp(): Counter {
    return new Counter({ ...this.state, value: this.state.value + 1 });
  }

  countDown(): Counter {
    return new Counter({ ...this.state, value: this.state.value - 1 });
  }

  toJSON(): { id: string; value: number } {
    return this.state;
  }

  static fromJSON(json: { id: string; value: number }): Counter {
    return new Counter(json);
  }
}
