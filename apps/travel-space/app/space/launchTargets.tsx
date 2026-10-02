"use client";
/**
 * **この空間から呼び出せるもの。** ランチャーの札はここから見せ方（名前・アイコン）を引く。
 *
 * ★ 呼び出すのは**一覧そのもの**（いきなり海に開く）。窓を 1 枚挟まない
 *   ── OS がその形に揃えたのと同じ理由で、海を 2 つ重ねないと札 1 枚に辿り着けなくなる。
 * ★ **旅の 4 つ**（地図・旅程・アクティビティ・宿泊施設）が先。
 * ★ そのあとに**器のほう**を 3 つ ── ポケット・ユニバース・バブリを追加。
 *   OS と同じ決まりで、**いちばん下が「バブリを追加」、その上が「ユニバース」**。
 *   どれも中身ではなく器を足す／覗くものなので、並びの端に置く。
 */
import EventNoteIcon from "@mui/icons-material/EventNote";
import HikingIcon from "@mui/icons-material/Hiking";
import HotelIcon from "@mui/icons-material/Hotel";
import ExtensionIcon from "@mui/icons-material/Extension";
import MapIcon from "@mui/icons-material/Map";
import PublicIcon from "@mui/icons-material/Public";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import {
  MAIN_LAUNCHER_ID,
  registerLaunchTargets,
  type LaunchTarget,
} from "@bublys-org/launcher-libs";

export const ITINERARY_URL = "itineraries";
export const MAP_URL = "map";
/**
 * **アクティビティの一覧は「地点の一覧」。**
 *
 * ★ 収集したのは `tools/echigo/source/アクティビティ一覧.csv` の 793 件で、
 *   `build.mjs` はこれを**地点（Spot）**として書き出している。温泉・酒蔵・スキー場・
 *   体験プログラムなど、46 種類の目印がすべて「そこで何かをする」もの
 *   ── つまり**地点の一覧がそのままアクティビティの一覧**になっている。
 * ★ 評価・料金・所要時間を持つ別の入れ物（`activities`）へ流し込まないのは、
 *   収集データにその 3 つが無いから。入れると空の★が 793 行並ぶ。
 */
export const ACTIVITIES_URL = "spots";
export const LODGINGS_URL = "lodgings";

export const TRAVEL_LAUNCH_TARGETS: LaunchTarget[] = [
  { url: MAP_URL, label: "地図", icon: <MapIcon sx={{ color: "#0f8f86" }} /> },
  { url: ITINERARY_URL, label: "旅程", icon: <EventNoteIcon color="primary" /> },
  { url: ACTIVITIES_URL, label: "アクティビティ", icon: <HikingIcon sx={{ color: "#e06c2b" }} /> },
  { url: LODGINGS_URL, label: "宿泊施設", icon: <HotelIcon sx={{ color: "#9a5bd6" }} /> },
  { url: "pocket", label: "ポケット", icon: <WorkspacesIcon sx={{ color: "#6ea8ff" }} /> },
  { url: "universe", label: "ユニバース", icon: <PublicIcon sx={{ color: "#7e9bd4" }} /> },
  { url: "bubly-loader", label: "バブリを追加", icon: <ExtensionIcon color="action" /> },
];

/** ランチャーに入っている呼び出し（この順に並べる） */
export const DEFAULT_LAUNCHER_URLS = TRAVEL_LAUNCH_TARGETS.map((t) => t.url);

/** 最初のランチャーの ID。左の岸に着いている（字は `launcher-libs` が持つ） */
export { MAIN_LAUNCHER_ID };

registerLaunchTargets(TRAVEL_LAUNCH_TARGETS);
