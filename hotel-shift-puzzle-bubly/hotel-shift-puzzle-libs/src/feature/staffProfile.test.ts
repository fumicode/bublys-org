import {
  DayOffStyle,
  ShiftLeaderRule,
  WorkingStaffGroup,
} from "@bublys-org/hotel-shift-puzzle-model";
import { createSampleStaffList, createSampleStaffProfileDictionary } from "../data/index.js";
import { staffProfileResolver } from "./staffProfile.js";

const staffList = createSampleStaffList();
const dictionary = createSampleStaffProfileDictionary();
const night = new ShiftLeaderRule({
  key: "night",
  label: "夜責",
  shiftName: "遅番",
  leaderStaffIds: ["staff-tsuchiya"],
});

describe("staffProfileResolver — 名前の横の記号を、勤務表・日別バブル・名簿で同じ引き方で読む", () => {
  test("例データの新人（伊藤）には 🔰 が付く", () => {
    const profileOf = staffProfileResolver({ staffList, dictionary });
    expect(profileOf("staff-5").marks[0]).toEqual({
      kind: "symbol",
      text: "🔰",
      label: "経験：新人",
      framed: false,
    });
  });

  test("勤務表では、責任者は制約セットから、休みの形はメンバーの上書きから読む", () => {
    const staffGroup = WorkingStaffGroup.ofRoster(
      "g",
      staffList.map((s) => s.id)
    ).overrideDayOffStyle("staff-tsuchiya", DayOffStyle.clustered());
    const profileOf = staffProfileResolver({
      staffList,
      staffGroup,
      dictionary,
      leaderRules: [night],
    });

    expect(profileOf("staff-tsuchiya").marks.map((m) => m.kind)).toEqual(["leader", "dayOffStyle"]);
    expect(profileOf("staff-tsuchiya").entry(":dayOffStyle")?.source).toBe("member");
  });

  test("勤務表で新人を外す上書きをすると、その勤務表では 🔰 が消える", () => {
    const staffGroup = WorkingStaffGroup.ofRoster(
      "g",
      staffList.map((s) => s.id)
    ).overrideProfileValues("staff-5", "experience", []);
    const profileOf = staffProfileResolver({ staffList, staffGroup, dictionary });

    expect(profileOf("staff-5").marks.some((m) => m.kind === "symbol")).toBe(false);
  });
});
