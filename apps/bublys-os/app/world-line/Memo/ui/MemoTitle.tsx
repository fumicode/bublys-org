import { Memo } from '../domain/Memo';
import { IconButton, Tooltip } from '@mui/material';
import { LuClipboardCopy } from 'react-icons/lu';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { MemoIcon } from './MemoIcon';
import { useAppSelector } from '@bublys-org/state-management';
import { UserBadge, selectUsers } from '@bublys-org/users-libs';
import { getDragType, parseDragPayload, setDragPayload, extractIdFromUrl, UrledPlace } from "@bublys-org/bubbles-ui";

interface MemoTitleProps {
  memo: Memo;
  onSetAuthor?: (userId: string) => void;
  onOpenWorldLineView?: () => void;
  /** このメモの世界線バブルの URL（リンクのリボン用） */
  worldLineUrl?: string;
}

export function MemoTitle({ memo, onSetAuthor, onOpenWorldLineView, worldLineUrl }: MemoTitleProps) {
  const users = useAppSelector(selectUsers);
  const firstBlockId = memo.lines[0];
  const firstBlock = firstBlockId ? memo.blocks[firstBlockId] : null;
  const content = firstBlock?.content || '';
  const authorName = memo.authorId ? users.find((u) => u.id === memo.authorId)?.name : undefined;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const payload = parseDragPayload(e, { acceptTypes: [getDragType('User')] });
    const url = payload?.url || e.dataTransfer.getData(getDragType('User'));
    const userId = url ? extractIdFromUrl(url) : "";
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
          setDragPayload(e, {
            type: getDragType('Memo'),
            url,
            label: content || "メモ",
          });
        }}
      >
        <MemoIcon fontSize="medium" />
        <span>「{content}」</span>
        <IconButton onClick={() => navigator.clipboard.writeText(content)}>
          <LuClipboardCopy />
        </IconButton>
        {worldLineUrl && onOpenWorldLineView && (
          /* すでに在るもの（このメモの世界線）を開くのでダブルクリック。
             ただしここは小さなアイコンボタンで、持ち出す意味も薄いので ObjectView にはせず、
             UrledPlace でリンクのリボンだけ確保して onDoubleClick に載せ替えている。 */
          <UrledPlace url={worldLineUrl}>
            <Tooltip title="世界線（履歴）— ダブルクリックで開く" arrow>
              <IconButton onDoubleClick={onOpenWorldLineView}>
                <AccountTreeIcon />
              </IconButton>
            </Tooltip>
          </UrledPlace>
        )}
      </h2>
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, color: "#555" }}
        onDragOver={(e) => {
          if (!onSetAuthor) return;
          e.preventDefault();
        }}
        onDrop={handleDrop}
      >
        <span>作者:</span>
        {authorName && memo.authorId ? (
          <UserBadge
            label={authorName}
            linkTarget={`users/${memo.authorId}`}
          />
        ) : (
          <span>未設定</span>
        )}
      </div>
    </div>
  );
}
