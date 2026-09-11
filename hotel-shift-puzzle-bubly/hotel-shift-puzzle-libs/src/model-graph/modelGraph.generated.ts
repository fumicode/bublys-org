/**
 * ★ 自動生成。手で編集しないこと。
 *
 * 出どころ: hotel-shift-puzzle-bubly/hotel-shift-puzzle-model/src/lib
 * 生成: bublys-libs/model-graph の generate ターゲット
 *
 * 古くなったら `modelGraph.staleness.test.ts` が落ちる。落ちたら生成し直すこと。
 */
import type { ModelGraph } from '@bublys-org/model-graph';

export const MODEL_GRAPH: ModelGraph = {
  "classes": [
    {
      "name": "ConstraintViolation",
      "file": "schedule/ConstraintViolation.ts",
      "kind": "value",
      "fields": [
        {
          "name": "constraintType",
          "type": "string",
          "optional": false
        },
        {
          "name": "staffId",
          "type": "string",
          "optional": true
        },
        {
          "name": "days",
          "type": "WorkingDay[]",
          "optional": false
        },
        {
          "name": "message",
          "type": "string",
          "optional": false
        }
      ],
      "getters": [
        "constraintType",
        "staffId",
        "isDayScoped",
        "days",
        "message",
        "key"
      ],
      "methods": [
        {
          "name": "coversDay",
          "params": [
            "day"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "coversCell",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "toPlain",
          "params": [],
          "returns": "ConstraintViolationPlain",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "fromPlain",
          "params": [
            "plain"
          ],
          "returns": "ConstraintViolation",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "DailyReservationInfo",
      "file": "schedule/DailyReservationInfo.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "scheduleId",
          "type": "string",
          "optional": false
        },
        {
          "name": "byDay",
          "type": "Record<string, DailyReservationInfoEntry>",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "scheduleId"
      ],
      "methods": [
        {
          "name": "empty",
          "params": [
            "scheduleId"
          ],
          "returns": "DailyReservationInfo",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "entryOn",
          "params": [
            "day"
          ],
          "returns": "DailyReservationInfoEntry",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "numberOn",
          "params": [
            "day",
            "group",
            "field"
          ],
          "returns": "number | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "setNumber",
          "params": [
            "day",
            "group",
            "field",
            "value"
          ],
          "returns": "DailyReservationInfo",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "weddingsOn",
          "params": [
            "day"
          ],
          "returns": "string | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "setWeddings",
          "params": [
            "day",
            "value"
          ],
          "returns": "DailyReservationInfo",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "noteOn",
          "params": [
            "day"
          ],
          "returns": "string | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "setNote",
          "params": [
            "day",
            "value"
          ],
          "returns": "DailyReservationInfo",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "toPlain",
          "params": [],
          "returns": "DailyReservationInfoState",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "fromPlain",
          "params": [
            "plain"
          ],
          "returns": "DailyReservationInfo",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "MaxConsecutiveWorkdaysConstraint",
      "file": "schedule/MaxConsecutiveWorkdaysConstraint.ts",
      "kind": "value",
      "fields": [],
      "getters": [],
      "methods": [
        {
          "name": "describe",
          "params": [],
          "returns": "string",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "check",
          "params": [
            "schedule"
          ],
          "returns": "ConstraintViolation[]",
          "isStatic": false,
          "returnsSelf": false
        }
      ]
    },
    {
      "name": "MaxDayOffPerDayConstraint",
      "file": "schedule/MaxDayOffPerDayConstraint.ts",
      "kind": "value",
      "fields": [],
      "getters": [],
      "methods": [
        {
          "name": "describe",
          "params": [],
          "returns": "string",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "check",
          "params": [
            "schedule"
          ],
          "returns": "ConstraintViolation[]",
          "isStatic": false,
          "returnsSelf": false
        }
      ]
    },
    {
      "name": "MinMonthlyDayOffConstraint",
      "file": "schedule/MinMonthlyDayOffConstraint.ts",
      "kind": "value",
      "fields": [],
      "getters": [],
      "methods": [
        {
          "name": "describe",
          "params": [],
          "returns": "string",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "check",
          "params": [
            "schedule"
          ],
          "returns": "ConstraintViolation[]",
          "isStatic": false,
          "returnsSelf": false
        }
      ]
    },
    {
      "name": "MonthlyStaffSchedule",
      "file": "schedule/MonthlyStaffSchedule.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "storeId",
          "type": "string",
          "optional": false
        },
        {
          "name": "year",
          "type": "number",
          "optional": false
        },
        {
          "name": "month",
          "type": "number",
          "optional": false
        },
        {
          "name": "workingStaffGroupId",
          "type": "string",
          "optional": false
        },
        {
          "name": "assignments",
          "type": "ShiftAssignment[]",
          "optional": false
        },
        {
          "name": "requiredStaffing",
          "type": "RequiredStaffing",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "storeId",
        "year",
        "month",
        "workingStaffGroupId",
        "assignments",
        "index",
        "requiredStaffing"
      ],
      "methods": [
        {
          "name": "create",
          "params": [
            "params"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "workingDays",
          "params": [],
          "returns": "WorkingDay[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "getAssignment",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "ShiftAssignment | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "assignShift",
          "params": [
            "staffId",
            "day",
            "shiftId"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "assignDayOff",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "markUndecided",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "clearAssignment",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "clearStaff",
          "params": [
            "staffId"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "setCell",
          "params": [
            "staffId",
            "day",
            "to"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "statusOf",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "ShiftCell",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "getShiftIdFor",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "string | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isWorking",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isDayOff",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isUndecided",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "assignmentsOn",
          "params": [
            "day"
          ],
          "returns": "ShiftAssignment[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "assignmentsForStaff",
          "params": [
            "staffId"
          ],
          "returns": "ShiftAssignment[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "countWorkingByShift",
          "params": [
            "day"
          ],
          "returns": "Map<string, number>",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "countDayOffOn",
          "params": [
            "day"
          ],
          "returns": "number",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "countDayOffForStaff",
          "params": [
            "staffId"
          ],
          "returns": "number",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "countWorkingForStaff",
          "params": [
            "staffId",
            "shiftIds"
          ],
          "returns": "number",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "requiredFor",
          "params": [
            "day",
            "shiftName"
          ],
          "returns": "number",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "setRequired",
          "params": [
            "day",
            "shiftName",
            "count"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "setRequiredForAllDays",
          "params": [
            "shiftName",
            "count"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "checkConstraints",
          "params": [
            "constraints"
          ],
          "returns": "ConstraintViolation[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "toPlain",
          "params": [],
          "returns": "MonthlyStaffSchedulePlain",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "fromPlain",
          "params": [
            "plain"
          ],
          "returns": "MonthlyStaffSchedule",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "RequiredStaffing",
      "file": "schedule/RequiredStaffing.ts",
      "kind": "value",
      "fields": [
        {
          "name": "byDay",
          "type": "Record<string, Record<string, number>>",
          "optional": false
        }
      ],
      "getters": [],
      "methods": [
        {
          "name": "empty",
          "params": [],
          "returns": "RequiredStaffing",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "uniform",
          "params": [
            "days",
            "byName"
          ],
          "returns": "RequiredStaffing",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "requiredFor",
          "params": [
            "day",
            "shiftName"
          ],
          "returns": "number",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "requiredOn",
          "params": [
            "day"
          ],
          "returns": "Record<string, number>",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "setRequired",
          "params": [
            "day",
            "shiftName",
            "count"
          ],
          "returns": "RequiredStaffing",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "setRequiredForDays",
          "params": [
            "days",
            "shiftName",
            "count"
          ],
          "returns": "RequiredStaffing",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "toPlain",
          "params": [],
          "returns": "RequiredStaffingState",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "fromPlain",
          "params": [
            "plain"
          ],
          "returns": "RequiredStaffing",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "RequiredStaffingConstraint",
      "file": "schedule/RequiredStaffingConstraint.ts",
      "kind": "value",
      "fields": [],
      "getters": [],
      "methods": [
        {
          "name": "describe",
          "params": [],
          "returns": "string",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "check",
          "params": [
            "schedule"
          ],
          "returns": "ConstraintViolation[]",
          "isStatic": false,
          "returnsSelf": false
        }
      ]
    },
    {
      "name": "ScheduleAvailability",
      "file": "schedule/ScheduleAvailability.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "scheduleId",
          "type": "string",
          "optional": false
        },
        {
          "name": "byStaff",
          "type": "Record<string, string[]>",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "scheduleId"
      ],
      "methods": [
        {
          "name": "create",
          "params": [
            "scheduleId",
            "staffIds",
            "shiftIds"
          ],
          "returns": "ScheduleAvailability",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "allowedShiftIds",
          "params": [
            "staffId"
          ],
          "returns": "string[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isAllowed",
          "params": [
            "staffId",
            "shiftId"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "allowForAll",
          "params": [
            "staffIds",
            "shiftId"
          ],
          "returns": "ScheduleAvailability",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "allowAllIfUnset",
          "params": [
            "staffId",
            "shiftIds"
          ],
          "returns": "ScheduleAvailability",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "toggle",
          "params": [
            "staffId",
            "shiftId"
          ],
          "returns": "ScheduleAvailability",
          "isStatic": false,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "ScheduleCandidates",
      "file": "schedule/ScheduleCandidates.ts",
      "kind": "value",
      "fields": [
        {
          "name": "scheduleId",
          "type": "string",
          "optional": false
        },
        {
          "name": "byCell",
          "type": "Record<string, ShiftCell[]>",
          "optional": false
        },
        {
          "name": "legalByCell",
          "type": "Record<string, ShiftCell[]>",
          "optional": false
        }
      ],
      "getters": [
        "scheduleId",
        "size"
      ],
      "methods": [
        {
          "name": "empty",
          "params": [
            "scheduleId"
          ],
          "returns": "ScheduleCandidates",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "fromLegal",
          "params": [
            "scheduleId",
            "legalByCell"
          ],
          "returns": "ScheduleCandidates",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "candidatesOf",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "ShiftCell[] | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "legalCandidatesOf",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "ShiftCell[] | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "countOf",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "number | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "withCell",
          "params": [
            "staffId",
            "day",
            "candidates"
          ],
          "returns": "ScheduleCandidates",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withoutCell",
          "params": [
            "staffId",
            "day"
          ],
          "returns": "ScheduleCandidates",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "forcedCells",
          "params": [],
          "returns": "ForcedCell[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "deadCells",
          "params": [],
          "returns": "CandidateCell[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "toPlain",
          "params": [],
          "returns": "ScheduleCandidatesState",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "fromPlain",
          "params": [
            "plain"
          ],
          "returns": "ScheduleCandidates",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "ScheduleConstraints",
      "file": "schedule/ScheduleConstraints.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "scheduleId",
          "type": "string",
          "optional": false
        },
        {
          "name": "leaderRules",
          "type": "ShiftLeaderRuleState[]",
          "optional": false
        },
        {
          "name": "maxConsecutiveWorkdays",
          "type": "number",
          "optional": true
        },
        {
          "name": "checkShiftWish",
          "type": "boolean",
          "optional": true
        },
        {
          "name": "minMonthlyDayOff",
          "type": "number",
          "optional": true
        },
        {
          "name": "maxDayOffPerDay",
          "type": "number",
          "optional": true
        },
        {
          "name": "linkedReportIds",
          "type": "string[]",
          "optional": true
        }
      ],
      "getters": [
        "id",
        "scheduleId",
        "maxConsecutiveWorkdays",
        "checkShiftWish",
        "minMonthlyDayOff",
        "maxDayOffPerDay",
        "linkedReportIds",
        "leaderRules"
      ],
      "methods": [
        {
          "name": "linkReport",
          "params": [
            "reportId"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "unlinkReport",
          "params": [
            "reportId"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "modelConstraints",
          "params": [
            "shiftIdsOf"
          ],
          "returns": "ScheduleConstraint[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "leaderRule",
          "params": [
            "key"
          ],
          "returns": "ShiftLeaderRule | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "leaderConstraints",
          "params": [
            "shiftIdsOf"
          ],
          "returns": "ShiftLeaderConstraint[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "addLeader",
          "params": [
            "ruleKey",
            "staffId"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "removeLeader",
          "params": [
            "ruleKey",
            "staffId"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "removeStaff",
          "params": [
            "staffId"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "addRule",
          "params": [
            "rule"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "removeRule",
          "params": [
            "ruleKey"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "setRuleShift",
          "params": [
            "ruleKey",
            "shiftName"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "setRuleLabel",
          "params": [
            "ruleKey",
            "label"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "setRuleMinCount",
          "params": [
            "ruleKey",
            "minCount"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "toPlain",
          "params": [],
          "returns": "ScheduleConstraintsState",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "fromPlain",
          "params": [
            "s"
          ],
          "returns": "ScheduleConstraints",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "ScheduleEditLog",
      "file": "schedule/ScheduleEditLog.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "entries",
          "type": "ScheduleEditEntryPlain[]",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "entries",
        "latest"
      ],
      "methods": [
        {
          "name": "empty",
          "params": [
            "scheduleId"
          ],
          "returns": "ScheduleEditLog",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "entriesWithConcessions",
          "params": [],
          "returns": "ScheduleEditEntryPlain[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "append",
          "params": [
            "entry"
          ],
          "returns": "ScheduleEditLog",
          "isStatic": false,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "ScheduleReport",
      "file": "schedule/ScheduleReport.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "scheduleId",
          "type": "string",
          "optional": false
        },
        {
          "name": "worldLineNodeId",
          "type": "string",
          "optional": false
        },
        {
          "name": "year",
          "type": "number",
          "optional": false
        },
        {
          "name": "month",
          "type": "number",
          "optional": false
        },
        {
          "name": "storeId",
          "type": "string",
          "optional": false
        },
        {
          "name": "title",
          "type": "string",
          "optional": false
        },
        {
          "name": "compromises",
          "type": "CompromiseEntry[]",
          "optional": false
        },
        {
          "name": "busyDayContributions",
          "type": "BusyDayEntry[]",
          "optional": false
        },
        {
          "name": "contributionScores",
          "type": "ContributionScoreEntry[]",
          "optional": false
        },
        {
          "name": "considerationNotes",
          "type": "Record<string, string>",
          "optional": false
        },
        {
          "name": "compromiseWeight",
          "type": "number",
          "optional": false
        },
        {
          "name": "busyDayWeight",
          "type": "number",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "scheduleId",
        "worldLineNodeId",
        "year",
        "month",
        "storeId",
        "title",
        "compromises",
        "busyDayContributions",
        "contributionScores",
        "compromiseWeight",
        "busyDayWeight",
        "considerationNotes"
      ],
      "methods": [
        {
          "name": "idOf",
          "params": [
            "scheduleId",
            "worldLineNodeId"
          ],
          "returns": "string",
          "isStatic": true,
          "returnsSelf": false
        },
        {
          "name": "scheduleIdOf",
          "params": [
            "reportId"
          ],
          "returns": "string",
          "isStatic": true,
          "returnsSelf": false
        },
        {
          "name": "defaultTitle",
          "params": [
            "year",
            "month"
          ],
          "returns": "string",
          "isStatic": true,
          "returnsSelf": false
        },
        {
          "name": "create",
          "params": [
            "params"
          ],
          "returns": "ScheduleReport",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "rename",
          "params": [
            "title"
          ],
          "returns": "ScheduleReport",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "reweight",
          "params": [
            "compromiseWeight",
            "busyDayWeight"
          ],
          "returns": "ScheduleReport",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "noteFor",
          "params": [
            "staffId"
          ],
          "returns": "string",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "setNote",
          "params": [
            "staffId",
            "text"
          ],
          "returns": "ScheduleReport",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "toPlain",
          "params": [],
          "returns": "ScheduleReportState",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "fromPlain",
          "params": [
            "plain"
          ],
          "returns": "ScheduleReport",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "ShiftAssignment",
      "file": "schedule/ShiftAssignment.ts",
      "kind": "value",
      "fields": [
        {
          "name": "staffId",
          "type": "string",
          "optional": false
        },
        {
          "name": "day",
          "type": "WorkingDay",
          "optional": false
        },
        {
          "name": "shift",
          "type": "ShiftValue",
          "optional": false
        }
      ],
      "getters": [
        "staffId",
        "day",
        "shift",
        "isDayOff",
        "isUndecided",
        "isWorking",
        "shiftId"
      ],
      "methods": [
        {
          "name": "toPlain",
          "params": [],
          "returns": "ShiftAssignmentPlain",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "fromPlain",
          "params": [
            "plain"
          ],
          "returns": "ShiftAssignment",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "ShiftLeaderConstraint",
      "file": "schedule/ShiftLeaderConstraint.ts",
      "kind": "value",
      "fields": [],
      "getters": [],
      "methods": [
        {
          "name": "describe",
          "params": [],
          "returns": "string",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "check",
          "params": [
            "schedule"
          ],
          "returns": "ConstraintViolation[]",
          "isStatic": false,
          "returnsSelf": false
        }
      ]
    },
    {
      "name": "ShiftLeaderRule",
      "file": "schedule/ShiftLeaderRule.ts",
      "kind": "value",
      "fields": [
        {
          "name": "key",
          "type": "string",
          "optional": false
        },
        {
          "name": "label",
          "type": "string",
          "optional": false
        },
        {
          "name": "shiftName",
          "type": "string",
          "optional": false
        },
        {
          "name": "leaderStaffIds",
          "type": "string[]",
          "optional": false
        },
        {
          "name": "minCount",
          "type": "number",
          "optional": true
        }
      ],
      "getters": [
        "key",
        "label",
        "shiftName",
        "leaderStaffIds",
        "minCount"
      ],
      "methods": [
        {
          "name": "countOnShift",
          "params": [
            "schedule",
            "day",
            "shiftIds"
          ],
          "returns": "number",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isSatisfiedOn",
          "params": [
            "schedule",
            "day",
            "shiftIds"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        }
      ]
    },
    {
      "name": "Staff",
      "file": "staff/Staff.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "name",
          "type": "string",
          "optional": false
        },
        {
          "name": "department",
          "type": "string",
          "optional": true
        }
      ],
      "getters": [
        "id",
        "name",
        "department"
      ],
      "methods": [
        {
          "name": "rename",
          "params": [
            "name"
          ],
          "returns": "Staff",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "changeDepartment",
          "params": [
            "department"
          ],
          "returns": "Staff",
          "isStatic": false,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "StaffMonthlyShiftWish",
      "file": "schedule/StaffMonthlyShiftWish.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "staffId",
          "type": "string",
          "optional": false
        },
        {
          "name": "year",
          "type": "number",
          "optional": false
        },
        {
          "name": "month",
          "type": "number",
          "optional": false
        },
        {
          "name": "byDay",
          "type": "Record<string, Record<string, ShiftWishPreference>>",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "staffId",
        "year",
        "month"
      ],
      "methods": [
        {
          "name": "idOf",
          "params": [
            "staffId",
            "year",
            "month"
          ],
          "returns": "string",
          "isStatic": true,
          "returnsSelf": false
        },
        {
          "name": "create",
          "params": [
            "params"
          ],
          "returns": "StaffMonthlyShiftWish",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "workingDays",
          "params": [],
          "returns": "WorkingDay[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "preferenceFor",
          "params": [
            "day",
            "optionKey"
          ],
          "returns": "ShiftWishPreference | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "wishesOn",
          "params": [
            "day"
          ],
          "returns": "Record<string, ShiftWishPreference>",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isEmptyOn",
          "params": [
            "day"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "setPreference",
          "params": [
            "day",
            "optionKey",
            "pref"
          ],
          "returns": "StaffMonthlyShiftWish",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "cyclePreference",
          "params": [
            "day",
            "optionKey"
          ],
          "returns": "StaffMonthlyShiftWish",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "toPlain",
          "params": [],
          "returns": "StaffMonthlyShiftWishState",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "fromPlain",
          "params": [
            "plain"
          ],
          "returns": "StaffMonthlyShiftWish",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "WorkingDay",
      "file": "schedule/WorkingDay.ts",
      "kind": "value",
      "fields": [
        {
          "name": "year",
          "type": "number",
          "optional": false
        },
        {
          "name": "month",
          "type": "number",
          "optional": false
        },
        {
          "name": "day",
          "type": "number",
          "optional": false
        }
      ],
      "getters": [
        "year",
        "month",
        "day",
        "key",
        "label",
        "weekday"
      ],
      "methods": [
        {
          "name": "of",
          "params": [
            "year",
            "month",
            "day"
          ],
          "returns": "WorkingDay",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "fromKey",
          "params": [
            "key"
          ],
          "returns": "WorkingDay",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "toDate",
          "params": [],
          "returns": "Date",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "equals",
          "params": [
            "other"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "compareTo",
          "params": [
            "other"
          ],
          "returns": "number",
          "isStatic": false,
          "returnsSelf": false
        }
      ]
    },
    {
      "name": "WorkingStaffGroup",
      "file": "staff/WorkingStaffGroup.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "members",
          "type": "WorkingStaffMemberState[]",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "members"
      ],
      "methods": [
        {
          "name": "ofRoster",
          "params": [
            "id",
            "staffIds"
          ],
          "returns": "WorkingStaffGroup",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "staffIds",
          "params": [],
          "returns": "string[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "has",
          "params": [
            "staffId"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isTemporary",
          "params": [
            "staffId"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "temporaryStaff",
          "params": [],
          "returns": "Staff[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "resolve",
          "params": [
            "roster"
          ],
          "returns": "Staff[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "addRoster",
          "params": [
            "staffId"
          ],
          "returns": "WorkingStaffGroup",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "addTemporary",
          "params": [
            "staff"
          ],
          "returns": "WorkingStaffGroup",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "remove",
          "params": [
            "staffId"
          ],
          "returns": "WorkingStaffGroup",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "move",
          "params": [
            "staffId",
            "toIndex"
          ],
          "returns": "WorkingStaffGroup",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "renameTemporary",
          "params": [
            "staffId",
            "name"
          ],
          "returns": "WorkingStaffGroup",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "changeTemporaryDepartment",
          "params": [
            "staffId",
            "department"
          ],
          "returns": "WorkingStaffGroup",
          "isStatic": false,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "WorkShift",
      "file": "schedule/WorkShift.ts",
      "kind": "part",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "name",
          "type": "string",
          "optional": false
        },
        {
          "name": "startMinute",
          "type": "number",
          "optional": false
        },
        {
          "name": "aliases",
          "type": "string[]",
          "optional": true
        }
      ],
      "getters": [
        "id",
        "name",
        "aliases",
        "startMinute",
        "startHour",
        "startMinuteOfHour",
        "start",
        "startTimeLabel"
      ],
      "methods": [
        {
          "name": "of",
          "params": [
            "id",
            "name",
            "start",
            "opts"
          ],
          "returns": "WorkShift",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "rename",
          "params": [
            "name"
          ],
          "returns": "WorkShift",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "changeStart",
          "params": [
            "start"
          ],
          "returns": "WorkShift",
          "isStatic": false,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "WorkShiftSet",
      "file": "schedule/WorkShiftSet.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "shifts",
          "type": "WorkShiftState[]",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "shifts"
      ],
      "methods": [
        {
          "name": "of",
          "params": [
            "id",
            "shifts"
          ],
          "returns": "WorkShiftSet",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "shiftIds",
          "params": [],
          "returns": "string[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "findById",
          "params": [
            "id"
          ],
          "returns": "WorkShift | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "groupedByName",
          "params": [],
          "returns": "{ name: string; shifts: WorkShift[]; }[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "addShift",
          "params": [
            "shift"
          ],
          "returns": "WorkShiftSet",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "rename",
          "params": [
            "id",
            "name"
          ],
          "returns": "WorkShiftSet",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "changeStart",
          "params": [
            "id",
            "start"
          ],
          "returns": "WorkShiftSet",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "remove",
          "params": [
            "id"
          ],
          "returns": "WorkShiftSet",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withId",
          "params": [
            "newId"
          ],
          "returns": "WorkShiftSet",
          "isStatic": false,
          "returnsSelf": true
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "ConstraintViolation",
      "to": "WorkingDay",
      "kind": "contains",
      "via": "days",
      "many": true,
      "foundBy": "type"
    },
    {
      "from": "ConstraintViolation",
      "to": "Staff",
      "kind": "references",
      "via": "staffId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "DailyReservationInfo",
      "to": "MonthlyStaffSchedule",
      "kind": "references",
      "via": "scheduleId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "MonthlyStaffSchedule",
      "to": "ShiftAssignment",
      "kind": "contains",
      "via": "assignments",
      "many": true,
      "foundBy": "type"
    },
    {
      "from": "MonthlyStaffSchedule",
      "to": "RequiredStaffing",
      "kind": "contains",
      "via": "requiredStaffing",
      "many": false,
      "foundBy": "type"
    },
    {
      "from": "MonthlyStaffSchedule",
      "to": "WorkingStaffGroup",
      "kind": "references",
      "via": "workingStaffGroupId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "ScheduleAvailability",
      "to": "MonthlyStaffSchedule",
      "kind": "references",
      "via": "scheduleId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "ScheduleCandidates",
      "to": "MonthlyStaffSchedule",
      "kind": "references",
      "via": "scheduleId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "ScheduleConstraints",
      "to": "ShiftLeaderRule",
      "kind": "contains",
      "via": "leaderRules",
      "many": true,
      "foundBy": "type"
    },
    {
      "from": "ScheduleConstraints",
      "to": "MonthlyStaffSchedule",
      "kind": "references",
      "via": "scheduleId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "ScheduleReport",
      "to": "MonthlyStaffSchedule",
      "kind": "references",
      "via": "scheduleId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "ShiftAssignment",
      "to": "WorkingDay",
      "kind": "contains",
      "via": "day",
      "many": false,
      "foundBy": "type"
    },
    {
      "from": "ShiftAssignment",
      "to": "Staff",
      "kind": "references",
      "via": "staffId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "ShiftLeaderRule",
      "to": "Staff",
      "kind": "references",
      "via": "leaderStaffIds",
      "many": true,
      "foundBy": "id-naming"
    },
    {
      "from": "StaffMonthlyShiftWish",
      "to": "Staff",
      "kind": "references",
      "via": "staffId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "WorkShiftSet",
      "to": "WorkShift",
      "kind": "contains",
      "via": "shifts",
      "many": true,
      "foundBy": "type"
    }
  ],
  "diagnostics": {
    "sourceRoot": "hotel-shift-puzzle-bubly/hotel-shift-puzzle-model/src/lib",
    "fileCount": 37,
    "classesWithoutState": [
      "MaxConsecutiveWorkdaysConstraint",
      "MaxDayOffPerDayConstraint",
      "MinMonthlyDayOffConstraint",
      "RequiredStaffingConstraint",
      "ShiftLeaderConstraint"
    ],
    "unresolvedTypes": [],
    "unresolvedIdFields": [
      "MonthlyStaffSchedule.storeId",
      "ScheduleConstraints.linkedReportIds",
      "ScheduleReport.storeId",
      "ScheduleReport.worldLineNodeId"
    ]
  }
};
