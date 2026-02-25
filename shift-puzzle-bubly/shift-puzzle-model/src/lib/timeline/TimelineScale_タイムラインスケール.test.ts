import { TimelineScale_タイムラインスケール } from "./TimelineScale_タイムラインスケール";
import { TimeSlot_時間帯 } from "../master/TimeSlot_時間帯";

describe("TimelineScale_タイムラインスケール", () => {
  const defaultTimeSlots = TimeSlot_時間帯.createDefaultTimeSlots();
  const pixelsPerHour = 40;
  const dayGap = 16;

  const scale = TimelineScale_タイムラインスケール.fromTimeSlots(
    defaultTimeSlots,
    pixelsPerHour,
    dayGap
  );

  describe("fromTimeSlots", () => {
    it("日付ごとのday情報が正しく生成される", () => {
      const boundaries = scale.getDayBoundaries();
      // 3/17〜3/22の6日分
      expect(boundaries.length).toBe(6);
      expect(boundaries[0].date).toBe("2025-03-17");
      expect(boundaries[5].date).toBe("2025-03-22");
    });

    it("各日の開始・終了時刻が正しい", () => {
      const { days } = scale.state;
      // 3/17: 08:00-17:00
      const day17 = days.find((d) => d.date === "2025-03-17");
      expect(day17).toBeDefined();
      expect(day17!.startMinutes).toBe(8 * 60); // 08:00
      expect(day17!.endMinutes).toBe(17 * 60); // 17:00

      // 3/19: 08:00-20:00 (morning + afternoon + evening)
      const day19 = days.find((d) => d.date === "2025-03-19");
      expect(day19).toBeDefined();
      expect(day19!.startMinutes).toBe(8 * 60);
      expect(day19!.endMinutes).toBe(20 * 60);
    });
  });

  describe("timeToPixel", () => {
    it("初日の開始時刻は x=0", () => {
      const px = scale.timeToPixel("2025-03-17", "08:00");
      expect(px).toBe(0);
    });

    it("初日の中間時刻が正しく変換される", () => {
      // 08:00から3時間後 = 12:00 → 3h * 40px/h = 120px
      const px = scale.timeToPixel("2025-03-17", "11:00");
      expect(px).toBe(3 * pixelsPerHour);
    });

    it("2日目の開始はdayGap分オフセットされる", () => {
      // 3/17: 08:00-17:00 = 9h → 9*40=360px
      // 3/18開始: 360 + dayGap = 376
      const px = scale.timeToPixel("2025-03-18", "08:00");
      const day17Width = 9 * pixelsPerHour;
      expect(px).toBe(day17Width + dayGap);
    });
  });

  describe("pixelToTime", () => {
    it("x=0 → 初日の開始時刻", () => {
      const result = scale.pixelToTime(0);
      expect(result.date).toBe("2025-03-17");
      expect(result.time).toBe("08:00");
    });

    it("timeToPixelの逆変換が一致する", () => {
      const targetDate = "2025-03-19";
      const targetTime = "12:00";
      const px = scale.timeToPixel(targetDate, targetTime);
      const result = scale.pixelToTime(px);
      expect(result.date).toBe(targetDate);
      expect(result.time).toBe(targetTime);
    });

    it("負のピクセルはクランプされる", () => {
      const result = scale.pixelToTime(-100);
      expect(result.date).toBe("2025-03-17");
      expect(result.time).toBe("08:00");
    });
  });

  describe("getBarRect", () => {
    it("TimeSlotのバー矩形が正しく計算される", () => {
      // 3/17 終日: 08:00-17:00 = 9h
      const slot = defaultTimeSlots.find(
        (s) => s.id === "2025-03-17_all_day"
      )!;
      const rect = scale.getBarRect(slot);
      expect(rect.x).toBe(0);
      expect(rect.width).toBe(9 * pixelsPerHour);
    });

    it("午後のスロットはx>0から始まる", () => {
      // 3/19 午後: 12:00-17:00
      const slot = defaultTimeSlots.find(
        (s) => s.id === "2025-03-19_afternoon"
      )!;
      const rect = scale.getBarRect(slot);
      // 3/19の開始は08:00、午後は12:00 → 4h分オフセット
      const day19Start = scale.timeToPixel("2025-03-19", "08:00");
      expect(rect.x).toBe(day19Start + 4 * pixelsPerHour);
      expect(rect.width).toBe(5 * pixelsPerHour); // 12:00-17:00 = 5h
    });
  });

  describe("getDayBoundaries", () => {
    it("各日の幅が時間に比例する", () => {
      const boundaries = scale.getDayBoundaries();
      // 3/17: 08:00-17:00 = 9h → 360px
      expect(boundaries[0].width).toBe(9 * pixelsPerHour);
    });

    it("日付境界が連続してgap分だけ離れている", () => {
      const boundaries = scale.getDayBoundaries();
      const day1End = boundaries[0].x + boundaries[0].width;
      expect(boundaries[1].x).toBe(day1End + dayGap);
    });
  });

  describe("totalWidth", () => {
    it("全日の幅+gap合計が正しい", () => {
      const boundaries = scale.getDayBoundaries();
      const totalDayWidths = boundaries.reduce(
        (sum, b) => sum + b.width,
        0
      );
      const totalGaps = (boundaries.length - 1) * dayGap;
      expect(scale.totalWidth).toBe(totalDayWidths + totalGaps);
    });
  });

  describe("findClosestTimeSlot", () => {
    it("範囲内のピクセルから正しいTimeSlotを特定できる", () => {
      // 3/19 午前 (08:00-12:00) の中間あたり
      const px = scale.timeToPixel("2025-03-19", "10:00");
      const found = scale.findClosestTimeSlot(px, defaultTimeSlots);
      expect(found).toBeDefined();
      expect(found!.id).toBe("2025-03-19_morning");
    });
  });
});
