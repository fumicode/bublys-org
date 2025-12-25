/**
 * スタッフドメインモデル
 */

import { Role_係, SkillLevel_スキルレベル } from './Role_係.js';
import { DateString_日付, TimeSlotPeriod_時間帯区分 } from './TimeSlot_時間帯.js';

// ========== 型定義 ==========

/** スタッフのステータス */
export type StaffStatus_ステータス = 'pending' | 'accepted' | 'waitlist' | 'rejected';

/** 性別 */
export type Gender_性別 = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/** スキル情報 */
export interface SkillsState {
  readonly pc: SkillLevel_スキルレベル;
  readonly zoom: SkillLevel_スキルレベル;
  readonly english: 'none' | 'daily_conversation';
  readonly eventExperience: boolean;
  readonly eventExperienceDetail?: string;
}

/** 発表情報 */
export interface PresentationState {
  readonly hasPresentation: boolean;
  readonly presentations: ReadonlyArray<{
    readonly date: DateString_日付;
    readonly period: TimeSlotPeriod_時間帯区分;
  }>;
}

/** スコアリング重み設定 */
export interface ScoringWeightsState {
  readonly availableSlotCount: number;
  readonly pcSkill: number;
  readonly zoomSkill: number;
  readonly englishSkill: number;
  readonly eventExperience: number;
  readonly fullDayAvailability: number;
}

