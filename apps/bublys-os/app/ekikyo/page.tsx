"use client";

import styled from "styled-components";
import { useState } from "react";
import { Box, Stack } from "@mui/material";
import {
  calcKyuseiFromKyurekiYear,
  KyurekiYear,
  KyuseiName,
  KyuseiNameList,
} from "./domain/kyusei-types";
import { FloatingKotenTeiiban } from "./view/FloatingKotenTeiiban";

const StyledPage = styled.div`
  padding: 20px;
`;

export default function Index() {
  const [year, setYear] = useState<KyurekiYear>(2025);

  const [kyusei, setKyusei] = useState<KyuseiName>(
    calcKyuseiFromKyurekiYear(year)
  );

  const handleChangeYear = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = parseInt(e.target.value);
    setYear(newYear);
    const newKyusei = calcKyuseiFromKyurekiYear(newYear);
    setKyusei(newKyusei);
  };

  return (
    <StyledPage>
      <input
        type="number"
        value={year}
        onChange={handleChangeYear}
        onBlur={handleChangeYear}
      />

      <Stack direction={"row"} spacing={2}>
        <Box>
          <button
            onClick={() => {
              const kyuseiIndex = KyuseiNameList.indexOf(kyusei);
              const newKyuseiIndex =
                (kyuseiIndex - 1 + KyuseiNameList.length) %
                KyuseiNameList.length;
              setKyusei(KyuseiNameList[newKyuseiIndex]);
            }}
          >
            一個戻る
          </button>
          <button
            onClick={() => {
              const kyuseiIndex = KyuseiNameList.indexOf(kyusei);
              const newKyuseiIndex = (kyuseiIndex + 1) % KyuseiNameList.length;
              setKyusei(KyuseiNameList[newKyuseiIndex]);
            }}
          >
            一個進む
          </button>
          <select
            value={kyusei}
            onChange={(e) => {
              setKyusei(e.target.value as KyuseiName);
            }}
          >
            {KyuseiNameList.map((kyusei) => (
              <option key={kyusei} value={kyusei}>
                {kyusei}
              </option>
            ))}
          </select>
        </Box>
        <Box>
          <FloatingKotenTeiiban centerKyusei={kyusei}></FloatingKotenTeiiban>
        </Box>
      </Stack>
    </StyledPage>
  );
}
