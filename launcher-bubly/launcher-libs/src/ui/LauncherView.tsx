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
  /**
   * 帯（岸に着いている）として描くか。
   * compact ならアイコンだけ並べてラベルはツールチップ、そうでなければ一覧。
   */
  compact: boolean;
  /** 帯の並ぶ向き。左右の岸なら縦、上下の岸なら横。浮いているときは縦 */
  vertical: boolean;
  onLaunch: (url: string) => void;
  /** 設定バブルの url（末尾の ⚙ から開く）。帯の起点にもなる */
  settingsUrl: string;
  onOpenSettings: () => void;
};

const ITEM_MIN = 44;

/**
 * ランチャーの見た目。url の並びをボタンにする純粋な UI。
 * 岸に着いているか浮いているかは props（compact / vertical）で受けるだけで、
 * 自分では知らない。
 */
export const LauncherView: FC<LauncherViewProps> = ({
  entries,
  compact,
  vertical,
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
      alignItems: vertical ? "stretch" : "center",
      minWidth: compact ? 56 : 180,
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
        compact={compact}
        vertical={vertical}
        onClick={() => onLaunch(entry.url)}
      />
    ))}
    {/* 末尾: このランチャーの設定（設定バブルを開く） */}
    <LauncherItem
      url={settingsUrl}
      label="設定"
      icon={<SettingsIcon color="action" />}
      compact={compact}
      vertical={vertical}
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
  compact: boolean;
  vertical: boolean;
  onClick: () => void;
  sx?: SxProps<Theme>;
};

/** 1 項目。compact ならアイコンだけでラベルはツールチップ */
const LauncherItem: FC<LauncherItemProps> = ({ url, label, icon, compact, vertical, onClick, sx }) => {
  const button = (
    <ListItemButton
      onClick={onClick}
      sx={{
        minHeight: ITEM_MIN,
        px: 2,
        flex: "0 0 auto",
        justifyContent: compact ? "center" : "initial",
        ...sx,
      }}
    >
      {/* UrledPlace: ここから開いたバブルへの帯（リンク）の起点。
          ボタンの中身（アイコン + ラベル）を囲むので、起点の矩形はその範囲になる */}
      <UrledPlace url={url}>
        <ListItemIcon sx={{ minWidth: 0, mr: compact ? 0 : 2, justifyContent: "center" }}>
          {icon}
        </ListItemIcon>
        {!compact && (
          <ListItemText
            primary={label}
            primaryTypographyProps={{ fontSize: "0.875rem", whiteSpace: "nowrap" }}
          />
        )}
      </UrledPlace>
    </ListItemButton>
  );
  return compact ? (
    <Tooltip title={label} placement={vertical ? "right" : "bottom"} arrow>
      {button}
    </Tooltip>
  ) : (
    button
  );
};
