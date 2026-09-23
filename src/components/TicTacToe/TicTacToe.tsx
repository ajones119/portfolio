import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from 'react';
import {
  availableMoves,
  createGame,
  playMove,
  type GameState,
} from '../../game/ticTacToe';

const DEFAULT_SIZE = 3;
const MIN_SIZE = 3;
const MAX_SIZE = 10;
const OPPONENT_ERROR = 'The opponent is unavailable right now. Your move is still on the board. Start a new game to try again.';
type OpponentMode = 'jev' | 'minimax';

type BoardStyle = CSSProperties & { '--board-size': number };

export default function TicTacToe() {
  const [game, setGame] = useState<GameState>(() => createGame(DEFAULT_SIZE));
  const [mode, setMode] = useState<OpponentMode>('jev');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  const resetGame = (size: number) => {
    requestGeneration.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setThinking(false);
    setError(null);
    setGame(createGame(size));
  };

  const requestOpponent = async (humanState: GameState, generation: number) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    try {
      const response = await fetch('/api/tic-tac-toe/opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          size: humanState.size,
          board: humanState.board,
          moves: humanState.moves,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('opponent request failed');
      }

      const payload: unknown = await response.json();
      const index =
        typeof payload === 'object' && payload !== null && 'index' in payload
          ? payload.index
          : undefined;

      if (
        typeof index !== 'number' ||
        !Number.isInteger(index) ||
        !availableMoves(humanState.board).includes(index)
      ) {
        throw new Error('opponent response was invalid');
      }

      if (requestGeneration.current !== generation) return;
      const opponentState = playMove(humanState, index);
      setGame(opponentState);
      setThinking(false);
      setError(null);
    } catch (requestError) {
      if (requestGeneration.current !== generation) return;
      if (requestError instanceof Error && requestError.name === 'AbortError') return;
      setThinking(false);
      setError(OPPONENT_ERROR);
    } finally {
      if (requestGeneration.current === generation) {
        activeRequest.current = null;
      }
    }
  };

  const handleCellClick = (index: number) => {
    if (thinking || game.status !== 'playing' || game.currentPlayer !== 'X') return;
    if (!availableMoves(game.board).includes(index)) return;

    const humanState = playMove(game, index);
    setGame(humanState);
    setError(null);

    if (humanState.status !== 'playing') return;

    const generation = requestGeneration.current;
    setThinking(true);
    void requestOpponent(humanState, generation);
  };

  const handleSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value);
    if (Number.isInteger(nextSize) && nextSize >= MIN_SIZE && nextSize <= MAX_SIZE) {
      resetGame(nextSize);
    }
  };

  const handleModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextMode = event.target.value;
    if (nextMode === 'jev' || nextMode === 'minimax') {
      setMode(nextMode);
      setError(null);
    }
  };

  const statusMessage = error
    ? error
    : thinking
      ? 'Opponent is thinking…'
      : game.status === 'won'
        ? game.winner === 'X'
          ? 'You win. That line was yours.'
          : 'The opponent wins this round.'
        : game.status === 'draw'
          ? 'Draw game. Every square is spoken for.'
          : 'Your turn — choose an open square.';

  const boardStyle: BoardStyle = { '--board-size': game.size };

  return (
    <section className="tic-tac-toe" aria-labelledby="tic-tac-toe-title">
      <header className="gameHeader">
        <p className="eyebrow">A small game of lines</p>
        <h1 id="tic-tac-toe-title">Tic-Tac-Toe</h1>
        <p className="intro">
          You play <strong>X</strong>. The opponent plays <strong>O</strong>. Find a
          clean line across the board.
        </p>
      </header>

      <div className="gameToolbar" aria-label="Game controls">
        <div className="gameControls">
          <label className="sizeControl" htmlFor="board-size">
            <span>Board size</span>
            <select id="board-size" value={game.size} onChange={handleSizeChange}>
              {Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, offset) => {
                const size = MIN_SIZE + offset;
                return <option key={size} value={size}>{size} × {size}</option>;
              })}
            </select>
          </label>
          <label className="sizeControl" htmlFor="opponent-mode">
            <span>Opponent mode</span>
            <select id="opponent-mode" value={mode} onChange={handleModeChange} disabled={thinking}>
              <option value="jev">JEV strategy</option>
              <option value="minimax">Minimax (optimal 3×3)</option>
            </select>
          </label>
        </div>
        <button className="newGameButton" type="button" onClick={() => resetGame(game.size)}>
          New game
        </button>
      </div>

      <div className="gameLayout">
        <div className="boardColumn">
          <div className="boardMeta">
            <span className="playerKey"><i className="playerDot playerDotX" aria-hidden="true" /> You · X</span>
            <span className="playerKey"><i className="playerDot playerDotO" aria-hidden="true" /> Opponent · O</span>
          </div>

          <div
            className="board"
            role="grid"
            aria-label={`${game.size} by ${game.size} Tic-Tac-Toe board`}
            style={boardStyle}
            aria-describedby="game-status"
          >
            {Array.from({ length: game.size }, (_, row) => (
              <div className="boardRow" role="row" key={row}>
                {Array.from({ length: game.size }, (_, column) => {
                  const index = row * game.size + column;
                  const cell = game.board[index];
                  const isWinning = game.winningLine.includes(index);
                  const cellLabel = cell
                    ? `Row ${row + 1}, column ${column + 1}, ${cell}`
                    : `Row ${row + 1}, column ${column + 1}, empty`;

                  return (
                    <button
                      className={`cell${isWinning ? ' cellWinning' : ''}`}
                      type="button"
                      role="gridcell"
                      key={index}
                      aria-label={cellLabel}
                      aria-pressed={cell !== null}
                      disabled={thinking || game.status !== 'playing' || cell !== null}
                      onClick={() => handleCellClick(index)}
                    >
                      {cell && <span className={`cellMark cellMark${cell}`}>{cell}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <p id="game-status" className={`gameStatus${error ? ' gameStatusError' : ''}`} role="status" aria-live="polite" aria-atomic="true">
            {thinking && <span className="thinkingIndicator" aria-hidden="true"><span /><span /><span /></span>}
            {statusMessage}
          </p>
        </div>

        <aside className="historyPanel" aria-labelledby="move-history-title">
          <div className="historyHeading">
            <p className="eyebrow">The record</p>
            <h2 id="move-history-title">Move history</h2>
          </div>
          {game.moves.length > 0 ? (
            <ol className="moveHistory">
              {game.moves.map((move, moveNumber) => (
                <li key={`${move.index}-${moveNumber}`}>
                  <span className={`historyMark historyMark${move.player}`} aria-hidden="true">{move.player}</span>
                  <span>Row {move.row + 1}, column {move.column + 1}</span>
                  <span className="moveNumber">{String(moveNumber + 1).padStart(2, '0')}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="historyEmpty">Your first move sets the tempo.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

