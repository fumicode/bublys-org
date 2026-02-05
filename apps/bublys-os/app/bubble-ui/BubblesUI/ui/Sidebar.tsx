"use client";
import { FC, useState, memo } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import * as Tooltip from "@radix-ui/react-tooltip";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GroupsIcon from "@mui/icons-material/Groups";
import NoteIcon from "@mui/icons-material/Note";
import PersonIcon from "@mui/icons-material/Person";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExtensionIcon from "@mui/icons-material/Extension";
import { loadBublyFromOrigin, getAllBublies, getAllMenuItems, BublyMenuItem } from "@bublys-org/bubbles-ui";

type MenuItem = {
  label: string;
  url: string | (() => string);
  icon: React.ReactNode;
};

// 静的メニュー項目（常に表示）
const staticMenuItems: MenuItem[] = [
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
  // 九星盤は動的ロードのバブリとして提供
];

type SidebarProps = {
  onItemClick: (url: string) => void;
};

const SIDEBAR_WIDTH_EXPANDED = 180;
const SIDEBAR_WIDTH_COLLAPSED = 56;

// Radix Tooltip用のスタイル
const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: "rgba(50, 50, 50, 0.95)",
  color: "white",
  padding: "6px 12px",
  borderRadius: "4px",
  fontSize: "0.75rem",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  zIndex: 9999,
};

const tooltipArrowStyle: React.CSSProperties = {
  fill: "rgba(50, 50, 50, 0.95)",
};

export const Sidebar: FC<SidebarProps> = memo(({ onItemClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [bublyOrigin, setBublyOrigin] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_BUBLY_ORIGIN ?? ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadedBublies, setLoadedBublies] = useState<string[]>([]);
  const [dynamicMenuItems, setDynamicMenuItems] = useState<BublyMenuItem[]>([]);

  // 静的 + 動的メニュー項目を結合
  const menuItems: MenuItem[] = [...staticMenuItems, ...dynamicMenuItems];

  const handleItemClick = (item: MenuItem) => {
    const url = typeof item.url === "function" ? item.url() : item.url;
    onItemClick(url);
  };

  const handleLoadBubly = async () => {
    if (!bublyOrigin.trim()) return;

    setIsLoading(true);
    try {
      const bubly = await loadBublyFromOrigin(bublyOrigin.trim());
      if (bubly) {
        setLoadedBublies(Object.keys(getAllBublies()));
        setDynamicMenuItems(getAllMenuItems());
        alert(`バブリ "${bubly.name}" v${bubly.version} をロードしました`);
      } else {
        alert("バブリのロードに失敗しました");
      }
    } catch (error) {
      console.error("Bubly load error:", error);
      alert("バブリのロードに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const width = isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  return (
    <Tooltip.Provider delayDuration={300}>
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
            <Tooltip.Root key={item.label}>
              <Tooltip.Trigger asChild>
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
              </Tooltip.Trigger>
              {!isExpanded && (
                <Tooltip.Portal>
                  <Tooltip.Content side="right" sideOffset={5} style={tooltipContentStyle}>
                    {item.label}
                    <Tooltip.Arrow style={tooltipArrowStyle} />
                  </Tooltip.Content>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>
          ))}
        </List>

        {/* Bubly Loader Section */}
        <Box sx={{ borderTop: "1px solid rgba(0, 0, 0, 0.1)", p: 1 }}>
          {isExpanded ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 0.5 }}>
                <ExtensionIcon sx={{ fontSize: 16 }} />
                バブリ
              </Typography>
              <TextField
                size="small"
                placeholder="オリジン (例: http://localhost:4001)"
                value={bublyOrigin}
                onChange={(e) => setBublyOrigin(e.target.value)}
                sx={{ "& input": { fontSize: "0.75rem", py: 0.5 } }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={handleLoadBubly}
                disabled={isLoading || !bublyOrigin.trim()}
                sx={{ fontSize: "0.75rem", py: 0.5 }}
              >
                {isLoading ? <CircularProgress size={16} /> : "ロード"}
              </Button>
              {loadedBublies.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  ロード済: {loadedBublies.join(", ")}
                </Typography>
              )}
            </Box>
          ) : (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <ListItemButton
                  onClick={() => setIsExpanded(true)}
                  sx={{ minHeight: 44, justifyContent: "center" }}
                >
                  <ExtensionIcon color="action" />
                </ListItemButton>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="right" sideOffset={5} style={tooltipContentStyle}>
                  バブリ
                  <Tooltip.Arrow style={tooltipArrowStyle} />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
        </Box>

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
    </Tooltip.Provider>
  );
});

export const SIDEBAR_WIDTH_COLLAPSED_EXPORT = SIDEBAR_WIDTH_COLLAPSED;
