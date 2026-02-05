import { FC, useState } from "react";
import styled from "styled-components";
import { RotatingArray } from "../util/RotatingArray.js";
import { KyuseiName, KyuseiNameList } from "../domain/kyusei-types.js";
import { GogyoIcon } from "./GogyoIcon.js";
import { FloatingKyusei } from "./FloatingKyusei.js";
import { Slider } from "@mui/material";

type FloatingKotenTeiibanProps = {
  centerKyusei?: KyuseiName;

  onClickKyusei?: (kyusei: KyuseiName) => void;
};

export const FloatingKotenTeiiban: FC<FloatingKotenTeiibanProps> = ({
  centerKyusei = "五黄",
  onClickKyusei,
}) => {
  //3x3のマスを作成

  const basicKyuseiPositions = new RotatingArray([
    { top: 1, left: 0, level: 5 - Math.abs(1 - 5) }, // 一白
    { top: -1, left: 1, level: 5 - Math.abs(2 - 5) }, // 二黒
    { top: 0, left: -1, level: 5 - Math.abs(3 - 5) }, // 三碧
    { top: -1, left: -1, level: 5 - Math.abs(4 - 5) }, // 四緑
    { top: 0, left: 0, level: 5 - Math.abs(5 - 5) }, // 五黄
    { top: 1, left: 1, level: 5 - Math.abs(6 - 5) }, // 六白
    { top: 0, left: 1, level: 5 - Math.abs(7 - 5) }, // 七赤
    { top: 1, left: -1, level: 5 - Math.abs(8 - 5) }, // 八白
    { top: -1, left: 0, level: 5 - Math.abs(9 - 5) }, // 九紫
  ]);

  const centerKyuseiIndex = KyuseiNameList.indexOf(centerKyusei);
  const diff = centerKyuseiIndex - 4; // 4は五黄のインデックス
  const zurashi = -diff;
  const rotatedKyuseiPositions = basicKyuseiPositions.rotate(zurashi);

  const [popOutMaxHeight, setPopOutMaxHeight] = useState<number>(100); // px

  return (
    <StyledTable>
      <tbody>
        <tr>
          <td colSpan={3}>
            {centerKyusei}
            <Slider
              max={500}
              aria-label="Volume"
              value={popOutMaxHeight}
              onChange={(_, val) => setPopOutMaxHeight(val as number)}
            />
          </td>
        </tr>
        <tr>
          <td>
            四緑
            <GogyoIcon gogyo={"木"} />
          </td>
          <td>
            九紫
            <GogyoIcon gogyo={"火"} />
          </td>
          <td>
            二黒
            <GogyoIcon gogyo={"土"} />
          </td>
        </tr>
        <tr>
          <td>
            三碧
            <GogyoIcon gogyo={"木"} />
          </td>
          <td style={{ position: "relative" }}>
            五黄 <GogyoIcon gogyo={"土"} />
            <div className="e-origin">
              <FloatingKyusei
                kyusei={"一白"}
                position={rotatedKyuseiPositions.at(0)}
                popOutMaxHeight={popOutMaxHeight}
                onClick={() => {
                  onClickKyusei?.("一白" as const);
                }}
              />
              <FloatingKyusei
                kyusei={"二黒"}
                position={rotatedKyuseiPositions.at(1)}
                popOutMaxHeight={popOutMaxHeight}
                onClick={() => {
                  onClickKyusei?.("二黒" as const);
                }}
              />
              <FloatingKyusei
                kyusei={"三碧"}
                position={rotatedKyuseiPositions.at(2)}
                popOutMaxHeight={popOutMaxHeight}
                onClick={() => {
                  onClickKyusei?.("三碧" as const);
                }}
              />
              <FloatingKyusei
                kyusei={"四緑"}
                position={rotatedKyuseiPositions.at(3)}
                popOutMaxHeight={popOutMaxHeight}
                onClick={() => {
                  onClickKyusei?.("四緑" as const);
                }}
              />
              <FloatingKyusei
                kyusei={"五黄"}
                position={rotatedKyuseiPositions.at(4)}
                popOutMaxHeight={popOutMaxHeight}
                onClick={() => {
                  onClickKyusei?.("五黄" as const);
                }}
              />
              <FloatingKyusei
                kyusei={"六白"}
                position={rotatedKyuseiPositions.at(5)}
                popOutMaxHeight={popOutMaxHeight}
                onClick={() => {
                  onClickKyusei?.("六白" as const);
                }}
              />
              <FloatingKyusei
                kyusei={"七赤"}
                position={rotatedKyuseiPositions.at(6)}
                popOutMaxHeight={popOutMaxHeight}
                onClick={() => {
                  onClickKyusei?.("七赤" as const);
                }}
              />
              <FloatingKyusei
                kyusei={"八白"}
                position={rotatedKyuseiPositions.at(7)}
                popOutMaxHeight={popOutMaxHeight}
                onClick={() => {
                  onClickKyusei?.("八白" as const);
                }}
              />
              <FloatingKyusei
                kyusei={"九紫"}
                position={rotatedKyuseiPositions.at(8)}
                popOutMaxHeight={popOutMaxHeight}
                onClick={() => {
                  onClickKyusei?.("九紫" as const);
                }}
              />
            </div>
          </td>
          <td>
            七赤
            <GogyoIcon gogyo={"金"} />
          </td>
        </tr>
        <tr>
          <td>
            八白
            <GogyoIcon gogyo={"土"} />
          </td>
          <td>
            一白
            <GogyoIcon gogyo={"水"} />
          </td>
          <td>
            六白
            <GogyoIcon gogyo={"金"} />
          </td>
        </tr>
      </tbody>
    </StyledTable>
  );
};

const StyledTable = styled.table`
  border: 1px solid black;
  border-collapse: collapse;
  font-size: 20px;
  font-weight: bold;

  background-color: #f0f0f0;

  td {
    border: 1px solid black;
    padding: 10px;

    width: 100px;
    height: 100px;

    color: #888;

    //縦書き

    text-align: center;
    vertical-align: bottom;
    font-family: serif;

    > .e-origin {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 10px;
      height: 10px;

      background: red;

      perspective: 500px;
      perspective-origin: 170% 30%;
    }
  }
`;
