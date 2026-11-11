"use client";
/** 暦バブリで何が開けるか ── url と、それを描く部品の対応表 */
import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { KoyomiCalendar } from "../feature/KoyomiCalendar.js";

/** 暦のカレンダー。koyomi/calendar は今月、koyomi/calendar/2026/11 はその月から開く */
const CalendarBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const year = Number(bubble.params.year);
  const month = Number(bubble.params.month);
  const valid = Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
  return valid ? <KoyomiCalendar year={year} month={month} /> : <KoyomiCalendar />;
};

export const koyomiBubbleRoutes: BubbleRoute[] = [
  { pattern: "koyomi/calendar/:year/:month", type: "koyomi-calendar", Component: CalendarBubble },
  { pattern: "koyomi/calendar", type: "koyomi-calendar", Component: CalendarBubble },
];
