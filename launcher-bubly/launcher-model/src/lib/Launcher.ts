/**
 * ランチャー: バブリの呼び出し（url）を溜めておくもの。
 *
 * サイドバーの後継。何個でも作れて、分割（split）と合流（merge）ができる。
 * 岸（Showre）に着けると帯になり、浮かせると一覧になる — それは表示側の話で、
 * ここは「どの url が並んでいるか」だけを持つ。
 *
 * entry は url しか持たない。ラベルやアイコンは表示するときに解決する
 * （バブリ登録や OS 側の登録表から引く）。ID の配列しか持たない型を誰が読み解き
 * 誰が描くか、という分界をここでも守る。
 */

export type LaunchEntry = {
  id: string;
  /** 開くバブルの url。例: "memo-bubly", "users", "launchers/xxx" */
  url: string;
};

export type LauncherState = {
  id: string;
  entries: LaunchEntry[];
};

/** シリアライズ用（今は state と同じ形。子がインスタンスになったら分かれる） */
export type LauncherPlain = {
  id: string;
  entries: { id: string; url: string }[];
};

const newId = (): string => crypto.randomUUID();

export class Launcher {
  constructor(readonly state: LauncherState) {}

  /** url の並びから新しいランチャーを作る */
  static create(urls: string[], id: string = newId()): Launcher {
    return new Launcher({
      id,
      entries: urls.map((url) => ({ id: newId(), url })),
    });
  }

  get id(): string {
    return this.state.id;
  }

  get entries(): readonly LaunchEntry[] {
    return this.state.entries;
  }

  get urls(): string[] {
    return this.state.entries.map((e) => e.url);
  }

  get isEmpty(): boolean {
    return this.state.entries.length === 0;
  }

  entryOf(entryId: string): LaunchEntry | undefined {
    return this.state.entries.find((e) => e.id === entryId);
  }

  /** 末尾（または index の位置）に url を足す。範囲外の index は端に丸める */
  add(url: string, index?: number): Launcher {
    const entries = [...this.state.entries];
    const at = index === undefined ? entries.length : clamp(index, 0, entries.length);
    entries.splice(at, 0, { id: newId(), url });
    return new Launcher({ ...this.state, entries });
  }

  /**
   * 呼び出し先の差し替え。`from` を開いていた entry を `to` に向け直す。
   *
   * 同じ呼び出しの行き先が変わっただけなので、消して足し直すのではなく
   * **その場で向きだけ変える** ── 並び順も entry の id も変わらない。
   * 無ければ何もしない（自分をそのまま返す）。
   */
  rename(from: string, to: string): Launcher {
    if (!this.state.entries.some((e) => e.url === from)) return this;
    return new Launcher({
      ...this.state,
      entries: this.state.entries.map((e) => (e.url === from ? { ...e, url: to } : e)),
    });
  }

  remove(entryId: string): Launcher {
    if (!this.entryOf(entryId)) return this;
    return new Launcher({
      ...this.state,
      entries: this.state.entries.filter((e) => e.id !== entryId),
    });
  }

  /**
   * **決まった並びへ揃える。** `urls` に有るものはその順に前へ、無いものは後ろにそのまま。
   *
   * ★ entry の id は引き継ぐ（消して足し直すのではなく、並べ替えるだけ）。
   * ★ 標準の呼び出しの順番を後から変えたとき、**すでに使っている人の並びにも効かせる**
   *   ために要る。足りないものを足すだけでは、古い並びのまま末尾に付くだけになる。
   * ★ 標準に無いもの（読み込んだバブリなど）は触らない。人が足したものを、
   *   こちらの都合で並べ替えない。
   */
  ordered(urls: readonly string[]): Launcher {
    const rank = new Map(urls.map((url, i) => [url, i]));
    const known = this.state.entries.filter((e) => rank.has(e.url));
    const rest = this.state.entries.filter((e) => !rank.has(e.url));
    const sorted = [...known].sort((a, b) => (rank.get(a.url) ?? 0) - (rank.get(b.url) ?? 0));
    const same = sorted.every((e, i) => e === known[i]) && rest.every((e, i) => e === this.state.entries[known.length + i]);
    if (same) return this;
    return new Launcher({ ...this.state, entries: [...sorted, ...rest] });
  }

  /** entry を toIndex の位置へ並び替える */
  move(entryId: string, toIndex: number): Launcher {
    const from = this.state.entries.findIndex((e) => e.id === entryId);
    if (from < 0) return this;
    const entries = [...this.state.entries];
    const [entry] = entries.splice(from, 1);
    entries.splice(clamp(toIndex, 0, entries.length), 0, entry);
    return new Launcher({ ...this.state, entries });
  }

  /**
   * 分割。指定した entry を抜いて新しいランチャーにする。
   * 戻り値は [残った自分, 新しいランチャー]。entry の id は引き継ぐ。
   */
  split(entryIds: string[], newLauncherId: string = newId()): [Launcher, Launcher] {
    const picked = new Set(entryIds);
    const taken = this.state.entries.filter((e) => picked.has(e.id));
    const rest = this.state.entries.filter((e) => !picked.has(e.id));
    return [
      new Launcher({ ...this.state, entries: rest }),
      new Launcher({ id: newLauncherId, entries: taken }),
    ];
  }

  /** 合流。相手の entry を末尾（または index の位置）に取り込む。id は引き継ぐ */
  merge(other: Launcher, index?: number): Launcher {
    const entries = [...this.state.entries];
    const at = index === undefined ? entries.length : clamp(index, 0, entries.length);
    entries.splice(at, 0, ...other.state.entries);
    return new Launcher({ ...this.state, entries });
  }

  toPlain(): LauncherPlain {
    return {
      id: this.state.id,
      entries: this.state.entries.map((e) => ({ id: e.id, url: e.url })),
    };
  }

  static fromPlain(plain: LauncherPlain): Launcher {
    return new Launcher({
      id: plain.id,
      entries: plain.entries.map((e) => ({ id: e.id, url: e.url })),
    });
  }
}

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(n, max));
