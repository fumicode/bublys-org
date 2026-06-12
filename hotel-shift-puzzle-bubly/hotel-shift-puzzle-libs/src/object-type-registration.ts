/**
 * このバブリ固有のオブジェクト型をレジストリに登録する（副作用）
 *
 * ObjectView でダブルクリック展開を使うオブジェクト型をここで登録する。
 * 例:
 *   import PersonIcon from "@mui/icons-material/Person";
 *   import React from "react";
 *   import { registerObjectType, registerObjectBubble } from "@bublys-org/bubbles-ui";
 *
 *   registerObjectType('Staff', React.createElement(PersonIcon, { fontSize: 'small' }));
 *   registerObjectBubble('Staff', { openingPosition: 'bubble-side' });
 */
export {};
