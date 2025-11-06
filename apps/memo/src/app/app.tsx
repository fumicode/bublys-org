import styled from 'styled-components';
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  Link,
  Navigate
} from 'react-router-dom';
import { MemoList } from '@bublys-org/memo-feature'
import { MemoTitle } from '@bublys-org/memo-feature';
import { MemoEditor } from '@bublys-org/memo-feature';

const StyledApp = styled.div`
  padding: 16px;
  // Your style here
`;

export function App() {
  const navigate = useNavigate();
  return (
    <StyledApp>
      <Routes>
        <Route
          path="/memos"
          element={<MemoList onSelectMemo={(id) => navigate(`/memos/${id}`)} />}
        />
        <Route path="/memos/:memoId" element={<MemoPage />} />
        <Route path="*" element={<Navigate to="/memos" replace />} />
      </Routes>
    </StyledApp>
  );
}

function MemoPage() {
  const { memoId } = useParams<{ memoId: string }>();
  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/memos">← メモ一覧に戻る</Link>
      </div>
      <MemoTitle memoId={memoId!} />
      <MemoEditor memoId={memoId!} />
    </>
  );
}

export default App;
