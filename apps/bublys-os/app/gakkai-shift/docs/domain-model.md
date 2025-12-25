# 学会シフト生成システム - ドメインモデル

## クラス図

```mermaid
classDiagram
    direction TB

    class TimeSlot_時間帯 {
        <<immutable / master data>>
        +state: TimeSlotState
        +id: string
        +date: DateString_日付
        +period: TimeSlotPeriod_時間帯区分
        +label: string
        +isOrientation: boolean
        +isSameDate(other) boolean
        +overlaps(other) boolean
        +getDurationHours() number
        +getPeriodLabel(period)$ string
        +createDefaultTimeSlots()$ TimeSlot_時間帯[]
    }

    class Role_係 {
        <<immutable / master data>>
        +state: RoleState
        +id: string
        +name: string
        +description: string
        +fixedness: RoleFixedness_係の固定性
        +requirements: RoleRequirementsState
        +priority: number
        +isAllDayFixed() boolean
        +isPartyOnly() boolean
        +isConcurrentOk() boolean
        +skillLevelToNumber(level)$ number
        +createDefaultRoles()$ Role_係[]
    }

    class Staff_スタッフ {
        <<immutable>>
        +state: StaffState
        +id: string
        +name: string
        +email: string
        +gender: Gender_性別
        +skills: SkillsState
        +presentation: PresentationState
        +availableTimeSlots: string[]
        +status: StaffStatus_ステータス
        +aptitudeScore?: number
        +isAvailableAt(timeSlotId) boolean
        +hasPresentationAt(date, period) boolean
        +canAttendOrientation(slotId) boolean
        +meetsRoleRequirements(role) boolean
        +calculateRoleFitScore(role) number
        +calculateAptitudeScore(weights) number
        +accept() Staff_スタッフ
        +putOnWaitlist() Staff_スタッフ
        +reject() Staff_スタッフ
        +withAptitudeScore(score) Staff_スタッフ
        +withNotes(notes) Staff_スタッフ
        #withUpdatedState(partial) Staff_スタッフ
        +create(data)$ Staff_スタッフ
    }

    class ShiftAssignment_シフト配置 {
        <<immutable>>
        +state: ShiftAssignmentState
        +id: string
        +staffId: string
        +timeSlotId: string
        +roleId: string
        +isAutoAssigned: boolean
        +notes?: string
        +markAsManuallyAssigned() ShiftAssignment_シフト配置
        +withNotes(notes) ShiftAssignment_シフト配置
        +create(...)$ ShiftAssignment_シフト配置
    }

    class StaffRequirement_必要人数 {
        <<immutable>>
        +state: StaffRequirementState
        +id: string
        +timeSlotId: string
        +roleId: string
        +requiredCount: number
        +minCount: number
        +maxCount: number
        +withRequiredCount(count) StaffRequirement_必要人数
        +withCountRange(min, max) StaffRequirement_必要人数
        +create(...)$ StaffRequirement_必要人数
    }

    class SlotRoleResult_配置結果 {
        <<immutable / calculated>>
        +state: SlotRoleResultState
        +timeSlotId: string
        +roleId: string
        +requiredCount: number
        +assignedCount: number
        +fulfillmentRate: number
        +hasShortage: boolean
        +hasExcess: boolean
        +calculate(requirement, staffIds)$ SlotRoleResult_配置結果
    }

    class ShiftPlan_シフト案 {
        <<immutable / aggregate>>
        +state: ShiftPlanState
        +id: string
        +name: string
        +assignments: ShiftAssignment_シフト配置[]
        +getAssignmentsByStaff(staffId) ShiftAssignment_シフト配置[]
        +getAssignmentsByTimeSlot(slotId) ShiftAssignment_シフト配置[]
        +getAssignmentsByRole(roleId) ShiftAssignment_シフト配置[]
        +getAssignmentsForSlotRole(slotId, roleId) ShiftAssignment_シフト配置[]
        +evaluate(requirements) ShiftPlanEvaluation
        +calculateOverallScore(requirements) number
        +addAssignment(assignment) ShiftPlan_シフト案
        +removeAssignment(assignmentId) ShiftPlan_シフト案
        +withName(name) ShiftPlan_シフト案
        #withUpdatedState(partial) ShiftPlan_シフト案
        +create(name)$ ShiftPlan_シフト案
    }

    %% 関連
    Staff_スタッフ "1" --> "*" TimeSlot_時間帯 : availableTimeSlots
    Staff_スタッフ "1" --> "*" Role_係 : preferredRoles
    Staff_スタッフ ..> Role_係 : meetsRoleRequirements()

    ShiftAssignment_シフト配置 "*" --> "1" Staff_スタッフ : staffId
    ShiftAssignment_シフト配置 "*" --> "1" TimeSlot_時間帯 : timeSlotId
    ShiftAssignment_シフト配置 "*" --> "1" Role_係 : roleId

    StaffRequirement_必要人数 "*" --> "1" TimeSlot_時間帯 : timeSlotId
    StaffRequirement_必要人数 "*" --> "1" Role_係 : roleId

    SlotRoleResult_配置結果 ..> StaffRequirement_必要人数 : calculate()

    ShiftPlan_シフト案 "1" *-- "*" ShiftAssignment_シフト配置 : assignments
    ShiftPlan_シフト案 ..> StaffRequirement_必要人数 : evaluate()
    ShiftPlan_シフト案 ..> SlotRoleResult_配置結果 : evaluate()
```

