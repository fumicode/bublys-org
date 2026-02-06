import { FC } from "react";
import { KyuseiName, KyuseiRepository } from "../domain/kyusei-types.js";
import { GogyoIcon } from "./GogyoIcon.js";
import styled from "styled-components";

export type FloatingKyuseiProps = {
  kyusei: KyuseiName;
  position: {
    top: number;
    left: number;
    level: number;
  };
  popOutMaxHeight: number; //z px

  onClick: () => void;
};

export const FloatingKyusei: FC<FloatingKyuseiProps> = ({
  kyusei,
  position,
  popOutMaxHeight: popOutMaxHeight,
  onClick,
}) => {
  const kyuseiObj = KyuseiRepository[kyusei];

  return (
    <FloatingKyuseiContainer
      position={position}
      level={position.level}
      popOutHeight={popOutMaxHeight}
      onClick={onClick}
    >
      {kyusei}
      <GogyoIcon gogyo={kyuseiObj.gogyo} />
    </FloatingKyuseiContainer>
  );
};

type FloatingKyuseiContainerProps = {
  position: {
    top: number;
    left: number;
  };
  level: number;

  popOutHeight: number;
  children: React.ReactNode;
  onClick: () => void;
};

const SIZE = 100; // px

const FloatingKyuseiContainer = styled.div<FloatingKyuseiContainerProps>`
  position: absolute;
  transition: all 1s ease;
  z-index: ${(p) => p.level};

  transform: translateX(${(p) => p.position.left * SIZE}px)
    translateY(${(p) => p.position.top * SIZE}px)
    translateZ(${(p) => (p.level / 5) * p.popOutHeight}px);

  transform-origin: center ${(p) => -p.position.left * SIZE}px center
    ${(p) => -p.position.top * SIZE}px;

  background-color: rgba(255, 255, 255, ${(p) => (p.level / 5) * 0.3 + 0.7});
  border: 1px solid black;
  box-sizing: border-box;
  padding: 5px;
  border-radius: 50%;
  width: ${SIZE}px;
  height: ${SIZE}px;
  margin-top: -${SIZE / 2}px;
  margin-left: -${SIZE / 2}px;

  box-shadow: ${(p) => (p.level / 5) * 3}px ${(p) => (p.level / 5) * 3}px
    ${(p) => (p.level / 5) * 8}px rgba(0, 0, 0, 0.5);

  display: flex;
  justify-content: center;

  color: #333;
  align-items: center;
  //縦書き
  writing-mode: vertical-rl;
  font-family: serif;
`;
