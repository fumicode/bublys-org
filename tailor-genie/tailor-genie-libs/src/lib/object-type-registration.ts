/**
 * tailor-genie 固有のオブジェクト型をレジストリに登録する
 *
 * 登録しないと ObjectView からドラッグはできても、宇宙やポケットが
 * 「知らない型」として受け取らない（受け入れ側は登録済みの型しか見ない）。
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import ForumIcon from "@mui/icons-material/Forum";
import React from "react";

/** 話し手 */
registerObjectType("Speaker", React.createElement(RecordVoiceOverIcon, { fontSize: "small" }));

/** 会話 */
registerObjectType("Conversation", React.createElement(ForumIcon, { fontSize: "small" }));
