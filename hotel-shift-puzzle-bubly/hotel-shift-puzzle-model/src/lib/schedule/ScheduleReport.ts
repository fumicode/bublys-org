/**
 * ScheduleReport — シフト表完成レポート
 *
 * 確定した勤務表（世界線の apex）について、妥協（#87）・繁忙日対応（#88）・
 * 貢献度スコア（#89）を確定時点のスナップショットとして保持する。
 * 以降スタッフの希望や勤務表が変わっても、このレポートの内容は変化しない（確定記録）。
 * 自由記述の配慮メモ（considerationNotes）とタイトル（title）だけは確定後も編集できる。
 * 削除は集約自体をリポジトリから取り除く操作（feature 層が useObjectRepo.remove で行う）
 * なので、ここにはメソッドを持たない。
 *
 * state は完全に plain なので、state がそのまま plain 形式を兼ねる。
 * 不変。setNote / rename 以外の更新手段は無い（compromises 等は create 時に一括で決まる）。
 */

/**
 * 妥協エントリ。#87
 * 連勤・休日・希望など、スタッフに紐づくルール違反（ConstraintViolation）を1件=1妥協として表す。
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

/** スタッフごとの貢献度スコア（妥協回数・繁忙日出勤回数の加重合計）。#89 */
export type ContributionScoreEntry = {
  staffId: string;
  compromiseCount: number;
  busyDayCount: number;
  score: number;
};

export type ScheduleReportState = {
  id: string;
  scheduleId: string;
  /** 確定時点の世界線ノードID（トレーサビリティ用の参照。このスコープの時間移動には使わない） */
  worldLineNodeId: string;
  year: number;
  /** 1-12 */
  month: number;
  storeId: string;
  /** 表示名。既定は "{year}年{month}月" だが rename で変更できる */
  title: string;
  compromises: CompromiseEntry[];
  busyDayContributions: BusyDayEntry[];
  contributionScores: ContributionScoreEntry[];
  /** staffId → 自由記述の配慮メモ（確定後も編集可） */
  considerationNotes: Record<string, string>;
};

/** シリアライズ用（state がそのまま plain） */
export type ScheduleReportPlain = ScheduleReportState;

export class ScheduleReport {
  constructor(readonly state: ScheduleReportState) {}

  /** 勤務表×確定ノードで一意な ID */
  static idOf(scheduleId: string, worldLineNodeId: string): string {
    return `${scheduleId}:${worldLineNodeId}`;
  }

  /** 既定のタイトル（未命名時・rename で空にしたときのフォールバック） */
  static defaultTitle(year: number, month: number): string {
    return `${year}年${month}月`;
  }

  /** 確定時に計算済みのデータからレポートを作る（配慮メモは空、タイトルは既定値で始まる） */
  static create(params: {
    scheduleId: string;
    worldLineNodeId: string;
    year: number;
    month: number;
    storeId: string;
    compromises: CompromiseEntry[];
    busyDayContributions: BusyDayEntry[];
    contributionScores: ContributionScoreEntry[];
  }): ScheduleReport {
    return new ScheduleReport({
      id: ScheduleReport.idOf(params.scheduleId, params.worldLineNodeId),
      scheduleId: params.scheduleId,
      worldLineNodeId: params.worldLineNodeId,
      year: params.year,
      month: params.month,
      storeId: params.storeId,
      title: ScheduleReport.defaultTitle(params.year, params.month),
      compromises: params.compromises,
      busyDayContributions: params.busyDayContributions,
      contributionScores: params.contributionScores,
      considerationNotes: {},
    });
  }

  get id(): string {
    return this.state.id;
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

  /**
   * タイトルを変更した新インスタンスを返す。不変。
   * 空文字（trim後）なら既定のタイトル（"{year}年{month}月"）に戻す。
   */
  rename(title: string): ScheduleReport {
    const trimmed = title.trim();
    return new ScheduleReport({
      ...this.state,
      title: trimmed || ScheduleReport.defaultTitle(this.state.year, this.state.month),
    });
  }

  get compromises(): CompromiseEntry[] {
    return this.state.compromises;
  }

  get busyDayContributions(): BusyDayEntry[] {
    return this.state.busyDayContributions;
  }

  get contributionScores(): ContributionScoreEntry[] {
    return this.state.contributionScores;
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
  setNote(staffId: string, text: string): ScheduleReport {
    const considerationNotes = { ...this.state.considerationNotes };
    if (text.trim()) considerationNotes[staffId] = text;
    else delete considerationNotes[staffId];
    return new ScheduleReport({ ...this.state, considerationNotes });
  }

  toPlain(): ScheduleReportPlain {
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
      contributionScores: this.state.contributionScores.map((s) => ({ ...s })),
      considerationNotes: { ...this.state.considerationNotes },
    };
  }

  static fromPlain(plain: ScheduleReportPlain): ScheduleReport {
    return new ScheduleReport({
      id: plain.id,
      scheduleId: plain.scheduleId,
      worldLineNodeId: plain.worldLineNodeId,
      year: plain.year,
      month: plain.month,
      storeId: plain.storeId,
      title: plain.title ?? ScheduleReport.defaultTitle(plain.year, plain.month),
      compromises: plain.compromises.map((c) => ({ ...c, dayKeys: [...c.dayKeys] })),
      busyDayContributions: plain.busyDayContributions.map((b) => ({
        ...b,
        workedStaffIds: [...b.workedStaffIds],
      })),
      contributionScores: plain.contributionScores.map((s) => ({ ...s })),
      considerationNotes: { ...(plain.considerationNotes ?? {}) },
    });
  }
}
