/**
 * 囲碁ゲーム ドメインモデル
 *
 * DDDの原則に従い、純粋なTypeScriptで実装
 * - 不変性を維持（状態更新時は新しいインスタンスを返す）
 * - 状態はstateオブジェクトを介して管理
 */

/** 石の色（手番） */
export type StoneColor_石の色 = 'black' | 'white' | null;

/** 盤面の交点 */
export type Intersection_交点 = {
  row: number;
  col: number;
};

/** ゲームの状態 */
export type GameStatus_ゲーム状態 = 'playing' | 'finished';

/** 着手の記録 */
export type Move_着手 = {
  intersection: Intersection_交点;
  color: StoneColor_石の色;
  moveNumber: number;
};

/** 囲碁ゲームの状態 */
export type IgoGameState_囲碁ゲーム状態 = {
  id: string;
  boardSize: number;
  board: StoneColor_石の色[][];
  currentTurn: 'black' | 'white';
  moveHistory: Move_着手[];
  capturedBlack: number;  // 白に取られた黒石の数
  capturedWhite: number;  // 黒に取られた白石の数
  status: GameStatus_ゲーム状態;
  passCount: number;      // 連続パスの回数（2回で終局）
  winner: 'black' | 'white' | null;  // 勝者
  endReason: 'resign' | 'pass' | null;  // 終局理由
};

/**
 * 囲碁ゲーム ドメインクラス
 */
export class IgoGame_囲碁ゲーム {
  constructor(readonly state: IgoGameState_囲碁ゲーム状態) {}

  /** 新しいゲームを作成 */
  static create(id: string, boardSize: number = 9): IgoGame_囲碁ゲーム {
    const board: StoneColor_石の色[][] = Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(null));

