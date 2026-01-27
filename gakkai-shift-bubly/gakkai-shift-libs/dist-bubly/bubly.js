var GakkaiShiftBubly = function(React$1, EventNoteIcon, bubblesUi, stateManagement, toolkit, styled2, PersonIcon, material, FilterListIcon, SearchIcon, CheckIcon, CloseIcon, WarningIcon, AutoFixHighIcon, PeopleIcon, AddIcon, DeleteIcon, ContentCopyIcon, CheckCircleIcon, CancelIcon, ArrowBackIcon) {
  "use strict";
  class StaffRequirement_必要人数 {
    state;
    timeSlotId;
    constructor(state, timeSlotId) {
      this.state = state;
      this.timeSlotId = timeSlotId;
    }
    get id() {
      return `${this.timeSlotId}_${this.state.roleId}`;
    }
    get roleId() {
      return this.state.roleId;
    }
    get requiredCount() {
      return this.state.requiredCount;
    }
    get minCount() {
      return this.state.minCount ?? this.state.requiredCount;
    }
    get maxCount() {
      return this.state.maxCount ?? this.state.requiredCount;
    }
  }
  class TimeSlot_時間帯 {
    state;
    _requirements;
    constructor(state) {
      this.state = state;
      this._requirements = state.staffRequirements.map((req) => new StaffRequirement_必要人数(req, state.id));
    }
    get id() {
      return this.state.id;
    }
    get date() {
      return this.state.date;
    }
    get period() {
      return this.state.period;
    }
    get label() {
      return this.state.label;
    }
    get isOrientation() {
      return this.state.isOrientation;
    }
    /** この時間帯の必要人数設定一覧 */
    get staffRequirements() {
      return this._requirements;
    }
    /** 特定の係の必要人数を取得 */
    getRequirementForRole(roleId) {
      return this._requirements.find((req) => req.roleId === roleId);
    }
    /** 同じ日付かどうか */
    isSameDate(other) {
      return this.state.date === other.state.date;
    }
    /** この時間帯と重複するかどうか */
    overlaps(other) {
      return this.state.id === other.state.id;
    }
    /** 時間帯の長さ（時間単位） */
    getDurationHours() {
      const [startH, startM] = this.state.startTime.split(":").map(Number);
      const [endH, endM] = this.state.endTime.split(":").map(Number);
      return (endH * 60 + endM - startH * 60 - startM) / 60;
    }
    // TimeSlotはマスターデータのため、更新メソッドは提供しない
    /** 時間帯区分の日本語ラベルを取得 */
    static getPeriodLabel(period) {
      const labels = {
        all_day: "終日",
        morning: "午前",
        afternoon: "午後",
        evening: "夕刻",
        party: "懇親会"
      };
      return labels[period];
    }
    /** IDから時間帯を生成するヘルパー */
    static createId(date, period) {
      return `${date}_${period}`;
    }
    /** 2025年学会のデフォルト時間帯を生成（必要人数データ含む） */
    static createDefaultTimeSlots() {
      const standardRequirements = [
        { roleId: "headquarters", requiredCount: 2, minCount: 2, maxCount: 3 },
        { roleId: "reception", requiredCount: 3, minCount: 2, maxCount: 4 },
        { roleId: "badge_reissue", requiredCount: 2, minCount: 1, maxCount: 3 },
        { roleId: "cloakroom", requiredCount: 3, minCount: 2, maxCount: 4 },
        { roleId: "venue", requiredCount: 4, minCount: 3, maxCount: 5 },
        { roleId: "venue_check", requiredCount: 2, minCount: 1, maxCount: 3 },
        { roleId: "preview_room", requiredCount: 2, minCount: 1, maxCount: 2 },
        { roleId: "mobile_support", requiredCount: 2, minCount: 1, maxCount: 3 },
        { roleId: "exhibition", requiredCount: 2, minCount: 1, maxCount: 3 },
        { roleId: "poster", requiredCount: 2, minCount: 1, maxCount: 3 }
      ];
      const prepRequirements = [
        { roleId: "headquarters", requiredCount: 2, minCount: 1, maxCount: 2 },
        { roleId: "setup", requiredCount: 6, minCount: 4, maxCount: 8 }
      ];
      const eveningRequirements = [
        { roleId: "headquarters", requiredCount: 2, minCount: 1, maxCount: 2 },
        { roleId: "reception", requiredCount: 2, minCount: 1, maxCount: 2 },
        { roleId: "venue", requiredCount: 2, minCount: 1, maxCount: 3 },
        { roleId: "mobile_support", requiredCount: 1, minCount: 1, maxCount: 2 }
      ];
      const partyRequirements = [
        { roleId: "party_cloakroom", requiredCount: 3, minCount: 2, maxCount: 4 },
        { roleId: "party_reception", requiredCount: 4, minCount: 3, maxCount: 5 }
      ];
      const teardownRequirements = [
        { roleId: "headquarters", requiredCount: 2, minCount: 1, maxCount: 2 },
        { roleId: "setup", requiredCount: 8, minCount: 6, maxCount: 10 }
      ];
      const slots = [
        // 3/17（月）準備日
        {
          id: "2025-03-17_all_day",
          date: "2025-03-17",
          period: "all_day",
          startTime: "08:00",
          endTime: "17:00",
          label: "3/17 終日（準備）",
          isOrientation: false,
          staffRequirements: prepRequirements
        },
        // 3/18（火）準備日
        {
          id: "2025-03-18_morning",
          date: "2025-03-18",
          period: "morning",
          startTime: "08:00",
          endTime: "13:00",
          label: "3/18 午前",
          isOrientation: false,
          staffRequirements: prepRequirements
        },
        {
          id: "2025-03-18_afternoon",
          date: "2025-03-18",
          period: "afternoon",
          startTime: "13:00",
          endTime: "17:00",
          label: "3/18 午後（オリエン）",
          isOrientation: true,
          staffRequirements: prepRequirements
        },
        // 3/19（水）会期1日目
        {
          id: "2025-03-19_morning",
          date: "2025-03-19",
          period: "morning",
          startTime: "08:00",
          endTime: "12:00",
          label: "3/19 午前",
          isOrientation: false,
          staffRequirements: standardRequirements
        },
        {
          id: "2025-03-19_afternoon",
          date: "2025-03-19",
          period: "afternoon",
          startTime: "12:00",
          endTime: "17:00",
          label: "3/19 午後",
          isOrientation: false,
          staffRequirements: standardRequirements
        },
        {
          id: "2025-03-19_evening",
          date: "2025-03-19",
          period: "evening",
          startTime: "17:00",
          endTime: "20:00",
          label: "3/19 夕刻",
          isOrientation: false,
          staffRequirements: eveningRequirements
        },
        // 3/20（木）会期2日目
        {
          id: "2025-03-20_morning",
          date: "2025-03-20",
          period: "morning",
          startTime: "08:00",
          endTime: "12:00",
          label: "3/20 午前",
          isOrientation: false,
          staffRequirements: standardRequirements
        },
        {
          id: "2025-03-20_afternoon",
          date: "2025-03-20",
          period: "afternoon",
          startTime: "12:00",
          endTime: "17:00",
          label: "3/20 午後",
          isOrientation: false,
          staffRequirements: standardRequirements
        },
        {
          id: "2025-03-20_evening",
          date: "2025-03-20",
          period: "evening",
          startTime: "17:00",
          endTime: "20:00",
          label: "3/20 夕刻",
          isOrientation: false,
          staffRequirements: eveningRequirements
        },
        {
          id: "2025-03-20_party",
          date: "2025-03-20",
          period: "party",
          startTime: "17:00",
          endTime: "20:30",
          label: "3/20 交流会",
          isOrientation: false,
          staffRequirements: partyRequirements
        },
        // 3/21（金）会期3日目
        {
          id: "2025-03-21_morning",
          date: "2025-03-21",
          period: "morning",
          startTime: "08:00",
          endTime: "12:00",
          label: "3/21 午前",
          isOrientation: false,
          staffRequirements: standardRequirements
        },
        {
          id: "2025-03-21_afternoon",
          date: "2025-03-21",
          period: "afternoon",
          startTime: "12:00",
          endTime: "17:00",
          label: "3/21 午後",
          isOrientation: false,
          staffRequirements: standardRequirements
        },
        {
          id: "2025-03-21_evening",
          date: "2025-03-21",
          period: "evening",
          startTime: "17:00",
          endTime: "20:00",
          label: "3/21 夕刻",
          isOrientation: false,
          staffRequirements: eveningRequirements
        },
        // 3/22（土）会期4日目（最終日）
        {
          id: "2025-03-22_morning",
          date: "2025-03-22",
          period: "morning",
          startTime: "08:00",
          endTime: "12:00",
          label: "3/22 午前",
          isOrientation: false,
          staffRequirements: standardRequirements
        },
        {
          id: "2025-03-22_afternoon",
          date: "2025-03-22",
          period: "afternoon",
          startTime: "12:00",
          endTime: "17:00",
          label: "3/22 午後（撤去）",
          isOrientation: false,
          staffRequirements: teardownRequirements
        }
      ];
      return slots.map((state) => new TimeSlot_時間帯(state));
    }
  }
  class Role_係 {
    state;
    constructor(state) {
      this.state = state;
    }
    get id() {
      return this.state.id;
    }
    get name() {
      return this.state.name;
    }
    get description() {
      return this.state.description;
    }
    get fixedness() {
      return this.state.fixedness;
    }
    get requirements() {
      return this.state.requirements;
    }
    get priority() {
      return this.state.priority;
    }
    /** 全日固定の係かどうか */
    isAllDayFixed() {
      return this.state.fixedness === "all_day_fixed";
    }
    /** 懇親会専用の係かどうか */
    isPartyOnly() {
      return this.state.fixedness === "party_only";
    }
    /** 兼務可能な係かどうか */
    isConcurrentOk() {
      return this.state.fixedness === "concurrent_ok";
    }
    // Roleはマスターデータのため、更新メソッドは提供しない
    /** 固定性の日本語ラベルを取得 */
    static getFixednessLabel(fixedness) {
      const labels = {
        all_day_fixed: "全日固定",
        time_slot_ok: "時間帯替わりOK",
        concurrent_ok: "兼務可能",
        party_only: "懇親会専用"
      };
      return labels[fixedness];
    }
    /** スキルレベルの数値変換 */
    static skillLevelToNumber(level) {
      const values = {
        none: 0,
        beginner: 1,
        intermediate: 2,
        advanced: 3
      };
      return values[level];
    }
    /** スキルレベルの日本語ラベルを取得 */
    static getSkillLevelLabel(level) {
      const labels = {
        none: "なし",
        beginner: "初級",
        intermediate: "中級",
        advanced: "上級"
      };
      return labels[level];
    }
    /** 13種類のデフォルト係を生成 */
    static createDefaultRoles() {
      const roles = [
        {
          id: "headquarters",
          name: "大会センター",
          description: "運営中枢。PC・Zoom上級、全日程参加必須",
          fixedness: "all_day_fixed",
          requirements: {
            minPcSkill: "advanced",
            minZoomSkill: "advanced"
          },
          priority: 100
        },
        {
          id: "reception",
          name: "受付案内",
          description: "案内対応。英語力あれば優先",
          fixedness: "time_slot_ok",
          requirements: {
            requireEnglish: false
          },
          priority: 80
        },
        {
          id: "badge_reissue",
          name: "名札交換",
          description: "PC入力中心。正確性重視",
          fixedness: "time_slot_ok",
          requirements: {
            minPcSkill: "intermediate"
          },
          priority: 70
        },
        {
          id: "cloakroom",
          name: "手荷物預かり",
          description: "荷物の受け渡し。体力・スピード重視",
          fixedness: "time_slot_ok",
          requirements: {},
          priority: 60
        },
        {
          id: "venue",
          name: "ホール係",
          description: "会場案内・進行補助。Zoom中級、英語あれば優先",
          fixedness: "time_slot_ok",
          requirements: {
            minZoomSkill: "intermediate"
          },
          priority: 85
        },
        {
          id: "venue_check",
          name: "配信確認係",
          description: "配信チェック・機材確認。Zoom・PC中級、イベント経験者優先",
          fixedness: "time_slot_ok",
          requirements: {
            minPcSkill: "intermediate",
            minZoomSkill: "intermediate",
            requireEventExperience: false
          },
          priority: 90
        },
        {
          id: "preview_room",
          name: "プレビュー係",
          description: "発表データ確認など、静かな作業",
          fixedness: "time_slot_ok",
          requirements: {
            minPcSkill: "beginner"
          },
          priority: 50
        },
        {
          id: "mobile_support",
          name: "応援要員",
          description: "欠員・トラブル時の応援要員",
          fixedness: "time_slot_ok",
          requirements: {
            minPcSkill: "intermediate",
            minZoomSkill: "intermediate"
          },
          priority: 75
        },
        {
          id: "setup",
          name: "準備係",
          description: "会場設営。男性優先（力仕事）",
          fixedness: "concurrent_ok",
          requirements: {
            preferMale: true
          },
          priority: 65
        },
        {
          id: "exhibition",
          name: "ブース係",
          description: "企業・展示ブース対応。英語できると尚可",
          fixedness: "time_slot_ok",
          requirements: {},
          priority: 55
        },
        {
          id: "poster",
          name: "掲示係",
          description: "ポスター会場案内・誘導",
          fixedness: "time_slot_ok",
          requirements: {},
          priority: 50
        },
        {
          id: "party_cloakroom",
          name: "交流会荷物係",
          description: "懇親会時間に参加できるスタッフ",
          fixedness: "party_only",
          requirements: {},
          priority: 40
        },
        {
          id: "party_reception",
          name: "交流会案内",
          description: "懇親会受付対応",
          fixedness: "party_only",
          requirements: {},
          priority: 40
        }
      ];
      return roles.map((state) => new Role_係(state));
    }
  }
  class Staff_スタッフ {
    state;
    constructor(state) {
      this.state = state;
    }
    get id() {
      return this.state.id;
    }
    get name() {
      return this.state.name;
    }
    get email() {
      return this.state.email;
    }
    get gender() {
      return this.state.gender;
    }
    get skills() {
      return this.state.skills;
    }
    get presentation() {
      return this.state.presentation;
    }
    get availableTimeSlots() {
      return this.state.availableTimeSlots;
    }
    get status() {
      return this.state.status;
    }
    get aptitudeScore() {
      return this.state.aptitudeScore;
    }
    /** 指定時間帯に勤務可能かどうか */
    isAvailableAt(timeSlotId) {
      return this.state.availableTimeSlots.includes(timeSlotId);
    }
    /** 発表時間帯かどうか */
    hasPresentationAt(date, period) {
      if (!this.state.presentation.hasPresentation)
        return false;
      return this.state.presentation.presentations.some((p) => p.date === date && p.period === period);
    }
    /** 業務オリエンテーションに参加可能かどうか */
    canAttendOrientation(orientationSlotId) {
      return this.state.availableTimeSlots.includes(orientationSlotId);
    }
    /** 係の最低要件を満たしているかどうか */
    meetsRoleRequirements(role) {
      const req = role.requirements;
      const skills = this.state.skills;
      if (req.minPcSkill) {
        if (Role_係.skillLevelToNumber(skills.pc) < Role_係.skillLevelToNumber(req.minPcSkill)) {
          return false;
        }
      }
      if (req.minZoomSkill) {
        if (Role_係.skillLevelToNumber(skills.zoom) < Role_係.skillLevelToNumber(req.minZoomSkill)) {
          return false;
        }
      }
      if (req.requireEnglish && skills.english === "none") {
        return false;
      }
      if (req.requireEventExperience && !skills.eventExperience) {
        return false;
      }
      return true;
    }
    // ========== 状態変更メソッド（意味のある操作のみ公開） ==========
    /** 採用する */
    accept() {
      return this.withUpdatedState({ status: "accepted" });
    }
    /** 補欠にする */
    putOnWaitlist() {
      return this.withUpdatedState({ status: "waitlist" });
    }
    /** 不採用にする */
    reject() {
      return this.withUpdatedState({ status: "rejected" });
    }
    /** 適性スコアを設定（マッチング処理で使用） */
    withAptitudeScore(score) {
      return this.withUpdatedState({ aptitudeScore: score });
    }
    /** 備考を更新 */
    withNotes(notes) {
      return this.withUpdatedState({ notes });
    }
    /** 内部用：状態更新ヘルパー（外部からは呼び出さない） */
    withUpdatedState(partial) {
      return new Staff_スタッフ({
        ...this.state,
        ...partial,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    // ========== シリアライズ ==========
    /** Redux/JSON用にシリアライズ */
    toJSON() {
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
          presentations: [...this.state.presentation.presentations]
        },
        availableTimeSlots: [...this.state.availableTimeSlots],
        notes: this.state.notes,
        status: this.state.status,
        aptitudeScore: this.state.aptitudeScore,
        createdAt: this.state.createdAt,
        updatedAt: this.state.updatedAt
      };
    }
    /** JSONからドメインオブジェクトを復元 */
    static fromJSON(json) {
      return new Staff_スタッフ(json);
    }
    // ========== 静的メソッド ==========
    /** ステータスの日本語ラベルを取得 */
    static getStatusLabel(status) {
      const labels = {
        pending: "審査中",
        accepted: "採用",
        waitlist: "補欠",
        rejected: "不採用"
      };
      return labels[status];
    }
    /** 性別の日本語ラベルを取得 */
    static getGenderLabel(gender) {
      const labels = {
        male: "男性",
        female: "女性",
        other: "その他",
        prefer_not_to_say: "回答しない"
      };
      return labels[gender];
    }
    /** 新しいスタッフを作成 */
    static create(data) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      return new Staff_スタッフ({
        ...data,
        id: crypto.randomUUID(),
        status: "pending",
        createdAt: now,
        updatedAt: now
      });
    }
  }
  class ShiftAssignment_シフト配置 {
    state;
    constructor(state) {
      this.state = state;
    }
    get id() {
      return this.state.id;
    }
    get staffId() {
      return this.state.staffId;
    }
    get timeSlotId() {
      return this.state.timeSlotId;
    }
    get roleId() {
      return this.state.roleId;
    }
    get isAutoAssigned() {
      return this.state.isAutoAssigned;
    }
    get notes() {
      return this.state.notes;
    }
    /** 手動配置に変更（自動配置を上書き） */
    markAsManuallyAssigned() {
      return new ShiftAssignment_シフト配置({ ...this.state, isAutoAssigned: false });
    }
    /** 備考を追加 */
    withNotes(notes) {
      return new ShiftAssignment_シフト配置({ ...this.state, notes });
    }
    // ShiftAssignmentは基本的に作成後は削除して再作成するため、汎用updateは提供しない
    /** 新しい配置を作成 */
    static create(staffId, timeSlotId, roleId, isAutoAssigned = true) {
      return new ShiftAssignment_シフト配置({
        id: crypto.randomUUID(),
        staffId,
        timeSlotId,
        roleId,
        isAutoAssigned
      });
    }
  }
  class SlotRoleEvaluation_配置枠評価 {
    state;
    constructor(state) {
      this.state = state;
    }
    get timeSlotId() {
      return this.state.timeSlotId;
    }
    get roleId() {
      return this.state.roleId;
    }
    get requiredCount() {
      return this.state.requiredCount;
    }
    get assignedCount() {
      return this.state.assignedCount;
    }
    get assignedStaffIds() {
      return this.state.assignedStaffIds;
    }
    get fulfillmentRate() {
      return this.state.fulfillmentRate;
    }
    get hasShortage() {
      return this.state.hasShortage;
    }
    get hasExcess() {
      return this.state.hasExcess;
    }
    // SlotRoleEvaluationは計算結果のため、更新メソッドは提供しない
    /** 配置状況から評価を行う */
    static evaluate(requirement, assignedStaffIds) {
      const assignedCount = assignedStaffIds.length;
      const requiredCount = requirement.requiredCount;
      const fulfillmentRate = requiredCount > 0 ? assignedCount / requiredCount * 100 : 100;
      return new SlotRoleEvaluation_配置枠評価({
        timeSlotId: requirement.timeSlotId,
        roleId: requirement.roleId,
        requiredCount,
        assignedCount,
        assignedStaffIds,
        fulfillmentRate,
        hasShortage: assignedCount < requirement.minCount,
        hasExcess: assignedCount > requirement.maxCount
      });
    }
  }
  class ShiftPlan_シフト案 {
    state;
    constructor(state) {
      this.state = state;
    }
    get id() {
      return this.state.id;
    }
    get name() {
      return this.state.name;
    }
    get assignments() {
      return this.state.assignments.map((s) => new ShiftAssignment_シフト配置(s));
    }
    get constraintViolations() {
      return this.state.constraintViolations ?? ShiftPlan_シフト案.computeConstraintViolations(this.state.assignments);
    }
    /** 特定スタッフの配置を取得 */
    getAssignmentsByStaff(staffId) {
      return this.assignments.filter((a) => a.staffId === staffId);
    }
    /** 特定時間帯の配置を取得 */
    getAssignmentsByTimeSlot(timeSlotId) {
      return this.assignments.filter((a) => a.timeSlotId === timeSlotId);
    }
    /** 特定係の配置を取得 */
    getAssignmentsByRole(roleId) {
      return this.assignments.filter((a) => a.roleId === roleId);
    }
    /** 特定の時間帯×係の配置を取得 */
    getAssignmentsForSlotRole(timeSlotId, roleId) {
      return this.assignments.filter((a) => a.timeSlotId === timeSlotId && a.roleId === roleId);
    }
    /** シフト案を評価（必要人数と照合） */
    evaluate(requirements) {
      const slotRoleEvaluations = [];
      for (const req of requirements) {
        const assignedStaffIds = this.getAssignmentsForSlotRole(req.timeSlotId, req.roleId).map((a) => a.staffId);
        const evaluation = SlotRoleEvaluation_配置枠評価.evaluate(req, assignedStaffIds);
        slotRoleEvaluations.push(evaluation);
      }
      const totalAssignmentCount = this.state.assignments.length;
      const shortageCount = slotRoleEvaluations.filter((e) => e.hasShortage).length;
      const excessCount = slotRoleEvaluations.filter((e) => e.hasExcess).length;
      const totalFulfillmentRate = slotRoleEvaluations.length > 0 ? slotRoleEvaluations.reduce((sum, e) => sum + e.fulfillmentRate, 0) / slotRoleEvaluations.length : 100;
      return {
        totalAssignmentCount,
        totalFulfillmentRate,
        shortageCount,
        excessCount,
        slotRoleEvaluations
      };
    }
    /** 総合スコアを計算（高いほど良い） */
    calculateOverallScore(requirements) {
      const evaluation = this.evaluate(requirements);
      let score = evaluation.totalFulfillmentRate;
      score -= evaluation.shortageCount * 5;
      score -= evaluation.excessCount * 2;
      return Math.max(0, score);
    }
    // ========== 制約違反 ==========
    /** 制約違反を取得 */
    detectConstraintViolations() {
      return this.constraintViolations;
    }
    /** 制約違反があるかどうか */
    hasConstraintViolations() {
      return this.constraintViolations.length > 0;
    }
    /** 特定の配置が制約違反に含まれているか */
    isAssignmentInViolation(assignmentId) {
      return this.constraintViolations.some((v) => v.assignmentIds.includes(assignmentId));
    }
    /** 特定のスタッフ×時間帯の組み合わせが制約違反か */
    isStaffTimeSlotInViolation(staffId, timeSlotId) {
      return this.constraintViolations.some((v) => v.staffId === staffId && v.timeSlotId === timeSlotId);
    }
    /** 配置リストから制約違反を計算 */
    static computeConstraintViolations(assignments) {
      const violations = [];
      const groupedByTimeSlotAndStaff = /* @__PURE__ */ new Map();
      for (const assignment of assignments) {
        const key = `${assignment.timeSlotId}:${assignment.staffId}`;
        const existing = groupedByTimeSlotAndStaff.get(key) ?? [];
        existing.push(assignment);
        groupedByTimeSlotAndStaff.set(key, existing);
      }
      for (const [key, grouped] of groupedByTimeSlotAndStaff) {
        if (grouped.length > 1) {
          const [timeSlotId, staffId] = key.split(":");
          violations.push({
            type: "duplicate_staff_in_timeslot",
            staffId,
            timeSlotId,
            assignmentIds: grouped.map((a) => a.id),
            message: `同一時間帯に同じスタッフが${grouped.length}件配置されています`
          });
        }
      }
      return violations;
    }
    // ========== 状態変更メソッド ==========
    /** 配置を追加 */
    addAssignment(assignment) {
      return this.withUpdatedState({
        assignments: [...this.state.assignments, assignment.state]
      });
    }
    /** 配置を削除 */
    removeAssignment(assignmentId) {
      return this.withUpdatedState({
        assignments: this.state.assignments.filter((a) => a.id !== assignmentId)
      });
    }
    /** 名前を変更 */
    withName(name) {
      return this.withUpdatedState({ name });
    }
    /** 内部用：状態更新ヘルパー */
    withUpdatedState(partial) {
      const newAssignments = partial.assignments ?? this.state.assignments;
      const constraintViolations = partial.assignments ? ShiftPlan_シフト案.computeConstraintViolations(newAssignments) : this.state.constraintViolations;
      return new ShiftPlan_シフト案({
        ...this.state,
        ...partial,
        constraintViolations,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    // ========== 静的メソッド ==========
    /** 新しいシフト案を作成 */
    static create(name) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      return new ShiftPlan_シフト案({
        id: crypto.randomUUID(),
        name,
        assignments: [],
        constraintViolations: [],
        createdAt: now,
        updatedAt: now
      });
    }
  }
  class StaffAssignmentEvaluation_スタッフ配置評価 {
    state;
    constructor(state) {
      this.state = state;
    }
    get assignmentId() {
      return this.state.assignmentId;
    }
    get staffId() {
      return this.state.staffId;
    }
    get timeSlotId() {
      return this.state.timeSlotId;
    }
    get roleId() {
      return this.state.roleId;
    }
    get isAvailable() {
      return this.state.isAvailable;
    }
    get meetsRequirements() {
      return this.state.meetsRequirements;
    }
    get hasPresentationConflict() {
      return this.state.hasPresentationConflict;
    }
    get skillMatches() {
      return this.state.skillMatches;
    }
    get roleFitScore() {
      return this.state.roleFitScore;
    }
    get totalScore() {
      return this.state.totalScore;
    }
    get issues() {
      return this.state.issues;
    }
    /** 総合評価ステータスを取得 */
    getOverallStatus() {
      const { issues, totalScore } = this.state;
      if (!this.state.isAvailable || this.state.hasPresentationConflict) {
        return "error";
      }
      if (!this.state.meetsRequirements) {
        return "warning";
      }
      if (totalScore >= 10)
        return "excellent";
      if (totalScore >= 5)
        return "good";
      if (totalScore >= 0)
        return "acceptable";
      if (issues.length > 0)
        return "warning";
      return "acceptable";
    }
    /** ステータスの日本語ラベルを取得 */
    static getStatusLabel(status) {
      const labels = {
        excellent: "最適",
        good: "良好",
        acceptable: "可",
        warning: "注意",
        error: "問題あり"
      };
      return labels[status];
    }
    /** 配置を評価（既存配置の評価用） */
    static evaluate(assignment, staff, role, timeSlot) {
      const result = this.evaluateCore(staff, role, timeSlot);
      return new StaffAssignmentEvaluation_スタッフ配置評価({
        ...result,
        assignmentId: assignment.id
      });
    }
    /**
     * 候補者を評価（配置前の仮評価用）
     * ShiftMatcherなどのマッチングアルゴリズムから使用
     */
    static evaluateCandidate(staff, role, timeSlot) {
      const result = this.evaluateCore(staff, role, timeSlot);
      return new StaffAssignmentEvaluation_スタッフ配置評価({
        ...result,
        assignmentId: ""
        // 配置前なのでID未定
      });
    }
    /** 評価の共通ロジック */
    static evaluateCore(staff, role, timeSlot) {
      const issues = [];
      const isAvailable = staff.isAvailableAt(timeSlot.id);
      if (!isAvailable) {
        issues.push("この時間帯に参加できません");
      }
      const hasPresentationConflict = staff.hasPresentationAt(timeSlot.date, timeSlot.period);
      if (hasPresentationConflict) {
        issues.push("発表と時間が重複しています");
      }
      const meetsRequirements = staff.meetsRoleRequirements(role);
      if (!meetsRequirements) {
        issues.push("係の要件を満たしていません");
      }
      const skillMatches = this.evaluateSkillMatches(staff, role);
      const roleFitScore = skillMatches.reduce((sum, m) => sum + m.scoreDiff, 0);
      let totalScore = roleFitScore;
      if (!isAvailable)
        totalScore -= 10;
      if (hasPresentationConflict)
        totalScore -= 10;
      if (!meetsRequirements)
        totalScore -= 10;
      return {
        staffId: staff.id,
        timeSlotId: timeSlot.id,
        roleId: role.id,
        isAvailable,
        meetsRequirements,
        hasPresentationConflict,
        skillMatches,
        roleFitScore,
        totalScore,
        issues
      };
    }
    /** スキルマッチングを評価 */
    static evaluateSkillMatches(staff, role) {
      const matches = [];
      const req = role.requirements;
      const skills = staff.skills;
      const pcRequired = req.minPcSkill ?? "none";
      const pcRawDiff = req.minPcSkill ? Role_係.skillLevelToNumber(skills.pc) - Role_係.skillLevelToNumber(req.minPcSkill) : 0;
      const pcDiff = req.minPcSkill ? pcRawDiff >= 0 ? pcRawDiff + 1 : pcRawDiff : 0;
      matches.push({
        skillName: "PC",
        required: pcRequired,
        staffHas: skills.pc,
        isMatch: pcRawDiff >= 0,
        scoreDiff: pcDiff
      });
      const zoomRequired = req.minZoomSkill ?? "none";
      const zoomRawDiff = req.minZoomSkill ? Role_係.skillLevelToNumber(skills.zoom) - Role_係.skillLevelToNumber(req.minZoomSkill) : 0;
      const zoomDiff = req.minZoomSkill ? zoomRawDiff >= 0 ? zoomRawDiff + 1 : zoomRawDiff : 0;
      matches.push({
        skillName: "Zoom",
        required: zoomRequired,
        staffHas: skills.zoom,
        isMatch: zoomRawDiff >= 0,
        scoreDiff: zoomDiff
      });
      const englishRequired = req.requireEnglish ? "any" : "none";
      const englishMatch = !req.requireEnglish || skills.english === "daily_conversation";
      matches.push({
        skillName: "英語",
        required: englishRequired,
        staffHas: skills.english === "daily_conversation" ? "日常会話" : "なし",
        isMatch: englishMatch,
        // 係が求めている場合のみ加点
        scoreDiff: req.requireEnglish && skills.english === "daily_conversation" ? 2 : 0
      });
      const expRequired = req.requireEventExperience ? "any" : "none";
      const expMatch = !req.requireEventExperience || skills.eventExperience;
      matches.push({
        skillName: "経験",
        required: expRequired,
        staffHas: skills.eventExperience ? "あり" : "なし",
        isMatch: expMatch,
        // 係が求めている場合のみ加点
        scoreDiff: req.requireEventExperience && skills.eventExperience ? 2 : 0
      });
      const maleRequired = req.preferMale ? "any" : "none";
      const maleMatch = !req.preferMale || staff.gender === "male";
      const maleScore = req.preferMale ? staff.gender === "male" ? 2 : 1 : 0;
      matches.push({
        skillName: "性別",
        required: maleRequired,
        staffHas: staff.gender === "male" ? "男性" : "その他",
        isMatch: maleMatch,
        scoreDiff: maleScore
      });
      return matches;
    }
  }
  const DEFAULT_OPTIONS = {
    allowConcurrentAssignment: false,
    maxAssignmentsPerStaff: 0,
    // 無制限
    preserveExistingAssignments: true
  };
  class ShiftMatcher_シフトマッチング {
    staffList;
    roles;
    timeSlots;
    requirements;
    constructor(staffList, roles, timeSlots2, requirements) {
      this.staffList = staffList;
      this.roles = roles;
      this.timeSlots = timeSlots2;
      this.requirements = requirements;
    }
    /**
     * 自動マッチングを実行
     * @param existingAssignments 既存の配置（オプション）
     * @param options マッチングオプション
     */
    match(existingAssignments = [], options = {}) {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const assignments = opts.preserveExistingAssignments ? [...existingAssignments] : [];
      const staffAssignmentCount = /* @__PURE__ */ new Map();
      const staffTimeSlotAssignments = /* @__PURE__ */ new Map();
      for (const assignment of assignments) {
        const count = staffAssignmentCount.get(assignment.staffId) ?? 0;
        staffAssignmentCount.set(assignment.staffId, count + 1);
        const slots = staffTimeSlotAssignments.get(assignment.staffId) ?? /* @__PURE__ */ new Set();
        slots.add(assignment.timeSlotId);
        staffTimeSlotAssignments.set(assignment.staffId, slots);
      }
      const sortedRoles = [...this.roles].sort((a, b) => b.priority - a.priority);
      for (const role of sortedRoles) {
        for (const timeSlot of this.timeSlots) {
          const requirement = this.requirements.find((r) => r.timeSlotId === timeSlot.id && r.roleId === role.id);
          if (!requirement) {
            continue;
          }
          const requiredCount = requirement.requiredCount;
          const existingCount = assignments.filter((a) => a.timeSlotId === timeSlot.id && a.roleId === role.id).length;
          const neededCount = Math.max(0, requiredCount - existingCount);
          const candidates = this.evaluateCandidates(timeSlot, role, assignments, staffAssignmentCount, staffTimeSlotAssignments, opts);
          for (let i = 0; i < neededCount && i < candidates.length; i++) {
            const candidate = candidates[i];
            const assignment = ShiftAssignment_シフト配置.create(
              candidate.staff.id,
              timeSlot.id,
              role.id,
              true
              // 自動配置フラグ
            );
            assignments.push(assignment.state);
            const count = staffAssignmentCount.get(candidate.staff.id) ?? 0;
            staffAssignmentCount.set(candidate.staff.id, count + 1);
            const slots = staffTimeSlotAssignments.get(candidate.staff.id) ?? /* @__PURE__ */ new Set();
            slots.add(timeSlot.id);
            staffTimeSlotAssignments.set(candidate.staff.id, slots);
          }
        }
      }
      const stats = this.calculateStats(assignments, staffAssignmentCount);
      return { assignments, stats };
    }
    /**
     * 特定の時間帯×係への候補者を評価
     */
    evaluateCandidates(timeSlot, role, currentAssignments, staffAssignmentCount, staffTimeSlotAssignments, opts) {
      const candidates = [];
      for (const staff of this.staffList) {
        const reasons = [];
        if (!staff.isAvailableAt(timeSlot.id)) {
          continue;
        }
        const alreadyAssigned = currentAssignments.some((a) => a.staffId === staff.id && a.timeSlotId === timeSlot.id && a.roleId === role.id);
        if (alreadyAssigned) {
          continue;
        }
        const assignedSlots = staffTimeSlotAssignments.get(staff.id);
        if (assignedSlots?.has(timeSlot.id) && !opts.allowConcurrentAssignment) {
          if (!role.isConcurrentOk()) {
            continue;
          }
        }
        if (opts.maxAssignmentsPerStaff > 0) {
          const count = staffAssignmentCount.get(staff.id) ?? 0;
          if (count >= opts.maxAssignmentsPerStaff) {
            continue;
          }
        }
        const evaluation = StaffAssignmentEvaluation_スタッフ配置評価.evaluateCandidate(staff, role, timeSlot);
        let matchingScore = evaluation.totalScore;
        if (evaluation.meetsRequirements) {
          reasons.push("要件満たす");
        } else {
          reasons.push("要件不足");
        }
        if (evaluation.roleFitScore > 0) {
          reasons.push(`適性+${evaluation.roleFitScore}`);
        }
        const currentCount = staffAssignmentCount.get(staff.id) ?? 0;
        matchingScore -= currentCount * 2;
        if (currentCount === 0) {
          reasons.push("未配置");
        }
        const availableCount = staff.availableTimeSlots.length;
        matchingScore += Math.min(availableCount, 5);
        candidates.push({ staff, evaluation, matchingScore, reasons });
      }
      return candidates.sort((a, b) => b.matchingScore - a.matchingScore);
    }
    /**
     * マッチング統計を計算
     */
    calculateStats(assignments, staffAssignmentCount) {
      let filledSlots = 0;
      let unfilledSlots = 0;
      for (const requirement of this.requirements) {
        const assignedCount = assignments.filter((a) => a.timeSlotId === requirement.timeSlotId && a.roleId === requirement.roleId).length;
        if (assignedCount >= requirement.requiredCount) {
          filledSlots++;
        } else {
          unfilledSlots++;
        }
      }
      const assignedStaffIds = new Set(assignments.map((a) => a.staffId));
      const unassignedStaff = this.staffList.filter((s) => !assignedStaffIds.has(s.id)).length;
      return {
        totalAssignments: assignments.length,
        filledSlots,
        unfilledSlots,
        unassignedStaff
      };
    }
    // ========== 静的ファクトリーメソッド ==========
    /**
     * デフォルトのマッチングを実行するシンプルなファクトリー
     */
    static autoAssign(staffList, roles, timeSlots2, existingAssignments = [], options = {}) {
      const requirements = ShiftMatcher_シフトマッチング.extractRequirements(timeSlots2);
      const matcher = new ShiftMatcher_シフトマッチング(staffList, roles, timeSlots2, requirements);
      return matcher.match(existingAssignments, options);
    }
    /**
     * TimeSlotの配列から必要人数を抽出する
     */
    static extractRequirements(timeSlots2) {
      const requirements = [];
      for (const timeSlot of timeSlots2) {
        requirements.push(...timeSlot.staffRequirements);
      }
      return requirements;
    }
  }
  const initialState$1 = {
    shiftPlans: [],
    currentShiftPlanId: null
  };
  const toMutableShiftPlanState = (plan) => ({
    ...plan,
    assignments: [...plan.assignments],
    constraintViolations: (plan.constraintViolations ?? []).map((v) => ({
      ...v,
      assignmentIds: [...v.assignmentIds]
    }))
  });
  const shiftPlanSlice = toolkit.createSlice({
    name: "shiftPlan",
    initialState: initialState$1,
    reducers: {
      addShiftPlan: (state, action) => {
        if (!state.shiftPlans) {
          state.shiftPlans = [];
        }
        const mutablePlan = toMutableShiftPlanState(action.payload);
        state.shiftPlans.push(mutablePlan);
      },
      updateShiftPlan: (state, action) => {
        if (!state.shiftPlans) state.shiftPlans = [];
        const index = state.shiftPlans.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.shiftPlans[index] = toMutableShiftPlanState(action.payload);
        }
      },
      setCurrentShiftPlanId: (state, action) => {
        state.currentShiftPlanId = action.payload;
      },
      deleteShiftPlan: (state, action) => {
        if (!state.shiftPlans) state.shiftPlans = [];
        state.shiftPlans = state.shiftPlans.filter((p) => p.id !== action.payload);
        if (state.currentShiftPlanId === action.payload) {
          state.currentShiftPlanId = state.shiftPlans.length > 0 ? state.shiftPlans[0].id : null;
        }
      }
    }
  });
  const {
    addShiftPlan,
    updateShiftPlan,
    deleteShiftPlan,
    setCurrentShiftPlanId
  } = shiftPlanSlice.actions;
  shiftPlanSlice.injectInto(stateManagement.rootReducer);
  const selectShiftPlansRaw = (state) => state.shiftPlan?.shiftPlans ?? [];
  const selectShiftPlans = toolkit.createSelector(
    [selectShiftPlansRaw],
    (shiftPlans) => shiftPlans.map((s) => new ShiftPlan_シフト案(s))
  );
  const selectShiftPlanById = (id) => toolkit.createSelector(
    [(state) => (state.shiftPlan?.shiftPlans ?? []).find((p) => p.id === id)],
    (plan) => {
      return plan ? new ShiftPlan_シフト案(plan) : void 0;
    }
  );
  toolkit.createSelector(
    [(state) => {
      const id = state.shiftPlan?.currentShiftPlanId;
      if (!id) return void 0;
      return (state.shiftPlan?.shiftPlans ?? []).find((p) => p.id === id);
    }],
    (plan) => {
      return plan ? new ShiftPlan_シフト案(plan) : void 0;
    }
  );
  const initialState = {
    staffList: [],
    selectedStaffId: null
  };
  const gakkaiShiftSlice = toolkit.createSlice({
    name: "gakkaiShift",
    initialState,
    reducers: {
      setStaffList: (state, action) => {
        state.staffList = action.payload;
      },
      addStaff: (state, action) => {
        state.staffList.push(action.payload);
      },
      updateStaff: (state, action) => {
        const index = state.staffList.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.staffList[index] = action.payload;
        }
      },
      deleteStaff: (state, action) => {
        state.staffList = state.staffList.filter((s) => s.id !== action.payload);
      },
      setSelectedStaffId: (state, action) => {
        state.selectedStaffId = action.payload;
      },
      updateStaffStatus: (state, action) => {
        const staff = state.staffList.find((s) => s.id === action.payload.id);
        if (staff) {
          staff.status = action.payload.status;
          staff.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
      }
    }
  });
  const {
    setStaffList,
    addStaff,
    updateStaff,
    deleteStaff,
    setSelectedStaffId,
    updateStaffStatus
  } = gakkaiShiftSlice.actions;
  gakkaiShiftSlice.injectInto(stateManagement.rootReducer);
  const selectStaffListRaw = (state) => state.gakkaiShift?.staffList ?? [];
  const selectGakkaiShiftStaffList = toolkit.createSelector(
    [selectStaffListRaw],
    (staffList) => staffList.map((json) => Staff_スタッフ.fromJSON(json))
  );
  const selectGakkaiShiftSelectedStaffId = (state) => state.gakkaiShift?.selectedStaffId ?? null;
  const selectGakkaiShiftStaffById = (id) => toolkit.createSelector(
    [(state) => (state.gakkaiShift?.staffList ?? []).find((s) => s.id === id)],
    (json) => {
      return json ? Staff_スタッフ.fromJSON(json) : void 0;
    }
  );
  const selectGakkaiShiftSelectedStaff = toolkit.createSelector(
    [(state) => {
      const id = state.gakkaiShift?.selectedStaffId;
      if (!id) return void 0;
      return (state.gakkaiShift?.staffList ?? []).find((s) => s.id === id);
    }],
    (json) => {
      return json ? Staff_スタッフ.fromJSON(json) : void 0;
    }
  );
  const StaffListView = ({
    staffList,
    selectedStaffId,
    buildDetailUrl: buildDetailUrl2,
    onStaffClick,
    filteredSkills
  }) => {
    const renderSkillBadges = (staff) => {
      if (!filteredSkills) return null;
      const badges = [];
      if (filteredSkills.pc) {
        const label = Role_係.getSkillLevelLabel(staff.skills.pc);
        badges.push(
          /* @__PURE__ */ React.createElement("span", { key: "pc", className: "e-skill-badge e-skill-badge--pc" }, "PC: ", label)
        );
      }
      if (filteredSkills.zoom) {
        const label = Role_係.getSkillLevelLabel(staff.skills.zoom);
        badges.push(
          /* @__PURE__ */ React.createElement("span", { key: "zoom", className: "e-skill-badge e-skill-badge--zoom" }, "Zoom: ", label)
        );
      }
      if (filteredSkills.english && staff.skills.english === "daily_conversation") {
        badges.push(
          /* @__PURE__ */ React.createElement("span", { key: "english", className: "e-skill-badge e-skill-badge--english" }, "英語可")
        );
      }
      if (filteredSkills.eventExperience && staff.skills.eventExperience) {
        badges.push(
          /* @__PURE__ */ React.createElement("span", { key: "exp", className: "e-skill-badge e-skill-badge--exp" }, "経験あり")
        );
      }
      return badges.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "e-skills" }, badges) : null;
    };
    return /* @__PURE__ */ React.createElement(StyledStaffList, null, staffList.length === 0 ? /* @__PURE__ */ React.createElement("li", { className: "e-empty" }, "スタッフがいません") : staffList.map((staff) => {
      const detailUrl = buildDetailUrl2(staff.id);
      return /* @__PURE__ */ React.createElement(
        "li",
        {
          key: staff.id,
          className: `e-item ${selectedStaffId === staff.id ? "is-selected" : ""}`
        },
        /* @__PURE__ */ React.createElement(
          bubblesUi.ObjectView,
          {
            type: "Staff",
            url: detailUrl,
            label: staff.name,
            draggable: true,
            onClick: () => onStaffClick?.(staff.id)
          },
          /* @__PURE__ */ React.createElement("div", { className: "e-content" }, /* @__PURE__ */ React.createElement(PersonIcon, { fontSize: "small", className: "e-avatar" }), /* @__PURE__ */ React.createElement("div", { className: "e-text" }, /* @__PURE__ */ React.createElement("div", { className: "e-name" }, staff.name), /* @__PURE__ */ React.createElement("div", { className: "e-meta" }, staff.state.school, " / ", staff.state.grade), renderSkillBadges(staff)))
        )
      );
    }));
  };
  const StyledStaffList = styled2.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;

  > .e-empty {
    padding: 16px;
    text-align: center;
    color: #666;
  }

  > .e-item {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background-color: #f5f5f5;
    }

    &.is-selected {
      background-color: #e3f2fd;
    }

    &:last-child {
      border-bottom: none;
    }

    > .e-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .e-avatar {
      color: #666;
      flex-shrink: 0;
    }

    .e-text {
      flex: 1;
      min-width: 0;
    }

    .e-name {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .e-meta {
      color: #666;
      font-size: 0.85em;
    }

    .e-skills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }

    .e-skill-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7em;
      font-weight: bold;

      &.e-skill-badge--pc {
        background-color: #e3f2fd;
        color: #1565c0;
      }

      &.e-skill-badge--zoom {
        background-color: #f3e5f5;
        color: #7b1fa2;
      }

      &.e-skill-badge--english {
        background-color: #e8f5e9;
        color: #2e7d32;
      }

      &.e-skill-badge--exp {
        background-color: #fff3e0;
        color: #e65100;
      }
    }
  }
