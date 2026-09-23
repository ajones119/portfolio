export type Player = 'X' | 'O';

export type Cell = Player | null;

export interface Move {
  index: number;
  player: Player;
  row: number;
  column: number;
}

export interface GameState {
  size: number;
  board: Cell[];
  currentPlayer: Player;
  status: 'playing' | 'won' | 'draw';
  winner: Player | null;
  winningLine: number[];
  moves: Move[];
}

export const MIN_BOARD_SIZE = 3;
export const MAX_BOARD_SIZE = 10;

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

function validateBoardSize(size: number): void {
  if (!Number.isInteger(size) || size < MIN_BOARD_SIZE || size > MAX_BOARD_SIZE) {
    throw new RangeError(
      `Board size must be an integer between ${MIN_BOARD_SIZE} and ${MAX_BOARD_SIZE}.`,
    );
  }
}

function validateBoard(board: readonly Cell[], size: number): void {
  validateBoardSize(size);
  if (board.length !== size * size) {
    throw new RangeError(`Board must contain exactly ${size * size} cells.`);
  }
}

function opponent(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

function isPlayer(cell: Cell): cell is Player {
  return cell === 'X' || cell === 'O';
}

function lineFrom(board: readonly Cell[], size: number, index: number): number[] {
  const player = board[index];
  if (!isPlayer(player)) {
    return [];
  }

  const row = Math.floor(index / size);
  const column = index % size;

  for (const [rowStep, columnStep] of DIRECTIONS) {
    let startRow = row;
    let startColumn = column;
    let endRow = row;
    let endColumn = column;

    while (
      startRow - rowStep >= 0 &&
      startRow - rowStep < size &&
      startColumn - columnStep >= 0 &&
      startColumn - columnStep < size &&
      board[(startRow - rowStep) * size + (startColumn - columnStep)] === player
    ) {
      startRow -= rowStep;
      startColumn -= columnStep;
    }

    while (
      endRow + rowStep >= 0 &&
      endRow + rowStep < size &&
      endColumn + columnStep >= 0 &&
      endColumn + columnStep < size &&
      board[(endRow + rowStep) * size + (endColumn + columnStep)] === player
    ) {
      endRow += rowStep;
      endColumn += columnStep;
    }

    const length = Math.max(Math.abs(endRow - startRow), Math.abs(endColumn - startColumn)) + 1;
    if (length >= size) {
      const winningLine: number[] = [];
      for (let step = 0; step < size; step += 1) {
        winningLine.push((startRow + step * rowStep) * size + startColumn + step * columnStep);
      }
      return winningLine;
    }
  }

  return [];
}

export function createGame(size: number): GameState {
  validateBoardSize(size);

  return {
    size,
    board: Array<Cell>(size * size).fill(null),
    currentPlayer: 'X',
    status: 'playing',
    winner: null,
    winningLine: [],
    moves: [],
  };
}

export function evaluateWinner(
  board: readonly Cell[],
  size: number,
  lastMoveIndex?: number,
): { winner: Player | null; winningLine: number[] } {
  validateBoard(board, size);

  if (lastMoveIndex !== undefined) {
    if (Number.isInteger(lastMoveIndex) && lastMoveIndex >= 0 && lastMoveIndex < board.length) {
      const winningLine = lineFrom(board, size, lastMoveIndex);
      if (winningLine.length > 0) {
        return { winner: board[lastMoveIndex], winningLine };
      }
    }
    return { winner: null, winningLine: [] };
  }

  for (let index = 0; index < board.length; index += 1) {
    if (!isPlayer(board[index])) {
      continue;
    }
    const winningLine = lineFrom(board, size, index);
    if (winningLine.length > 0) {
      return { winner: board[index], winningLine };
    }
  }

  return { winner: null, winningLine: [] };
}

export function availableMoves(board: readonly Cell[]): number[] {
  const moves: number[] = [];
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === null) {
      moves.push(index);
    }
  }
  return moves;
}

export function playMove(state: GameState, index: number): GameState {
  if (
    state.status !== 'playing' ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= state.board.length ||
    state.board[index] !== null
  ) {
    return state;
  }

  const board = state.board.slice();
  const player = state.currentPlayer;
  board[index] = player;

  const row = Math.floor(index / state.size);
  const column = index % state.size;
  const move: Move = { index, player, row, column };
  const moves = [...state.moves, move];
  const { winner, winningLine } = evaluateWinner(board, state.size, index);

  if (winner !== null) {
    return {
      ...state,
      board,
      status: 'won',
      winner,
      winningLine,
      moves,
    };
  }

  if (availableMoves(board).length === 0) {
    return {
      ...state,
      board,
      status: 'draw',
      winner: null,
      winningLine: [],
      moves,
    };
  }

  return {
    ...state,
    board,
    currentPlayer: opponent(player),
    status: 'playing',
    winner: null,
    winningLine: [],
    moves,
  };
}
