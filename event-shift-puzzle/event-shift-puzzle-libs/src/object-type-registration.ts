/**
 * shift-puzzle 固有のオブジェクト型をレジストリに登録する
 */
import { registerObjectType, registerObjectBubble } from "@bublys-org/bubbles-ui";
import PersonIcon from "@mui/icons-material/Person";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import TaskIcon from "@mui/icons-material/Task";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";
import ViewTimelineIcon from "@mui/icons-material/ViewTimeline";
import HistoryIcon from "@mui/icons-material/History";
import React from "react";

registerObjectType('Member', React.createElement(PersonIcon, { fontSize: 'small' }));
registerObjectType('MemberAvailability', React.createElement(EventAvailableIcon, { fontSize: 'small' }));
registerObjectType('Task', React.createElement(TaskIcon, { fontSize: 'small' }));
registerObjectType('Shift', React.createElement(CalendarViewWeekIcon, { fontSize: 'small' }));

// 世界線に保存される集約ではないが、画面の上ではひとつの「もの」として振る舞うビュー。
// ObjectView の約束（ドラッグでき、ダブルクリックでバブルが開く）を満たすには型名が要る。
registerObjectType('TaskGantt', React.createElement(ViewTimelineIcon, { fontSize: 'small' }));
registerObjectType('ShiftPlanHistory', React.createElement(HistoryIcon, { fontSize: 'small' }));

registerObjectBubble('Member',             { openingPosition: 'bubble-side-right' });
registerObjectBubble('Task',               { openingPosition: 'bubble-side-right' });
registerObjectBubble('MemberAvailability', { openingPosition: 'bubble-side-right' });
registerObjectBubble('ShiftStatus',        { openingPosition: 'origin-side' });