`;
  const timeSlots = TimeSlot_時間帯.createDefaultTimeSlots();
  const allSlotIds = timeSlots.map((s) => s.id);
  function createSampleStaffList() {
    return [
      Staff_スタッフ.create({
        name: "田中 太郎",
        furigana: "たなか たろう",
        email: "tanaka@example.com",
        phone: "090-1234-5678",
        school: "東京大学",
        grade: "修士1年",
        gender: "male",
        skills: {
          pc: "advanced",
          zoom: "advanced",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "学園祭実行委員2年"
        },
        presentation: {
          hasPresentation: true,
          presentations: [{ date: "2025-03-20", period: "afternoon" }]
        },
        availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-20_afternoon"),
        notes: "リーダー経験あり"
      }),
      Staff_スタッフ.create({
        name: "佐藤 花子",
        furigana: "さとう はなこ",
        email: "sato@example.com",
        phone: "090-2345-6789",
        school: "早稲田大学",
        grade: "学部3年",
        gender: "female",
        skills: {
          pc: "intermediate",
          zoom: "intermediate",
          english: "none",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(2),
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "鈴木 健太",
        furigana: "すずき けんた",
        email: "suzuki@example.com",
        phone: "090-3456-7890",
        school: "慶應義塾大学",
        grade: "学部4年",
        gender: "male",
        skills: {
          pc: "beginner",
          zoom: "beginner",
          english: "none",
          eventExperience: true,
          eventExperienceDetail: "部活の運営"
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds,
        notes: "体力に自信あり"
      }),
      Staff_スタッフ.create({
        name: "高橋 美咲",
        furigana: "たかはし みさき",
        email: "takahashi@example.com",
        phone: "090-4567-8901",
        school: "東京工業大学",
        grade: "修士2年",
        gender: "female",
        skills: {
          pc: "advanced",
          zoom: "intermediate",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "国際学会ボランティア"
        },
        presentation: {
          hasPresentation: true,
          presentations: [
            { date: "2025-03-19", period: "morning" },
            { date: "2025-03-21", period: "afternoon" }
          ]
        },
        availableTimeSlots: allSlotIds.filter(
          (id) => id !== "2025-03-19_morning" && id !== "2025-03-21_afternoon"
        ),
        notes: "英語対応可能"
      }),
      Staff_スタッフ.create({
        name: "伊藤 大輔",
        furigana: "いとう だいすけ",
        email: "ito@example.com",
        phone: "090-5678-9012",
        school: "一橋大学",
        grade: "学部2年",
        gender: "male",
        skills: {
          pc: "intermediate",
          zoom: "none",
          english: "none",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(5, 12),
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "渡辺 さくら",
        furigana: "わたなべ さくら",
        email: "watanabe@example.com",
        phone: "090-6789-0123",
        school: "お茶の水女子大学",
        grade: "学部4年",
        gender: "female",
        skills: {
          pc: "intermediate",
          zoom: "intermediate",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "オープンキャンパススタッフ"
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds,
        notes: "コミュニケーション能力高い"
      }),
      Staff_スタッフ.create({
        name: "山本 翔太",
        furigana: "やまもと しょうた",
        email: "yamamoto@example.com",
        phone: "090-7890-1234",
        school: "東京大学",
        grade: "博士1年",
        gender: "male",
        skills: {
          pc: "advanced",
          zoom: "advanced",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "学会運営経験3回"
        },
        presentation: {
          hasPresentation: true,
          presentations: [{ date: "2025-03-20", period: "morning" }]
        },
        availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-20_morning"),
        notes: "過去に年会本部経験あり"
      }),
      Staff_スタッフ.create({
        name: "中村 愛",
        furigana: "なかむら あい",
        email: "nakamura@example.com",
        phone: "090-8901-2345",
        school: "明治大学",
        grade: "学部3年",
        gender: "female",
        skills: {
          pc: "beginner",
          zoom: "beginner",
          english: "none",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(2, 10),
        notes: "懇親会参加可能"
      }),
      // ここから追加スタッフ
      Staff_スタッフ.create({
        name: "小林 誠",
        furigana: "こばやし まこと",
        email: "kobayashi@example.com",
        phone: "090-1111-2222",
        school: "京都大学",
        grade: "修士1年",
        gender: "male",
        skills: {
          pc: "advanced",
          zoom: "intermediate",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "研究室セミナー運営"
        },
        presentation: {
          hasPresentation: true,
          presentations: [{ date: "2025-03-19", period: "afternoon" }]
        },
        availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-19_afternoon"),
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "加藤 優子",
        furigana: "かとう ゆうこ",
        email: "kato@example.com",
        phone: "090-2222-3333",
        school: "上智大学",
        grade: "学部2年",
        gender: "female",
        skills: {
          pc: "intermediate",
          zoom: "intermediate",
          english: "daily_conversation",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds,
        notes: "留学経験あり"
      }),
      Staff_スタッフ.create({
        name: "吉田 拓也",
        furigana: "よしだ たくや",
        email: "yoshida@example.com",
        phone: "090-3333-4444",
        school: "東北大学",
        grade: "博士2年",
        gender: "male",
        skills: {
          pc: "advanced",
          zoom: "advanced",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "国際会議運営補佐"
        },
        presentation: {
          hasPresentation: true,
          presentations: [{ date: "2025-03-21", period: "morning" }]
        },
        availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-21_morning"),
        notes: "複数言語対応可"
      }),
      Staff_スタッフ.create({
        name: "山田 真由",
        furigana: "やまだ まゆ",
        email: "yamada@example.com",
        phone: "090-4444-5555",
        school: "日本女子大学",
        grade: "学部4年",
        gender: "female",
        skills: {
          pc: "intermediate",
          zoom: "beginner",
          english: "none",
          eventExperience: true,
          eventExperienceDetail: "サークル会計"
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(0, 8),
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "松本 健一",
        furigana: "まつもと けんいち",
        email: "matsumoto@example.com",
        phone: "090-5555-6666",
        school: "九州大学",
        grade: "修士2年",
        gender: "male",
        skills: {
          pc: "intermediate",
          zoom: "intermediate",
          english: "none",
          eventExperience: false
        },
        presentation: {
          hasPresentation: true,
          presentations: [{ date: "2025-03-20", period: "afternoon" }]
        },
        availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-20_afternoon"),
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "井上 さやか",
        furigana: "いのうえ さやか",
        email: "inoue@example.com",
        phone: "090-6666-7777",
        school: "立教大学",
        grade: "学部3年",
        gender: "female",
        skills: {
          pc: "beginner",
          zoom: "intermediate",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "ボランティア活動"
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds,
        notes: "明るい性格"
      }),
      Staff_スタッフ.create({
        name: "木村 雄大",
        furigana: "きむら ゆうだい",
        email: "kimura@example.com",
        phone: "090-7777-8888",
        school: "名古屋大学",
        grade: "学部1年",
        gender: "male",
        skills: {
          pc: "beginner",
          zoom: "none",
          english: "none",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(4),
        notes: "力仕事可能"
      }),
      Staff_スタッフ.create({
        name: "林 美穂",
        furigana: "はやし みほ",
        email: "hayashi@example.com",
        phone: "090-8888-9999",
        school: "神戸大学",
        grade: "修士1年",
        gender: "female",
        skills: {
          pc: "advanced",
          zoom: "advanced",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "学会発表多数"
        },
        presentation: {
          hasPresentation: true,
          presentations: [{ date: "2025-03-19", period: "morning" }]
        },
        availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-19_morning"),
        notes: "リーダーシップあり"
      }),
      Staff_スタッフ.create({
        name: "清水 大地",
        furigana: "しみず だいち",
        email: "shimizu@example.com",
        phone: "090-9999-0000",
        school: "北海道大学",
        grade: "学部3年",
        gender: "male",
        skills: {
          pc: "intermediate",
          zoom: "beginner",
          english: "none",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(2, 12),
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "森 彩香",
        furigana: "もり あやか",
        email: "mori@example.com",
        phone: "090-0000-1111",
        school: "津田塾大学",
        grade: "学部2年",
        gender: "female",
        skills: {
          pc: "intermediate",
          zoom: "intermediate",
          english: "daily_conversation",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds,
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "池田 航",
        furigana: "いけだ わたる",
        email: "ikeda@example.com",
        phone: "090-1212-3434",
        school: "大阪大学",
        grade: "博士1年",
        gender: "male",
        skills: {
          pc: "advanced",
          zoom: "advanced",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "国際シンポジウム運営"
        },
        presentation: {
          hasPresentation: true,
          presentations: [
            { date: "2025-03-20", period: "morning" },
            { date: "2025-03-21", period: "afternoon" }
          ]
        },
        availableTimeSlots: allSlotIds.filter(
          (id) => id !== "2025-03-20_morning" && id !== "2025-03-21_afternoon"
        ),
        notes: "英語堪能"
      }),
      Staff_スタッフ.create({
        name: "橋本 萌",
        furigana: "はしもと もえ",
        email: "hashimoto@example.com",
        phone: "090-2323-4545",
        school: "青山学院大学",
        grade: "学部4年",
        gender: "female",
        skills: {
          pc: "intermediate",
          zoom: "intermediate",
          english: "none",
          eventExperience: true,
          eventExperienceDetail: "イベント企画サークル"
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(0, 10),
        notes: "企画力あり"
      }),
      Staff_スタッフ.create({
        name: "山口 隆",
        furigana: "やまぐち たかし",
        email: "yamaguchi@example.com",
        phone: "090-3434-5656",
        school: "筑波大学",
        grade: "修士2年",
        gender: "male",
        skills: {
          pc: "advanced",
          zoom: "intermediate",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "研究会幹事"
        },
        presentation: {
          hasPresentation: true,
          presentations: [{ date: "2025-03-21", period: "morning" }]
        },
        availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-21_morning"),
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "石川 結衣",
        furigana: "いしかわ ゆい",
        email: "ishikawa@example.com",
        phone: "090-4545-6767",
        school: "東京女子大学",
        grade: "学部3年",
        gender: "female",
        skills: {
          pc: "beginner",
          zoom: "beginner",
          english: "none",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(4, 14),
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "前田 悠斗",
        furigana: "まえだ ゆうと",
        email: "maeda@example.com",
        phone: "090-5656-7878",
        school: "横浜国立大学",
        grade: "学部2年",
        gender: "male",
        skills: {
          pc: "intermediate",
          zoom: "none",
          english: "none",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds,
        notes: "体育会系"
      }),
      Staff_スタッフ.create({
        name: "藤田 菜々子",
        furigana: "ふじた ななこ",
        email: "fujita@example.com",
        phone: "090-6767-8989",
        school: "学習院大学",
        grade: "学部4年",
        gender: "female",
        skills: {
          pc: "intermediate",
          zoom: "intermediate",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "留学生サポーター"
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(2),
        notes: "外国語対応可"
      }),
      Staff_スタッフ.create({
        name: "岡田 智也",
        furigana: "おかだ ともや",
        email: "okada@example.com",
        phone: "090-7878-9090",
        school: "千葉大学",
        grade: "修士1年",
        gender: "male",
        skills: {
          pc: "advanced",
          zoom: "advanced",
          english: "none",
          eventExperience: true,
          eventExperienceDetail: "学内IT支援"
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds,
        notes: "ITに強い"
      }),
      Staff_スタッフ.create({
        name: "後藤 美月",
        furigana: "ごとう みづき",
        email: "goto@example.com",
        phone: "090-8989-0101",
        school: "フェリス女学院大学",
        grade: "学部1年",
        gender: "female",
        skills: {
          pc: "beginner",
          zoom: "beginner",
          english: "daily_conversation",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(6),
        notes: "初参加"
      }),
      Staff_スタッフ.create({
        name: "長谷川 颯太",
        furigana: "はせがわ そうた",
        email: "hasegawa@example.com",
        phone: "090-0101-2323",
        school: "広島大学",
        grade: "学部3年",
        gender: "male",
        skills: {
          pc: "intermediate",
          zoom: "intermediate",
          english: "none",
          eventExperience: true,
          eventExperienceDetail: "学園祭実行委員"
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(0, 12),
        notes: ""
      }),
      Staff_スタッフ.create({
        name: "村上 真帆",
        furigana: "むらかみ まほ",
        email: "murakami@example.com",
        phone: "090-1313-2424",
        school: "同志社大学",
        grade: "修士2年",
        gender: "female",
        skills: {
          pc: "advanced",
          zoom: "intermediate",
          english: "daily_conversation",
          eventExperience: true,
          eventExperienceDetail: "学会幹事経験"
        },
        presentation: {
          hasPresentation: true,
          presentations: [{ date: "2025-03-19", period: "afternoon" }]
        },
        availableTimeSlots: allSlotIds.filter((id) => id !== "2025-03-19_afternoon"),
        notes: "経験豊富"
      }),
      Staff_スタッフ.create({
        name: "近藤 亮",
        furigana: "こんどう りょう",
        email: "kondo@example.com",
        phone: "090-2424-3535",
        school: "東京理科大学",
        grade: "学部2年",
        gender: "male",
        skills: {
          pc: "intermediate",
          zoom: "beginner",
          english: "none",
          eventExperience: false
        },
        presentation: {
          hasPresentation: false,
          presentations: []
        },
        availableTimeSlots: allSlotIds.slice(4, 14),
        notes: ""
      })
    ];
  }
  function parseStaffFilter(query) {
    const filter = {};
    if (!query) return filter;
    const params = new URLSearchParams(query);
    const pc = params.get("pc");
    if (pc) {
      if (pc.endsWith("+")) {
        filter.pc = { level: pc.slice(0, -1), operator: ">=" };
      } else {
        filter.pc = { level: pc, operator: "=" };
      }
    }
    const zoom = params.get("zoom");
    if (zoom) {
      if (zoom.endsWith("+")) {
        filter.zoom = { level: zoom.slice(0, -1), operator: ">=" };
      } else {
        filter.zoom = { level: zoom, operator: "=" };
      }
    }
    if (params.get("english") === "yes") {
      filter.english = true;
    }
    if (params.get("eventExperience") === "yes") {
      filter.eventExperience = true;
    }
    const availableAt = params.get("availableAt");
    if (availableAt) {
      filter.availableAt = availableAt.split(",");
    }
    return filter;
  }
  function stringifyStaffFilter(filter) {
    const params = new URLSearchParams();
    if (filter.pc) {
      params.set("pc", filter.pc.level + (filter.pc.operator === ">=" ? "+" : ""));
    }
    if (filter.zoom) {
      params.set("zoom", filter.zoom.level + (filter.zoom.operator === ">=" ? "+" : ""));
    }
    if (filter.english) {
      params.set("english", "yes");
    }
    if (filter.eventExperience) {
      params.set("eventExperience", "yes");
    }
    if (filter.availableAt && filter.availableAt.length > 0) {
      params.set("availableAt", filter.availableAt.join(","));
    }
    const str = params.toString();
    return str ? `?${str}` : "";
  }
  const stringifyStaffFilterCriteria = stringifyStaffFilter;
  function matchesSkillFilter(staffLevel, filterLevel, operator) {
    if (operator === "=") {
      return staffLevel === filterLevel;
    }
    const staffNum = Role_係.skillLevelToNumber(staffLevel);
    const filterNum = Role_係.skillLevelToNumber(filterLevel);
    return staffNum >= filterNum;
  }
  function matchesFilter(staff, filter) {
    if (filter.pc && !matchesSkillFilter(staff.skills.pc, filter.pc.level, filter.pc.operator)) {
      return false;
    }
    if (filter.zoom && !matchesSkillFilter(staff.skills.zoom, filter.zoom.level, filter.zoom.operator)) {
      return false;
    }
    if (filter.english && staff.skills.english !== "daily_conversation") {
      return false;
    }
    if (filter.eventExperience && !staff.skills.eventExperience) {
      return false;
    }
    if (filter.availableAt && filter.availableAt.length > 0) {
      const allAvailable = filter.availableAt.every((slotId) => staff.isAvailableAt(slotId));
      if (!allAvailable) {
        return false;
      }
    }
    return true;
  }
  function describeFilter(filter) {
    const skillParts = [];
    let timeSlotsPart = "";
    if (filter.pc) {
      const levelLabel = Role_係.getSkillLevelLabel(filter.pc.level);
      const opLabel = filter.pc.operator === ">=" ? "以上" : "";
      skillParts.push(`PC${levelLabel}${opLabel}`);
    }
    if (filter.zoom) {
      const levelLabel = Role_係.getSkillLevelLabel(filter.zoom.level);
      const opLabel = filter.zoom.operator === ">=" ? "以上" : "";
      skillParts.push(`Zoom${levelLabel}${opLabel}`);
    }
    if (filter.english) {
      skillParts.push("英語可");
    }
    if (filter.eventExperience) {
      skillParts.push("経験あり");
    }
    if (filter.availableAt && filter.availableAt.length > 0) {
      const timeSlots2 = TimeSlot_時間帯.createDefaultTimeSlots();
      const slotLabels = filter.availableAt.map((slotId) => {
        const slot = timeSlots2.find((s) => s.id === slotId);
        if (!slot) return slotId;
        const date = new Date(slot.date);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const period = TimeSlot_時間帯.getPeriodLabel(slot.period);
        return `${month}/${day}${period}`;
      });
      timeSlotsPart = `${slotLabels.join("・")}参加可能`;
    }
    return { skills: skillParts.join("、"), timeSlots: timeSlotsPart };
  }
  const buildDetailUrl = (staffId) => `gakkai-shift/staffs/${staffId}`;
  const StaffCollection = ({ filter, onStaffSelect }) => {
    const dispatch = stateManagement.useAppDispatch();
    const staffList = stateManagement.useAppSelector(selectGakkaiShiftStaffList);
    const selectedStaffId = stateManagement.useAppSelector(selectGakkaiShiftSelectedStaffId);
    const { openBubble } = React$1.useContext(bubblesUi.BubblesContext);
    React$1.useEffect(() => {
      if (staffList.length === 0) {
        const sampleData = createSampleStaffList();
        dispatch(setStaffList(sampleData.map((s) => s.toJSON())));
      }
    }, [dispatch, staffList.length]);
    const filteredStaffList = React$1.useMemo(() => {
      if (!filter || Object.keys(filter).length === 0) {
        return staffList;
      }
      return staffList.filter((staff) => matchesFilter(staff, filter));
    }, [staffList, filter]);
    const handleStaffClick = (staffId) => {
      dispatch(setSelectedStaffId(staffId));
      onStaffSelect?.(staffId);
    };
    const hasFilter = filter && Object.keys(filter).length > 0;
    const filterDescription = hasFilter ? describeFilter(filter) : null;
    const handleOpenFilter = () => {
      const currentFilter = filter ? stringifyStaffFilterCriteria(filter) : "";
      openBubble(`gakkai-shift/staffs/filter${currentFilter}`, "root");
    };
    return /* @__PURE__ */ React.createElement(StyledContainer$6, null, /* @__PURE__ */ React.createElement("div", { className: "e-header" }, hasFilter && filterDescription ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "e-filter-description" }, filterDescription.skills && /* @__PURE__ */ React.createElement("p", null, "「", filterDescription.skills, "」"), filterDescription.timeSlots && /* @__PURE__ */ React.createElement("p", null, "「", filterDescription.timeSlots, "」"), /* @__PURE__ */ React.createElement("p", null, "な")), /* @__PURE__ */ React.createElement("h3", null, "スタッフ一覧", /* @__PURE__ */ React.createElement("span", { className: "e-filter-badge" }, "(", filteredStaffList.length, "/", staffList.length, "名)"))) : /* @__PURE__ */ React.createElement("h3", null, "スタッフ一覧 (", staffList.length, "名)")), /* @__PURE__ */ React.createElement("div", { className: "e-filter-section" }, /* @__PURE__ */ React.createElement(
      material.Button,
      {
        variant: "outlined",
        size: "small",
        startIcon: /* @__PURE__ */ React.createElement(FilterListIcon, null),
        onClick: handleOpenFilter,
        className: "e-filter-button"
      },
      "絞り込み検索"
    )), /* @__PURE__ */ React.createElement(
      StaffListView,
      {
        staffList: filteredStaffList,
        selectedStaffId,
        buildDetailUrl,
        onStaffClick: handleStaffClick,
        filteredSkills: hasFilter ? {
          pc: filter.pc,
          zoom: filter.zoom,
          english: filter.english,
          eventExperience: filter.eventExperience
        } : void 0
      }
    ));
  };
  const StyledContainer$6 = styled2.div`
  .e-header {
    margin-bottom: 8px;

    h3 {
      margin: 0;
    }

    .e-filter-description {
      margin: 0 0 4px 0;
      font-size: 0.85em;
      color: #1976d2;

      p {
        margin: 0;
      }
    }

    .e-filter-badge {
      font-weight: normal;
      color: #1976d2;
    }
  }

  .e-filter-section {
    margin-bottom: 12px;

    .e-filter-button {
      font-size: 0.85em;
      text-transform: none;
    }
  }
