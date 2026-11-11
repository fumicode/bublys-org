/**
 * ConfirmedSchedule — 確定版（店舗×月で1つ）とその振り返り
 *
 * 「確定する」と、いま見ている勤務表の版（世界線のノード）が、その店舗×月の確定版になる。
 * 確定版は**店舗×月で1つ**（#231）。ID は店舗と年月から決まり（{@link ConfirmedSchedule.idFor}）、
 * もう一度確定すると同じ ID のまま置き換わる（{@link ConfirmedSchedule.confirm}）。別の勤務表で
 * 確定しても置き換わる。どの勤務表のどの版かは scheduleId / worldLineNodeId が持つ。
 *
 * 振り返り（譲歩 #87・繁忙日対応 #88・★ #89）は、確定版を「その月どうだったか」の
 * 角度から見たもの。確定時点のスナップショットとして持ち、以降スタッフの希望や勤務表が
 * 変わっても変化しない。置き換えると新しい版の振り返りになり、古い版の振り返りは残さない。
 * 自由記述の配慮メモ（considerationNotes）・タイトル（title）・譲歩/繁忙日の重み
 * （compromiseWeight/busyDayWeight）だけは確定後も編集できる。
 * 削除は集約自体をリポジトリから取り除く操作（feature 層が useObjectRepo.remove で行う）
 * なので、ここにはメソッドを持たない。
 *
 * 重みはシフト管理者によって★の感じ方が異なるため直接編集できるようにしている。
 * reweight() は譲歩・繁忙日の生データ（compromises/busyDayContributions/各エントリの
 * compromiseCount/busyDayCount）は変えず、重みと stars の score だけを
 * 再計算する（「何が起きたか」という事実は確定時点のまま、「どう評価するか」という
 * 重みだけを後から調整できる）。
 *
 * state は plain だけでできているが、保存形（{@link ConfirmedSchedulePlain}）は旧形式の名前も
 * 読めるよう別に定義する。
 * 不変。setNote / rename / reweight 以外の更新手段は無い（compromises 等は create 時に一括で決まる）。
 */

/**
 * 譲歩エントリ。#87
 * 連勤・休日・希望など、スタッフに紐づくルール違反（ConstraintViolation）を1件=1譲歩として表す。
 * 責任者不足・休み上限超過など、誰のせいでもない日単位の違反は含まない。
 */
export type CompromiseEntry = {
  staffId: string;
  /** 制約の短いラベル（例: "希望"/"連勤"/"休日"）。ScheduleConstraint.label と揃える */
  label: string;
  /** 該当する稼働日キー（月単位の違反など特定の日に紐づかない場合は空配列） */
  dayKeys: string[];
  /** 人が読める説明（ConstraintViolation.message をそのまま使う） */
  message: string;
};

/** 繁忙日エントリ（必要人数が平均を上回る稼働日と、その出勤者）。#88 */
export type BusyDayEntry = {
  /** 稼働日キー("2026-06-01") */
  dayKey: string;
  /** その日の必要人数合計（全勤務帯） */
  requiredCount: number;
  /** その日に出勤したスタッフID */
  workedStaffIds: string[];
};

/** スタッフごとの★（譲歩回数・繁忙日出勤回数の加重合計）。#89 */
export type StarEntry = {
  staffId: string;
  compromiseCount: number;
  busyDayCount: number;
  score: number;
};

/** 譲歩1件あたりの重みの既定値（#89 スコア算出） */
export const DEFAULT_COMPROMISE_WEIGHT = 2;
/** 繁忙日出勤1回あたりの重みの既定値（#89 スコア算出） */
export const DEFAULT_BUSY_DAY_WEIGHT = 1;

/** 確定版の版：どの勤務表の、どの世界線ノードか */
export type ConfirmedVersion = {
  scheduleId: string;
  worldLineNodeId: string;
};

export type ConfirmedScheduleState = {
  /** 店舗×月で一意（{@link ConfirmedSchedule.idFor}） */
  id: string;
  /** 確定版を持つ勤務表 */
  scheduleId: string;
  /** 確定版の世界線ノードID（その勤務表の世界線の中の、確定した版） */
  worldLineNodeId: string;
  year: number;
  /** 1-12 */
  month: number;
  storeId: string;
  /** 表示名。既定は "{year}年{month}月" だが rename で変更できる */
  title: string;
  compromises: CompromiseEntry[];
  busyDayContributions: BusyDayEntry[];
  stars: StarEntry[];
  /** staffId → 自由記述の配慮メモ（確定後も編集可） */
  considerationNotes: Record<string, string>;
  /** 譲歩1件あたりの重み（確定後も reweight で編集可） */
  compromiseWeight: number;
  /** 繁忙日出勤1回あたりの重み（確定後も reweight で編集可） */
  busyDayWeight: number;
  /**
   * 確定した時刻（epoch ms）。置き換えるたびに新しくなる。この項目より前に作られた
   * 古い確定版には無い（上位層が確定ノードの時刻で補う）。
   */
  confirmedAt?: number;
};

