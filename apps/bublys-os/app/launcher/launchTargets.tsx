"use client";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GroupsIcon from "@mui/icons-material/Groups";
import NoteIcon from "@mui/icons-material/Note";
import PersonIcon from "@mui/icons-material/Person";
import PublicIcon from "@mui/icons-material/Public";
import ExtensionIcon from "@mui/icons-material/Extension";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import { registerLaunchTargets, type LaunchTarget } from "@bublys-org/launcher-libs";

/**
 * OS が用意している呼び出し先の見せ方（url → ラベル・アイコン）。
 * ランチャーの entry は url しか持たないので、描くときにここから引く。
 * 各 bubly = 独立した universe バブル = 独立した世界線。複数同時に開ける。
 */
export const OS_LAUNCH_TARGETS: LaunchTarget[] = [
  { url: "igo-games", label: "囲碁ゲーム", icon: <SportsEsportsIcon sx={{ color: "#dcb35c" }} /> },
  { url: "task-bubly", label: "タスク管理", icon: <AssignmentIcon color="primary" /> },
  { url: "groups-bubly", label: "グループ", icon: <GroupsIcon color="action" /> },
  { url: "memo-bubly", label: "メモ", icon: <NoteIcon color="action" /> },
  { url: "users-bubly", label: "ユーザー", icon: <PersonIcon color="action" /> },
  { url: "universe", label: "ユニバース", icon: <PublicIcon sx={{ color: "#7e9bd4" }} /> },
  { url: "pocket", label: "ポケット", icon: <WorkspacesIcon sx={{ color: "#6ea8ff" }} /> },
  { url: "bubly-loader", label: "バブリを追加", icon: <ExtensionIcon color="action" /> },
];

/** 最初のランチャー（main）に入っている呼び出し */
export const DEFAULT_LAUNCHER_URLS = OS_LAUNCH_TARGETS.map((t) => t.url);

/** 最初のランチャーの ID。root の左の岸に着いている */
export const MAIN_LAUNCHER_ID = "main";

registerLaunchTargets(OS_LAUNCH_TARGETS);
