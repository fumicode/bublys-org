'use client';

import { FC, useState } from "react";
import styled from "styled-components";
import { Staff } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import AddIcon from "@mui/icons-material/Add";
import { Button, TextField } from "@mui/material";
import { ObjectView } from "@bublys-org/bubbles-ui";

type StaffListViewProps = {
  staffList: Staff[];
  onCreate: (name: string) => void;
};

export const StaffListView: FC<StaffListViewProps> = ({ staffList, onCreate }) => {
  const [name, setName] = useState("");

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  };

  return (
    <StyledContainer>
      <StyledStaffList>
        {staffList.length === 0 ? (
          <li className="e-empty">スタッフがいません</li>
        ) : (
          staffList.map((staff) => (
            <li key={staff.id} className="e-item">
              {/* ObjectView: ダブルクリックで詳細バブルを開く / ドラッグでポケットへ */}
              <ObjectView
                object={staff}
                label={staff.name}
                draggable={true}
                openingPosition="bubble-side"
                fullWidth={true}
              >
                <div className="e-content">
                  <PersonIcon fontSize="small" className="e-avatar" />
                  <div className="e-name">{staff.name}</div>
                </div>
              </ObjectView>
            </li>
          ))
        )}
      </StyledStaffList>

      <div className="e-create">
        <TextField
          className="e-name-input"
          variant="standard"
          size="small"
          label="スタッフ名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          追加
        </Button>
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-create {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid #eee;

    .e-name-input {
      flex: 1;
    }
  }
`;

const StyledStaffList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;

  > .e-empty {
    padding: 16px;
    text-align: center;
    color: #666;
  }

  > .e-item {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    transition: background-color 0.15s;

    &:hover {
      background-color: #f5f5f5;
    }

    &:last-child {
      border-bottom: none;
    }

    .e-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }

    .e-avatar {
      color: #666;
      flex-shrink: 0;
    }

    .e-name {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;
