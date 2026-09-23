import { choice, TypeSafeClient, type ChoiceQuestion } from '@typesafe-ai/sdk';
import { availableMoves, evaluateWinner, MAX_BOARD_SIZE, MIN_BOARD_SIZE, type Cell, type Move } from '../../../game/ticTacToe';

const ERROR_MESSAGE = 'The opponent is unavailable right now.';
export type OpponentMode = 'jev' | 'minimax';
const clientFactoryDefault = () => {
  const apiKey = import.meta.env.TYPESAFE_API_KEY;
  if (!apiKey) throw new Error('TypeSafe API key is not configured.');
  return new TypeSafeClient({
    apiKey,
    timeout: 3500,
    retry: { maxRetries: 0 },
    logLevel: 'off',
  });
};

type OpponentClient = {
  systemOne: (request: {
    state: Record<string, unknown>;
    questions: { move: ChoiceQuestion };
  }, options?: { timeout?: number; retry?: { maxRetries?: number } }) => Promise<{ answers?: { move?: { choice?: unknown } } }>;
};
type ClientFactory = () => OpponentClient;

let clientFactory: ClientFactory = clientFactoryDefault;

export function __setTypeSafeClientFactoryForTests(factory: ClientFactory | null): void {
  clientFactory = factory ?? clientFactoryDefault;
}

function json(body: Record<string, unknown>, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function isValidMove(value: unknown, size: number): value is Move {
  if (!value || typeof value !== 'object') return false;
  const move = value as Partial<Move>;
  return Number.isInteger(move.index)
    && Number.isInteger(move.row)
    && Number.isInteger(move.column)
    && (move.player === 'X' || move.player === 'O')
    && move.index >= 0
    && move.index < size * size
    && move.row === Math.floor(move.index / size)
    && move.column === move.index % size;
}

type ParsedState = { mode: OpponentMode; size: number; board: Cell[]; moves: Move[]; legalMoves: number[] };

function parseState(input: unknown): ParsedState | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as { mode?: unknown; size?: unknown; board?: unknown; moves?: unknown };
  const mode = value.mode === undefined ? 'jev' : value.mode;
  if (mode !== 'jev' && mode !== 'minimax') return null;
  const size = value.size;
  if (!Number.isInteger(size) || (size as number) < MIN_BOARD_SIZE || (size as number) > MAX_BOARD_SIZE) return null;
  if (!Array.isArray(value.board) || value.board.length !== (size as number) ** 2) return null;
  if (!value.board.every((cell) => cell === null || cell === 'X' || cell === 'O')) return null;
  if (!Array.isArray(value.moves) || !value.moves.every((move) => isValidMove(move, size as number))) return null;
  const moves = value.moves as Move[];
  const occupied = new Set<number>();
  for (const [moveNumber, move] of moves.entries()) {
    if (occupied.has(move.index) || value.board[move.index] !== move.player) return null;
    if (move.player !== (moveNumber % 2 === 0 ? 'X' : 'O')) return null;
    occupied.add(move.index);
  }
  const board = value.board as Cell[];
  if (occupied.size !== board.filter((cell) => cell !== null).length) return null;
  if (evaluateWinner(board, size as number).winner !== null) return null;
  const legalMoves = availableMoves(board);
  if (legalMoves.length === 0) return null;
  return { mode, size: size as number, board, moves, legalMoves };
}

function heuristicScore(board: readonly Cell[], size: number): number {
  let score = 0;
  const lines: number[][] = [];
  for (let row = 0; row < size; row += 1) lines.push(Array.from({ length: size }, (_, column) => row * size + column));
  for (let column = 0; column < size; column += 1) lines.push(Array.from({ length: size }, (_, row) => row * size + column));
  lines.push(Array.from({ length: size }, (_, index) => index * (size + 1)));
  lines.push(Array.from({ length: size }, (_, index) => index * (size - 1) + size - 1));
  for (const line of lines) {
    const marks = line.map((index) => board[index]);
    const o = marks.filter((mark) => mark === 'O').length;
    const x = marks.filter((mark) => mark === 'X').length;
    if (o > 0 && x === 0) score += 2 ** o;
    if (x > 0 && o === 0) score -= 2 ** x;
  }
  return score;
}

function minimaxScore(board: Cell[], size: number, turn: 'X' | 'O', depth: number, depthLimit: number): number {
  const result = evaluateWinner(board, size);
  if (result.winner === 'O') return 10_000 - depth;
  if (result.winner === 'X') return depth - 10_000;
  const moves = availableMoves(board);
  if (moves.length === 0) return 0;
  if (depth >= depthLimit) return heuristicScore(board, size);

  const scores = moves.map((index) => {
    board[index] = turn;
    const score = minimaxScore(board, size, turn === 'O' ? 'X' : 'O', depth + 1, depthLimit);
    board[index] = null;
    return score;
  });
  return turn === 'O' ? Math.max(...scores) : Math.min(...scores);
}

function chooseMinimaxMove(state: ParsedState): number {
  let bestIndex = state.legalMoves[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const index of state.legalMoves) {
    const board = state.board.slice();
    board[index] = 'O';
    const depthLimit = state.size === 3 ? state.legalMoves.length + 1 : 3;
    const score = minimaxScore(board, state.size, 'X', 1, depthLimit);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestIndex;
}



export async function POST(context: { request: Request } | Request): Promise<Response> {
  const request = context instanceof Request ? context : context.request;
  let state: ParsedState | null;
  try {
    state = parseState(await request.json());
  } catch {
    return json({ error: 'Invalid game state.' }, 400);
  }
  if (!state) return json({ error: 'Invalid game state.' }, 400);

  if (state.mode === 'minimax') return json({ index: chooseMinimaxMove(state) });

  const labels = Object.fromEntries(state.legalMoves.map((index) => [`cell_${index}`, null]));
  try {
    const client = clientFactory();
    const response = await client.systemOne({
      state: {
        size: state.size,
        board: state.board,
        moves: state.moves,
        legalIndexes: state.legalMoves,
      },
      questions: {
        move: choice(
          'Choose the strongest legal move for O. Prioritize an immediate win, then block an immediate X win, then create a fork, then prefer center and corners. Never choose randomly.',
          labels,
        ),
      },
    }, { timeout: 3500, retry: { maxRetries: 0 } });
    const selected = response.answers?.move?.choice;
    const index = typeof selected === 'string' && selected.startsWith('cell_')
      ? Number(selected.slice(5))
      : typeof selected === 'string' && /^\d+$/.test(selected)
        ? Number(selected)
        : typeof selected === 'number' ? selected : NaN;
    if (!Number.isInteger(index) || !state.legalMoves.includes(index)) return json({ error: ERROR_MESSAGE }, 502);
    return json({ index });
  } catch {
    return json({ error: ERROR_MESSAGE }, 502);
  }
}

export async function ALL(): Promise<Response> {
  return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
}

export const GET = ALL;
export const PUT = ALL;
export const PATCH = ALL;
export const DELETE = ALL;
