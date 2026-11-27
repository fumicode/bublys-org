import {
  DayOffStyle,
  ShiftLeaderRule,
  WorkingStaffGroup,
} from "@bublys-org/hotel-shift-puzzle-model";
import { createSampleStaffList } from "../data/index.js";
import { staffProfileResolver } from "./staffProfile.js";

const staffList = createSampleStaffList();
const night = new ShiftLeaderRule({
  key: "night",
  label: "夜責",
  shiftName: "遅番",
  leaderStaffIds: ["staff-tsuchiya"],
});

describe("staffProfileResolver — 名前の横の記号を、勤務表・日別バブル・名簿で同じ引き方で読む", () => {
  test("例データの新人（伊藤）には 🔰 が付く", () => {
    const profileOf = staffProfileResolver({ staffList });
    expect(profileOf("staff-5").marks[0]).toEqual({
      kind: "emojiTag",
      emoji: "🔰",
      label: "新人",
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
      leaderRules: [night],
    });

    expect(profileOf("staff-tsuchiya").marks.map((m) => m.kind)).toEqual([
      "emojiTag",
      "leader",
      "dayOffStyle",
    ]);
  });

  test("タグのない人には絵文字タグが出ない", () => {
    const profileOf = staffProfileResolver({ staffList });
    expect(profileOf("staff-1").emojiTags).toHaveLength(0);
  });
});