/** シリアライズ用 */
export type ConfirmedSchedulePlain = Omit<ConfirmedScheduleState, "stars"> & {
  stars?: StarEntry[];
  /** 旧形式：★を「貢献度スコア」と呼んでいた頃の名前。読むときだけ受け付ける */
  contributionScores?: StarEntry[];
};

export class ConfirmedSchedule {
  constructor(readonly state: ConfirmedScheduleState) {}

  /** 店舗×月で一意な ID（"store-1:2026-06"）。確定し直しても変わらない */
  static idFor(storeId: string, year: number, month: number): string {
    return `${storeId}:${year}-${String(month).padStart(2, "0")}`;
  }

  /**
   * その勤務表が引き継ぐ前月の確定版の ID（同じ店舗の、ちょうど1か月前）。1月の前月は前年12月。
   * 2か月以上前を含めないのは、つながるのは直前の月末だけで、振り返るべきも直前の月だから。
   */
  static precedingIdFor(target: { storeId: string; year: number; month: number }): string {
    const prev =
      target.month === 1
        ? { year: target.year - 1, month: 12 }
        : { year: target.year, month: target.month - 1 };
    return ConfirmedSchedule.idFor(target.storeId, prev.year, prev.month);
  }

  /** 既定のタイトル（未命名時・rename で空にしたときのフォールバック） */
  static defaultTitle(year: number, month: number): string {
    return `${year}年${month}月`;
  }

  /** 確定時に計算済みのデータから確定版を作る（配慮メモは空、タイトルは既定値で始まる） */
  static create(params: {
    scheduleId: string;
    worldLineNodeId: string;
    year: number;
    month: number;
    storeId: string;
    compromises: CompromiseEntry[];
    busyDayContributions: BusyDayEntry[];
    stars: StarEntry[];
    /** 確定時刻（epoch ms）。時刻の取得は上位層の仕事 */
    confirmedAt?: number;
  }): ConfirmedSchedule {
    return new ConfirmedSchedule({
      id: ConfirmedSchedule.idFor(params.storeId, params.year, params.month),
      scheduleId: params.scheduleId,
      worldLineNodeId: params.worldLineNodeId,
      year: params.year,
      month: params.month,
      storeId: params.storeId,
      title: ConfirmedSchedule.defaultTitle(params.year, params.month),
      compromises: params.compromises,
      busyDayContributions: params.busyDayContributions,
      stars: params.stars,
      considerationNotes: {},
      compromiseWeight: DEFAULT_COMPROMISE_WEIGHT,
      busyDayWeight: DEFAULT_BUSY_DAY_WEIGHT,
      ...(params.confirmedAt !== undefined ? { confirmedAt: params.confirmedAt } : {}),
    });
  }

  /**
   * 確定する。その店舗×月にすでに確定版（current）があれば、新しい版で置き換える。
   * 置き換えても、手で書いた部分（タイトル・配慮メモ・譲歩/繁忙日の重み）は引き継ぎ、
   * ★は引き継いだ重みで出し直す。取り消しは無い（差し替えたければ別の版を確定する）。
   */
  static confirm(
    params: Parameters<typeof ConfirmedSchedule.create>[0],
    current?: ConfirmedSchedule
  ): ConfirmedSchedule {
    const fresh = ConfirmedSchedule.create(params);
    if (!current) return fresh;
    if (current.id !== fresh.id) {
      throw new Error(`別の店舗・月の確定版は置き換えられません（${current.id} → ${fresh.id}）`);
    }
    return new ConfirmedSchedule({
      ...fresh.state,
      title: current.title,
      considerationNotes: { ...current.considerationNotes },
    }).reweight(current.compromiseWeight, current.busyDayWeight);
  }

  get id(): string {
    return this.state.id;
  }

  /** 確定版の版（どの勤務表のどのノードか） */
  get version(): ConfirmedVersion {
    return { scheduleId: this.state.scheduleId, worldLineNodeId: this.state.worldLineNodeId };
  }

  /** その版がいまの確定版か */
  isVersion(version: ConfirmedVersion): boolean {
    return (
      version.scheduleId === this.state.scheduleId &&
      version.worldLineNodeId === this.state.worldLineNodeId
    );
  }

  get scheduleId(): string {
    return this.state.scheduleId;
  }

  get worldLineNodeId(): string {
    return this.state.worldLineNodeId;
  }

  get year(): number {
    return this.state.year;
  }

  /** 1-12 */
  get month(): number {
    return this.state.month;
  }

  get storeId(): string {
    return this.state.storeId;
  }

  get title(): string {
    return this.state.title;
  }

  /** 確定時刻（epoch ms）。古い確定版は undefined */
  get confirmedAt(): number | undefined {
    return this.state.confirmedAt;
  }

