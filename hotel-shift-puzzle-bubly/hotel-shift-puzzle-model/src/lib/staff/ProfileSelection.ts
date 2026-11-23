/**
 * ProfileSelection — その人が辞書の項目ごとに選んだ値（#236）
 *
 * 項目 ID → 値 ID の並び。Staff（店舗での既定）と WorkingStaffMember（その勤務表での上書き）が
 * 同じ形で持つ。上書きは**項目ごと**：メンバーに項目があればそれ、無ければ Staff の値
 * （{@link WorkingStaffMember.profileValueIdsOf}）。
 *
 * 項目があって値が空 ＝「この項目は何も無い」とはっきり決めたこと。上書きでは意味を持つ
 * （店舗では新人だが、この勤務表では外す）。項目が無い ＝ 決めていない。
 *
 * **空なら保存しない。** Staff・メンバーは選んだ値が1つも無いときこの欄を書かないので、
 * プロファイルを入れる前の記録と保存形が同じになり、ハッシュも変わらない（打ち消しスナップが
 * 移行の前後をまたいで効く）。
 *
 * state も保存形も primitive の並びだけ。項目の並び順は付けた順を保つ。不変。
 */

export type ProfileSelectionEntry = {
  itemId: string;
  valueIds: string[];
};

export type ProfileSelectionState = {
  entries: ProfileSelectionEntry[];
};
export type ProfileSelectionPlain = ProfileSelectionEntry[];

export class ProfileSelection {
  constructor(readonly state: ProfileSelectionState) {}

  static readonly EMPTY = new ProfileSelection({ entries: [] });

  get entries(): readonly ProfileSelectionEntry[] {
    return this.state.entries;
  }

  get isEmpty(): boolean {
    return this.state.entries.length === 0;
  }

  /** その項目を決めているか（値が空でも、決めていれば true） */
  has(itemId: string): boolean {
    return this.state.entries.some((e) => e.itemId === itemId);
  }

  /** その項目で選んだ値 ID。決めていなければ undefined */
  valueIdsOf(itemId: string): readonly string[] | undefined {
    return this.state.entries.find((e) => e.itemId === itemId)?.valueIds;
  }

  /** その項目の値を決める（空配列は「何も無い」と決めること）。同じなら自分自身 */
  set(itemId: string, valueIds: readonly string[]): ProfileSelection {
    const current = this.valueIdsOf(itemId);
    if (current && sameIds(current, valueIds)) return this;
    const entry = { itemId, valueIds: [...valueIds] };
    return new ProfileSelection({
      entries: current
        ? this.state.entries.map((e) => (e.itemId === itemId ? entry : e))
        : [...this.state.entries, entry],
    });
  }

  /** その項目を決めていない状態に戻す */
  clear(itemId: string): ProfileSelection {
    if (!this.has(itemId)) return this;
    return new ProfileSelection({
      entries: this.state.entries.filter((e) => e.itemId !== itemId),
    });
  }

  equals(other: ProfileSelection): boolean {
    if (this.state.entries.length !== other.state.entries.length) return false;
    return this.state.entries.every((e) => {
      const theirs = other.valueIdsOf(e.itemId);
      return theirs !== undefined && sameIds(e.valueIds, theirs);
    });
  }

  toPlain(): ProfileSelectionPlain {
    return this.state.entries.map((e) => ({ itemId: e.itemId, valueIds: [...e.valueIds] }));
  }

  static fromPlain(plain: ProfileSelectionPlain | undefined): ProfileSelection {
    if (!plain || plain.length === 0) return ProfileSelection.EMPTY;
    return new ProfileSelection({
      entries: plain.map((e) => ({ itemId: e.itemId, valueIds: [...e.valueIds] })),
    });
  }
}

const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, i) => id === b[i]);
