/**
 * このバブリ固有のオブジェクト型をレジストリに登録する（副作用）
 *
 * ObjectView でダブルクリック展開・ドラッグを使うオブジェクト型をここで登録する。
 */
import { registerObjectType, registerObjectBubble } from "@bublys-org/bubbles-ui";
import PersonIcon from "@mui/icons-material/Person";
import React from "react";

registerObjectType('Staff', React.createElement(PersonIcon, { fontSize: 'small' }));
registerObjectBubble('Staff', { openingPosition: 'bubble-side' });
