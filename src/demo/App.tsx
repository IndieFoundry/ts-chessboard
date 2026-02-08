import { useRef, useState, useCallback, useEffect } from 'react';
import { Chessboard, ChessboardRef } from '../';
import type { Key, Color } from '../core/types';
import type { DrawShape } from '../interactions/draw-handler';
import { ChessPosition, toFen, squareToName } from '../chess';
import './themes.css';

/** Convert chess engine square (0-63) to board Key (e.g., 'e4') */
const squareToKey = (sq: number): Key => squareToName(sq) as Key;

/** Convert board Key to chess engine square */
const keyToSquare = (key: Key): number => {
  const file = key.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = key.charCodeAt(1) - '1'.charCodeAt(0);
  return file + rank * 8;
};

/** Get legal destinations map from ChessPosition */
const getLegalDests = (pos: ChessPosition): Map<Key, Key[]> => {
  const dests = new Map<Key, Key[]>();
  const allDests = pos.getAllLegalMoves();
  for (const [from, toMask] of allDests) {
    const fromKey = squareToKey(from);
    const toKeys: Key[] = [];
    for (const to of toMask) {
      toKeys.push(squareToKey(to));
    }
    if (toKeys.length > 0) {
      dests.set(fromKey, toKeys);
    }
  }
  return dests;
};

/** Pick a random move from legal destinations */
const pickRandomMove = (dests: Map<Key, Key[]>): [Key, Key] | null => {
  const entries = Array.from(dests.entries()).filter(([, tos]) => tos.length > 0);
  if (entries.length === 0) return null;
  const [from, tos] = entries[Math.floor(Math.random() * entries.length)];
  const to = tos[Math.floor(Math.random() * tos.length)];
  return [from, to];
};

