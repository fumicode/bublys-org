import { FC } from "react";
import { KyuseiName, KyuseiRepository } from "../domain/kyusei-types.js";
import { GogyoIcon } from "./GogyoIcon.js";
import { ObjectView } from "@bublys-org/bubbles-ui";
import styled from "styled-components";

export type FloatingKyuseiProps = {
  kyusei: KyuseiName;
  position: {
    top: number;
    left: number;
    level: number;
  };
  popOutMaxHeight: number; //z px

  /** 九星のURLを生成（ダブルクリックで開く先） */
  buildKyuseiUrl: (kyusei: KyuseiName) => string;
};

/**
 * 盤の上に浮かぶ九星ひとつ。
 *
 * 「位置を持つ枠（Slot）」と「見た目の丸（Disc）」を分けている。
 * 丸そのものは position:absolute + transform で置かれているので、外から
 * ObjectView の span で包むと span が実質0サイズになってクリックもドラッグも
 * 拾えなくなる。位置の責務は枠に残し、包むのは中の丸のほうにする。
 */
export const FloatingKyusei: FC<FloatingKyuseiProps> = ({
  kyusei,
  position,
  popOutMaxHeight: popOutMaxHeight,
  buildKyuseiUrl,
}) => {
  const kyuseiObj = KyuseiRepository[kyusei];

  return (
    <FloatingKyuseiSlot
      position={position}
      level={position.level}
      popOutHeight={popOutMaxHeight}
    >
      <ObjectView
        type="Kyusei"
        url={buildKyuseiUrl(kyusei)}
        label={kyusei}
        openingPosition="bubble-side-right"
        fullWidth
        className="e-kyusei-hit"
      >
        <KyuseiDisc
          level={position.level}
          title="ダブルクリックで九星盤を開く"
        >
          {kyusei}
          <GogyoIcon gogyo={kyuseiObj.gogyo} />
        </KyuseiDisc>
      </ObjectView>
    </FloatingKyuseiSlot>
  );
};

const SIZE = 100; // px

/** 位置だけを持つ枠。見た目は持たない */
const FloatingKyuseiSlot = styled.div<{
  position: { top: number; left: number };
  level: number;
  popOutHeight: number;
  children: React.ReactNode;
}>`
  position: absolute;
  transition: all 1s ease;
  z-index: ${(p) => p.level};

  transform: translateX(${(p) => p.position.left * SIZE}px)
    translateY(${(p) => p.position.top * SIZE}px)
    translateZ(${(p) => (p.level / 5) * p.popOutHeight}px);

  transform-origin: center ${(p) => -p.position.left * SIZE}px center
    ${(p) => -p.position.top * SIZE}px;

  width: ${SIZE}px;
  height: ${SIZE}px;
  margin-top: -${SIZE / 2}px;
  margin-left: -${SIZE / 2}px;

  /* ObjectView のラッパ span。fullWidth で display:flex / width:100% は付くので、
     高さだけ枠いっぱいに広げて丸全体を当たり判定にする。
     hover で出る泡の膜も、四角ではなく丸で包まれてほしいので丸みを渡す */
  .e-kyusei-hit {
    height: 100%;
    border-radius: 50%;
    --object-view-film-radius: 50%;
  }
`;

/** 見た目の丸。当たり判定はこのサイズになる */
const KyuseiDisc = styled.div<{
  level: number;
  title: string;
  children: React.ReactNode;
}>`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 5px;
  border: 1px solid black;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, ${(p) => (p.level / 5) * 0.3 + 0.7});

  box-shadow: ${(p) => (p.level / 5) * 3}px ${(p) => (p.level / 5) * 3}px
    ${(p) => (p.level / 5) * 8}px rgba(0, 0, 0, 0.5);

  display: flex;
  justify-content: center;
  align-items: center;

  color: #333;
  //縦書き
  writing-mode: vertical-rl;
  font-family: serif;
`;
