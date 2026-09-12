'use client';

import { FC } from "react";
import styled from "styled-components";
import { Alert, Button, TextField, Tooltip } from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SaveIcon from "@mui/icons-material/Save";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

type WorldFileViewProps = {
  fileName: string | null;
  syncedAt: string | null;
  dirty: boolean;
  note: string;
  supported: boolean;
  canOverwrite: boolean;
  busy: boolean;
  message: { kind: "info" | "warn" | "error"; text: string } | null;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onStartBlank: () => void;
  onLoadSample: () => void;
  onNoteChange: (note: string) => void;
  onDismissMessage: () => void;
};

const formatTime = (iso: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" });
};

/**
 * 勤務表ファイルの操作パネル（表示のみ）。
 *
 * タイトル行は普通のアプリのタイトルバーと同じ考え方で「ファイル名＋未保存の印（●）」。
 * 何が保存されるのかは分かりにくいので、末尾に一言添える。
 */
export const WorldFileView: FC<WorldFileViewProps> = ({
  fileName,
  syncedAt,
  dirty,
  note,
  supported,
  canOverwrite,
  busy,
  message,
  onOpen,
  onSave,
  onSaveAs,
  onStartBlank,
  onLoadSample,
  onNoteChange,
  onDismissMessage,
}) => (
  <StyledContainer>
    <div className="e-title">
      <InsertDriveFileOutlinedIcon fontSize="small" className="e-fileicon" />
      <span className="e-name">{fileName ?? "無題（ファイル未保存）"}</span>
      {dirty && (
        <Tooltip title="最後の保存以降に変更があります">
          <span className="e-dirty" aria-label="未保存">
            ●
          </span>
        </Tooltip>
      )}
    </div>
    {syncedAt && (
      <div className="e-synced">
        {dirty ? "最後の保存" : "保存済み"}: {formatTime(syncedAt)}
      </div>
    )}

    <div className="e-actions">
      <Button
        size="small"
        variant="outlined"
        startIcon={<FolderOpenIcon />}
        disabled={busy}
        onClick={onOpen}
      >
        開く
      </Button>
      <Tooltip
        title={
          canOverwrite
            ? "同じファイルに上書きします"
            : "保存先のファイルを選びます"
        }
      >
        <span>
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={busy}
            onClick={onSave}
          >
            保存
          </Button>
        </span>
      </Tooltip>
      <Button
        size="small"
        variant="outlined"
        startIcon={<SaveAsIcon />}
        disabled={busy}
        onClick={onSaveAs}
      >
        名前を付けて保存
      </Button>
      <Button
        size="small"
        variant="text"
        color="inherit"
        startIcon={<NoteAddIcon />}
        disabled={busy}
        onClick={onStartBlank}
      >
        白紙から
      </Button>
    </div>

    {/* 例データはデバッグ用の出発点。読み込みは全置き換えなので、開く／白紙とは
        別の行に置いて、間違って押しにくくしておく。 */}
    <div className="e-sample">
      <Tooltip title="今の内容を破棄して、デバッグ用のデータパターン一式に置き換えます">
        <span>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<ScienceOutlinedIcon />}
            disabled={busy}
            onClick={onLoadSample}
          >
            例データ読み込み
          </Button>
        </span>
      </Tooltip>
      <span className="e-sampledesc">
        スタッフ9人・希望・制約と、勤務表4つ（6月/7月=空、8月=作成途中、9月=詰みあり）
      </span>
    </div>

    <TextField
      className="e-note"
      variant="standard"
      size="small"
      fullWidth
      label="メモ（ファイルに一緒に保存されます）"
      placeholder="例: 9月・詰みシナリオ / 早責が足りないケース"
      value={note}
      onChange={(event) => onNoteChange(event.target.value)}
    />

    {!supported && (
      <Alert severity="info" className="e-alert">
        このブラウザはファイルの直接編集に対応していないため、保存はダウンロード、
        読み込みはファイル選択になります（同じファイルへの上書きはできません）。
        Chrome や Edge だと普通のアプリと同じ操作感になります。
      </Alert>
    )}

    {message && (
      <Alert
        severity={message.kind === "warn" ? "warning" : message.kind}
        className="e-alert"
        onClose={onDismissMessage}
      >
        {message.text}
      </Alert>
    )}

    <p className="e-hint">
      保存されるのは、スタッフ・勤務帯・勤務表・希望・制約と、勤務表ごとの世界線
      （試行錯誤の履歴と分岐）すべてです。バブルの配置は含みません。
      読み込むと今の内容は破棄され、ファイルの内容に置き換わります。
    </p>
  </StyledContainer>
);

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  min-width: 320px;

  > .e-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 600;

    > .e-fileicon {
      color: hsl(20, 25%, 45%);
    }

    > .e-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    > .e-dirty {
      color: hsl(28, 80%, 50%);
      font-size: 12px;
      line-height: 1;
    }
  }

  > .e-synced {
    margin-top: -6px;
    font-size: 11px;
    color: hsl(0, 0%, 45%);
  }

  > .e-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  > .e-sample {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid hsl(0, 0%, 90%);

    > .e-sampledesc {
      font-size: 11px;
      line-height: 1.5;
      color: hsl(0, 0%, 45%);
    }
  }

  > .e-alert {
    font-size: 12px;
  }

  > .e-hint {
    margin: 0;
    font-size: 11px;
    line-height: 1.6;
    color: hsl(0, 0%, 45%);
  }
`;