    return new IgoGame_囲碁ゲーム({
      id,
      boardSize,
      board,
      currentTurn: 'black', // 黒が先手
      moveHistory: [],
      capturedBlack: 0,
      capturedWhite: 0,
      status: 'playing',
      passCount: 0,
      winner: null,
      endReason: null,
    });
  }

  /** 盤面サイズを取得 */
  get boardSize(): number {
    return this.state.boardSize;
  }

  /** 現在の手番を取得 */
  get currentTurn(): 'black' | 'white' {
    return this.state.currentTurn;
  }

  /** 現在の手番の表示名 */
  get currentTurnLabel(): string {
    return this.state.currentTurn === 'black' ? '黒' : '白';
  }

  /** 次の手番を取得 */
  get nextTurn(): 'black' | 'white' {
    return this.state.currentTurn === 'black' ? 'white' : 'black';
  }

  /** 指定位置の石を取得 */
  getStone(row: number, col: number): StoneColor_石の色 {
    if (!this.isValidPosition(row, col)) return null;
    return this.state.board[row][col];
  }

  /** 有効な盤面位置かどうか */
  isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < this.state.boardSize && col >= 0 && col < this.state.boardSize;
  }

  /** 指定位置に着手可能かどうか */
  canPlaceStone(row: number, col: number): boolean {
    if (this.state.status !== 'playing') return false;
    if (!this.isValidPosition(row, col)) return false;
    if (this.state.board[row][col] !== null) return false;

    // 自殺手のチェック（簡易版：呼吸点があるかどうか）
    const testBoard = this.copyBoard();
    testBoard[row][col] = this.state.currentTurn;

    // 相手の石を取れる場合は有効
    const captured = this.findCapturedStones(testBoard, this.nextTurn);
    if (captured.length > 0) return true;

    // 自分の石に呼吸点があるかチェック
    const group = this.findGroup(testBoard, row, col);
    return this.hasLiberties(testBoard, group);
  }

  /** 着手を実行 */
  placeStone(row: number, col: number): IgoGame_囲碁ゲーム {
    if (!this.canPlaceStone(row, col)) {
      return this; // 着手不可能な場合は何もしない
    }

    const newBoard = this.copyBoard();
    newBoard[row][col] = this.state.currentTurn;

    // 相手の石を取る
    const captured = this.findCapturedStones(newBoard, this.nextTurn);
    for (const pos of captured) {
      newBoard[pos.row][pos.col] = null;
    }

    // 取った石の数を更新
    const newCapturedBlack = this.state.currentTurn === 'white'
      ? this.state.capturedBlack + captured.length
      : this.state.capturedBlack;
    const newCapturedWhite = this.state.currentTurn === 'black'
      ? this.state.capturedWhite + captured.length
      : this.state.capturedWhite;

    const newMove: Move_着手 = {
      intersection: { row, col },
      color: this.state.currentTurn,
      moveNumber: this.state.moveHistory.length + 1,
    };

    return new IgoGame_囲碁ゲーム({
      ...this.state,
      board: newBoard,
      currentTurn: this.nextTurn,
      moveHistory: [...this.state.moveHistory, newMove],
      capturedBlack: newCapturedBlack,
      capturedWhite: newCapturedWhite,
      passCount: 0, // 着手したのでパスカウントをリセット
    });
  }

  /** パス */
  pass(): IgoGame_囲碁ゲーム {
    if (this.state.status !== 'playing') return this;

    const newPassCount = this.state.passCount + 1;
    const isFinished = newPassCount >= 2;

    return new IgoGame_囲碁ゲーム({
      ...this.state,
      currentTurn: this.nextTurn,
      passCount: newPassCount,
      status: isFinished ? 'finished' : 'playing',
      endReason: isFinished ? 'pass' : null,
      // 連続パスの場合、勝者は地計算が必要（簡易版では未実装）
    });
  }

  /** 投了 */
  resign(): IgoGame_囲碁ゲーム {
    // 投了した側が負け = 相手が勝ち
    const winner = this.nextTurn;
    return new IgoGame_囲碁ゲーム({
      ...this.state,
      status: 'finished',
      winner,
      endReason: 'resign',
    });
  }

  /** 盤面をコピー */
  private copyBoard(): StoneColor_石の色[][] {
    return this.state.board.map(row => [...row]);
  }

  /** 指定位置から連結した石のグループを見つける */
  private findGroup(board: StoneColor_石の色[][], row: number, col: number): Intersection_交点[] {
    const color = board[row][col];
    if (color === null) return [];

    const visited = new Set<string>();
    const group: Intersection_交点[] = [];
    const stack: Intersection_交点[] = [{ row, col }];

    while (stack.length > 0) {
      const pos = stack.pop()!;
      const key = `${pos.row},${pos.col}`;

      if (visited.has(key)) continue;
      if (!this.isValidPosition(pos.row, pos.col)) continue;
      if (board[pos.row][pos.col] !== color) continue;

      visited.add(key);
      group.push(pos);

      // 4方向を探索
      stack.push({ row: pos.row - 1, col: pos.col });
      stack.push({ row: pos.row + 1, col: pos.col });
      stack.push({ row: pos.row, col: pos.col - 1 });
      stack.push({ row: pos.row, col: pos.col + 1 });
    }

    return group;
  }

  /** グループに呼吸点（空点）があるかどうか */
  private hasLiberties(board: StoneColor_石の色[][], group: Intersection_交点[]): boolean {
    const checked = new Set<string>();

    for (const pos of group) {
      const neighbors = [
        { row: pos.row - 1, col: pos.col },
        { row: pos.row + 1, col: pos.col },
        { row: pos.row, col: pos.col - 1 },
        { row: pos.row, col: pos.col + 1 },
      ];

      for (const neighbor of neighbors) {
        const key = `${neighbor.row},${neighbor.col}`;
        if (checked.has(key)) continue;
        checked.add(key);

        if (this.isValidPosition(neighbor.row, neighbor.col)) {
          if (board[neighbor.row][neighbor.col] === null) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /** 取られる石を見つける */
  private findCapturedStones(board: StoneColor_石の色[][], color: 'black' | 'white'): Intersection_交点[] {
    const captured: Intersection_交点[] = [];
    const checked = new Set<string>();

    for (let row = 0; row < this.state.boardSize; row++) {
      for (let col = 0; col < this.state.boardSize; col++) {
        const key = `${row},${col}`;
        if (checked.has(key)) continue;
        if (board[row][col] !== color) continue;

        const group = this.findGroup(board, row, col);
        for (const pos of group) {
          checked.add(`${pos.row},${pos.col}`);
        }

        if (!this.hasLiberties(board, group)) {
          captured.push(...group);
        }
      }
    }

    return captured;
  }

  /** JSONにシリアライズ */
  toJSON(): IgoGameState_囲碁ゲーム状態 {
    return { ...this.state };
  }

  /** JSONからデシリアライズ */
  static fromJSON(json: IgoGameState_囲碁ゲーム状態): IgoGame_囲碁ゲーム {
    return new IgoGame_囲碁ゲーム(json);
  }
}
