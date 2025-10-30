import styled from 'styled-components';
import { MemoBody } from '../MemoBody';
import MemoEditor from '../memoContentEditable';

const StyledApp = styled.div`
  // Your style here
`;

export function App() {
  return (
    <StyledApp>
      <MemoBody />
    </StyledApp>
  );
}

export default App;
