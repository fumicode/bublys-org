import styled from 'styled-components';
import { Memo } from '../Memo';
import MemoEditor from '../memoContentEditable';

const StyledApp = styled.div`
  // Your style here
`;

export function App() {
  return (
    <StyledApp>
      <Memo />
    </StyledApp>
  );
}

export default App;
