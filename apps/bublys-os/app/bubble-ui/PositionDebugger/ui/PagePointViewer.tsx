"use client";

import styled from "styled-components";
import { FC, useContext, useState } from "react";
import { PositionDebuggerContext } from "../domain/PositionDebuggerContext";
import { SmartRectView } from "./SmartRectView";
import { Box, Stack } from "@mui/material";
import { Point2 } from "@ep2as-apps/vue-domain";
import { useWindowSize } from "../../01_Utils/01_useWindowSize";

//PositionDebuggerからpointsとrectsをもらって表示する
export const PagePointViewer: FC = () => {
  const { points, rects } = useContext(PositionDebuggerContext);
  const [blurred, setBlurred] = useState(false);

  const pageSize = useWindowSize();

  //格子点
  const gridSize = 100;
  const gridPoints: Point2[] = [];
  for (let x = 0; x < pageSize.width; x += gridSize) {
    for (let y = 0; y < pageSize.height; y += gridSize) {
      gridPoints.push({ x, y });
    }
  }

  return (
    <StyledPointViewer blurred={blurred}>
      <div className="e-controls">
        <button
          onClick={() => {
            setBlurred((prev) => !prev);
          }}
        >
          {blurred ? "Unblur" : "Blur"}
        </button>

        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box>
            Points: {points.length}
            <ul>
              {points.map((point, index) => (
                <li key={index}>{`(${point.x}, ${point.y})`}</li>
              ))}
            </ul>
          </Box>
          <Box>
            Rects: {rects.length}
            <ul>
              {rects.map((rect, index) => (
                <li key={index}>{`(${Math.round(rect.x)}, ${Math.round(
                  rect.y
                )}) ${Math.round(rect.width)}x${Math.round(rect.height)}`}</li>
              ))}
            </ul>
          </Box>
        </Stack>
      </div>
      {gridPoints.map((point, index) => (
        <div
          key={index}
          className="e-point"
          style={{ left: point.x, top: point.y }}
        >
          <span className="e-point-mark is-small is-gray"></span>
        </div>
      ))}

      {points.map((point, index) => (
        <div
          key={index}
          className="e-point"
          style={{ left: point.x, top: point.y }}
        >
          <span className="e-point-mark"></span>
          <span className="e-point-value">{`(${point.x}, ${point.y})`}</span>
        </div>
      ))}

      {rects.map((rect, index) => (
        <div
          key={index}
          className="e-rect"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        >
          <span className="e-rect">
            <SmartRectView rect={rect} />
          </span>
        </div>
      ))}
    </StyledPointViewer>
  );
};

type StyledPointViewerProps = {
  blurred?: boolean;
};
const StyledPointViewer = styled.div<StyledPointViewerProps>`
  position: fixed;

  left: 0;
  bottom: 0;
  right: 0;
  top: 0;
  z-index: 1000; // デバッグ用の高いz-index
  pointer-events: none;

  ${({ blurred }) => (blurred ? `backdrop-filter: blur(10px);` : "")}

  .e-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10001;
    pointer-events: auto;

    background: rgba(255, 255, 255, 0.8);

    button {
      padding: 5px 10px;
      font-size: 14px;
      cursor: pointer;
    }
  }

  .e-point {
    position: absolute;
    width: 100px;
    height: 20px;

    .e-point-mark {
      position: absolute;
      top: 0px;
      left: 0px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      width: 10px;
      height: 10px;
      background-color: hsla(0, 100%, 50%, 0.5);
      border-radius: 50%;

      &.is-small {
        width: 5px;
        height: 5px;
      }
      &.is-gray {
        background-color: hsla(0, 0%, 50%, 0.5);
      }
    }
    .e-point-value {
      font-size: 9px;
      opacity: 0.8;
    }
  }

  .e-rect {
    position: absolute;
    border: 1px solid red;

    .e-rect {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  }
`;
