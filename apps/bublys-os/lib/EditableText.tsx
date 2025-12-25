"use client";

import { FC, useState, useRef, useEffect } from "react";
import EditIcon from "@mui/icons-material/Edit";

type EditableTextProps = {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
};

export const EditableText: FC<EditableTextProps> = ({
  value,
  onSave,
  className,
  style,
  inputStyle,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditingValue(value);
  }, [value]);

  const handleStartEdit = () => {
    setEditingValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editingValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={className}
        style={{
          fontSize: "inherit",
          fontWeight: "inherit",
          border: "1px solid #ccc",
          borderRadius: 4,
          padding: "2px 6px",
          ...inputStyle,
        }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        ...style,
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleStartEdit}
    >
      {value}
      <EditIcon
        fontSize="small"
        style={{
          marginLeft: 6,
          opacity: isHovering ? 1 : 0,
          transition: "opacity 0.2s",
          color: "#666",
        }}
      />
    </span>
  );
};
