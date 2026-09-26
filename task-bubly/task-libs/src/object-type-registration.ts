/**
 * task バブリが自分で名乗る ── 型（アイコン）と、その中身の形（スキーマ）。
 * なぜ持ち主が名乗るのかは `users-libs` の同名ファイルの註。
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import AssignmentIcon from "@mui/icons-material/Assignment";
import React from "react";
import { TASK_SHAPE } from "./domain/Task.domain.js";

registerObjectType("Task", React.createElement(AssignmentIcon, { fontSize: "small" }));

registerSchema("Task", TASK_SHAPE);
