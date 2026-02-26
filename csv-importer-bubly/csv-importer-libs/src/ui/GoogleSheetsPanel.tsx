'use client';

import { FC, useState } from "react";
import styled from "styled-components";

export type GoogleSheetsPanelProps = {
  isLinked: boolean;
  spreadsheetId?: string;
  sheetName?: string;
  lastSyncedAt?: string;
  isSyncing: boolean;
  onLink: (spreadsheetUrl: string) => void;
  onUnlink: () => void;
  onPush: () => void;
  onPull: () => void;
};

export const GoogleSheetsPanel: FC<GoogleSheetsPanelProps> = ({
  isLinked,
  spreadsheetId,
  sheetName,
  lastSyncedAt,
  isSyncing,
  onLink,
  onUnlink,
  onPush,
  onPull,
}) => {
  const [urlInput, setUrlInput] = useState("");

  const handleLink = () => {
    if (urlInput.trim()) {
      onLink(urlInput.trim());
      setUrlInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLink();
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <StyledPanel>
      <div className="gs-title">Google Sheets連携</div>

      {!isLinked ? (
        <div className="gs-unlinked">
          <input
            className="gs-url-input"
            type="text"
            placeholder="スプレッドシートURL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="gs-link-btn"
            onClick={handleLink}
            disabled={!urlInput.trim()}
          >
            接続
          </button>
        </div>
      ) : (
        <div className="gs-linked">
          <div className="gs-info">
            <span className="gs-status">接続中</span>
            {sheetName && <span className="gs-sheet-name">{sheetName}</span>}
            <span className="gs-id" title={spreadsheetId}>
              {spreadsheetId?.slice(0, 12)}...
            </span>
          </div>
          {lastSyncedAt && (
            <div className="gs-last-sync">
              最終同期: {formatDate(lastSyncedAt)}
            </div>
          )}
          <div className="gs-actions">
            <button
              className="gs-push-btn"
              onClick={onPush}
              disabled={isSyncing}
            >
              {isSyncing ? "..." : "↑ Push"}
            </button>
            <button
              className="gs-pull-btn"
              onClick={onPull}
              disabled={isSyncing}
            >
              {isSyncing ? "..." : "↓ Pull"}
            </button>
            <button
              className="gs-unlink-btn"
              onClick={onUnlink}
              disabled={isSyncing}
            >
              接続解除
            </button>
          </div>
        </div>
      )}
    </StyledPanel>
  );
};

const StyledPanel = styled.div`
  background: #fff;
  border: 1px solid #dadce0;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  font-size: 0.85em;

  .gs-title {
    font-weight: bold;
    margin-bottom: 8px;
    color: #1a73e8;
  }

  .gs-unlinked {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .gs-url-input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: inherit;
    outline: none;

    &:focus {
      border-color: #1a73e8;
      box-shadow: 0 0 0 1px #1a73e8;
    }
  }

  .gs-link-btn {
    padding: 6px 16px;
    border: none;
    border-radius: 4px;
    background: #1a73e8;
    color: #fff;
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: #1557b0;
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  .gs-linked {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .gs-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gs-status {
    color: #34a853;
    font-weight: bold;
  }

  .gs-sheet-name {
    color: #5f6368;
  }

  .gs-id {
    color: #9aa0a6;
    font-size: 0.9em;
  }

  .gs-last-sync {
    color: #5f6368;
    font-size: 0.9em;
  }

  .gs-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .gs-push-btn,
  .gs-pull-btn {
    padding: 4px 12px;
    border: 1px solid #1a73e8;
    border-radius: 4px;
    background: #e8f0fe;
    color: #1a73e8;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #d2e3fc;
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  .gs-unlink-btn {
    padding: 4px 12px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background: #fff;
    color: #5f6368;
    cursor: pointer;
    margin-left: auto;

    &:hover:not(:disabled) {
      background: #f1f3f4;
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
`;
