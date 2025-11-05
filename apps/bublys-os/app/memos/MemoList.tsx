import { addMemo, deleteMemo, selectMemos, useAppDispatch, useAppSelector, Memo} from '@bublys-org/state-management';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { Button, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { LuClipboardCopy } from 'react-icons/lu';
import styled from 'styled-components';

type MemoListProps = {
  onSelectMemo: (memoId: string) => void;
};

export function MemoList({ onSelectMemo }: MemoListProps) {
  //メモの一覧を表示
  const memos = useAppSelector(selectMemos);
  const dispatch = useAppDispatch();

  return (
    <div>
      <StyledMemoList>
        {memos.map((memo) => (
          <li key={memo.id} className="e-item">
            {/* <a href={`/memos/${id}`}> */}
            <button style={{ all: "unset", cursor: "pointer" }} onClick={() => {
              onSelectMemo?.(memo.id);
            }}>
              <ArticleOutlinedIcon/>
              <span>「{memo.blocks[memo.lines?.[0]]?.content}...」</span>
            </button>
            {/* </a> */}

            <span className='e-button-group'>
              <IconButton
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(memo.id);
                }}
              >
                <LuClipboardCopy />
              </IconButton>
              <IconButton onClick={(e)=> {
                e.preventDefault();
                dispatch(deleteMemo(memo.id));
              }}>
                <DeleteIcon />
              </IconButton>
            </span>
          </li>
        ))}
      </StyledMemoList>

      <div>
        <Button variant="contained" onClick={(e)=> {
          e.preventDefault();
          const newMemo = Memo.create();
          dispatch(addMemo({ memo: newMemo.toJson() }));
          onSelectMemo(newMemo.id);


        }}>メモを追加</Button>
      </div>
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