`;
  const StaffFilter = ({ initialFilter }) => {
    const { openBubble } = React$1.useContext(bubblesUi.BubblesContext);
    const timeSlots2 = TimeSlot_時間帯.createDefaultTimeSlots();
    const getInitialSkillFilters = () => {
      const selected = [];
      if (initialFilter?.pc) selected.push("pc");
      if (initialFilter?.zoom) selected.push("zoom");
      if (initialFilter?.english) selected.push("english");
      if (initialFilter?.eventExperience) selected.push("eventExperience");
      return selected;
    };
    const [selectedSkills, setSelectedSkills] = React$1.useState(getInitialSkillFilters);
    const [selectedTimeSlots, setSelectedTimeSlots] = React$1.useState(
      initialFilter?.availableAt ?? []
    );
    const handleSkillToggle = (_event, newSkills) => {
      setSelectedSkills(newSkills);
    };
    const handleTimeSlotToggle = (slotId) => {
      setSelectedTimeSlots(
        (prev) => prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
      );
    };
    const handleSelectDate = (date) => {
      const slotsForDate = timeSlots2.filter((s) => s.date === date).map((s) => s.id);
      const allSelected = slotsForDate.every((id) => selectedTimeSlots.includes(id));
      if (allSelected) {
        setSelectedTimeSlots((prev) => prev.filter((id) => !slotsForDate.includes(id)));
      } else {
        setSelectedTimeSlots((prev) => [.../* @__PURE__ */ new Set([...prev, ...slotsForDate])]);
      }
    };
    const handleSearch = () => {
      const filter = {};
      if (selectedSkills.includes("pc")) {
        filter.pc = { level: "intermediate", operator: ">=" };
      }
      if (selectedSkills.includes("zoom")) {
        filter.zoom = { level: "intermediate", operator: ">=" };
      }
      if (selectedSkills.includes("english")) {
        filter.english = true;
      }
      if (selectedSkills.includes("eventExperience")) {
        filter.eventExperience = true;
      }
      if (selectedTimeSlots.length > 0) {
        filter.availableAt = selectedTimeSlots;
      }
      const query = stringifyStaffFilter(filter);
      openBubble(`gakkai-shift/staffs${query}`, "root");
    };
    const hasSelection = selectedSkills.length > 0 || selectedTimeSlots.length > 0;
    const slotsByDate = timeSlots2.reduce((acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push(slot);
      return acc;
    }, {});
    const dates = Object.keys(slotsByDate).sort();
    const formatDate2 = (dateStr) => {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
      const weekday = weekdays[date.getDay()];
      return `${month}/${day}(${weekday})`;
    };
    return /* @__PURE__ */ React.createElement(StyledContainer$5, null, /* @__PURE__ */ React.createElement("h3", null, "スタッフ絞り込み検索"), /* @__PURE__ */ React.createElement("section", { className: "e-section" }, /* @__PURE__ */ React.createElement("h4", null, "スキル条件"), /* @__PURE__ */ React.createElement(
      material.ToggleButtonGroup,
      {
        value: selectedSkills,
        onChange: handleSkillToggle,
        size: "small",
        className: "e-skill-toggles"
      },
      /* @__PURE__ */ React.createElement(material.ToggleButton, { value: "pc" }, "PC中級+"),
      /* @__PURE__ */ React.createElement(material.ToggleButton, { value: "zoom" }, "Zoom中級+"),
      /* @__PURE__ */ React.createElement(material.ToggleButton, { value: "english" }, "英語可"),
      /* @__PURE__ */ React.createElement(material.ToggleButton, { value: "eventExperience" }, "経験あり")
    )), /* @__PURE__ */ React.createElement("section", { className: "e-section" }, /* @__PURE__ */ React.createElement("h4", null, "参加可能日程（AND条件）"), /* @__PURE__ */ React.createElement("p", { className: "e-hint" }, "選択した全ての時間帯に参加可能なスタッフを検索"), /* @__PURE__ */ React.createElement("div", { className: "e-timeslots" }, dates.map((date) => {
      const slots = slotsByDate[date];
      const allSelected = slots.every((s) => selectedTimeSlots.includes(s.id));
      const someSelected = slots.some((s) => selectedTimeSlots.includes(s.id));
      return /* @__PURE__ */ React.createElement("div", { key: date, className: "e-date-group" }, /* @__PURE__ */ React.createElement(
        material.FormControlLabel,
        {
          control: /* @__PURE__ */ React.createElement(
            material.Checkbox,
            {
              checked: allSelected,
              indeterminate: someSelected && !allSelected,
              onChange: () => handleSelectDate(date),
              size: "small"
            }
          ),
          label: /* @__PURE__ */ React.createElement("span", { className: "e-date-label" }, formatDate2(date)),
          className: "e-date-header"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "e-slots" }, slots.map((slot) => /* @__PURE__ */ React.createElement(
        material.FormControlLabel,
        {
          key: slot.id,
          control: /* @__PURE__ */ React.createElement(
            material.Checkbox,
            {
              checked: selectedTimeSlots.includes(slot.id),
              onChange: () => handleTimeSlotToggle(slot.id),
              size: "small"
            }
          ),
          label: /* @__PURE__ */ React.createElement("span", { className: slot.isOrientation ? "e-orientation" : "" }, TimeSlot_時間帯.getPeriodLabel(slot.period), slot.isOrientation && " (オリエン)"),
          className: "e-slot-item"
        }
      ))));
    }))), /* @__PURE__ */ React.createElement("div", { className: "e-actions" }, /* @__PURE__ */ React.createElement(
      material.Button,
      {
        variant: "contained",
        size: "large",
        startIcon: /* @__PURE__ */ React.createElement(SearchIcon, null),
        onClick: handleSearch,
        disabled: !hasSelection,
        fullWidth: true
      },
      "検索"
    )));
  };
  const StyledContainer$5 = styled2.div`
  padding: 16px;

  h3 {
    margin: 0 0 16px 0;
  }

  .e-section {
    margin-bottom: 20px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #333;
    }

    .e-hint {
      margin: 0 0 8px 0;
      font-size: 0.8em;
      color: #666;
    }
  }

  .e-skill-toggles {
    flex-wrap: wrap;

    .MuiToggleButton-root {
      font-size: 0.8em;
      padding: 6px 12px;
      text-transform: none;

      &.Mui-selected {
        background-color: #1976d2;
        color: white;

        &:hover {
          background-color: #1565c0;
        }
      }
    }
  }

  .e-timeslots {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-date-group {
    padding: 8px;
    background-color: #f5f5f5;
    border-radius: 4px;

    .e-date-header {
      margin: 0;

      .e-date-label {
        font-weight: bold;
        font-size: 0.9em;
      }
    }

    .e-slots {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-left: 24px;
      margin-top: 4px;
    }

    .e-slot-item {
      margin: 0;

      .MuiFormControlLabel-label {
        font-size: 0.8em;
      }

      .e-orientation {
        color: #e65100;
      }
    }
  }

  .e-actions {
    margin-top: 20px;

    button {
      text-transform: none;
      font-size: 1em;
    }
  }
`;
  const StaffDetailView = ({
    staff,
    buildAvailabilityUrl: buildAvailabilityUrl2,
    onOpenAvailability
  }) => {
    const availabilityUrl = buildAvailabilityUrl2?.(staff.id);
    return /* @__PURE__ */ React.createElement(StyledStaffDetail, null, /* @__PURE__ */ React.createElement("div", { className: "e-header" }, /* @__PURE__ */ React.createElement(PersonIcon, { className: "e-avatar" }), /* @__PURE__ */ React.createElement("div", { className: "e-title" }, /* @__PURE__ */ React.createElement(
      bubblesUi.ObjectView,
      {
        type: "Staff",
        url: `gakkai-shift/staffs/${staff.id}`,
        label: staff.name,
        draggable: true
      },
      /* @__PURE__ */ React.createElement("h3", { className: "e-name" }, staff.name)
    ), /* @__PURE__ */ React.createElement("div", { className: "e-furigana" }, staff.state.furigana)), /* @__PURE__ */ React.createElement(StatusBadge, { status: staff.status })), /* @__PURE__ */ React.createElement("section", { className: "e-section" }, /* @__PURE__ */ React.createElement("h4", null, "基本情報"), /* @__PURE__ */ React.createElement("dl", { className: "e-dl" }, /* @__PURE__ */ React.createElement("dt", null, "所属"), /* @__PURE__ */ React.createElement("dd", null, staff.state.school), /* @__PURE__ */ React.createElement("dt", null, "学年"), /* @__PURE__ */ React.createElement("dd", null, staff.state.grade), /* @__PURE__ */ React.createElement("dt", null, "性別"), /* @__PURE__ */ React.createElement("dd", null, Staff_スタッフ.getGenderLabel(staff.gender)), /* @__PURE__ */ React.createElement("dt", null, "メール"), /* @__PURE__ */ React.createElement("dd", null, staff.email), /* @__PURE__ */ React.createElement("dt", null, "電話"), /* @__PURE__ */ React.createElement("dd", null, staff.state.phone))), /* @__PURE__ */ React.createElement("section", { className: "e-section" }, /* @__PURE__ */ React.createElement("h4", null, "スキル"), /* @__PURE__ */ React.createElement("dl", { className: "e-dl" }, /* @__PURE__ */ React.createElement("dt", null, "PC"), /* @__PURE__ */ React.createElement("dd", null, Role_係.getSkillLevelLabel(staff.skills.pc)), /* @__PURE__ */ React.createElement("dt", null, "Zoom"), /* @__PURE__ */ React.createElement("dd", null, Role_係.getSkillLevelLabel(staff.skills.zoom)), /* @__PURE__ */ React.createElement("dt", null, "英語"), /* @__PURE__ */ React.createElement("dd", null, staff.skills.english === "daily_conversation" ? "日常会話可" : "なし"), /* @__PURE__ */ React.createElement("dt", null, "イベント経験"), /* @__PURE__ */ React.createElement("dd", null, staff.skills.eventExperience ? "あり" : "なし", staff.skills.eventExperienceDetail && /* @__PURE__ */ React.createElement("span", { className: "e-detail" }, " (", staff.skills.eventExperienceDetail, ")")))), /* @__PURE__ */ React.createElement("section", { className: "e-section" }, /* @__PURE__ */ React.createElement("h4", null, "参加可能時間帯"), /* @__PURE__ */ React.createElement("div", { className: "e-slots" }, staff.availableTimeSlots.length === 0 ? /* @__PURE__ */ React.createElement("span", { className: "e-empty" }, "なし") : availabilityUrl ? /* @__PURE__ */ React.createElement(
      bubblesUi.ObjectView,
      {
        type: "StaffAvailability",
        url: availabilityUrl,
        label: `${staff.name}の参加可能時間帯`,
        draggable: true,
        onClick: () => onOpenAvailability?.(staff.id)
      },
      /* @__PURE__ */ React.createElement(
        material.Button,
        {
          variant: "text",
          size: "small",
          component: "span"
        },
        staff.availableTimeSlots.length,
        "枠 (詳細を見る)"
      )
    ) : /* @__PURE__ */ React.createElement("span", null, staff.availableTimeSlots.length, "枠"))), staff.presentation.hasPresentation && /* @__PURE__ */ React.createElement("section", { className: "e-section" }, /* @__PURE__ */ React.createElement("h4", null, "発表予定"), /* @__PURE__ */ React.createElement("ul", { className: "e-presentations" }, staff.presentation.presentations.map((p, i) => /* @__PURE__ */ React.createElement("li", { key: i }, p.date, " ", p.period)))), staff.aptitudeScore !== void 0 && /* @__PURE__ */ React.createElement("section", { className: "e-section" }, /* @__PURE__ */ React.createElement("h4", null, "適性スコア"), /* @__PURE__ */ React.createElement("div", { className: "e-score" }, staff.aptitudeScore, "点")), staff.state.notes && /* @__PURE__ */ React.createElement("section", { className: "e-section" }, /* @__PURE__ */ React.createElement("h4", null, "備考"), /* @__PURE__ */ React.createElement("p", { className: "e-notes" }, staff.state.notes)));
  };
  const StatusBadge = ({ status }) => {
    const label = Staff_スタッフ.getStatusLabel(status);
    return /* @__PURE__ */ React.createElement("span", { className: `e-badge e-badge--${status}` }, label);
  };
  const StyledStaffDetail = styled2.div`
  padding: 16px;

  .e-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
  }

  .e-avatar {
    font-size: 48px;
    color: #666;
  }

  .e-title {
    flex: 1;
  }

  .e-name {
    margin: 0;
    font-size: 1.25em;
  }

  .e-furigana {
    color: #666;
    font-size: 0.85em;
  }

  .e-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.85em;
    font-weight: bold;

    &.e-badge--pending {
      background-color: #fff3e0;
      color: #e65100;
    }

    &.e-badge--accepted {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    &.e-badge--waitlist {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    &.e-badge--rejected {
      background-color: #fce4ec;
      color: #c62828;
    }
  }

  .e-section {
    margin-bottom: 16px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 0.9em;
      color: #666;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
  }

  .e-dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 0;

    dt {
      color: #666;
      font-size: 0.9em;
    }

    dd {
      margin: 0;
    }
  }

  .e-detail {
    color: #666;
    font-size: 0.9em;
  }

  .e-slots, .e-score {
    font-weight: bold;
  }

  .e-empty {
    color: #999;
  }

  .e-presentations {
    margin: 0;
    padding-left: 20px;
  }

  .e-notes {
    margin: 0;
    white-space: pre-wrap;
    color: #333;
  }
