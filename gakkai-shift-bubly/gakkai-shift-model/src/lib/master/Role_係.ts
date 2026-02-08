/**
 * 係ドメインモデル
 */

// ========== 型定義 ==========

/** スキルレベル */
export type SkillLevel_スキルレベル = 'none' | 'beginner' | 'intermediate' | 'advanced';

/** 係の固定性 */
export type RoleFixedness_係の固定性 =
  | 'all_day_fixed'     // 全日固定（年会本部など）
  | 'time_slot_ok'      // 時間帯替わりOK
  | 'concurrent_ok'     // 兼務可能（設営係など）
  | 'party_only';       // 懇親会専用

/** 係のスキル要件 */
export interface RoleRequirementsState {
  readonly minPcSkill?: SkillLevel_スキルレベル;
  readonly minZoomSkill?: SkillLevel_スキルレベル;
  readonly requireEnglish?: boolean;
  readonly requireEventExperience?: boolean;
  readonly preferMale?: boolean;  // 男性優先（設営係など）
}

/** 係の状態 */
export interface RoleState {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly fixedness: RoleFixedness_係の固定性;
  readonly requirements: RoleRequirementsState;
  readonly priority: number;  // 配置優先度（高いほど先に配置）
}

// ========== ドメインクラス ==========

export class Role_係 {
  constructor(readonly state: RoleState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get description(): string {
    return this.state.description;
  }

  get fixedness(): RoleFixedness_係の固定性 {
    return this.state.fixedness;
  }

  get requirements(): RoleRequirementsState {
    return this.state.requirements;
  }

  get priority(): number {
    return this.state.priority;
  }

  /** 全日固定の係かどうか */
  isAllDayFixed(): boolean {
    return this.state.fixedness === 'all_day_fixed';
  }

  /** 懇親会専用の係かどうか */
  isPartyOnly(): boolean {
    return this.state.fixedness === 'party_only';
  }

  /** 兼務可能な係かどうか */
  isConcurrentOk(): boolean {
    return this.state.fixedness === 'concurrent_ok';
  }

  // Roleはマスターデータのため、更新メソッドは提供しない

  /** 固定性の日本語ラベルを取得 */
  static getFixednessLabel(fixedness: RoleFixedness_係の固定性): string {
    const labels: Record<RoleFixedness_係の固定性, string> = {
      all_day_fixed: '全日固定',
      time_slot_ok: '時間帯替わりOK',
      concurrent_ok: '兼務可能',
      party_only: '懇親会専用',
    };
    return labels[fixedness];
  }

  /** スキルレベルの数値変換 */
  static skillLevelToNumber(level: SkillLevel_スキルレベル): number {
    const values: Record<SkillLevel_スキルレベル, number> = {
      none: 0,
      beginner: 1,
      intermediate: 2,
      advanced: 3,
    };
    return values[level];
  }

  /** スキルレベルの日本語ラベルを取得 */
  static getSkillLevelLabel(level: SkillLevel_スキルレベル): string {
    const labels: Record<SkillLevel_スキルレベル, string> = {
      none: 'なし',
      beginner: '初級',
      intermediate: '中級',
      advanced: '上級',
    };
    return labels[level];
  }

  /** 9種類のデフォルト係を生成 */
  static createDefaultRoles(): Role_係[] {
    const roles: RoleState[] = [
      {
        id: 'headquarters',
        name: '大会センター',
        description: '運営中枢。PC・Zoom上級、全日程参加必須',
        fixedness: 'all_day_fixed',
        requirements: {
          minPcSkill: 'advanced',
          minZoomSkill: 'advanced',
        },
        priority: 100,
      },
      {
        id: 'reception',
        name: '受付案内',
        description: '案内対応。英語力あれば優先',
        fixedness: 'time_slot_ok',
        requirements: {
          requireEnglish: false,
        },
        priority: 80,
      },
      {
        id: 'badge_reissue',
        name: '名札交換',
        description: 'PC入力中心。正確性重視',
        fixedness: 'time_slot_ok',
        requirements: {
          minPcSkill: 'intermediate',
        },
        priority: 70,
      },
      {
        id: 'venue',
        name: 'ホール係',
        description: '会場案内・進行補助。Zoom中級、英語あれば優先',
        fixedness: 'time_slot_ok',
        requirements: {
          minZoomSkill: 'intermediate',
        },
        priority: 85,
      },
      {
        id: 'venue_check',
        name: '配信確認係',
        description: '配信チェック・機材確認。Zoom・PC中級、イベント経験者優先',
        fixedness: 'time_slot_ok',
        requirements: {
          minPcSkill: 'intermediate',
          minZoomSkill: 'intermediate',
          requireEventExperience: false,
        },
        priority: 90,
      },
      {
        id: 'preview_room',
        name: 'プレビュー係',
        description: '発表データ確認など、静かな作業',
        fixedness: 'time_slot_ok',
        requirements: {
          minPcSkill: 'beginner',
        },
        priority: 50,
      },
      {
        id: 'mobile_support',
        name: '応援要員',
        description: '欠員・トラブル時の応援要員',
        fixedness: 'time_slot_ok',
        requirements: {
          minPcSkill: 'intermediate',
          minZoomSkill: 'intermediate',
        },
        priority: 75,
      },
      {
        id: 'setup',
        name: '準備係',
        description: '会場設営。男性優先（力仕事）',
        fixedness: 'concurrent_ok',
        requirements: {
          preferMale: true,
        },
        priority: 65,
      },
      {
        id: 'party_reception',
        name: '交流会案内',
        description: '懇親会受付対応',
        fixedness: 'party_only',
        requirements: {},
        priority: 40,
      },
    ];

    return roles.map((state) => new Role_係(state));
  }
}
