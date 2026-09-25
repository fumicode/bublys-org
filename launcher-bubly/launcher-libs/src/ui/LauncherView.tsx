"use client";
import { FC, ReactNode } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  type SxProps,
  type Theme,
} from "@mui/material";
import LaunchIcon from "@mui/icons-material/Launch";
import { UrledPlace } from "@bublys-org/bubbles-ui";

/** 描くのに必要な分だけ解決済みの entry */
export type LauncherViewEntry = {
  id: string;
  url: string;
  label: string;
  icon?: ReactNode;
};

export type LauncherViewProps = {
  entries: LauncherViewEntry[];
  /** 並ぶ向き。決めるのは呼ぶ側（箱の大きさから {@link launcherLayout} が決める） */
  vertical: boolean;
  /** ラベルを出すか。false ならアイコンだけ（名前はツールチップで出る） */
  labels: boolean;
  onLaunch: (url: string) => void;
};

const ITEM_MIN = 44;

/**
 * ランチャーの見た目。url の並びをボタンにする純粋な UI。
 * 並べ方（向き・ラベルの有無）は props で受けるだけで、自分では決めない。
 */
export const LauncherView: FC<LauncherViewProps> = ({
  entries,
  vertical,
  labels,
  onLaunch,
}) => (
  <List
    dense
    disablePadding
    sx={{
      display: "flex",
      flexDirection: vertical ? "column" : "row",
      alignItems: vertical && labels ? "stretch" : "center",
      minWidth: 0,
      py: vertical ? 0.5 : 0,
      px: vertical ? 0 : 0.5,
    }}
  >
    {entries.map((entry) => (
      <LauncherItem
        key={entry.id}
        url={entry.url}
        label={entry.label}
        icon={entry.icon ?? <LaunchIcon color="action" />}
        vertical={vertical}
        labels={labels}
        onOpen={() => onLaunch(entry.url)}
      />
    ))}
    {/*
      ★ **設定（⚙）は外した。** 持っていたつまみは「開いたものと帯で繋ぐ」1 つだけで、
        それは旧い海の値（`linksHidden`）── 新しい海は読んでいなかった。
        帯は**海ぜんぶの見え方**なので、口は見え方の帯（`SpaceViewBubble`）に移した。
    */}
  </List>
);

type LauncherItemProps = {
  url: string;
  label: string;
  icon: ReactNode;
  vertical: boolean;
  labels: boolean;
  /** 開く ── **ダブルクリック**で呼ばれる */
  onOpen: () => void;
  sx?: SxProps<Theme>;
};

/**
 * 1 項目。ラベルを出さないときは、アイコンだけの正方形になる（名前はツールチップ）。
 *
 * **開くのはダブルクリック。** バブリでは「オブジェクトを開く」は一貫して
 * ダブルクリック（`ObjectView`）なので、ランチャーの項目も同じにする
 * ── 1 回のクリックは「選ぶ」であって「開く」ではない。
 */
const LauncherItem: FC<LauncherItemProps> = ({ url, label, icon, vertical, labels, onOpen, sx }) => {
  const button = (
    <ListItemButton
      onDoubleClick={onOpen}
      sx={{
        userSelect: "none", // 2 回目のクリックで字が選ばれないように
        minHeight: ITEM_MIN,
        minWidth: ITEM_MIN,
        px: labels ? 2 : 0,
        flex: "0 0 auto",
        justifyContent: labels ? "initial" : "center",
        ...sx,
      }}
    >
      {/* UrledPlace: ここから開いたバブルへの帯（リンク）の起点。
          ボタンの中身（アイコン + ラベル）を囲むので、起点の矩形はその範囲になる */}
      <UrledPlace url={url}>
        <ListItemIcon sx={{ minWidth: 0, mr: labels ? 2 : 0, justifyContent: "center" }}>
          {icon}
        </ListItemIcon>
        {labels && (
          <ListItemText
            primary={label}
            primaryTypographyProps={{ fontSize: "0.875rem", whiteSpace: "nowrap" }}
          />
        )}
      </UrledPlace>
    </ListItemButton>
  );
  return (
    <Tooltip title={label} placement={vertical ? "right" : "bottom"} arrow>
      {button}
    </Tooltip>
  );
};
