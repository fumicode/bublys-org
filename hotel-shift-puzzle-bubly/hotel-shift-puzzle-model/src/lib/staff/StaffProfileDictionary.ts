/**
 * StaffProfileDictionary — スタッフプロファイルの辞書（店舗共通。#236）
 *
 * 人に付くもの（経験・雇用形態・スキル・資格・勤務ステータス…）を、**ここで1回だけ定義**し、
 * 人はその値を指す。人ごとに自由に文字を入れると「新人」「しんじん」「🔰」が混ざり、
 * 同じ意味が別の記号になる（SDSD: 1つの意味に1つの記号）。辞書の記号を変えれば全員ぶん一度に変わる。
 *
 * 言葉:
 *   - 分類（ProfileCategory） … 基本情報 / 役割・責任 / 能力・特性 / 勤務スタイル / 勤務ステータス。
 *                               コードで固定（5つ）。項目は必ずどれかの分類に属する
 *   - 項目（ProfileItem）     … 経験・雇用形態…。辞書で足す・直す・消す
 *   - 値（ProfileValue）      … 項目が取るもの（経験なら 新人・中堅・ベテラン）
 *   - 見せ方                  … 勤務表の名前の横にどう出すか（{@link ProfileMarkStyle}）。
 *                               出さない／そのまま（🔰 などの絵文字）／文字を囲む（「パ」「研修」）
 *
 * 休みの形・所属（部署）・責任者は、辞書には載せない**組み込みの項目**。値の出所が別にあり
 * （Staff の dayOffStyle / department、勤務表の制約セット）、読むときに StaffProfile が束ねる。
 *
 * 店舗の概念がまだ無い（#225）ので、いまはアプリに1つ（id = "global"）。
 * state は子をインスタンスで持つ。保存形は {@link StaffProfileDictionaryPlain}。不変。
 */

/** 分類。並びは勤務表の名前の横に記号を出す順でもある */
export const PROFILE_CATEGORIES = [
  { key: "basic", label: "基本情報" },
  { key: "role", label: "役割・責任" },
  { key: "ability", label: "能力・特性" },
  { key: "workStyle", label: "勤務スタイル" },
  { key: "status", label: "勤務ステータス" },
] as const;

export type ProfileCategoryKey = (typeof PROFILE_CATEGORIES)[number]["key"];

/** 分類の表示名 */
export const profileCategoryLabel = (key: ProfileCategoryKey): string =>
  PROFILE_CATEGORIES.find((c) => c.key === key)?.label ?? key;

/** 分類の並び順（記号を並べる順） */
export const profileCategoryOrder = (key: ProfileCategoryKey): number =>
  PROFILE_CATEGORIES.findIndex((c) => c.key === key);

// ========== 値 ==========

/**
 * 名前の横の見せ方。
 *   - none   … 出さない（スタッフ詳細・プロファイルの表で読む）
 *   - plain  … 記号をそのまま（🔰 などの絵文字向け）
 *   - framed … 文字を囲む（責任者のバッジと同じ形。文字だけでも目に留まる）
 */
export type ProfileMarkStyle = "none" | "plain" | "framed";

export type ProfileValueState = {
  id: string;
  /** 表示名（例: 新人） */
  label: string;
  /** 名前の横に出す文字（例: 🔰）。省略すると表示名を出す */
  symbol?: string;
  /**
   * 名前の横の見せ方。省略は「記号があればそのまま、無ければ出さない」
   * （見せ方を選ぶ前に作った値も、記号を入れれば出る）
   */
  mark?: ProfileMarkStyle;
};
export type ProfileValuePlain = ProfileValueState;

export class ProfileValue {
  constructor(readonly state: ProfileValueState) {}

  get id(): string {
    return this.state.id;
  }
  get label(): string {
    return this.state.label;
  }
  get symbol(): string | undefined {
    return this.state.symbol || undefined;
  }

  /** 名前の横の見せ方 */
  get markStyle(): ProfileMarkStyle {
    return this.state.mark ?? (this.symbol ? "plain" : "none");
  }

  /** 名前の横に出す文字（出さないなら undefined。記号が無ければ表示名） */
  get markText(): string | undefined {
    return this.markStyle === "none" ? undefined : (this.symbol ?? this.state.label);
  }

