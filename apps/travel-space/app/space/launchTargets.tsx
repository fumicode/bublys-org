"use client";
/**
 * **この空間から呼び出せるもの。** ランチャーの札はここから見せ方（名前・アイコン）を引く。
 *
 * ★ 呼び出すのは**一覧そのもの**（いきなり海に開く）。窓を 1 枚挟まない
 *   ── OS がその形に揃えたのと同じ理由で、海を 2 つ重ねないと札 1 枚に辿り着けなくなる。
 * ★ 旅程だけは**見本の 1 件を直に開く**。この空間で真っ先に見たいのは
 *   「旅程が組まれている姿」なので、一覧を挟まない。
 */
import EventNoteIcon from "@mui/icons-material/EventNote";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import HikingIcon from "@mui/icons-material/Hiking";
import MapIcon from "@mui/icons-material/Map";
import PlaceIcon from "@mui/icons-material/Place";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import { registerLaunchTargets, type LaunchTarget } from "@bublys-org/launcher-libs";
import { SAMPLE_ITINERARY_ID } from "@bublys-org/itinerary-libs";
import { SAMPLE_NOTE_ID } from "@bublys-org/note-libs";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";

/** 最初に開いておくもの ── 旅程・地図・アクティビティが 3 つ並んだ状態 */
export const NOTE_URL = `notes/${SAMPLE_NOTE_ID}`;
export const ITINERARY_URL = `itineraries/${SAMPLE_ITINERARY_ID}`;
export const MAP_URL = "map";
export const ACTIVITIES_URL = "activities";

export const TRAVEL_LAUNCH_TARGETS: LaunchTarget[] = [
  { url: NOTE_URL, label: "メモ", icon: <StickyNote2Icon sx={{ color: "#c9a227" }} /> },
  { url: ITINERARY_URL, label: "旅程", icon: <EventNoteIcon color="primary" /> },
  { url: MAP_URL, label: "地図", icon: <MapIcon sx={{ color: "#0f8f86" }} /> },
  { url: ACTIVITIES_URL, label: "アクティビティ", icon: <HikingIcon sx={{ color: "#e06c2b" }} /> },
  { url: "notes", label: "メモの一覧", icon: <FormatListBulletedIcon color="action" /> },
  { url: "itineraries", label: "旅程の一覧", icon: <FormatListBulletedIcon color="action" /> },
  { url: "spots", label: "地点の一覧", icon: <PlaceIcon color="action" /> },
  { url: "pocket", label: "ポケット", icon: <WorkspacesIcon sx={{ color: "#6ea8ff" }} /> },
];

/** ランチャーに入っている呼び出し（この順に並べる） */
export const DEFAULT_LAUNCHER_URLS = TRAVEL_LAUNCH_TARGETS.map((t) => t.url);

/** 最初のランチャーの ID。左の岸に着いている */
export const MAIN_LAUNCHER_ID = "main";

registerLaunchTargets(TRAVEL_LAUNCH_TARGETS);