  /**
   * タイトルを変更した新インスタンスを返す。不変。
   * 空文字（trim後）なら既定のタイトル（"{year}年{month}月"）に戻す。
   */
  rename(title: string): ConfirmedSchedule {
    const trimmed = title.trim();
    return new ConfirmedSchedule({
      ...this.state,
      title: trimmed || ConfirmedSchedule.defaultTitle(this.state.year, this.state.month),
    });
  }

  get compromises(): CompromiseEntry[] {
    return this.state.compromises;
  }

  get busyDayContributions(): BusyDayEntry[] {
    return this.state.busyDayContributions;
  }

  get stars(): StarEntry[] {
    return this.state.stars;
  }

  /** そのスタッフの★（スコアの行が無ければ 0） */
  starsOf(staffId: string): number {
    return this.state.stars.find((s) => s.staffId === staffId)?.score ?? 0;
  }

  get compromiseWeight(): number {
    return this.state.compromiseWeight;
  }

  get busyDayWeight(): number {
    return this.state.busyDayWeight;
  }

  /**
   * 譲歩・繁忙日の重みを変更し、★（stars の score、降順の並び）を
   * 再計算した新インスタンスを返す。不変。負の重みは 0 に丸める。
   * 生データ（compromises/busyDayContributions/各エントリの compromiseCount/busyDayCount）は
   * 変えない（「何が起きたか」は確定時点のまま、「どう評価するか」だけを調整する）。
   */
  reweight(compromiseWeight: number, busyDayWeight: number): ConfirmedSchedule {
    const w1 = Math.max(0, compromiseWeight);
    const w2 = Math.max(0, busyDayWeight);
    const stars = this.state.stars
      .map((s) => ({ ...s, score: s.compromiseCount * w1 + s.busyDayCount * w2 }))
      .sort((a, b) => b.score - a.score);
    return new ConfirmedSchedule({
      ...this.state,
      compromiseWeight: w1,
      busyDayWeight: w2,
      stars,
    });
  }

  get considerationNotes(): Record<string, string> {
    return this.state.considerationNotes;
  }

  /** そのスタッフの配慮メモ（未設定は空文字） */
  noteFor(staffId: string): string {
    return this.state.considerationNotes[staffId] ?? "";
  }

  /**
   * スタッフごとの配慮メモを設定した新インスタンスを返す。不変。
   * 空文字（trim後）ならそのキーを取り除く。
   */
  setNote(staffId: string, text: string): ConfirmedSchedule {
    const considerationNotes = { ...this.state.considerationNotes };
    if (text.trim()) considerationNotes[staffId] = text;
    else delete considerationNotes[staffId];
    return new ConfirmedSchedule({ ...this.state, considerationNotes });
  }

  toPlain(): ConfirmedSchedulePlain {
    return {
      id: this.state.id,
      scheduleId: this.state.scheduleId,
      worldLineNodeId: this.state.worldLineNodeId,
      year: this.state.year,
      month: this.state.month,
      storeId: this.state.storeId,
      title: this.state.title,
      compromises: this.state.compromises.map((c) => ({ ...c, dayKeys: [...c.dayKeys] })),
      busyDayContributions: this.state.busyDayContributions.map((b) => ({
        ...b,
        workedStaffIds: [...b.workedStaffIds],
      })),
      stars: this.state.stars.map((s) => ({ ...s })),
      considerationNotes: { ...this.state.considerationNotes },
      compromiseWeight: this.state.compromiseWeight,
      busyDayWeight: this.state.busyDayWeight,
      ...(this.state.confirmedAt !== undefined ? { confirmedAt: this.state.confirmedAt } : {}),
    };
  }

  static fromPlain(plain: ConfirmedSchedulePlain): ConfirmedSchedule {
    return new ConfirmedSchedule({
      id: plain.id,
      scheduleId: plain.scheduleId,
      worldLineNodeId: plain.worldLineNodeId,
      year: plain.year,
      month: plain.month,
      storeId: plain.storeId,
      title: plain.title ?? ConfirmedSchedule.defaultTitle(plain.year, plain.month),
      compromises: plain.compromises.map((c) => ({ ...c, dayKeys: [...c.dayKeys] })),
      busyDayContributions: plain.busyDayContributions.map((b) => ({
        ...b,
        workedStaffIds: [...b.workedStaffIds],
      })),
      stars: (plain.stars ?? plain.contributionScores ?? []).map((s) => ({ ...s })),
      considerationNotes: { ...(plain.considerationNotes ?? {}) },
      compromiseWeight: plain.compromiseWeight ?? DEFAULT_COMPROMISE_WEIGHT,
      busyDayWeight: plain.busyDayWeight ?? DEFAULT_BUSY_DAY_WEIGHT,
      ...(plain.confirmedAt !== undefined ? { confirmedAt: plain.confirmedAt } : {}),
    });
  }
}