  /** 見せ方を変える。記号（文字）は残す（出さない⇄そのまま⇄囲むを行き来しても消えない） */
  withMarkStyle(style: ProfileMarkStyle): ProfileValue {
    return new ProfileValue({ ...this.state, mark: style });
  }

  withLabel(label: string): ProfileValue {
    return new ProfileValue({ ...this.state, label });
  }

  /** 記号（名前の横に出す文字）を変える。空文字は「記号なし」（表示名を出す）。見せ方はそのまま */
  withSymbol(symbol: string | undefined): ProfileValue {
    const { id, label, mark } = this.state;
    return new ProfileValue({
      id,
      label,
      ...(symbol ? { symbol } : {}),
      ...(mark ? { mark } : {}),
    });
  }

  toPlain(): ProfileValuePlain {
    return { ...this.state };
  }
  static fromPlain(plain: ProfileValuePlain): ProfileValue {
    return new ProfileValue({ ...plain });
  }
}

// ========== 項目 ==========

/**
 * 値の選び方。
 *   - one  … 1つ選ぶ（経験・雇用形態）。段階（皿洗い→炒め物→プロ）も、値を順に並べた one で表す
 *   - many … 複数選ぶ（資格・得意分野）。「あり／なし」は値が1つだけの many
 */
export type ProfileChoice = "one" | "many";

export type ProfileItemState = {
  id: string;
  category: ProfileCategoryKey;
  /** 項目名（例: 経験） */
  name: string;
  choice: ProfileChoice;
  values: ProfileValue[];
};
export type ProfileItemPlain = Omit<ProfileItemState, "values"> & {
  values: ProfileValuePlain[];
};

export class ProfileItem {
  constructor(readonly state: ProfileItemState) {}

  get id(): string {
    return this.state.id;
  }
  get category(): ProfileCategoryKey {
    return this.state.category;
  }
  get name(): string {
    return this.state.name;
  }
  get choice(): ProfileChoice {
    return this.state.choice;
  }
  get values(): ProfileValue[] {
    return this.state.values;
  }

  value(valueId: string): ProfileValue | undefined {
    return this.state.values.find((v) => v.id === valueId);
  }

  /**
   * 選ばれた値 ID を、この項目の値に解く。辞書から消えた値は黙って落とす。
   * 1つ選ぶ項目は先頭の1つだけ（複数選ぶから1つ選ぶに変えた後の記録でも崩れない）。
   */
  resolve(valueIds: readonly string[]): ProfileValue[] {
    const values = valueIds
      .map((id) => this.value(id))
      .filter((v): v is ProfileValue => v !== undefined);
    return this.state.choice === "one" ? values.slice(0, 1) : values;
  }

  rename(name: string): ProfileItem {
    return name === this.state.name ? this : new ProfileItem({ ...this.state, name });
  }
  withCategory(category: ProfileCategoryKey): ProfileItem {
    return new ProfileItem({ ...this.state, category });
  }
  withChoice(choice: ProfileChoice): ProfileItem {
    return new ProfileItem({ ...this.state, choice });
  }
  /** 値を足す。同じ ID が既にあれば何もしない */
  addValue(value: ProfileValue): ProfileItem {
    if (this.value(value.id)) return this;
    return new ProfileItem({ ...this.state, values: [...this.state.values, value] });
  }
  updateValue(valueId: string, fn: (v: ProfileValue) => ProfileValue): ProfileItem {
    return new ProfileItem({
      ...this.state,
      values: this.state.values.map((v) => (v.id === valueId ? fn(v) : v)),
    });
  }
  removeValue(valueId: string): ProfileItem {
    return new ProfileItem({
      ...this.state,
      values: this.state.values.filter((v) => v.id !== valueId),
    });
  }

  toPlain(): ProfileItemPlain {
    return { ...this.state, values: this.state.values.map((v) => v.toPlain()) };
  }
  static fromPlain(plain: ProfileItemPlain): ProfileItem {
    return new ProfileItem({ ...plain, values: plain.values.map(ProfileValue.fromPlain) });
  }
}

// ========== 辞書 ==========