`;
  const buildAvailabilityUrl = (staffId) => `gakkai-shift/staffs/${staffId}/availableTimeSlots`;
  const StaffDetail = ({ staffId, onOpenAvailability }) => {
    const selectedStaff = stateManagement.useAppSelector(selectGakkaiShiftSelectedStaff);
    const specificStaff = stateManagement.useAppSelector(
      staffId ? selectGakkaiShiftStaffById(staffId) : () => void 0
    );
    const staff = staffId ? specificStaff : selectedStaff;
    if (!staff) {
      return /* @__PURE__ */ React.createElement("div", { style: { padding: 16, color: "#666" } }, "スタッフを選択してください");
    }
    return /* @__PURE__ */ React.createElement(
      StaffDetailView,
      {
        staff,
        buildAvailabilityUrl,
        onOpenAvailability
      }
    );
  };
  const StaffAvailabilityView = ({
    staff,
    timeSlots: timeSlots2
  }) => {
    const slotsByDate = timeSlots2.reduce((acc, slot) => {
      const date = slot.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(slot);
      return acc;
    }, {});
    const dates = Object.keys(slotsByDate).sort();
    return /* @__PURE__ */ React.createElement(StyledContainer$4, null, /* @__PURE__ */ React.createElement(
      bubblesUi.ObjectView,
      {
        type: "Staff",
        url: `gakkai-shift/staffs/${staff.id}`,
        label: staff.name,
        draggable: true
      },
      /* @__PURE__ */ React.createElement("h3", null, staff.name)
    ), /* @__PURE__ */ React.createElement("p", { className: "e-subtitle" }, staff.state.school, " / ", staff.state.grade), /* @__PURE__ */ React.createElement("div", { className: "e-summary" }, "参加可能: ", /* @__PURE__ */ React.createElement("strong", null, staff.availableTimeSlots.length), " / ", timeSlots2.length, " 枠"), /* @__PURE__ */ React.createElement("table", { className: "e-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "日付"), /* @__PURE__ */ React.createElement("th", null, "時間帯"), /* @__PURE__ */ React.createElement("th", null, "時間"), /* @__PURE__ */ React.createElement("th", null, "参加可否"))), /* @__PURE__ */ React.createElement("tbody", null, dates.map(
      (date) => slotsByDate[date].map((slot, idx) => /* @__PURE__ */ React.createElement("tr", { key: slot.id, className: staff.isAvailableAt(slot.id) ? "is-available" : "is-unavailable" }, idx === 0 && /* @__PURE__ */ React.createElement("td", { rowSpan: slotsByDate[date].length, className: "e-date" }, formatDate$1(date)), /* @__PURE__ */ React.createElement("td", { className: "e-period" }, slot.label.split(" ")[1], slot.isOrientation && /* @__PURE__ */ React.createElement("span", { className: "e-orientation" }, "オリエン")), /* @__PURE__ */ React.createElement("td", { className: "e-time" }, slot.state.startTime, " - ", slot.state.endTime), /* @__PURE__ */ React.createElement("td", { className: "e-status" }, staff.isAvailableAt(slot.id) ? /* @__PURE__ */ React.createElement("span", { className: "e-ok" }, /* @__PURE__ */ React.createElement(CheckIcon, { fontSize: "small" }), " 可能") : /* @__PURE__ */ React.createElement("span", { className: "e-ng" }, /* @__PURE__ */ React.createElement(CloseIcon, { fontSize: "small" }), " 不可"))))
    ))));
  };
  const formatDate$1 = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  };
  const StyledContainer$4 = styled2.div`
  h3 {
    margin: 0 0 4px 0;
  }

  .e-subtitle {
    margin: 0 0 12px 0;
    color: #666;
    font-size: 0.9em;
  }

  .e-summary {
    margin-bottom: 16px;
    padding: 8px 12px;
    background-color: #f5f5f5;
    border-radius: 4px;
    font-size: 0.9em;
  }

  .e-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;

    th, td {
      padding: 8px;
      border: 1px solid #ddd;
      text-align: left;
    }

    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }

    .e-date {
      font-weight: bold;
      background-color: #fafafa;
      vertical-align: top;
    }

    .e-period {
      white-space: nowrap;
    }

    .e-orientation {
      margin-left: 4px;
      padding: 2px 4px;
      background-color: #fff3e0;
      color: #e65100;
      font-size: 0.75em;
      border-radius: 2px;
    }

    .e-time {
      color: #666;
      white-space: nowrap;
    }

    .e-status {
      text-align: center;
    }

    .e-ok {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: #2e7d32;
    }

    .e-ng {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: #c62828;
    }

    tr.is-available {
      background-color: #e8f5e9;
    }

    tr.is-unavailable {
      background-color: #ffebee;
    }
  }
