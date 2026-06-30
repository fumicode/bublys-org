/**
 * shift-puzzle 固有のオブジェクト型をレジストリに登録する
 */
import { registerObjectType, registerObjectBubble } from "@bublys-org/bubbles-ui";
import PersonIcon from "@mui/icons-material/Person";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import TaskIcon from "@mui/icons-material/Task";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";
import React from "react";

registerObjectType('Member', React.createElement(PersonIcon, { fontSize: 'small' }));
registerObjectType('MemberAvailability', React.createElement(EventAvailableIcon, { fontSize: 'small' }));
registerObjectType('Task', React.createElement(TaskIcon, { fontSize: 'small' }));
registerObjectType('Shift', React.createElement(CalendarViewWeekIcon, { fontSize: 'small' }));

registerObjectBubble('Member',             { openingPosition: 'right-side' });
registerObjectBubble('Task',               { openingPosition: 'right-side' });
registerObjectBubble('MemberAvailability', { openingPosition: 'right-side' });
registerObjectBubble('ShiftStatus',        { openingPosition: 'origin-side' });