## 型一覧

| 型名 | 説明 |
|------|------|
| `DateString_日付` | 日付文字列 (YYYY-MM-DD形式) |
| `TimeSlotPeriod_時間帯区分` | 時間帯区分 (all_day/morning/afternoon/evening/party) |
| `SkillLevel_スキルレベル` | スキルレベル (none/beginner/intermediate/advanced) |
| `RoleFixedness_係の固定性` | 係の固定性 (all_day_fixed/time_slot_ok/concurrent_ok/party_only) |
| `StaffStatus_ステータス` | スタッフステータス (pending/accepted/waitlist/rejected) |
| `Gender_性別` | 性別 (male/female/other/prefer_not_to_say) |

## 状態遷移図（StaffStatus_ステータス）

```mermaid
stateDiagram-v2
    [*] --> pending : 応募

    pending --> rejected : 業務オリエン参加不可
    pending --> accepted : マッチング採用
    pending --> waitlist : マッチング補欠
    pending --> rejected : マッチング不採用

    waitlist --> accepted : 繰り上げ採用
    waitlist --> rejected : 最終不採用

    accepted --> [*] : 配置完了
    rejected --> [*] : 処理終了
```

## データフロー

```mermaid
flowchart TD
    subgraph Input["入力データ"]
        A[応募者データ]
        B[係マスター]
        C[必要人数]
        D[マッチング設定]
    end

    subgraph Domain["ドメイン処理"]
        E[Staff_スタッフ作成]
        F[適性スコア計算]
        G[採用判定]
        H[配置最適化]
    end

    subgraph Output["出力"]
        I[採用/補欠/不採用]
        J[ShiftPlan_シフト案]
        K[ShiftAssignment_シフト配置]
        L[SlotRoleResult_配置結果]
    end

    A --> E
    E --> F
    D --> F
    F --> G
    G --> I

    B --> H
    C --> H
    G --> H
    H --> J
    J --> K
    K --> L
```

## 時間帯構成（15枠）

| 日付 | 時間帯 | 備考 |
|------|--------|------|
| 3/24（月） | 終日 | 準備日（設営） |
| 3/25（火） | 午前 | 準備日 |
| 3/25（火） | 午後 | **業務オリエン（必須）** |
| 3/26（水） | 午前/午後/夕刻 | 会期1日目 |
| 3/27（木） | 午前/午後/夕刻/懇親会 | 会期2日目 |
| 3/28（金） | 午前/午後/夕刻 | 会期3日目 |
| 3/29（土） | 午前/午後 | 会期4日目（撤去） |

## 係一覧（13種類）

| ID | 係名 | 固定性 | 優先度 |
|----|------|--------|--------|
| headquarters | 年会本部 | 全日固定 | 100 |
| venue_check | 会場チェック係 | 時間帯OK | 90 |
| venue | 会場係 | 時間帯OK | 85 |
| reception | 総合案内 | 時間帯OK | 80 |
| mobile_support | 機動運用係 | 時間帯OK | 75 |
| badge_reissue | 参加証再発行 | 時間帯OK | 70 |
| setup | 設営係 | 兼務可能 | 65 |
| cloakroom | クローク | 時間帯OK | 60 |
| exhibition | 展示係 | 時間帯OK | 55 |
| preview_room | 試写室係 | 時間帯OK | 50 |
| poster | ポスター係 | 時間帯OK | 50 |
| party_cloakroom | 懇親会クローク | 懇親会専用 | 40 |
| party_reception | 懇親会受付 | 懇親会専用 | 40 |