/** スタッフの状態 */
export interface StaffState {
  readonly id: string;
  readonly name: string;
  readonly furigana: string;
  readonly email: string;
  readonly phone: string;
  readonly school: string;
  readonly grade: string;
  readonly gender: Gender_性別;
  readonly skills: SkillsState;
  readonly presentation: PresentationState;
  readonly availableTimeSlots: ReadonlyArray<string>;
  readonly preferredRoles: ReadonlyArray<string>;
  readonly notes: string;
  readonly status: StaffStatus_ステータス;
  readonly aptitudeScore?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Redux/JSON用のシリアライズ型 */
export type StaffJSON = {
  id: string;
  name: string;
  furigana: string;
  email: string;
  phone: string;
  school: string;
  grade: string;
  gender: Gender_性別;
  skills: {
    pc: SkillLevel_スキルレベル;
    zoom: SkillLevel_スキルレベル;
    english: 'none' | 'daily_conversation';
    eventExperience: boolean;
    eventExperienceDetail?: string;
  };
  presentation: {
    hasPresentation: boolean;
    presentations: Array<{
      date: DateString_日付;
      period: TimeSlotPeriod_時間帯区分;
    }>;
  };
  availableTimeSlots: string[];
  preferredRoles: string[];
  notes: string;
  status: StaffStatus_ステータス;
  aptitudeScore?: number;
  createdAt: string;
  updatedAt: string;
};

// ========== ドメインクラス ==========

export class Staff_スタッフ {
  constructor(readonly state: StaffState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get email(): string {
    return this.state.email;
  }

  get gender(): Gender_性別 {
    return this.state.gender;
  }

  get skills(): SkillsState {
    return this.state.skills;
  }

  get presentation(): PresentationState {
    return this.state.presentation;
  }

  get availableTimeSlots(): ReadonlyArray<string> {
    return this.state.availableTimeSlots;
  }

  get status(): StaffStatus_ステータス {
    return this.state.status;
  }

  get aptitudeScore(): number | undefined {
    return this.state.aptitudeScore;
  }

  /** 指定時間帯に勤務可能かどうか */
  isAvailableAt(timeSlotId: string): boolean {
    return this.state.availableTimeSlots.includes(timeSlotId);
  }

  /** 発表時間帯かどうか */
  hasPresentationAt(date: DateString_日付, period: TimeSlotPeriod_時間帯区分): boolean {
    if (!this.state.presentation.hasPresentation) return false;
    return this.state.presentation.presentations.some(
      (p) => p.date === date && p.period === period
    );
  }

  /** 業務オリエンテーションに参加可能かどうか */
  canAttendOrientation(orientationSlotId: string): boolean {
    return this.state.availableTimeSlots.includes(orientationSlotId);
  }

  /** 係の最低要件を満たしているかどうか */
  meetsRoleRequirements(role: Role_係): boolean {
    const req = role.requirements;
    const skills = this.state.skills;

    if (req.minPcSkill) {
      if (
        Role_係.skillLevelToNumber(skills.pc) <
        Role_係.skillLevelToNumber(req.minPcSkill)
      ) {
        return false;
      }
    }

    if (req.minZoomSkill) {
      if (
        Role_係.skillLevelToNumber(skills.zoom) <
        Role_係.skillLevelToNumber(req.minZoomSkill)
      ) {
        return false;
      }
    }

    if (req.requireEnglish && skills.english === 'none') {
      return false;
    }

    if (req.requireEventExperience && !skills.eventExperience) {
      return false;
    }

    return true;
  }

  /** 係への適性スコアを計算 */
  calculateRoleFitScore(role: Role_係): number {
    let score = 0;
    const req = role.requirements;
    const skills = this.state.skills;

    if (req.minPcSkill) {
      score +=
        Role_係.skillLevelToNumber(skills.pc) -
        Role_係.skillLevelToNumber(req.minPcSkill);
    }
    if (req.minZoomSkill) {
      score +=
        Role_係.skillLevelToNumber(skills.zoom) -
        Role_係.skillLevelToNumber(req.minZoomSkill);
    }

    if (skills.english === 'daily_conversation') {
      score += 2;
    }

    if (skills.eventExperience) {
      score += 2;
    }

    if (req.preferMale && this.state.gender === 'male') {
      score += 3;
    }

    return score;
  }

  /** 適性スコア（採用判定用）を計算 */
  calculateAptitudeScore(weights: ScoringWeightsState): number {
    let score = 0;
    const skills = this.state.skills;

    score += this.state.availableTimeSlots.length * weights.availableSlotCount;
    score += Role_係.skillLevelToNumber(skills.pc) * weights.pcSkill;
    score += Role_係.skillLevelToNumber(skills.zoom) * weights.zoomSkill;

    if (skills.english === 'daily_conversation') {
      score += weights.englishSkill;
    }

    if (skills.eventExperience) {
      score += weights.eventExperience;
    }

    if (this.state.availableTimeSlots.length >= 13) {
      score += weights.fullDayAvailability;
    }

    return score;
  }

  // ========== 状態変更メソッド（意味のある操作のみ公開） ==========

  /** 採用する */
  accept(): Staff_スタッフ {
    return this.withUpdatedState({ status: 'accepted' });
  }

  /** 補欠にする */
  putOnWaitlist(): Staff_スタッフ {
    return this.withUpdatedState({ status: 'waitlist' });
  }

  /** 不採用にする */
  reject(): Staff_スタッフ {
    return this.withUpdatedState({ status: 'rejected' });
  }

  /** 適性スコアを設定（マッチング処理で使用） */
  withAptitudeScore(score: number): Staff_スタッフ {
    return this.withUpdatedState({ aptitudeScore: score });
  }

  /** 備考を更新 */
  withNotes(notes: string): Staff_スタッフ {
    return this.withUpdatedState({ notes });
  }

  /** 内部用：状態更新ヘルパー（外部からは呼び出さない） */
  protected withUpdatedState(partial: Partial<StaffState>): Staff_スタッフ {
    return new Staff_スタッフ({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }

  // ========== シリアライズ ==========

  /** Redux/JSON用にシリアライズ */
  toJSON(): StaffJSON {
    return {
      id: this.state.id,
      name: this.state.name,
      furigana: this.state.furigana,
      email: this.state.email,
      phone: this.state.phone,
      school: this.state.school,
      grade: this.state.grade,
      gender: this.state.gender,
      skills: { ...this.state.skills },
      presentation: {
        hasPresentation: this.state.presentation.hasPresentation,
        presentations: [...this.state.presentation.presentations],
      },
      availableTimeSlots: [...this.state.availableTimeSlots],
      preferredRoles: [...this.state.preferredRoles],
      notes: this.state.notes,
      status: this.state.status,
      aptitudeScore: this.state.aptitudeScore,
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
    };
  }

  /** JSONからドメインオブジェクトを復元 */
  static fromJSON(json: StaffJSON): Staff_スタッフ {
    return new Staff_スタッフ(json);
  }

  // ========== 静的メソッド ==========

  /** ステータスの日本語ラベルを取得 */
  static getStatusLabel(status: StaffStatus_ステータス): string {
    const labels: Record<StaffStatus_ステータス, string> = {
      pending: '審査中',
      accepted: '採用',
      waitlist: '補欠',
      rejected: '不採用',
    };
    return labels[status];
  }

  /** 性別の日本語ラベルを取得 */
  static getGenderLabel(gender: Gender_性別): string {
    const labels: Record<Gender_性別, string> = {
      male: '男性',
      female: '女性',
      other: 'その他',
      prefer_not_to_say: '回答しない',
    };
    return labels[gender];
  }

  /** 新しいスタッフを作成 */
  static create(
    data: Omit<StaffState, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Staff_スタッフ {
    const now = new Date().toISOString();
    return new Staff_スタッフ({
      ...data,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  }
}