`;
  const StaffAvailability = ({ staffId }) => {
    const staffList = stateManagement.useAppSelector(selectGakkaiShiftStaffList);
    const staff = staffList.find((s) => s.id === staffId);
    const timeSlots2 = React$1.useMemo(() => TimeSlot_時間帯.createDefaultTimeSlots(), []);
    if (!staff) {
      return /* @__PURE__ */ React.createElement("div", null, "スタッフが見つかりません");
    }
    return /* @__PURE__ */ React.createElement(StaffAvailabilityView, { staff, timeSlots: timeSlots2 });
  };
  const ShiftPlanTableView = ({
    timeSlots: timeSlots2,
    roles,
    assignments,
    staffList,
    violations = [],
    buildAssignmentUrl,
    buildCellUrl,
    onDropStaff,
    onRemoveAssignment,
    onMoveAssignment,
    onAssignmentClick,
    onCellClick
  }) => {
    const getStaffName = (staffId) => {
      const staff = staffList.find((s) => s.id === staffId);
      return staff?.name ?? "不明";
    };
    const getStaff = (staffId) => {
      return staffList.find((s) => s.id === staffId);
    };
    const getAssignmentsForCell = (timeSlotId, roleId) => {
      return assignments.filter(
        (a) => a.timeSlotId === timeSlotId && a.roleId === roleId
      );
    };
    const getViolationForAssignment = (assignmentId) => {
      return violations.find((v) => v.assignmentIds.includes(assignmentId));
    };
    const calculateCellScore = (timeSlotId, roleId) => {
      const cellAssignments = getAssignmentsForCell(timeSlotId, roleId);
      const role = roles.find((r) => r.id === roleId);
      const timeSlot = timeSlots2.find((t) => t.id === timeSlotId);
      if (!role || !timeSlot) return 0;
      let score = 0;
      for (const assignment of cellAssignments) {
        const staff = getStaff(assignment.staffId);
        if (staff) {
          const evaluation = StaffAssignmentEvaluation_スタッフ配置評価.evaluateCandidate(
            staff,
            role,
            timeSlot
          );
          score += evaluation.totalScore;
        }
      }
      return score;
    };
    const handleDragOver = (e) => {
      const types = Array.from(e.dataTransfer.types);
      const staffDragType = bubblesUi.getDragType("Staff");
      const isInternalMove = types.includes("text/staff-id");
      const isStaffDrag = types.includes(staffDragType);
      console.log("[DragOver] types:", types, "staffDragType:", staffDragType, "isInternalMove:", isInternalMove, "isStaffDrag:", isStaffDrag);
      if (isInternalMove || isStaffDrag) {
        e.preventDefault();
        e.currentTarget.classList.add("is-drag-over");
      }
    };
    const handleDragLeave = (e) => {
      e.currentTarget.classList.remove("is-drag-over");
    };
    const handleDrop = (e, timeSlotId, roleId) => {
      e.preventDefault();
      e.currentTarget.classList.remove("is-drag-over");
      const types = Array.from(e.dataTransfer.types);
      console.log("[Drop] types:", types);
      const internalStaffId = e.dataTransfer.getData("text/staff-id");
      const assignmentId = e.dataTransfer.getData("text/assignment-id");
      console.log("[Drop] internalStaffId:", internalStaffId, "assignmentId:", assignmentId);
      if (assignmentId && internalStaffId && onMoveAssignment) {
        onMoveAssignment(assignmentId, internalStaffId, timeSlotId, roleId);
        return;
      }
      if (internalStaffId && !assignmentId && onDropStaff) {
        console.log("[Drop] internal new assignment, staffId:", internalStaffId);
        onDropStaff(internalStaffId, timeSlotId, roleId);
        return;
      }
      const staffDragType = bubblesUi.getDragType("Staff");
      if (types.includes(staffDragType)) {
        const url = e.dataTransfer.getData(staffDragType) || e.dataTransfer.getData(bubblesUi.DRAG_KEYS.url);
        console.log("[Drop] staffDragType found, url:", url);
        const match = url.match(/gakkai-shift\/staffs?\/([^/]+)/);
        console.log("[Drop] match:", match);
        if (match && onDropStaff) {
          const staffId = match[1];
          console.log("[Drop] calling onDropStaff with staffId:", staffId);
          onDropStaff(staffId, timeSlotId, roleId);
        }
      }
    };
    const handleChipDragStart = (e, assignmentId, staffId) => {
      e.dataTransfer.setData("text/staff-id", staffId);
      e.dataTransfer.setData("text/assignment-id", assignmentId);
      e.dataTransfer.effectAllowed = "move";
    };
    const slotsByDate = timeSlots2.reduce((acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push(slot);
      return acc;
    }, {});
    const dates = Object.keys(slotsByDate).sort();
    return /* @__PURE__ */ React.createElement(StyledTable$1, null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "e-date-header" }, "日付"), /* @__PURE__ */ React.createElement("th", { className: "e-slot-header" }, "時間帯"), roles.map((role) => /* @__PURE__ */ React.createElement("th", { key: role.id, className: "e-role-header" }, /* @__PURE__ */ React.createElement("div", { className: "e-role-name" }, role.name), /* @__PURE__ */ React.createElement("div", { className: "e-role-fixedness" }, Role_係.getFixednessLabel(role.fixedness)))))), /* @__PURE__ */ React.createElement("tbody", null, dates.map(
      (date) => slotsByDate[date].map((slot, slotIdx) => /* @__PURE__ */ React.createElement("tr", { key: slot.id }, slotIdx === 0 && /* @__PURE__ */ React.createElement("td", { rowSpan: slotsByDate[date].length, className: "e-date-cell" }, formatDate(date)), /* @__PURE__ */ React.createElement("td", { className: "e-slot-cell" }, /* @__PURE__ */ React.createElement("div", { className: "e-slot-label" }, slot.label.split(" ")[1]), /* @__PURE__ */ React.createElement("div", { className: "e-slot-time" }, slot.state.startTime, " - ", slot.state.endTime)), roles.map((role) => {
        const cellAssignments = getAssignmentsForCell(slot.id, role.id);
        const score = calculateCellScore(slot.id, role.id);
        const requirement = slot.getRequirementForRole(role.id);
        const requiredCount = requirement?.requiredCount ?? 0;
        const assignedCount = cellAssignments.length;
        const hasRequirement = requiredCount > 0;
        const isFilled = assignedCount >= requiredCount;
        const isShortage = hasRequirement && assignedCount < (requirement?.minCount ?? requiredCount);
        const isExcess = hasRequirement && assignedCount > (requirement?.maxCount ?? requiredCount);
        const emptySlotCount = Math.max(0, requiredCount - assignedCount);
        const cellUrl = buildCellUrl?.(slot.id, role.id);
        return /* @__PURE__ */ React.createElement(
          "td",
          {
            key: `${slot.id}_${role.id}`,
            className: `e-assignment-cell ${!hasRequirement ? "no-requirement" : ""}`,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: (e) => handleDrop(e, slot.id, role.id)
          },
          /* @__PURE__ */ React.createElement("div", { className: "e-cell-content" }, hasRequirement && /* @__PURE__ */ React.createElement("div", { className: `e-requirement ${isFilled ? "is-filled" : ""} ${isShortage ? "is-shortage" : ""} ${isExcess ? "is-excess" : ""}` }, assignedCount, "/", requiredCount), cellAssignments.map((assignment) => {
            const staff = getStaff(assignment.staffId);
            const isAvailable = staff?.isAvailableAt(slot.id) ?? false;
            const violation = getViolationForAssignment(assignment.id);
            const hasViolation = !!violation;
            const assignmentUrl = buildAssignmentUrl?.(assignment.id) ?? `gakkai-shift/assignments/${assignment.id}`;
            const staffName = getStaffName(assignment.staffId);
            return /* @__PURE__ */ React.createElement(
              bubblesUi.ObjectView,
              {
                key: assignment.id,
                type: "ShiftAssignment",
                url: assignmentUrl,
                label: staffName,
                draggable: false,
                onClick: () => onAssignmentClick?.(assignment.id)
              },
              /* @__PURE__ */ React.createElement(
                "div",
                {
                  className: `e-staff-chip ${isAvailable ? "is-available" : "is-unavailable"} ${hasViolation ? "has-violation" : ""}`,
                  draggable: true,
                  onDragStart: (e) => handleChipDragStart(e, assignment.id, assignment.staffId)
                },
                hasViolation && /* @__PURE__ */ React.createElement(material.Tooltip, { title: violation.message, arrow: true }, /* @__PURE__ */ React.createElement(WarningIcon, { className: "e-violation-icon", fontSize: "inherit" })),
                /* @__PURE__ */ React.createElement("span", { className: "e-staff-name" }, /* @__PURE__ */ React.createElement(PersonIcon, { fontSize: "inherit" }), staffName),
                /* @__PURE__ */ React.createElement(
                  material.IconButton,
                  {
                    size: "small",
                    className: "e-remove-btn",
                    onClick: (e) => {
                      e.stopPropagation();
                      onRemoveAssignment?.(assignment.id);
                    }
                  },
                  /* @__PURE__ */ React.createElement(CloseIcon, { fontSize: "inherit" })
                )
              )
            );
          }), hasRequirement && /* @__PURE__ */ React.createElement(
            "div",
            {
              className: `e-empty-slot ${emptySlotCount === 0 ? "is-full" : ""}`,
              "data-url": cellUrl,
              onClick: () => onCellClick?.(slot.id, role.id)
            },
            /* @__PURE__ */ React.createElement("span", { className: "e-empty-label" }, emptySlotCount > 0 ? `+ ${emptySlotCount}名追加` : "+ 追加")
          ), cellAssignments.length > 0 && /* @__PURE__ */ React.createElement("div", { className: `e-score ${score >= 0 ? "is-positive" : "is-negative"}` }, score > 0 ? "+" : "", score, "pt"))
        );
      })))
    )));
  };
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  };
  const StyledTable$1 = styled2.table`
  border-collapse: collapse;
  font-size: 0.85em;
  width: 100%;

  th,
  td {
    border: 1px solid #ddd;
    padding: 4px 6px;
    vertical-align: top;
  }

  th {
    background-color: #f5f5f5;
    font-weight: bold;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .e-date-header,
  .e-slot-header {
    width: 80px;
    min-width: 80px;
  }

  .e-role-header {
    min-width: 100px;

    .e-role-name {
      font-size: 0.9em;
    }

    .e-role-fixedness {
      font-size: 0.7em;
      color: #888;
      font-weight: normal;
    }
  }

  .e-date-cell {
    font-weight: bold;
    background-color: #fafafa;
    text-align: center;
    vertical-align: middle;
  }

  .e-slot-cell {
    text-align: center;

    .e-slot-label {
      font-weight: bold;
    }

    .e-slot-time {
      font-size: 0.8em;
      color: #666;
    }
  }

  .e-assignment-cell {
    min-height: 60px;
    transition: background-color 0.15s;

    &.is-drag-over {
      background-color: #e3f2fd;
    }

    &.no-requirement {
      background-color: #fafafa;
    }
  }

  .e-cell-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-empty-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    border: 1px dashed #ccc;
    border-radius: 4px;
    background-color: #fafafa;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;

    &:hover {
      background-color: #e3f2fd;
      border-color: #1976d2;
    }

    .e-empty-label {
      font-size: 0.8em;
      color: #888;
    }

    &:hover .e-empty-label {
      color: #1976d2;
    }

    &.is-full {
      border-style: dotted;
      background-color: transparent;
      padding: 2px 6px;

      .e-empty-label {
        font-size: 0.7em;
        color: #aaa;
      }
    }
  }

  .e-requirement {
    font-size: 0.65em;
    color: #999;
    text-align: right;
    font-weight: 500;
    line-height: 1;

    &.is-filled {
      color: #4caf50;
    }

    &.is-shortage {
      color: #f44336;
      font-weight: bold;
    }

    &.is-excess {
      color: #ff9800;
    }
  }

  .e-staff-chip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 0.85em;
    cursor: grab;
    transition: opacity 0.15s, box-shadow 0.15s;

    &:active {
      cursor: grabbing;
    }

    &[draggable="true"]:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }

    &.is-available {
      background-color: #e8f5e9;
      border: 1px solid #a5d6a7;
    }

    &.is-unavailable {
      background-color: #ffebee;
      border: 1px solid #ef9a9a;
    }

    &.has-violation {
      border: 2px solid #ff9800;
      background-color: #fff3e0;
      animation: violation-pulse 1.5s ease-in-out infinite;
    }

    .e-violation-icon {
      color: #ff9800;
      margin-right: 2px;
      font-size: 1em;
    }

    .e-staff-name {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .e-remove-btn {
      padding: 0;
      font-size: 0.9em;
    }
  }

  .e-score {
    font-size: 0.75em;
    text-align: right;
    font-weight: bold;

    &.is-positive {
      color: #2e7d32;
    }

    &.is-negative {
      color: #c62828;
    }
  }

  @keyframes violation-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.2);
    }
  }