export function App() {
  const boardRef = useRef<ChessboardRef>(null);

  const [position, setPosition] = useState<ChessPosition>(() => ChessPosition.default());
  const [orientation, setOrientation] = useState<Color>('white');
  const [playerColor] = useState<Color>('white');
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>();
  const [shapes, setShapes] = useState<DrawShape[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [boardTheme, setBoardTheme] = useState<'brown' | 'green' | 'blue' | 'purple'>('brown');
  const [pieceSet, setPieceSet] = useState<'staunty' | 'cburnett'>('staunty');
  const [gameStatus, setGameStatus] = useState<string>('');

  // Get current legal moves
  const dests = getLegalDests(position);
  const turnColor = position.turn;
  const isCheck = position.isCheck();

  // Check game end
  useEffect(() => {
    const outcome = position.getOutcome();
    if (outcome) {
      if (outcome.winner) {
        setGameStatus(`${outcome.winner === 'white' ? 'White' : 'Black'} wins by checkmate!`);
      } else {
        setGameStatus('Draw!');
      }
    } else if (isCheck) {
      setGameStatus('Check!');
    } else {
      setGameStatus('');
    }
  }, [position, isCheck]);

  // AI plays when it's black's turn
  useEffect(() => {
    if (turnColor === 'black' && playerColor === 'white' && !position.getOutcome()) {
      const aiDests = getLegalDests(position);
      const move = pickRandomMove(aiDests);
      if (move) {
        const timeout = setTimeout(() => {
          const [from, to] = move;
          const newPos = position.clone();
          const fromSq = keyToSquare(from);
          const toSq = keyToSquare(to);

          // Check for promotion
          const piece = newPos.board.get(fromSq);
          const isPromotion = piece?.role === 'pawn' && (toSq >= 56 || toSq < 8);

          newPos.playMove({
            from: fromSq,
            to: toSq,
            promotion: isPromotion ? 'queen' : undefined,
          });

          setPosition(newPos);
          setLastMove([from, to]);
          setMoveHistory((prev) => [...prev, `${from}-${to}`]);

          // Play any pending premove after AI move
          setTimeout(() => {
            boardRef.current?.api?.playPremove();
          }, 10);
        }, 300);
        return () => clearTimeout(timeout);
      }
    }
  }, [turnColor, playerColor, position]);

  // Handle player moves
  const onMoveAfter = useCallback((orig: Key, dest: Key) => {
    const newPos = position.clone();
    const fromSq = keyToSquare(orig);
    const toSq = keyToSquare(dest);

    // Check for promotion
    const piece = newPos.board.get(fromSq);
    const isPromotion = piece?.role === 'pawn' && (toSq >= 56 || toSq < 8);

    newPos.playMove({
      from: fromSq,
      to: toSq,
      promotion: isPromotion ? 'queen' : undefined,
    });

    setPosition(newPos);
    setLastMove([orig, dest]);
    setMoveHistory((prev) => [...prev, `${orig}-${dest}`]);
  }, [position]);

  const onShapesChange = useCallback((newShapes: DrawShape[]) => {
    setShapes(newShapes);
  }, []);

  const flipBoard = useCallback(() => {
    setOrientation((o) => (o === 'white' ? 'black' : 'white'));
  }, []);

  const resetBoard = useCallback(() => {
    setPosition(ChessPosition.default());
    setLastMove(undefined);
    setMoveHistory([]);
    setShapes([]);
    setGameStatus('');
  }, []);

  // Get FEN for display
  const fen = toFen(position.toSetup());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>@indiefoundry/chessboard</h1>

      <div style={{ width: '480px', maxWidth: '100vw', position: 'relative' }}>
        <Chessboard
          ref={boardRef}
          fen={fen.split(' ')[0]}
          orientation={orientation}
          turnColor={turnColor}
          lastMove={lastMove}
          check={isCheck}
          movable={{
            free: false,
            color: playerColor,
            dests,
            showDests: true,
            events: {
              after: onMoveAfter,
            },
          }}
          premovable={{
            enabled: true,
            showDests: true,
          }}
          draggable={{
            enabled: true,
            showGhost: true,
          }}
          animation={{
            enabled: true,
            duration: 200,
          }}
          drawable={{
            enabled: true,
            visible: true,
            shapes,
            onChange: onShapesChange,
          }}
          highlight={{
            lastMove: true,
            check: true,
          }}
          coordinates={true}
          className={`chess-wrap theme-${boardTheme} pieces-${pieceSet}`}
          style={{ width: '100%', aspectRatio: '1' }}
        />
      </div>

      {gameStatus && (
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: gameStatus.includes('wins') ? '#4a4' : gameStatus === 'Check!' ? '#c44' : '#666'
        }}>
          {gameStatus}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={flipBoard} style={buttonStyle}>
          Flip Board
        </button>
        <button onClick={resetBoard} style={buttonStyle}>
          New Game
        </button>
      </div>

      {/* Theme selector */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', opacity: 0.8 }}>Board:</label>
          <select
            value={boardTheme}
            onChange={(e) => setBoardTheme(e.target.value as typeof boardTheme)}
            style={selectStyle}
          >
            <option value="brown">Brown</option>
            <option value="green">Green (chess.com)</option>
            <option value="blue">Blue (lichess)</option>
            <option value="purple">Purple</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', opacity: 0.8 }}>Pieces:</label>
          <select
            value={pieceSet}
            onChange={(e) => setPieceSet(e.target.value as typeof pieceSet)}
            style={selectStyle}
          >
            <option value="staunty">Staunty</option>
            <option value="cburnett">CBurnett</option>
          </select>
        </div>
      </div>

      <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
        <p style={{ margin: '0.25rem 0' }}>Turn: {turnColor} {turnColor === playerColor ? '(you)' : '(AI)'}</p>
        <p style={{ margin: '0.25rem 0' }}>Orientation: {orientation}</p>
        {moveHistory.length > 0 && (
          <p style={{ margin: '0.25rem 0' }}>
            Moves: {moveHistory.slice(-5).join(', ')}
          </p>
        )}
      </div>

      <div style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>
        <p style={{ margin: '0.25rem 0' }}>Play as white against a random AI</p>
        <p style={{ margin: '0.25rem 0' }}>Right-click drag to draw arrows</p>
        <p style={{ margin: '0.25rem 0' }}>Right-click to draw circles</p>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  fontSize: '0.875rem',
  background: '#555',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  fontSize: '0.875rem',
  background: '#444',
  color: '#fff',
  border: '1px solid #666',
  borderRadius: '4px',
  cursor: 'pointer',
};
