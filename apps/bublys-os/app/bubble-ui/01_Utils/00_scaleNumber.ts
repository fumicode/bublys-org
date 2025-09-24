interface NumberRange {
  start: number;
  end: number;
}

export default function scaleNumber(
  input: number,
  from: NumberRange = { start: 0, end: 1 },
  to: NumberRange = { start: 0, end: 1 }
): number {
  const x = input;

  const x1 = from.start,
    y1 = to.start,
    x2 = from.end,
    y2 = to.end;

  if (x > x2) {
    //とてもひどいなら真っ赤
    return y2;
  } else if (x < x1) {
    //ちょっとかさなってるだけなら真っ黄
    return y1;
  }

  const a = (y2 - y1) / (x2 - x1); //傾き
  return a * (x - x1) + y1;
}
