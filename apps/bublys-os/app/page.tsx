'use client';
import styled from 'styled-components';
import { selectCount, useAppDispatch, useAppSelector, decrement, increment } from "@bublys-org/state-management";

const StyledPage = styled.div`
  .page {
  }
`;

export default function Index() {
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.styled-components file.
   */

  const dispatch = useAppDispatch();
  console.log(dispatch);
  console.log(selectCount);
  console.log(decrement);
  console.log(increment);
  
  const count = useAppSelector(selectCount);
  return (
    <StyledPage>
      <button onClick={() => dispatch(decrement())}>
        -
      </button>
      {count}
      <button onClick={() => dispatch(increment())}>
        +
      </button>
    </StyledPage>
  );
}
