import { Memo } from '../domain/Memo';
import { IconButton } from '@mui/material';
import { LuClipboardCopy } from 'react-icons/lu';
import { MemoIcon } from './MemoIcon';
import { useAppSelector, selectUsers } from '@bublys-org/state-management';
import { UserBadge } from '@/app/users/ui/UserBadge';
import { DRAG_DATA_TYPES } from '../../../bubble-ui/utils/drag-types';
import { extractIdFromUrl } from '../../../bubble-ui/utils/url-parser';

interface MemoTitleProps {
  memo: Memo;
  onSetAuthor?: (userId: string) => void;
  onOpenAuthor?: (userId: string, detailUrl: string) => void;
}

export function MemoTitle({ memo, onSetAuthor, onOpenAuthor }: MemoTitleProps) {
  const users = useAppSelector(selectUsers);
  const firstBlockId = memo.lines[0];
  const firstBlock = firstBlockId ? memo.blocks[firstBlockId] : null;
  const content = firstBlock?.content || '';
  const authorName = memo.authorId ? users.find((u) => u.id === memo.authorId)?.name : undefined;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    // 優先してtype/userのURLからIDを抽出、なければ旧形式のtext/user-idを使用
    const userUrl = e.dataTransfer.getData(DRAG_DATA_TYPES.user);
    const userIdFromUrl = userUrl ? extractIdFromUrl(userUrl) : "";
    const fallbackUserId = e.dataTransfer.getData("text/user-id");
    const userId = userIdFromUrl || fallbackUserId;
    if (!userId) return;
    e.preventDefault();
    onSetAuthor?.(userId);
  };

  return (
    <div>
      <h2
        style={{ display: "flex", alignItems: "center", gap: 8 }}
        draggable={true}
        onDragStart={(e) => {
          const url = `memos/${memo.id}`;
          e.dataTransfer.setData(DRAG_DATA_TYPES.memo, url);
          e.dataTransfer.setData("url", url);
          e.dataTransfer.setData("label", content || "メモ");
          e.dataTransfer.effectAllowed = "copy";
        }}
      >
        <MemoIcon fontSize="medium" />
        <span>「{content}」</span>
        <IconButton onClick={() => navigator.clipboard.writeText(content)}>
          <LuClipboardCopy />
        </IconButton>
      </h2>
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, color: "#555" }}
        onDragOver={(e) => {
          if (onSetAuthor) e.preventDefault();
        }}
        onDrop={handleDrop}
      >
        <span>作者:</span>
        {authorName && memo.authorId ? (
          <UserBadge
            label={authorName}
            linkTarget={`users/${memo.authorId}`}
            onClick={() => onOpenAuthor?.(memo.authorId!, `users/${memo.authorId}`)}
          />
        ) : (
          <span>未設定</span>
        )}
      </div>
    </div>
  );
}
