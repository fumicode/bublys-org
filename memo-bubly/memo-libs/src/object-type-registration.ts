/**
 * memo バブリが自分で名乗る ── 型（アイコン）と、その中身の形（スキーマ）。
 * なぜ持ち主が名乗るのかは `users-libs` の同名ファイルの註。
 */
import { registerObjectType, registerObjectTypes } from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import React from "react";
import { MemoIcon } from "./ui/MemoIcon.js";
import { MEMO_SHAPE } from "./domain/Memo.js";

registerObjectType("Memo", React.createElement(MemoIcon));

/** 一覧として見たときの型（アイコンは要らない） */
registerObjectTypes(["Memos"]);

registerSchema("Memo", MEMO_SHAPE);
