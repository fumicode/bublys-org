"use client";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GroupsIcon from "@mui/icons-material/Groups";
import NoteIcon from "@mui/icons-material/Note";
import PersonIcon from "@mui/icons-material/Person";
import PublicIcon from "@mui/icons-material/Public";
import ExtensionIcon from "@mui/icons-material/Extension";
import TableChartIcon from "@mui/icons-material/TableChart";
import TransformIcon from "@mui/icons-material/Transform";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import { registerLaunchTargets, type LaunchTarget } from "@bublys-org/launcher-libs";

/**
 * OS が用意している呼び出し先の見せ方（url → ラベル・アイコン）。
 * ランチャーの entry は url しか持たないので、描くときにここから引く。
 *
 * ★ **呼び出すのは一覧そのもの ── いきなり海に開く。**
 *   前は `task-bubly` のような「自分の宇宙を持つ窓」を開いていた。窓の中にもう一つ海があり、
 *   一覧はその中に居たので、海を 2 つ重ねないと札 1 枚に辿り着けなかった。
 *   囲碁（`igo-games`）だけが最初から一覧を直に開いていて、そちらのほうが素直だったので揃える
 *   ── **開くものは一覧、置く場所は海。** 窓は要らない。
 *
 *   `*-bubly` のルートは消していない（url を直に開けば今でも窓になる）。
 *   すでに保存されている呼び出しは {@link RETIRED_LAUNCH_URLS} で差し替える。
 */
export const OS_LAUNCH_TARGETS: LaunchTarget[] = [
  /**
   * ★ **使いそうな順。** はじめて開いた人が手を伸ばす順に並べる ──
   *   すぐ書けるもの（メモ・タスク）、次に人と表（ユーザー・グループ・CSV）、
   *   そのうえで道具（変換）と遊び（囲碁）。
   * ★ **下の 2 つは決まり**：いちばん下が「バブリを追加」、その上が「ユニバース」。
   *   どちらも中身ではなく**器を足す/覗く**ものなので、並びの端に置く。
   */
  { url: "memos", label: "メモ", icon: <NoteIcon color="action" /> },
  { url: "task-management/tasks", label: "タスク管理", icon: <AssignmentIcon color="primary" /> },
  { url: "users", label: "ユーザー", icon: <PersonIcon color="action" /> },
  { url: "user-groups", label: "グループ", icon: <GroupsIcon color="action" /> },
  { url: "csv-importer/sheets", label: "CSV インポーター", icon: <TableChartIcon color="primary" /> },
  { url: "object-transformer/editor", label: "変換エディタ", icon: <TransformIcon color="primary" /> },
  { url: "igo-games", label: "囲碁ゲーム", icon: <SportsEsportsIcon sx={{ color: "#dcb35c" }} /> },
  { url: "pocket", label: "ポケット", icon: <WorkspacesIcon sx={{ color: "#6ea8ff" }} /> },
  { url: "universe", label: "ユニバース", icon: <PublicIcon sx={{ color: "#7e9bd4" }} /> },
  { url: "bubly-loader", label: "バブリを追加", icon: <ExtensionIcon color="action" /> },
];

/**
 * 引退した呼び出し先（古い url → 今の url）。
 *
 * ランチャーは「標準の呼び出しが足りなければ足す」規則なので、差し替えないと
 * 古い窓と新しい一覧が**両方**並んでしまう。同じ呼び出しが行き先を変えただけなので、
 * 足す／消すではなく**その場で差し替える**（並び順も entry の id もそのまま）。
 */
export const RETIRED_LAUNCH_URLS: Readonly<Record<string, string>> = {
  "task-bubly": "task-management/tasks",
  "groups-bubly": "user-groups",
  "memo-bubly": "memos",
  "users-bubly": "users",
};

/** 最初のランチャー（main）に入っている呼び出し */
export const DEFAULT_LAUNCHER_URLS = OS_LAUNCH_TARGETS.map((t) => t.url);

/** 最初のランチャーの ID。root の左の岸に着いている */
export const MAIN_LAUNCHER_ID = "main";

registerLaunchTargets(OS_LAUNCH_TARGETS);
