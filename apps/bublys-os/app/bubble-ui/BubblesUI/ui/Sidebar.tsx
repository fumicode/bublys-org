"use client";
import { FC, useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Collapse,
} from "@mui/material";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventNoteIcon from "@mui/icons-material/EventNote";
import GroupsIcon from "@mui/icons-material/Groups";
import NoteIcon from "@mui/icons-material/Note";
import PersonIcon from "@mui/icons-material/Person";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

type MenuItem = {
  label: string;
  url: string | (() => string);
  icon: React.ReactNode;
};

const menuItems: MenuItem[] = [
  {
    label: "囲碁ゲーム",
    url: () => `igo-game/${crypto.randomUUID()}`,
    icon: <SportsEsportsIcon sx={{ color: "#dcb35c" }} />,
  },
  {
    label: "タスク管理",
    url: "task-management/tasks",
    icon: <AssignmentIcon color="primary" />,
  },
  {
    label: "スタッフ一覧",
    url: "gakkai-shift/staffs",
    icon: <EventNoteIcon color="action" />,
  },
  {
    label: "シフト配置表",
    url: "gakkai-shift/shift-plans",
    icon: <EventNoteIcon color="primary" />,
  },
  {
    label: "グループ",
    url: "user-groups",
    icon: <GroupsIcon color="action" />,
  },
  {
    label: "メモ",
    url: "memos",
    icon: <NoteIcon color="action" />,
  },
  {
    label: "ユーザー",
    url: "users",
    icon: <PersonIcon color="action" />,
  },
];

type SidebarProps = {
  onItemClick: (url: string) => void;
};

const SIDEBAR_WIDTH_EXPANDED = 180;
const SIDEBAR_WIDTH_COLLAPSED = 56;

export const Sidebar: FC<SidebarProps> = ({ onItemClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleItemClick = (item: MenuItem) => {
    const url = typeof item.url === "function" ? item.url() : item.url;
    onItemClick(url);
  };

  const width = isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  return (
    <Box
      sx={{
        width,
        height: "100vh",
        backgroundColor: "rgba(245, 245, 245, 0.95)",
        borderRight: "1px solid rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <List dense sx={{ flex: 1, pt: 1 }}>
        {menuItems.map((item) => (
          <Tooltip
            key={item.label}
            title={isExpanded ? "" : item.label}
            placement="right"
          >
            <ListItemButton
              onClick={() => handleItemClick(item)}
              sx={{
                minHeight: 44,
                px: 2,
                justifyContent: isExpanded ? "initial" : "center",
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isExpanded ? 2 : 0,
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <Collapse in={isExpanded} orientation="horizontal">
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    whiteSpace: "nowrap",
                  }}
                />
              </Collapse>
            </ListItemButton>
          </Tooltip>
        ))}
      </List>

      {/* Toggle button */}
      <ListItemButton
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          minHeight: 44,
          px: 2,
          justifyContent: isExpanded ? "flex-end" : "center",
          borderTop: "1px solid rgba(0, 0, 0, 0.1)",
        }}
      >
        {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </ListItemButton>
    </Box>
  );
};

export const SIDEBAR_WIDTH_COLLAPSED_EXPORT = SIDEBAR_WIDTH_COLLAPSED;
