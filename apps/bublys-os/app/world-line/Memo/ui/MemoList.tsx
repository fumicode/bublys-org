import { useAppSelector } from '@bublys-org/state-management';
import { selectMemoIds, selectMemoAtApex } from '../feature/memoSelectors';
import { Memo } from '../domain/Memo';
import { IconButton } from '@mui/material';
import { LuClipboardCopy } from 'react-icons/lu';
import CloseIcon from '@mui/icons-material/Close';
import styled from 'styled-components';
import { MemoIcon } from './MemoIcon';
import { UserBadge, selectUsers } from '@bublys-org/users-libs';
import { ObjectView, UrledPlace } from '@bublys-org/bubbles-ui';

type MemoListProps = {
  buildDetailUrl: (memoId: string) => string;
  buildDeleteUrl: (memoId: string) => string;
  onMemoClick?: (memoId: string, detailUrl: string) => void;
  onMemoDelete?: (memoId: string) => void;
};

export function MemoList({ buildDetailUrl, buildDeleteUrl, onMemoClick, onMemoDelete }: MemoListProps) {
  // world-line-graph slice の scopeId 一覧（`memo:` プレフィックス）から ID を取り、
  // 各 ID の scope の apex に置かれている Memo を読む。
  const memoIds = useAppSelector(selectMemoIds);
  const users = useAppSelector(selectUsers);
  const memos = useAppSelector((state) =>
    memoIds
      .map((id) => selectMemoAtApex(id)(state))
      .filter((m): m is Memo => m !== null),
  );

  return (
    <div>
      <StyledMemoList>
        {memos.map((memo) => {
          const detailUrl = buildDetailUrl(memo.id);
          const label = memo.blocks[memo.lines?.[0]]?.content ?? "メモ";
          return (
          <li
            key={memo.id}
            className="e-item"
          >
            <ObjectView
              type="Memo"
              url={detailUrl}
              label={label}
              onClick={() => onMemoClick?.(memo.id, detailUrl)}
            >
              <MemoIcon/>
              <span>「{label}...」</span>
            </ObjectView>

            {memo.authorId && (
              <span style={{ marginLeft: 8 }}>
                <UserBadge
                  label={users.find((u) => u.id === memo.authorId)?.name ?? "作者"}
                  linkTarget={`users/${memo.authorId}`}
                  onClick={() => onMemoClick?.(memo.authorId!, `users/${memo.authorId}`)}
                />
              </span>
            )}

            <span className='e-button-group'>
              <IconButton
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(memo.id);
                }}
              >
                <LuClipboardCopy />
              </IconButton>
              <UrledPlace url={buildDeleteUrl(memo.id)}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMemoDelete?.(memo.id);
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </UrledPlace>
            </span>
          </li>
        )})}
      </StyledMemoList>
    </div>
  );
}


const StyledMemoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  > .e-item {
    list-style-type: none;

    padding: 8px 0;
    border-bottom: 1px solid #eee;



    &:last-child {
      border-bottom: none;
    }



    &:hover {
      > .e-button-group {
        opacity: 1.0;
      }
    }

    > .e-button-group {
      margin-left: 8px;
      opacity: 0;
    }
  }
`
