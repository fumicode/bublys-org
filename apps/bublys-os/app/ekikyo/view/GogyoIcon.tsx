import styled from "styled-components";
import { GogyoName } from "../domain/kyusei-types";
import { FC } from "react";

export type GogyoIconProps = {
  gogyo: GogyoName;
};

export const GogyoColors: Record<GogyoName, string> = {
  木: "#409c5b",
  火: "#9c4057",
  土: "#9c6b40",
  金: "#9c9740",
  水: "#40989c",
};

type StyledGogyoIconProps = {
  gogyo: GogyoName;
  children: React.ReactNode;
}

//style
export const StyledGogyoIcon = styled.span<StyledGogyoIconProps>`
  display: inline-flex;
  justify-content: center;
  align-items: center;

  background-color: ${(p: { gogyo: GogyoName }) => GogyoColors[p.gogyo]};
  color: white;
  border-radius: 50%;
  width: 1em;
  height: 1em;
  font-size: 0.8em;
`;

export const GogyoIcon: FC<GogyoIconProps> = ({ gogyo }) => {
  return <StyledGogyoIcon gogyo={gogyo}>{gogyo}</StyledGogyoIcon>;
};