`;
  const ShiftPlanEditor = ({
    shiftPlanId,
    onAssignmentClick,
    onCellClick,
    onStaffViewClick,
    buildCellUrl
  }) => {
    const dispatch = stateManagement.useAppDispatch();
    const staffList = stateManagement.useAppSelector(selectGakkaiShiftStaffList);
    const shiftPlan = stateManagement.useAppSelector(selectShiftPlanById(shiftPlanId));
    const timeSlots2 = React$1.useMemo(() => TimeSlot_時間帯.createDefaultTimeSlots(), []);
    const roles = React$1.useMemo(() => Role_係.createDefaultRoles(), []);
    const violations = React$1.useMemo(() => {
      if (!shiftPlan) return [];
      return shiftPlan.constraintViolations;
    }, [shiftPlan]);
    React$1.useEffect(() => {
      if (staffList.length === 0) {
        const sampleData = createSampleStaffList();
        dispatch(setStaffList(sampleData.map((s) => s.toJSON())));
      }
    }, [dispatch, staffList.length]);
    React$1.useEffect(() => {
      if (!shiftPlan) {
        const newPlan = ShiftPlan_シフト案.create("シフト案1");
        const planWithId = {
          ...newPlan.state,
          id: shiftPlanId
        };
        dispatch(addShiftPlan(planWithId));
      }
    }, [dispatch, shiftPlan, shiftPlanId]);
    const handleDropStaff = (staffId, timeSlotId, roleId) => {
      if (!shiftPlan) return;
      const existingAssignment = shiftPlan.assignments.find(
        (a) => a.staffId === staffId && a.timeSlotId === timeSlotId && a.roleId === roleId
      );
      if (existingAssignment) return;
      const assignment = ShiftAssignment_シフト配置.create(
        staffId,
        timeSlotId,
        roleId,
        false
        // 手動配置
      );
      const updatedPlan = shiftPlan.addAssignment(assignment);
      dispatch(updateShiftPlan(updatedPlan.state));
    };
    const handleRemoveAssignment = (assignmentId) => {
      if (!shiftPlan) return;
      const updatedPlan = shiftPlan.removeAssignment(assignmentId);
      dispatch(updateShiftPlan(updatedPlan.state));
    };
    const handleMoveAssignment = (assignmentId, staffId, timeSlotId, roleId) => {
      if (!shiftPlan) return;
      const existingAssignment = shiftPlan.assignments.find(
        (a) => a.staffId === staffId && a.timeSlotId === timeSlotId && a.roleId === roleId
      );
      if (existingAssignment) return;
      const planAfterRemove = shiftPlan.removeAssignment(assignmentId);
      const assignment = ShiftAssignment_シフト配置.create(
        staffId,
        timeSlotId,
        roleId,
        false
      );
      const updatedPlan = planAfterRemove.addAssignment(assignment);
      dispatch(updateShiftPlan(updatedPlan.state));
    };
    const handleAutoAssign = () => {
      if (!shiftPlan) return;
      const result = ShiftMatcher_シフトマッチング.autoAssign(
        staffList,
        roles,
        timeSlots2,
        shiftPlan.state.assignments,
        // 既存配置を維持
        { preserveExistingAssignments: true }
      );
      const existingIds = new Set(shiftPlan.assignments.map((a) => a.id));
      const newAssignments = result.assignments.filter(
        (a) => !existingIds.has(a.id)
      );
      let updatedPlan = shiftPlan;
      for (const assignmentState of newAssignments) {
        const assignment = new ShiftAssignment_シフト配置(assignmentState);
        updatedPlan = updatedPlan.addAssignment(assignment);
      }
      dispatch(updateShiftPlan(updatedPlan.state));
      console.log("[AutoAssign] Result:", result.stats);
    };
    if (!shiftPlan) {
      return /* @__PURE__ */ React.createElement("div", null, "読み込み中...");
    }
    return /* @__PURE__ */ React.createElement(StyledContainer$3, null, /* @__PURE__ */ React.createElement("div", { className: "e-header" }, /* @__PURE__ */ React.createElement("h3", null, shiftPlan.name), /* @__PURE__ */ React.createElement("div", { className: "e-stats" }, /* @__PURE__ */ React.createElement(
      material.Button,
      {
        variant: "contained",
        size: "small",
        startIcon: /* @__PURE__ */ React.createElement(AutoFixHighIcon, null),
        onClick: handleAutoAssign,
        sx: { mr: 1 }
      },
      "自動シフト配置"
    ), /* @__PURE__ */ React.createElement(bubblesUi.UrledPlace, { url: `gakkai-shift/shift-plans/${shiftPlanId}/staff-view` }, /* @__PURE__ */ React.createElement(
      material.Button,
      {
        variant: "outlined",
        size: "small",
        startIcon: /* @__PURE__ */ React.createElement(PeopleIcon, null),
        onClick: onStaffViewClick,
        sx: { mr: 2 }
      },
      "スタッフ別表示"
    )), "配置数: ", shiftPlan.assignments.length, "件", violations.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "e-violation-warning" }, /* @__PURE__ */ React.createElement(WarningIcon, { fontSize: "small" }), "制約違反: ", violations.length, "件"))), /* @__PURE__ */ React.createElement("div", { className: "e-main" }, /* @__PURE__ */ React.createElement("div", { className: "e-table-panel" }, /* @__PURE__ */ React.createElement(
      ShiftPlanTableView,
      {
        timeSlots: timeSlots2,
        roles,
        assignments: shiftPlan.assignments,
        staffList,
        violations,
        buildAssignmentUrl: (assignmentId) => `gakkai-shift/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`,
        buildCellUrl,
        onDropStaff: handleDropStaff,
        onRemoveAssignment: handleRemoveAssignment,
        onMoveAssignment: handleMoveAssignment,
        onAssignmentClick,
        onCellClick
      }
    ))));
  };
  const StyledContainer$3 = styled2.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;

    h3 {
      margin: 0;
    }

    .e-stats {
      color: #666;
      font-size: 0.9em;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .e-violation-warning {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #ff9800;
      font-weight: bold;
      background-color: #fff3e0;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #ff9800;
    }
  }

  .e-main {
    flex: 1;
    overflow: hidden;
  }

  .e-table-panel {
    height: 100%;
    overflow: auto;
    padding: 8px;
  }
`;
  const ShiftPlanManager = ({
    onAssignmentClick,
    onCellClick,
    buildCellUrl,
    onStaffViewClick
  }) => {
    const dispatch = stateManagement.useAppDispatch();
    const shiftPlans = stateManagement.useAppSelector(selectShiftPlans);
    const staffList = stateManagement.useAppSelector(selectGakkaiShiftStaffList);
    const [selectedPlanId, setSelectedPlanId] = React$1.useState(null);
    React$1.useEffect(() => {
      if (staffList.length === 0) {
        const sampleData = createSampleStaffList();
        dispatch(setStaffList(sampleData.map((s) => s.toJSON())));
      }
    }, [dispatch, staffList.length]);
    React$1.useEffect(() => {
      if (shiftPlans.length === 0) {
        const newPlan = ShiftPlan_シフト案.create("シフト案1");
        dispatch(addShiftPlan(newPlan.state));
        setSelectedPlanId(newPlan.id);
      } else if (!selectedPlanId || !shiftPlans.find((p) => p.id === selectedPlanId)) {
        setSelectedPlanId(shiftPlans[0].id);
      }
    }, [dispatch, shiftPlans, selectedPlanId]);
    const handleAddPlan = () => {
      const planNumber = shiftPlans.length + 1;
      const newPlan = ShiftPlan_シフト案.create(`シフト案${planNumber}`);
      dispatch(addShiftPlan(newPlan.state));
      setSelectedPlanId(newPlan.id);
    };
    const handleCopyPlan = (planId) => {
      const sourcePlan = shiftPlans.find((p) => p.id === planId);
      if (!sourcePlan) return;
      const newPlan = ShiftPlan_シフト案.create(`${sourcePlan.name}のコピー`);
      const copiedState = {
        ...newPlan.state,
        assignments: sourcePlan.state.assignments.map((a) => ({
          ...a,
          id: crypto.randomUUID()
          // 新しいIDを割り当て
        }))
      };
      dispatch(addShiftPlan(copiedState));
      setSelectedPlanId(newPlan.id);
    };
    const handleDeletePlan = (planId) => {
      if (shiftPlans.length <= 1) return;
      dispatch(deleteShiftPlan(planId));
      if (selectedPlanId === planId) {
        const remaining = shiftPlans.filter((p) => p.id !== planId);
        setSelectedPlanId(remaining[0]?.id ?? null);
      }
    };
    const selectedPlan = shiftPlans.find((p) => p.id === selectedPlanId);
    return /* @__PURE__ */ React.createElement(StyledContainer$2, null, /* @__PURE__ */ React.createElement("div", { className: "e-tab-bar" }, /* @__PURE__ */ React.createElement("div", { className: "e-tabs" }, shiftPlans.map((plan) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: plan.id,
        className: `e-tab ${plan.id === selectedPlanId ? "is-selected" : ""}`,
        onClick: () => setSelectedPlanId(plan.id)
      },
      /* @__PURE__ */ React.createElement("span", { className: "e-tab-name" }, plan.name),
      /* @__PURE__ */ React.createElement("span", { className: "e-tab-count" }, plan.assignments.length, "件"),
      /* @__PURE__ */ React.createElement(material.Tooltip, { title: "コピー", arrow: true }, /* @__PURE__ */ React.createElement(
        material.IconButton,
        {
          size: "small",
          className: "e-tab-action",
          onClick: (e) => {
            e.stopPropagation();
            handleCopyPlan(plan.id);
          }
        },
        /* @__PURE__ */ React.createElement(ContentCopyIcon, { fontSize: "inherit" })
      )),
      shiftPlans.length > 1 && /* @__PURE__ */ React.createElement(material.Tooltip, { title: "削除", arrow: true }, /* @__PURE__ */ React.createElement(
        material.IconButton,
        {
          size: "small",
          className: "e-tab-action e-delete-action",
          onClick: (e) => {
            e.stopPropagation();
            handleDeletePlan(plan.id);
          }
        },
        /* @__PURE__ */ React.createElement(DeleteIcon, { fontSize: "inherit" })
      ))
    ))), /* @__PURE__ */ React.createElement(material.Tooltip, { title: "新しいシフト案を追加", arrow: true }, /* @__PURE__ */ React.createElement(
      material.IconButton,
      {
        size: "small",
        className: "e-add-btn",
        onClick: handleAddPlan
      },
      /* @__PURE__ */ React.createElement(AddIcon, null)
    ))), /* @__PURE__ */ React.createElement("div", { className: "e-content" }, selectedPlan ? /* @__PURE__ */ React.createElement(
      ShiftPlanEditor,
      {
        key: selectedPlan.id,
        shiftPlanId: selectedPlan.id,
        onAssignmentClick: (assignmentId) => onAssignmentClick?.(selectedPlan.id, assignmentId),
        onCellClick,
        buildCellUrl,
        onStaffViewClick: () => onStaffViewClick?.(selectedPlan.id)
      }
    ) : /* @__PURE__ */ React.createElement("div", { className: "e-empty" }, "シフト案を選択してください")));
  };
  const StyledContainer$2 = styled2.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-tab-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background-color: #f0f0f0;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
  }

  .e-tabs {
    display: flex;
    gap: 4px;
    flex: 1;
    overflow-x: auto;
  }

  .e-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: #e0e0e0;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    transition: background-color 0.15s;
    white-space: nowrap;

    &:hover {
      background-color: #d0d0d0;
    }

    &.is-selected {
      background-color: #fff;
      border: 1px solid #ddd;
      border-bottom: 1px solid #fff;
      margin-bottom: -1px;
    }

    .e-tab-name {
      font-weight: bold;
      font-size: 0.9em;
    }

    .e-tab-count {
      font-size: 0.75em;
      color: #666;
      background-color: rgba(0, 0, 0, 0.1);
      padding: 1px 6px;
      border-radius: 10px;
    }

    .e-tab-action {
      opacity: 0;
      transition: opacity 0.15s;
      padding: 2px;
      font-size: 0.85em;
    }

    .e-delete-action {
      color: #d32f2f;

      &:hover {
        background-color: rgba(211, 47, 47, 0.1);
      }
    }

    &:hover .e-tab-action {
      opacity: 1;
    }
  }

  .e-add-btn {
    background-color: #1976d2;
    color: white;

    &:hover {
      background-color: #1565c0;
    }
  }

  .e-content {
    flex: 1;
    overflow: hidden;
  }

  .e-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
  }
