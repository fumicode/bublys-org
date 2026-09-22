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
import SettingsIcon from "@mui/icons-material/Settings";
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
  /** 設定バブルの url（末尾の ⚙ から開く）。帯の起点にもなる */
  settingsUrl: string;
  onOpenSettings: () => void;
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
  settingsUrl,
  onOpenSettings,
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
        onClick={() => onLaunch(entry.url)}
      />
    ))}
    {/* 末尾: このランチャーの設定（設定バブルを開く） */}
    <LauncherItem
      url={settingsUrl}
      label="設定"
      icon={<SettingsIcon color="action" />}
      vertical={vertical}
      labels={labels}
      onClick={onOpenSettings}
      sx={{
        [vertical ? "mt" : "ml"]: "auto",
        [vertical ? "borderTop" : "borderLeft"]: "1px solid rgba(0, 0, 0, 0.08)",
      }}
    />
  </List>
);

type LauncherItemProps = {
  url: string;
  label: string;
  icon: ReactNode;
  vertical: boolean;
  labels: boolean;
  onClick: () => void;
  sx?: SxProps<Theme>;
};

/** 1 項目。ラベルを出さないときは、アイコンだけの正方形になる（名前はツールチップ） */
const LauncherItem: FC<LauncherItemProps> = ({ url, label, icon, vertical, labels, onClick, sx }) => {
  const button = (
    <ListItemButton
      onClick={onClick}
      sx={{
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
