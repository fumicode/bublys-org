"use client";
import { FC } from "react";
import { Box, FormControlLabel, Switch, Typography } from "@mui/material";

export type LauncherSettingsViewProps = {
  /** ここから開いたバブルと帯（リンク）で繋ぐか */
  linksOpened: boolean;
  onLinksOpenedChange: (linksOpened: boolean) => void;
};

/** ランチャーの設定の見た目。値と変更通知だけを受け取る純粋な UI */
export const LauncherSettingsView: FC<LauncherSettingsViewProps> = ({ linksOpened, onLinksOpenedChange }) => (
  <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 240 }}>
    <Typography variant="subtitle1" fontWeight="bold">ランチャー</Typography>
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={linksOpened}
          onChange={(e) => onLinksOpenedChange(e.target.checked)}
        />
      }
      label="開いたものと帯で繋ぐ"
      slotProps={{ typography: { fontSize: "0.875rem" } }}
    />
    <Typography variant="caption" color="text.secondary">
      切ると、ここから開いたバブルへの帯を描きません（既に開いているものも含む）。
      関係は残るので、戻せばまた出ます
    </Typography>
  </Box>
);