`;
  const AssignmentEvaluationView = ({
    evaluation,
    staffName,
    timeSlotLabel,
    roleName,
    constraintViolations = [],
    staffDetailUrl,
    staffAvailabilityUrl,
    onStaffClick,
    onTimeSlotClick
  }) => {
    const status = evaluation.getOverallStatus();
    return /* @__PURE__ */ React.createElement(StyledContainer$1, null, /* @__PURE__ */ React.createElement("div", { className: "e-header" }, /* @__PURE__ */ React.createElement("div", { className: "e-assignment-visual" }, /* @__PURE__ */ React.createElement("div", { className: "e-cell" }, /* @__PURE__ */ React.createElement("div", { className: "e-cell-primary" }, staffAvailabilityUrl ? /* @__PURE__ */ React.createElement(
      bubblesUi.ObjectView,
      {
        type: "StaffAvailability",
        url: staffAvailabilityUrl,
        label: `${staffName}の参加可能時間帯`,
        draggable: true,
        onClick: onTimeSlotClick
      },
      /* @__PURE__ */ React.createElement(material.Button, { variant: "text", size: "small", component: "span", className: "e-link-button" }, timeSlotLabel)
    ) : /* @__PURE__ */ React.createElement("span", null, timeSlotLabel)), /* @__PURE__ */ React.createElement("div", { className: "e-cell-secondary" }, roleName)), /* @__PURE__ */ React.createElement("div", { className: "e-center" }, /* @__PURE__ */ React.createElement("div", { className: `e-score is-${status}` }, evaluation.totalScore > 0 ? "+" : "", evaluation.totalScore, "pt"), /* @__PURE__ */ React.createElement(ArrowBackIcon, { className: "e-arrow" })), /* @__PURE__ */ React.createElement("div", { className: "e-cell" }, /* @__PURE__ */ React.createElement("div", { className: "e-cell-primary" }, /* @__PURE__ */ React.createElement(PersonIcon, { className: "e-person-icon" }), staffDetailUrl ? /* @__PURE__ */ React.createElement(
      bubblesUi.ObjectView,
      {
        type: "Staff",
        url: staffDetailUrl,
        label: staffName,
        draggable: true,
        onClick: onStaffClick
      },
      /* @__PURE__ */ React.createElement(material.Button, { variant: "text", size: "small", component: "span", className: "e-link-button" }, staffName)
    ) : /* @__PURE__ */ React.createElement("span", null, staffName))))), /* @__PURE__ */ React.createElement("div", { className: "e-section" }, /* @__PURE__ */ React.createElement("div", { className: "e-section-title" }, "スキルマッチング"), /* @__PURE__ */ React.createElement("div", { className: "e-skill-table" }, /* @__PURE__ */ React.createElement("div", { className: "e-skill-header" }, /* @__PURE__ */ React.createElement("span", { className: "e-skill-name" }, "スキル"), /* @__PURE__ */ React.createElement("span", { className: "e-skill-required" }, "要求"), /* @__PURE__ */ React.createElement("span", { className: "e-skill-has" }, "本人"), /* @__PURE__ */ React.createElement("span", { className: "e-skill-result" }, "評価")), evaluation.skillMatches.map((match, idx) => /* @__PURE__ */ React.createElement(SkillMatchRow, { key: idx, match })))), /* @__PURE__ */ React.createElement("div", { className: "e-section" }, /* @__PURE__ */ React.createElement("div", { className: "e-section-title" }, "時間帯"), /* @__PURE__ */ React.createElement("div", { className: "e-row" }, /* @__PURE__ */ React.createElement("span", { className: "e-label" }, "参加可能:"), /* @__PURE__ */ React.createElement(EvalIcon, { ok: evaluation.isAvailable })), /* @__PURE__ */ React.createElement("div", { className: "e-row" }, /* @__PURE__ */ React.createElement("span", { className: "e-label" }, "発表重複:"), /* @__PURE__ */ React.createElement("span", { className: evaluation.hasPresentationConflict ? "is-bad" : "is-good" }, evaluation.hasPresentationConflict ? "あり" : "なし"))), constraintViolations.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "e-section e-constraint-violations" }, /* @__PURE__ */ React.createElement("div", { className: "e-section-title" }, /* @__PURE__ */ React.createElement(WarningIcon, { fontSize: "inherit" }), " 制約違反"), /* @__PURE__ */ React.createElement("ul", { className: "e-violation-list" }, constraintViolations.map((violation, idx) => /* @__PURE__ */ React.createElement("li", { key: idx }, violation.message)))), evaluation.issues.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "e-section e-issues" }, /* @__PURE__ */ React.createElement("div", { className: "e-section-title" }, /* @__PURE__ */ React.createElement(WarningIcon, { fontSize: "inherit" }), " 注意事項"), /* @__PURE__ */ React.createElement("ul", { className: "e-issue-list" }, evaluation.issues.map((issue, idx) => /* @__PURE__ */ React.createElement("li", { key: idx }, issue)))));
  };
  const EvalIcon = ({ ok }) => /* @__PURE__ */ React.createElement("span", { className: ok ? "is-good" : "is-bad" }, ok ? /* @__PURE__ */ React.createElement(CheckCircleIcon, { fontSize: "inherit" }) : /* @__PURE__ */ React.createElement(CancelIcon, { fontSize: "inherit" }));
  const getSkillLevelLabel = (level) => {
    const labels = {
      none: "なし",
      beginner: "初級",
      intermediate: "中級",
      advanced: "上級"
    };
    return labels[level] ?? level;
  };
  const getRequiredLabel = (required) => {
    if (required === "none") return "要求なし";
    if (required === "any") return "あれば優先";
    return getSkillLevelLabel(required);
  };
  const getScoreSymbol = (diff) => {
    if (diff >= 2) return "◎";
    if (diff >= 1) return "○";
    if (diff >= 0) return "△";
    return "×";
  };
  const SkillMatchRow = ({ match }) => {
    const isNotRequired = match.required === "none";
    return /* @__PURE__ */ React.createElement("div", { className: "e-skill-row" }, /* @__PURE__ */ React.createElement("span", { className: "e-skill-name" }, match.skillName), /* @__PURE__ */ React.createElement("span", { className: "e-skill-required" }, getRequiredLabel(match.required)), /* @__PURE__ */ React.createElement("span", { className: "e-skill-has" }, getSkillLevelLabel(match.staffHas)), /* @__PURE__ */ React.createElement("span", { className: `e-skill-result ${isNotRequired ? "is-not-required" : match.isMatch ? "is-match" : "is-no-match"}` }, isNotRequired ? "-" : `${getScoreSymbol(match.scoreDiff)} ${match.scoreDiff > 0 ? `+${match.scoreDiff}` : match.scoreDiff}`));
  };
  const StyledContainer$1 = styled2.div`
  padding: 12px;
  font-size: 0.9em;

  .e-header {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 2px solid #1976d2;
  }

  .e-assignment-visual {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e-cell {
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 6px 10px;
    min-width: 0;
  }

  .e-cell-primary {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: bold;
    font-size: 0.85em;
    white-space: nowrap;
  }

  .e-cell-secondary {
    font-size: 0.75em;
    color: #666;
    margin-top: 2px;
  }

  .e-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .e-score {
    font-size: 0.8em;
    font-weight: bold;
    margin-bottom: 2px;

    &.is-excellent { color: #2e7d32; }
    &.is-good { color: #558b2f; }
    &.is-acceptable { color: #f9a825; }
    &.is-warning { color: #ef6c00; }
    &.is-error { color: #c62828; }
  }

  .e-arrow {
    color: #999;
  }

  .e-person-icon {
    font-size: 1.1em;
    color: #666;
  }

  .e-section {
    margin-bottom: 12px;
    padding: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;

    &.e-issues {
      background-color: #fff3e0;
      border-color: #ff9800;
    }

    &.e-constraint-violations {
      background-color: #fffde7;
      border-color: #fbc02d;
    }
  }

  .e-violation-list {
    margin: 0;
    padding-left: 20px;

    li {
      padding: 2px 0;
      color: #f57f17;
    }
  }

  .e-section-title {
    font-weight: bold;
    font-size: 0.85em;
    color: #666;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .e-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;

    .e-label {
      min-width: 80px;
      color: #666;
    }
  }

  .is-good {
    color: #2e7d32;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .is-bad {
    color: #c62828;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .is-neutral {
    color: #666;
  }

  .e-skill-table {
    font-size: 0.9em;
  }

  .e-skill-header,
  .e-skill-row {
    display: flex;
    align-items: center;
    padding: 4px 0;

    .e-skill-name {
      width: 60px;
      flex-shrink: 0;
    }

    .e-skill-required {
      width: 80px;
      flex-shrink: 0;
    }

    .e-skill-has {
      width: 60px;
      flex-shrink: 0;
    }

    .e-skill-result {
      flex: 1;
      text-align: right;
    }
  }

  .e-skill-header {
    font-size: 0.8em;
    color: #888;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 2px;
  }

  .e-skill-row {
    .e-skill-name {
      font-weight: bold;
    }

    .e-skill-required {
      color: #1976d2;
    }

    .e-skill-has {
      color: #333;
    }

    .e-skill-result {
      font-weight: bold;

      &.is-match {
        color: #2e7d32;
      }

      &.is-no-match {
        color: #c62828;
      }

      &.is-not-required {
        color: #999;
        font-weight: normal;
      }
    }
  }

  .e-issue-list {
    margin: 0;
    padding-left: 20px;

    li {
      padding: 2px 0;
      color: #e65100;
    }
  }

  .e-link-button {
    padding: 0 4px;
    min-width: auto;
    font-size: inherit;
    font-weight: inherit;
    text-transform: none;
    vertical-align: baseline;
  }
`;
  const AssignmentEvaluation = ({
    shiftPlanId,
    assignmentId,
    onStaffClick,
    onTimeSlotClick,
    buildStaffDetailUrl,
    buildStaffAvailabilityUrl
  }) => {
    const staffList = stateManagement.useAppSelector(selectGakkaiShiftStaffList);
    const shiftPlan = stateManagement.useAppSelector(selectShiftPlanById(shiftPlanId));
    const timeSlots2 = React$1.useMemo(() => TimeSlot_時間帯.createDefaultTimeSlots(), []);
    const roles = React$1.useMemo(() => Role_係.createDefaultRoles(), []);
    const assignment = React$1.useMemo(() => {
      if (!shiftPlan) return void 0;
      const assignmentState = shiftPlan.state.assignments.find(
        (a) => a.id === assignmentId
      );
      return assignmentState ? new ShiftAssignment_シフト配置(assignmentState) : void 0;
    }, [shiftPlan, assignmentId]);
    const staff = React$1.useMemo(() => {
      if (!assignment) return void 0;
      return staffList.find((s) => s.id === assignment.staffId);
    }, [staffList, assignment]);
    const timeSlot = React$1.useMemo(() => {
      if (!assignment) return void 0;
      return timeSlots2.find((t) => t.id === assignment.timeSlotId);
    }, [timeSlots2, assignment]);
    const role = React$1.useMemo(() => {
      if (!assignment) return void 0;
      return roles.find((r) => r.id === assignment.roleId);
    }, [roles, assignment]);
    const evaluation = React$1.useMemo(() => {
      if (!assignment || !staff || !role || !timeSlot) return void 0;
      return StaffAssignmentEvaluation_スタッフ配置評価.evaluate(
        assignment,
        staff,
        role,
        timeSlot
      );
    }, [assignment, staff, role, timeSlot]);
    const constraintViolations = React$1.useMemo(() => {
      if (!shiftPlan) return [];
      return shiftPlan.constraintViolations.filter((v) => v.assignmentIds.includes(assignmentId));
    }, [shiftPlan, assignmentId]);
    if (!shiftPlan) {
      return /* @__PURE__ */ React.createElement("div", null, "シフト案が見つかりません");
    }
    if (!assignment) {
      return /* @__PURE__ */ React.createElement("div", null, "配置が見つかりません");
    }
    if (!staff || !role || !timeSlot || !evaluation) {
      return /* @__PURE__ */ React.createElement("div", null, "データを読み込み中...");
    }
    return /* @__PURE__ */ React.createElement(
      AssignmentEvaluationView,
      {
        evaluation,
        staffName: staff.name,
        timeSlotLabel: timeSlot.label,
        roleName: role.name,
        constraintViolations,
        staffDetailUrl: buildStaffDetailUrl?.(staff.id),
        staffAvailabilityUrl: buildStaffAvailabilityUrl?.(staff.id),
        onStaffClick: () => onStaffClick?.(staff.id),
        onTimeSlotClick: () => onTimeSlotClick?.(staff.id)
      }
    );
  };
  const StaffShiftTableView = ({
    timeSlots: timeSlots2,
    roles,
    assignments,
    staffList,
    onStaffClick,
    onAssignmentClick
  }) => {
    const getAssignmentsForStaff = (staffId) => {
      return assignments.filter((a) => a.staffId === staffId);
    };
    const getAssignmentForStaffAndTimeSlot = (staffId, timeSlotId) => {
      return assignments.find(
        (a) => a.staffId === staffId && a.timeSlotId === timeSlotId
      );
    };
    const calculateScore = (staff, assignment) => {
      const role = roles.find((r) => r.id === assignment.roleId);
      const timeSlot = timeSlots2.find((t) => t.id === assignment.timeSlotId);
      if (!role || !timeSlot) return 0;
      const evaluation = StaffAssignmentEvaluation_スタッフ配置評価.evaluateCandidate(
        staff,
        role,
        timeSlot
      );
      return evaluation.roleFitScore;
    };
    const getRoleName = (roleId) => {
      return roles.find((r) => r.id === roleId)?.name ?? "不明";
    };
    const staffWithAssignments = staffList.filter(
      (staff) => getAssignmentsForStaff(staff.id).length > 0
    );
    return /* @__PURE__ */ React.createElement(StyledTable, null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "e-staff-header" }, "スタッフ"), timeSlots2.map((slot) => /* @__PURE__ */ React.createElement("th", { key: slot.id, className: "e-slot-header" }, slot.label)), /* @__PURE__ */ React.createElement("th", { className: "e-total-header" }, "配置数"))), /* @__PURE__ */ React.createElement("tbody", null, staffWithAssignments.map((staff) => {
      const staffAssignments = getAssignmentsForStaff(staff.id);
      return /* @__PURE__ */ React.createElement("tr", { key: staff.id }, /* @__PURE__ */ React.createElement(
        "td",
        {
          className: "e-staff-cell",
          onClick: () => onStaffClick?.(staff.id)
        },
        /* @__PURE__ */ React.createElement("div", { className: "e-staff-name" }, staff.name),
        /* @__PURE__ */ React.createElement("div", { className: "e-staff-school" }, staff.state.school)
      ), timeSlots2.map((slot) => {
        const assignment = getAssignmentForStaffAndTimeSlot(staff.id, slot.id);
        const isAvailable = staff.isAvailableAt(slot.id);
        return /* @__PURE__ */ React.createElement(
          "td",
          {
            key: slot.id,
            className: `e-slot-cell ${isAvailable ? "is-available" : "is-unavailable"}`
          },
          !isAvailable && /* @__PURE__ */ React.createElement("div", { className: "e-unavailable-mark" }, "×"),
          assignment && /* @__PURE__ */ React.createElement(
            "div",
            {
              className: `e-assignment ${calculateScore(staff, assignment) >= 0 ? "is-positive" : "is-negative"}`,
              onClick: () => onAssignmentClick?.(assignment.id)
            },
            /* @__PURE__ */ React.createElement("div", { className: "e-role" }, getRoleName(assignment.roleId)),
            /* @__PURE__ */ React.createElement("div", { className: "e-score" }, calculateScore(staff, assignment) >= 0 ? "+" : "", calculateScore(staff, assignment))
          )
        );
      }), /* @__PURE__ */ React.createElement("td", { className: "e-total-cell" }, staffAssignments.length));
    })));
  };
  const StyledTable = styled2.table`
  border-collapse: collapse;
  font-size: 0.85em;
  width: 100%;

  th,
  td {
    border: 1px solid #ddd;
    padding: 6px 8px;
    vertical-align: middle;
    text-align: center;
  }

  th {
    background-color: #f5f5f5;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .e-staff-header {
    width: 120px;
    min-width: 120px;
    text-align: left;
  }

  .e-slot-header {
    min-width: 80px;
    font-size: 0.85em;
  }

  .e-total-header {
    width: 60px;
    min-width: 60px;
  }

  .e-staff-cell {
    cursor: pointer;
    transition: background-color 0.15s;
    text-align: left;

    &:hover {
      background-color: #e3f2fd;
    }

    .e-staff-name {
      font-weight: bold;
    }

    .e-staff-school {
      font-size: 0.8em;
      color: #666;
    }
  }

  .e-slot-cell {
    min-width: 80px;
    position: relative;

    &.is-unavailable {
      background-color: #f5f5f5;
    }
  }

  .e-unavailable-mark {
    position: absolute;
    top: 2px;
    left: 4px;
    font-size: 0.7em;
    color: #999;
  }

  .e-assignment {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.8;
    }

    &.is-positive {
      background-color: #e8f5e9;
      border: 1px solid #a5d6a7;
    }

    &.is-negative {
      background-color: #ffebee;
      border: 1px solid #ef9a9a;
    }

    .e-role {
      font-weight: 500;
      font-size: 0.9em;
    }

    .e-score {
      font-size: 0.8em;
      font-weight: bold;
    }
  }

  .e-total-cell {
    font-weight: bold;
    background-color: #fafafa;
  }
`;
  const StaffShiftTable = ({
    shiftPlanId,
    onStaffClick,
    onAssignmentClick
  }) => {
    const dispatch = stateManagement.useAppDispatch();
    const staffList = stateManagement.useAppSelector(selectGakkaiShiftStaffList);
    const shiftPlan = stateManagement.useAppSelector(selectShiftPlanById(shiftPlanId));
    const timeSlots2 = React$1.useMemo(() => TimeSlot_時間帯.createDefaultTimeSlots(), []);
    const roles = React$1.useMemo(() => Role_係.createDefaultRoles(), []);
    React$1.useEffect(() => {
      if (staffList.length === 0) {
        const sampleData = createSampleStaffList();
        dispatch(setStaffList(sampleData.map((s) => s.toJSON())));
      }
    }, [dispatch, staffList.length]);
    if (!shiftPlan) {
      return /* @__PURE__ */ React.createElement(StyledContainer, null, /* @__PURE__ */ React.createElement("div", { className: "e-loading" }, "シフト案が見つかりません"));
    }
    return /* @__PURE__ */ React.createElement(StyledContainer, null, /* @__PURE__ */ React.createElement("div", { className: "e-header" }, /* @__PURE__ */ React.createElement("h3", null, shiftPlan.name, " - スタッフ別シフト表"), /* @__PURE__ */ React.createElement("div", { className: "e-stats" }, "配置数: ", shiftPlan.assignments.length, "件 / スタッフ: ", new Set(shiftPlan.assignments.map((a) => a.staffId)).size, "名")), /* @__PURE__ */ React.createElement("div", { className: "e-main" }, /* @__PURE__ */ React.createElement(
      StaffShiftTableView,
      {
        timeSlots: timeSlots2,
        roles,
        assignments: shiftPlan.assignments,
        staffList,
        onStaffClick,
        onAssignmentClick: (assignmentId) => onAssignmentClick?.(shiftPlanId, assignmentId)
      }
    )));
  };
  const StyledContainer = styled2.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-loading {
    padding: 20px;
    text-align: center;
    color: #666;
  }

  .e-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;

    h3 {
      margin: 0;
      font-size: 1em;
    }

    .e-stats {
      color: #666;
      font-size: 0.85em;
    }
  }

  .e-main {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }
`;
  const GakkaiShiftStaffFilterBubble = ({ bubble }) => {
    const queryIndex = bubble.url.indexOf("?");
    const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : "";
    const initialFilter = parseStaffFilter(query);
    return /* @__PURE__ */ React.createElement(StaffFilter, { initialFilter });
  };
  const GakkaiShiftStaffsBubble = ({ bubble }) => {
    const { openBubble } = React$1.useContext(bubblesUi.BubblesContext);
    const handleStaffSelect = (staffId) => {
      openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id);
    };
    const queryIndex = bubble.url.indexOf("?");
    const query = queryIndex >= 0 ? bubble.url.slice(queryIndex + 1) : "";
    const filter = parseStaffFilter(query);
    return /* @__PURE__ */ React.createElement(StaffCollection, { filter, onStaffSelect: handleStaffSelect });
  };
  const GakkaiShiftStaffBubble = ({ bubble }) => {
    const staffId = bubble.url.replace("gakkai-shift/staffs/", "");
    const { openBubble } = React$1.useContext(bubblesUi.BubblesContext);
    const handleOpenAvailability = (staffId2) => {
      openBubble(`gakkai-shift/staffs/${staffId2}/availableTimeSlots`, bubble.id);
    };
    return /* @__PURE__ */ React.createElement(StaffDetail, { staffId, onOpenAvailability: handleOpenAvailability });
  };
  const GakkaiShiftStaffAvailabilityBubble = ({ bubble }) => {
    const staffId = bubble.url.replace("gakkai-shift/staffs/", "").replace("/availableTimeSlots", "");
    return /* @__PURE__ */ React.createElement(StaffAvailability, { staffId });
  };
  const GakkaiShiftPlanEditorBubble = ({ bubble }) => {
    const { openBubble } = React$1.useContext(bubblesUi.BubblesContext);
    const shiftPlanId = bubble.url.replace("gakkai-shift/shift-plan/", "");
    const roles = Role_係.createDefaultRoles();
    const handleAssignmentClick = (assignmentId) => {
      openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
    };
    const handleStaffViewClick = () => {
      openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/staff-view`, bubble.id, "origin-side");
    };
    const buildFilterUrl = (timeSlotId, roleId) => {
      const role = roles.find((r) => r.id === roleId);
      const filter = {};
      if (role) {
        const requirements = role.requirements;
        if (requirements.minPcSkill) {
          filter.pc = { level: requirements.minPcSkill, operator: ">=" };
        }
        if (requirements.minZoomSkill) {
          filter.zoom = { level: requirements.minZoomSkill, operator: ">=" };
        }
        if (requirements.requireEnglish) {
          filter.english = true;
        }
        if (requirements.requireEventExperience) {
          filter.eventExperience = true;
        }
      }
      filter.availableAt = [timeSlotId];
      const query = stringifyStaffFilter(filter);
      const originCell = `&originCell=${timeSlotId}_${roleId}`;
      return `gakkai-shift/staffs${query}${originCell}`;
    };
    const handleCellClick = (timeSlotId, roleId) => {
      const url = buildFilterUrl(timeSlotId, roleId);
      openBubble(url, bubble.id, "origin-side");
    };
    return /* @__PURE__ */ React.createElement(
      ShiftPlanEditor,
      {
        shiftPlanId,
        onAssignmentClick: handleAssignmentClick,
        onCellClick: handleCellClick,
        onStaffViewClick: handleStaffViewClick,
        buildCellUrl: buildFilterUrl
      }
    );
  };
  const GakkaiShiftPlanManagerBubble = ({ bubble }) => {
    const { openBubble } = React$1.useContext(bubblesUi.BubblesContext);
    const roles = Role_係.createDefaultRoles();
    const handleAssignmentClick = (shiftPlanId, assignmentId) => {
      openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
    };
    const handleStaffViewClick = (shiftPlanId) => {
      openBubble(`gakkai-shift/shift-plans/${shiftPlanId}/staff-view`, bubble.id, "origin-side");
    };
    const buildFilterUrl = (timeSlotId, roleId) => {
      const role = roles.find((r) => r.id === roleId);
      const filter = {};
      if (role) {
        const requirements = role.requirements;
        if (requirements.minPcSkill) {
          filter.pc = { level: requirements.minPcSkill, operator: ">=" };
        }
        if (requirements.minZoomSkill) {
          filter.zoom = { level: requirements.minZoomSkill, operator: ">=" };
        }
        if (requirements.requireEnglish) {
          filter.english = true;
        }
        if (requirements.requireEventExperience) {
          filter.eventExperience = true;
        }
      }
      filter.availableAt = [timeSlotId];
      const query = stringifyStaffFilter(filter);
      const originCell = `&originCell=${timeSlotId}_${roleId}`;
      return `gakkai-shift/staffs${query}${originCell}`;
    };
    const handleCellClick = (timeSlotId, roleId) => {
      const url = buildFilterUrl(timeSlotId, roleId);
      openBubble(url, bubble.id, "origin-side");
    };
    return /* @__PURE__ */ React.createElement(
      ShiftPlanManager,
      {
        onAssignmentClick: handleAssignmentClick,
        onCellClick: handleCellClick,
        buildCellUrl: buildFilterUrl,
        onStaffViewClick: handleStaffViewClick
      }
    );
  };
  const GakkaiShiftStaffShiftTableBubble = ({ bubble }) => {
    const { openBubble } = React$1.useContext(bubblesUi.BubblesContext);
    const match = bubble.url.match(/^gakkai-shift\/shift-plans\/([^/]+)\/staff-view$/);
    const shiftPlanId = match?.[1] ?? "";
    const handleStaffClick = (staffId) => {
      openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id, "bubble-side");
    };
    const handleAssignmentClick = (shiftPlanId2, assignmentId) => {
      openBubble(`gakkai-shift/shift-plans/${shiftPlanId2}/assignments/${assignmentId}/evaluation`, bubble.id, "origin-side");
    };
    return /* @__PURE__ */ React.createElement(
      StaffShiftTable,
      {
        shiftPlanId,
        onStaffClick: handleStaffClick,
        onAssignmentClick: handleAssignmentClick
      }
    );
  };
  const GakkaiShiftAssignmentEvaluationBubble = ({ bubble }) => {
    const { openBubble } = React$1.useContext(bubblesUi.BubblesContext);
    const match = bubble.url.match(/^gakkai-shift\/shift-plans\/([^/]+)\/assignments\/([^/]+)\/evaluation$/);
    const shiftPlanId = match?.[1] ?? "";
    const assignmentId = match?.[2] ?? "";
    const handleStaffClick = (staffId) => {
      openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id, "bubble-side");
    };
    const handleTimeSlotClick = (staffId) => {
      openBubble(`gakkai-shift/staffs/${staffId}/availableTimeSlots`, bubble.id, "bubble-side");
    };
    const buildStaffDetailUrl = (staffId) => `gakkai-shift/staffs/${staffId}`;
    const buildStaffAvailabilityUrl = (staffId) => `gakkai-shift/staffs/${staffId}/availableTimeSlots`;
    return /* @__PURE__ */ React.createElement(
      AssignmentEvaluation,
      {
        shiftPlanId,
        assignmentId,
        onStaffClick: handleStaffClick,
        onTimeSlotClick: handleTimeSlotClick,
        buildStaffDetailUrl,
        buildStaffAvailabilityUrl
      }
    );
  };
  const gakkaiShiftBubbleRoutes = [
    { pattern: /^gakkai-shift\/staffs\/filter(\?.*)?$/, type: "gakkai-shift-staff-filter", Component: GakkaiShiftStaffFilterBubble },
    { pattern: /^gakkai-shift\/staffs(\?.*)?$/, type: "gakkai-shift-staffs", Component: GakkaiShiftStaffsBubble },
    { pattern: /^gakkai-shift\/staffs\/[^/]+\/availableTimeSlots$/, type: "gakkai-shift-staff-availability", Component: GakkaiShiftStaffAvailabilityBubble },
    { pattern: /^gakkai-shift\/staffs\/[^/]+$/, type: "gakkai-shift-staff", Component: GakkaiShiftStaffBubble },
    { pattern: /^gakkai-shift\/shift-plans$/, type: "gakkai-shift-plans", Component: GakkaiShiftPlanManagerBubble },
    { pattern: /^gakkai-shift\/shift-plans\/[^/]+\/staff-view$/, type: "gakkai-shift-staff-view", Component: GakkaiShiftStaffShiftTableBubble },
    { pattern: /^gakkai-shift\/shift-plans\/[^/]+\/assignments\/[^/]+\/evaluation$/, type: "gakkai-shift-assignment-evaluation", Component: GakkaiShiftAssignmentEvaluationBubble },
    { pattern: /^gakkai-shift\/shift-plan\/[^/]+$/, type: "gakkai-shift-plan", Component: GakkaiShiftPlanEditorBubble }
  ];
  const GakkaiShiftBubly2 = {
    name: "gakkai-shift",
    version: "0.0.1",
    menuItems: [
      {
        label: "スタッフ一覧",
        url: "gakkai-shift/staffs",
        icon: React$1.createElement(EventNoteIcon, { color: "action" })
      },
      {
        label: "シフト配置表",
        url: "gakkai-shift/shift-plans",
        icon: React$1.createElement(EventNoteIcon, { color: "primary" })
      }
    ],
    register(context) {
      console.log("[GakkaiShiftBubly] Registering...");
      console.log("[GakkaiShiftBubly] Slices auto-injected: gakkaiShift, shiftPlan");
      context.registerBubbleRoutes(gakkaiShiftBubbleRoutes);
      console.log("[GakkaiShiftBubly] Registered", gakkaiShiftBubbleRoutes.length, "bubble routes");
      console.log("[GakkaiShiftBubly] Registration complete");
    },
    unregister() {
      console.log("[GakkaiShiftBubly] Unregistering...");
    }
  };
  window.__BUBLYS_BUBLIES__ = window.__BUBLYS_BUBLIES__ || {};
  window.__BUBLYS_BUBLIES__["gakkai-shift"] = GakkaiShiftBubly2;
  console.log("[GakkaiShiftBubly] Bubly loaded and registered to window.__BUBLYS_BUBLIES__");
  return GakkaiShiftBubly2;
}(React, window.__BUBLYS_SHARED__.MuiIcons.EventNote, window.__BUBLYS_SHARED__.BubblesUI, window.__BUBLYS_SHARED__.StateManagement, window.__BUBLYS_SHARED__.Redux, styled, window.__BUBLYS_SHARED__.MuiIcons.Person, window.__BUBLYS_SHARED__.MuiMaterial, window.__BUBLYS_SHARED__.MuiIcons.FilterList, window.__BUBLYS_SHARED__.MuiIcons.Search, window.__BUBLYS_SHARED__.MuiIcons.Check, window.__BUBLYS_SHARED__.MuiIcons.Close, window.__BUBLYS_SHARED__.MuiIcons.Warning, window.__BUBLYS_SHARED__.MuiIcons.AutoFixHigh, window.__BUBLYS_SHARED__.MuiIcons.People, window.__BUBLYS_SHARED__.MuiIcons.Add, window.__BUBLYS_SHARED__.MuiIcons.Delete, window.__BUBLYS_SHARED__.MuiIcons.ContentCopy, window.__BUBLYS_SHARED__.MuiIcons.CheckCircle, window.__BUBLYS_SHARED__.MuiIcons.Cancel, window.__BUBLYS_SHARED__.MuiIcons.ArrowBack);
//# sourceMappingURL=bubly.js.map
