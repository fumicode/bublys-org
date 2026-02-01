export class RotatingArray<T> {
  private _array: T[];

  constructor(array: T[]) {
    this._array = array;
  }

  rotate(steps: number): RotatingArray<T> {
    return new RotatingArray(rotateArray(this._array, steps));
  }

  get array(): T[] {
    return this._array;
  }

  at(index: number): T {
    return this._array[index];
  }
}

//rotate の実装を純粋な関数に抽出
function rotateArray<T>(array: T[], steps: number): T[] {
  const length = array.length;
  const normalizedSteps = ((steps % length) + length) % length;
  return array.slice(normalizedSteps).concat(array.slice(0, normalizedSteps));
}
