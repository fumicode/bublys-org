/**
 * ★ 自動生成。手で編集しないこと。
 *
 * 出どころ: event-shift-puzzle/event-shift-puzzle-model/src/lib
 * 生成: bublys-libs/model-graph の generate ターゲット
 *
 * 古くなったら `modelGraph.staleness.test.ts` が落ちる。落ちたら生成し直すこと。
 */
import type { ModelGraph } from '@bublys-org/model-graph';

export const MODEL_GRAPH: ModelGraph = {
  "classes": [
    {
      "name": "BlockList",
      "file": "shift-plan/BlockList.ts",
      "kind": "value",
      "fields": [
        {
          "name": "blocks",
          "type": "readonly (readonly string[])[]",
          "optional": false
        }
      ],
      "getters": [
        "totalBlocks"
      ],
      "methods": [
        {
          "name": "addUser",
          "params": [
            "blockIndex",
            "userId"
          ],
          "returns": "BlockList",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "removeUser",
          "params": [
            "blockIndex",
            "userId"
          ],
          "returns": "BlockList",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "hasUser",
          "params": [
            "blockIndex",
            "userId"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "getUsersAt",
          "params": [
            "blockIndex"
          ],
          "returns": "readonly string[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "getBlocksForUser",
          "params": [
            "userId"
          ],
          "returns": "number[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "addUserToRange",
          "params": [
            "startBlock",
            "endBlock",
            "userId"
          ],
          "returns": "BlockList",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "removeUserFromRange",
          "params": [
            "startBlock",
            "endBlock",
            "userId"
          ],
          "returns": "BlockList",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "removeUserFromAll",
          "params": [
            "userId"
          ],
          "returns": "BlockList",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "createEmpty",
          "params": [
            "totalBlocks"
          ],
          "returns": "BlockList",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "Member",
      "file": "member/Member.ts",
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
          "name": "furigana",
          "type": "string",
          "optional": true
        },
        {
          "name": "department",
          "type": "string",
          "optional": false
        },
        {
          "name": "isNewMember",
          "type": "boolean",
          "optional": false
        },
        {
          "name": "availability",
          "type": "Partial<Record<string, TimeRange[]>>",
          "optional": false
        },
        {
          "name": "notes",
          "type": "string",
          "optional": true
        },
        {
          "name": "createdAt",
          "type": "string",
          "optional": false
        },
        {
          "name": "updatedAt",
          "type": "string",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "name",
        "furigana",
        "department",
        "isNewMember",
        "availability",
        "notes"
      ],
      "methods": [
        {
          "name": "getAvailableRanges",
          "params": [
            "dayType"
          ],
          "returns": "readonly TimeRange[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isAvailableAt",
          "params": [
            "dayType",
            "minute"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isAvailableForShift",
          "params": [
            "shift"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "withDepartment",
          "params": [
            "department"
          ],
          "returns": "Member",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withIsNewMember",
          "params": [
            "isNewMember"
          ],
          "returns": "Member",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withNotes",
          "params": [
            "notes"
          ],
          "returns": "Member",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withAvailability",
          "params": [
            "availability"
          ],
          "returns": "Member",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withUpdatedState",
          "params": [
            "partial"
          ],
          "returns": "Member",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "create",
          "params": [
            "name",
            "department",
            "isNewMember"
          ],
          "returns": "Member",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "MemberFilter",
      "file": "member/MemberFilter.ts",
      "kind": "value",
      "fields": [
        {
          "name": "availableAtSlotId",
          "type": "string",
          "optional": true
        },
        {
          "name": "requiredSkillIds",
          "type": "readonly string[]",
          "optional": false
        },
        {
          "name": "tags",
          "type": "readonly string[]",
          "optional": false
        },
        {
          "name": "assignmentStatus",
          "type": "\"unassigned\" | \"assigned\" | \"over_assigned\"",
          "optional": true
        }
      ],
      "getters": [],
      "methods": [
        {
          "name": "apply",
          "params": [
            "members",
            "assignedCountMap"
          ],
          "returns": "Member[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "matches",
          "params": [
            "member",
            "assignedCountMap"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "withAvailableAtSlot",
          "params": [
            "slotId"
          ],
          "returns": "MemberFilter",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withRequiredSkills",
          "params": [
            "skillIds"
          ],
          "returns": "MemberFilter",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withTags",
          "params": [
            "tags"
          ],
          "returns": "MemberFilter",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withAssignmentStatus",
          "params": [
            "status"
          ],
          "returns": "MemberFilter",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "empty",
          "params": [],
          "returns": "MemberFilter",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "Shift",
      "file": "master/Shift.ts",
      "kind": "part",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "taskId",
          "type": "string",
          "optional": false
        },
        {
          "name": "date",
          "type": "string",
          "optional": true
        },
        {
          "name": "timeScheduleId",
          "type": "string",
          "optional": true
        },
        {
          "name": "blockList",
          "type": "BlockListState",
          "optional": true
        },
        {
          "name": "dayType",
          "type": "string",
          "optional": false
        },
        {
          "name": "weatherCondition",
          "type": "WeatherCondition",
          "optional": true
        },
        {
          "name": "startTime",
          "type": "string",
          "optional": false
        },
        {
          "name": "endTime",
          "type": "string",
          "optional": false
        },
        {
          "name": "requiredCount",
          "type": "number",
          "optional": false
        },
        {
          "name": "minCount",
          "type": "number",
          "optional": false
        },
        {
          "name": "maxCount",
          "type": "number",
          "optional": false
        },
        {
          "name": "label",
          "type": "string",
          "optional": true
        },
        {
          "name": "taskName",
          "type": "string",
          "optional": true
        },
        {
          "name": "responsibleDepartment",
          "type": "string",
          "optional": true
        }
      ],
      "getters": [
        "id",
        "taskId",
        "dayType",
        "weatherCondition",
        "startTime",
        "endTime",
        "startMinute",
        "endMinute",
        "durationMinutes",
        "requiredCount",
        "minCount",
        "maxCount",
        "taskName",
        "responsibleDepartment",
        "dragId",
        "timeScheduleId",
        "blockList"
      ],
      "methods": [
        {
          "name": "validBlockRange",
          "params": [
            "timeSchedule"
          ],
          "returns": "{ start: number; end: number; }",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isBlockInRange",
          "params": [
            "blockIndex",
            "timeSchedule"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "addUser",
          "params": [
            "blockIndex",
            "userId"
          ],
          "returns": "Shift",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "removeUser",
          "params": [
            "blockIndex",
            "userId"
          ],
          "returns": "Shift",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "addUserToRange",
          "params": [
            "startBlock",
            "endBlock",
            "userId"
          ],
          "returns": "Shift",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "toggleUser",
          "params": [
            "blockIndex",
            "userId"
          ],
          "returns": "Shift",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "getAssignedUserIds",
          "params": [],
          "returns": "string[]",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "toView",
          "params": [],
          "returns": "ShiftView",
          "isStatic": false,
          "returnsSelf": false
        }
      ]
    },
    {
      "name": "ShiftAssignmentStatus",
      "file": "shift-plan/ShiftAssignmentStatus.ts",
      "kind": "value",
      "fields": [
        {
          "name": "shiftId",
          "type": "string",
          "optional": false
        },
        {
          "name": "requiredCount",
          "type": "number",
          "optional": false
        },
        {
          "name": "totalBlocks",
          "type": "number",
          "optional": false
        },
        {
          "name": "blockCoverages",
          "type": "readonly BlockCoverage[]",
          "optional": false
        },
        {
          "name": "memberSummaries",
          "type": "readonly MemberAssignmentSummary[]",
          "optional": false
        },
        {
          "name": "shiftViolations",
          "type": "readonly AssignmentViolation[]",
          "optional": false
        },
        {
          "name": "violatingMemberIds",
          "type": "readonly string[]",
          "optional": false
        },
        {
          "name": "fulfillmentRate",
          "type": "number",
          "optional": false
        }
      ],
      "getters": [
        "shiftId",
        "requiredCount",
        "totalBlocks",
        "blockCoverages",
        "memberSummaries",
        "shiftViolations",
        "violatingMemberIds",
        "fulfillmentRate"
      ],
      "methods": [
        {
          "name": "compute",
          "params": [
            "shift",
            "timeSchedule",
            "members",
            "allShifts",
            "allTimeSchedules"
          ],
          "returns": "ShiftAssignmentStatus",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "ShiftPlan",
      "file": "shift-plan/ShiftPlan.ts",
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
          "name": "date",
          "type": "string",
          "optional": false
        },
        {
          "name": "weatherCondition",
          "type": "WeatherCondition",
          "optional": true
        },
        {
          "name": "timeSchedules",
          "type": "readonly TimeScheduleState[]",
          "optional": true
        },
        {
          "name": "shifts",
          "type": "readonly ShiftState[]",
          "optional": true
        },
        {
          "name": "createdAt",
          "type": "string",
          "optional": false
        },
        {
          "name": "updatedAt",
          "type": "string",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "name",
        "date",
        "weatherCondition",
        "timeSchedules",
        "shifts"
      ],
      "methods": [
        {
          "name": "getShiftById",
          "params": [
            "shiftId"
          ],
          "returns": "Shift | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "getTimeScheduleById",
          "params": [
            "tsId"
          ],
          "returns": "TimeSchedule | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "addUserToBlock",
          "params": [
            "shiftId",
            "blockIndex",
            "userId"
          ],
          "returns": "ShiftPlan",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "removeUserFromBlock",
          "params": [
            "shiftId",
            "blockIndex",
            "userId"
          ],
          "returns": "ShiftPlan",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "addUserToBlockRange",
          "params": [
            "shiftId",
            "startBlock",
            "endBlock",
            "userId"
          ],
          "returns": "ShiftPlan",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "removeUserFromBlockRange",
          "params": [
            "shiftId",
            "startBlock",
            "endBlock",
            "userId"
          ],
          "returns": "ShiftPlan",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withName",
          "params": [
            "name"
          ],
          "returns": "ShiftPlan",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withWeatherCondition",
          "params": [
            "weatherCondition"
          ],
          "returns": "ShiftPlan",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "withUpdatedState",
          "params": [
            "partial"
          ],
          "returns": "ShiftPlan",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "create",
          "params": [
            "name",
            "date",
            "weatherCondition"
          ],
          "returns": "ShiftPlan",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "createWithSchedule",
          "params": [
            "name",
            "date",
            "startTime",
            "endTime"
          ],
          "returns": "ShiftPlan",
          "isStatic": true,
          "returnsSelf": true
        },
        {
          "name": "createFromWorldLine",
          "params": [
            "name",
            "date",
            "shifts",
            "timeSchedules",
            "weatherCondition"
          ],
          "returns": "ShiftPlan",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "ShiftPreference",
      "file": "shift-plan/ShiftPreference.ts",
      "kind": "aggregate",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "memberId",
          "type": "string",
          "optional": false
        },
        {
          "name": "entries",
          "type": "readonly ShiftPreferenceEntryState[]",
          "optional": false
        },
        {
          "name": "submittedAt",
          "type": "string",
          "optional": false
        },
        {
          "name": "updatedAt",
          "type": "string",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "memberId",
        "entries",
        "submittedAt",
        "updatedAt"
      ],
      "methods": [
        {
          "name": "getEntryByDayType",
          "params": [
            "dayType"
          ],
          "returns": "ShiftPreferenceEntryState | undefined",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "isAvailableAt",
          "params": [
            "dayType",
            "minute"
          ],
          "returns": "boolean",
          "isStatic": false,
          "returnsSelf": false
        },
        {
          "name": "withEntries",
          "params": [
            "entries"
          ],
          "returns": "ShiftPreference",
          "isStatic": false,
          "returnsSelf": true
        },
        {
          "name": "create",
          "params": [
            "memberId",
            "entries"
          ],
          "returns": "ShiftPreference",
          "isStatic": true,
          "returnsSelf": true
        }
      ]
    },
    {
      "name": "Task",
      "file": "master/Task.ts",
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
          "name": "task",
          "type": "string",
          "optional": false
        },
        {
          "name": "responsibleDepartment",
          "type": "string",
          "optional": false
        },
        {
          "name": "description",
          "type": "string",
          "optional": true
        }
      ],
      "getters": [
        "id",
        "name",
        "task",
        "responsibleDepartment",
        "description"
      ],
      "methods": []
    },
    {
      "name": "TimeSchedule",
      "file": "master/TimeSchedule.ts",
      "kind": "part",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "optional": false
        },
        {
          "name": "dayType",
          "type": "string",
          "optional": false
        },
        {
          "name": "weatherCondition",
          "type": "WeatherCondition",
          "optional": true
        },
        {
          "name": "startTime",
          "type": "string",
          "optional": false
        },
        {
          "name": "endTime",
          "type": "string",
          "optional": false
        }
      ],
      "getters": [
        "id",
        "dayType",
        "weatherCondition",
        "startTime",
        "endTime",
        "startMinute",
        "endMinute",
        "durationMinutes",
        "totalBlocks"
      ],
      "methods": []
    }
  ],
  "relations": [
    {
      "from": "Shift",
      "to": "BlockList",
      "kind": "contains",
      "via": "blockList",
      "many": false,
      "foundBy": "type"
    },
    {
      "from": "Shift",
      "to": "Task",
      "kind": "references",
      "via": "taskId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "Shift",
      "to": "TimeSchedule",
      "kind": "references",
      "via": "timeScheduleId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "ShiftAssignmentStatus",
      "to": "Shift",
      "kind": "references",
      "via": "shiftId",
      "many": false,
      "foundBy": "id-naming"
    },
    {
      "from": "ShiftAssignmentStatus",
      "to": "Member",
      "kind": "references",
      "via": "violatingMemberIds",
      "many": true,
      "foundBy": "id-naming"
    },
    {
      "from": "ShiftPlan",
      "to": "Shift",
      "kind": "contains",
      "via": "shifts",
      "many": true,
      "foundBy": "type"
    },
    {
      "from": "ShiftPlan",
      "to": "TimeSchedule",
      "kind": "contains",
      "via": "timeSchedules",
      "many": true,
      "foundBy": "type"
    },
    {
      "from": "ShiftPreference",
      "to": "Member",
      "kind": "references",
      "via": "memberId",
      "many": false,
      "foundBy": "id-naming"
    }
  ],
  "diagnostics": {
    "sourceRoot": "event-shift-puzzle/event-shift-puzzle-model/src/lib",
    "fileCount": 10,
    "classesWithoutState": [],
    "unresolvedTypes": [],
    "unresolvedIdFields": [
      "MemberFilter.availableAtSlotId",
      "MemberFilter.requiredSkillIds"
    ]
  }
};
