import { FC } from "react";
import clsx from "clsx";
import styled from "styled-components";
import { SmartRect } from "@bublys-org/bubbles-ui";

type SmartRectViewProps = {
  rect: SmartRect; // SmartRectのインスタンス
};

export const SmartRectView: FC<SmartRectViewProps> = ({
  rect,
}: SmartRectViewProps) => {
  return (
    <StyledSmartRectView>
      <table>
        <tbody>
          <tr>
            <td
              className={clsx({
                "m-widest": rect.calcSpaceWideDirection() === "left",
              })}
            >
              ◀{Math.floor(rect.leftSpace)}
            </td>
            <td>↑{Math.floor(rect.top)}</td>
            <td
              className={clsx({
                "m-widest": rect.calcSpaceWideDirection() === "top",
              })}
            >
              ▲{Math.floor(rect.topSpace)}
            </td>
          </tr>
          <tr>
            <td>←{Math.floor(rect.left)}</td>
            <td></td>
            <td>{Math.floor(rect.right)}→</td>
          </tr>
          <tr>
            <td
              className={clsx({
                "m-widest": rect.calcSpaceWideDirection() === "bottom",
              })}
            >
              ▼{Math.floor(rect.bottomSpace)}
            </td>
            <td>↓{Math.floor(rect.bottom)}</td>
            <td
              className={clsx({
                "m-widest": rect.calcSpaceWideDirection() === "right",
              })}
            >
              {Math.floor(rect.rightSpace)}▶
            </td>
          </tr>
        </tbody>
      </table>
    </StyledSmartRectView>
  );
};

const StyledSmartRectView = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;

  z-index: 10000;

  background: white;
  border: 1px solid black;
  padding: 3px;
  font-size: 9px;

  opacity: 0.5;

  td {
    &.m-widest {
      color: red;
      font-weight: bold;
    }
  }
`;