/**
 * 組み込みの項目（辞書には載らず、値の出所が別にあるもの）。値は人ごとに決め、見せ方だけ
 * 辞書が持つ。責任者の役割そのもの（早責・予責・夜責の足し引き・担当勤務帯）は制約で決める。
 */
export type BuiltInProfileItemKey = "department" | "leaderRoles" | "dayOffStyle";

/** 組み込みの項目を名前の横に出すか。既定は 所属＝出さない／責任者・休みの形＝出す */
export type BuiltInProfileMarks = Record<BuiltInProfileItemKey, boolean>;

export const DEFAULT_BUILT_IN_PROFILE_MARKS: BuiltInProfileMarks = {
  department: false,
  leaderRoles: true,
  dayOffStyle: true,
};

export type StaffProfileDictionaryState = {
  id: string;
  items: ProfileItem[];
  /** 組み込みの項目の見せ方。省略＝既定（{@link DEFAULT_BUILT_IN_PROFILE_MARKS}） */
  builtInMarks?: Partial<BuiltInProfileMarks>;
};
export type StaffProfileDictionaryPlain = {
  id: string;
  items: ProfileItemPlain[];
  builtInMarks?: Partial<BuiltInProfileMarks>;
};

/** 辞書の固定ID（店舗の概念ができたら店舗ごとに持つ。#225） */
export const STAFF_PROFILE_DICTIONARY_ID = "global";

export class StaffProfileDictionary {
  constructor(readonly state: StaffProfileDictionaryState) {}

  static empty(id: string = STAFF_PROFILE_DICTIONARY_ID): StaffProfileDictionary {
    return new StaffProfileDictionary({ id, items: [] });
  }

  get id(): string {
    return this.state.id;
  }
  get items(): ProfileItem[] {
    return this.state.items;
  }

  item(itemId: string): ProfileItem | undefined {
    return this.state.items.find((i) => i.id === itemId);
  }

  /** 組み込みの項目を名前の横に出すか */
  showsBuiltIn(key: BuiltInProfileItemKey): boolean {
    return this.state.builtInMarks?.[key] ?? DEFAULT_BUILT_IN_PROFILE_MARKS[key];
  }

  /** 組み込みの項目の見せ方を変える */
  withBuiltInMark(key: BuiltInProfileItemKey, shown: boolean): StaffProfileDictionary {
    if (this.showsBuiltIn(key) === shown) return this;
    return new StaffProfileDictionary({
      ...this.state,
      builtInMarks: { ...this.state.builtInMarks, [key]: shown },
    });
  }

  /** その分類の項目（辞書に並べた順） */
  itemsIn(category: ProfileCategoryKey): ProfileItem[] {
    return this.state.items.filter((i) => i.category === category);
  }

  /** 項目を足す。同じ ID が既にあれば何もしない */
  addItem(item: ProfileItem): StaffProfileDictionary {
    if (this.item(item.id)) return this;
    return new StaffProfileDictionary({ ...this.state, items: [...this.state.items, item] });
  }
  updateItem(itemId: string, fn: (i: ProfileItem) => ProfileItem): StaffProfileDictionary {
    return new StaffProfileDictionary({
      ...this.state,
      items: this.state.items.map((i) => (i.id === itemId ? fn(i) : i)),
    });
  }
  /**
   * 項目を消す。人に残った値の記録はそのまま（読むときに辞書に無い項目として落ちる）。
   * 消した項目を同じ ID で戻せば、人の値も戻る。
   */
  removeItem(itemId: string): StaffProfileDictionary {
    return new StaffProfileDictionary({
      ...this.state,
      items: this.state.items.filter((i) => i.id !== itemId),
    });
  }

  toPlain(): StaffProfileDictionaryPlain {
    const plain: StaffProfileDictionaryPlain = {
      id: this.state.id,
      items: this.state.items.map((i) => i.toPlain()),
    };
    if (this.state.builtInMarks) plain.builtInMarks = { ...this.state.builtInMarks };
    return plain;
  }
  static fromPlain(plain: StaffProfileDictionaryPlain): StaffProfileDictionary {
    return new StaffProfileDictionary({
      id: plain.id,
      items: plain.items.map(ProfileItem.fromPlain),
      ...(plain.builtInMarks ? { builtInMarks: { ...plain.builtInMarks } } : {}),
    });
  }
}
