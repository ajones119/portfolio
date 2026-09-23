import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  availableMoves,
  createGame,
  evaluateWinner,
  MAX_BOARD_SIZE,
  MIN_BOARD_SIZE,
  playMove,
  type Cell,
  type GameState,
} from './ticTacToe.js';

const boardWith = (size: number, marks: Record<number, 'X' | 'O'>): Cell[] => {
  const board: Cell[] = Array.from({ length: size * size }, () => null);
  for (const [index, player] of Object.entries(marks)) board[Number(index)] = player;
  return board;
};

const indexes = (size: number, predicate: (row: number, column: number) => boolean): number[] => {
  const result: number[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (predicate(row, column)) result.push(row * size + column);
    }
  }
  return result;
};

const playSequence = (moves: number[], size = 3): GameState =>
  moves.reduce((state, index) => playMove(state, index), createGame(size));

describe('tic-tac-toe game state', () => {
  it('creates empty 3x3 and 10x10 games with X first', () => {
    const small = createGame(MIN_BOARD_SIZE);
    assert.equal(small.size, 3);
    assert.equal(small.board.length, 9);
    assert.equal(small.currentPlayer, 'X');
    assert.equal(small.status, 'playing');
    assert.equal(small.winner, null);
    assert.deepEqual(small.winningLine, []);
    assert.deepEqual(small.moves, []);

    const large = createGame(MAX_BOARD_SIZE);
    assert.equal(large.size, 10);
    assert.equal(large.board.length, 100);
    assert.equal(availableMoves(large.board).length, 100);
  });

  it('rejects non-integer and out-of-range board sizes deterministically', () => {
    for (const size of [Number.NaN, Number.POSITIVE_INFINITY, 2, 2.5, 11, 0, -1]) {
      assert.throws(() => createGame(size), {
        name: 'RangeError',
        message: /between 3 and 10/,
      });
    }
  });

  it('sequences valid moves, records coordinates, and alternates players', () => {
    let state = createGame(3);
    state = playMove(state, 0);
    assert.deepEqual(state.board, ['X', null, null, null, null, null, null, null, null]);
    assert.equal(state.currentPlayer, 'O');
    assert.deepEqual(state.moves[0], { index: 0, player: 'X', row: 0, column: 0 });

    state = playMove(state, 4);
    state = playMove(state, 1);
    assert.deepEqual(state.moves, [
      { index: 0, player: 'X', row: 0, column: 0 },
      { index: 4, player: 'O', row: 1, column: 1 },
      { index: 1, player: 'X', row: 0, column: 1 },
    ]);
    assert.equal(state.currentPlayer, 'O');
    assert.equal(state.status, 'playing');
  });

  it('returns the unchanged state for occupied, out-of-range, and terminal moves', () => {
    let state = playMove(createGame(3), 0);
    assert.strictEqual(playMove(state, 0), state);
    assert.strictEqual(playMove(state, -1), state);
    assert.strictEqual(playMove(state, 9), state);
    assert.deepEqual(state.moves, [{ index: 0, player: 'X', row: 0, column: 0 }]);

    state = playSequence([0, 3, 1, 4, 2]);
    assert.equal(state.status, 'won');
    assert.strictEqual(playMove(state, 5), state);
    assert.equal(state.moves.length, 5);
  });

  it('detects winning rows and returns the exact row indexes', () => {
    const board = boardWith(3, { 0: 'O', 1: 'O', 2: 'O', 4: 'X' });
    assert.deepEqual(evaluateWinner(board, 3, 2), { winner: 'O', winningLine: [0, 1, 2] });
  });

  it('detects winning columns and returns the exact column indexes', () => {
    const board = boardWith(3, { 1: 'X', 4: 'X', 7: 'X', 0: 'O' });
    assert.deepEqual(evaluateWinner(board, 3, 7), { winner: 'X', winningLine: [1, 4, 7] });
  });

  it('detects both diagonal directions', () => {
    const descending = boardWith(3, { 0: 'X', 4: 'X', 8: 'X' });
    assert.deepEqual(evaluateWinner(descending, 3, 8), {
      winner: 'X',
      winningLine: [0, 4, 8],
    });

    const ascending = boardWith(3, { 2: 'O', 4: 'O', 6: 'O' });
    assert.deepEqual(evaluateWinner(ascending, 3, 6), {
      winner: 'O',
      winningLine: [2, 4, 6],
    });
  });

  it('does not report a near-line as a win', () => {
    const nearRow = boardWith(3, { 0: 'X', 1: 'X' });
    const nearColumn = boardWith(3, { 0: 'O', 3: 'O' });
    const nearDiagonal = boardWith(3, { 0: 'X', 4: 'X' });
    assert.deepEqual(evaluateWinner(nearRow, 3), { winner: null, winningLine: [] });
    assert.deepEqual(evaluateWinner(nearColumn, 3), { winner: null, winningLine: [] });
    assert.deepEqual(evaluateWinner(nearDiagonal, 3), { winner: null, winningLine: [] });
  });

  it('supports all four generalized directions on a 10x10 board', () => {
    const lines = [
      indexes(10, (row) => row === 4),
      indexes(10, (_, column) => column === 6),
      indexes(10, (row, column) => row === column),
      indexes(10, (row, column) => row + column === 9),
    ];

    for (const line of lines) {
      const board = boardWith(10, Object.fromEntries(line.map((index) => [index, 'X'])));
      assert.deepEqual(evaluateWinner(board, 10, line[line.length - 1]), {
        winner: 'X',
        winningLine: line,
      });
    }
  });

  it('gives a winner precedence over a full-board draw', () => {
    const board = Array.from({ length: 9 }, (_, index) => (index < 3 ? 'X' : index % 2 ? 'O' : 'X')) as Cell[];
    assert.equal(board.every((cell) => cell !== null), true);
    assert.deepEqual(evaluateWinner(board, 3), { winner: 'X', winningLine: [0, 1, 2] });
  });

  it('marks a full board with no winner as a draw', () => {
    const state = playSequence([0, 1, 2, 4, 3, 5, 7, 6, 8]);
    assert.equal(state.status, 'draw');
    assert.equal(state.winner, null);
    assert.deepEqual(state.winningLine, []);
    assert.equal(state.moves.length, 9);
    assert.deepEqual(availableMoves(state.board), []);
  });

  it('returns only empty cell indexes without mutating the board', () => {
    const board: Cell[] = ['X', null, 'O', null];
    const snapshot = [...board];
    assert.deepEqual(availableMoves(board), [1, 3]);
    assert.deepEqual(board, snapshot);
  });
});
