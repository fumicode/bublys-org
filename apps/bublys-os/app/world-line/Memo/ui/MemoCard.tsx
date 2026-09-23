'use client';
/**
 * メモ 1 件の札 ── **一覧の中で 1 つの泡になる**中身。
 *
 * 前は巻物（スクロールする行の一覧）の中の行だった。泡にすると、並べ方の道具が
 * そのまま効く（縦に並べる／奥行きに重ねる）し、掴んで外へ出すこともできる。
 * 描くものは行のときと同じ ── 見出し・作者・消す口。
 */
import { useAppSelector } from '@bublys-org/state-management';
import { ObjectView, UrledPlace } from '@bublys-org/bubbles-ui';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import styled from 'styled-components';
import { UserBadge, selectUsers } from '@bublys-org/users-libs';
import { selectMemoAtApex } from '../feature/memoSelectors';
import { MemoIcon } from './MemoIcon';

export function MemoCard({ memoId, onDelete }: { memoId: string; onDelete?: (id: string) => void }) {
  const memo = useAppSelector(selectMemoAtApex(memoId));
  const users = useAppSelector(selectUsers);
  if (!memo) return <StyledCard>このメモは見つかりませんでした。</StyledCard>;

  const label = memo.blocks[memo.lines?.[0]]?.content ?? 'メモ';
  return (
    <StyledCard>
      <div className="e-main">
        {/* ダブルクリックで開く（開く先は**外の海**）／ドラッグでポケットや岸へ */}
        {/* ★ `openingPosition` は「開いてよい」の合図として要る（旧 ObjectView の決まり）。
            どこに置くかは新しい模型では親の View が決めるので、値そのものは使われない */}
        <ObjectView type="Memo" url={`memos/${memoId}`} label={label} openingPosition="bubble-side-right">
          <MemoIcon />
          <span className="e-label">「{label}…」</span>
        </ObjectView>
        {memo.authorId && (
          <span className="e-author">
            <UserBadge
              label={users.find((u) => u.id === memo.authorId)?.name ?? '作者'}
              linkTarget={`users/${memo.authorId}`}
            />
          </span>
        )}
      </div>
      <UrledPlace url={`memos/${memoId}/delete-confirm`}>
        <IconButton
          size="small"
          className="e-remove"
          title="このメモを消す"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(memoId);
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </UrledPlace>
    </StyledCard>
  );
}

const StyledCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
  padding: 8px 10px;
  box-sizing: border-box;
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
  color: #1b2029;

  .e-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1 1 auto;
  }
  .e-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .e-remove {
    flex: 0 0 auto;
  }
`;
