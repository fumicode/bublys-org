"use client";
import { FC, ReactNode } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import LaunchIcon from "@mui/icons-material/Launch";

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
};

const ITEM_MIN = 44;

/**
 * ランチャーの見た目。url の並びをボタンにする純粋な UI。
 * 岸に着いているか浮いているかは props（compact / vertical）で受けるだけで、
 * 自分では知らない。
 */
export const LauncherView: FC<LauncherViewProps> = ({ entries, compact, vertical, onLaunch }) => (
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
    {entries.map((entry) => {
      const button = (
        <ListItemButton
          key={entry.id}
          onClick={() => onLaunch(entry.url)}
          sx={{
            minHeight: ITEM_MIN,
            px: 2,
            flex: "0 0 auto",
            justifyContent: compact ? "center" : "initial",
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, mr: compact ? 0 : 2, justifyContent: "center" }}>
            {entry.icon ?? <LaunchIcon color="action" />}
          </ListItemIcon>
          {!compact && (
            <ListItemText
              primary={entry.label}
              primaryTypographyProps={{ fontSize: "0.875rem", whiteSpace: "nowrap" }}
            />
          )}
        </ListItemButton>
      );
      return compact ? (
        <Tooltip key={entry.id} title={entry.label} placement={vertical ? "right" : "bottom"} arrow>
          {button}
        </Tooltip>
      ) : (
        button
      );
    })}
  </List>
);
