import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Chessboard, ChessboardRef } from '../';
import type { Key, Color, Dests, Role, Piece } from '../core/types';
import type { DrawShape } from '../interactions/draw-handler';
import { Chess, makeFen, makeSquare, parseSquare } from '../chess';

// Promotion piece choices
const PROMOTION_ROLES: Role[] = ['queen', 'rook', 'bishop', 'knight'];

interface PendingPromotion {
  orig: Key;
  dest: Key;
  color: Color;
}

/**
 * Convert Chess legal moves to chessboard Dests format
 */
function chessToDestsForColor(chess: Chess, color: Color): Dests {
  const dests: Dests = new Map();

  // Only calculate dests if it's this color's turn
  if (chess.turn !== color) return dests;

  const allDests = chess.allDests();
  for (const [square, squareSet] of allDests) {
    const destKeys: Key[] = [];
    for (const dest of squareSet) {
      destKeys.push(makeSquare(dest) as Key);
    }
    if (destKeys.length > 0) {
      dests.set(makeSquare(square) as Key, destKeys);
    }
  }
  return dests;
}

/**
 * Convert Chess legal moves to chessboard Dests format (for current turn)
 */
function chessToDests(chess: Chess): Dests {
  return chessToDestsForColor(chess, chess.turn);
}

export function App() {
  const boardRef = useRef<ChessboardRef>(null);
  const expectingPlayerMoveRef = useRef(true);

  // Chess position state - use Chess class for legal moves
  const [chess, setChess] = useState(() => Chess.default());
  const [orientation, setOrientation] = useState<Color>('white');
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>();
  const [shapes, setShapes] = useState<DrawShape[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [vsAI, setVsAI] = useState(false);
  const [playerColor] = useState<Color>('white');
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [isInCheck, setIsInCheck] = useState(false);

  // Compute FEN from chess position
  const fen = useMemo(() => {
    const setup = chess.toSetup();
    return makeFen(setup).split(' ')[0]; // Board FEN only
  }, [chess]);

  // Get legal moves for current player
  const dests = useMemo(() => {
    if (vsAI) {
      // In AI mode, only show moves for player's color when it's their turn
      if (chess.turn === playerColor) {
        return chessToDests(chess);
      }
      return new Map();
    }
    // In free play, show moves for whoever's turn it is
    return chessToDests(chess);
  }, [chess, vsAI, playerColor]);

  // Check for check
  useEffect(() => {
    setIsInCheck(chess.isCheck());
  }, [chess]);

  // Set expectation based on turn
  useEffect(() => {
    if (vsAI) {
      expectingPlayerMoveRef.current = chess.turn === playerColor;
    } else {
      expectingPlayerMoveRef.current = true;
    }
  }, [vsAI, chess.turn, playerColor]);

  // AI makes a random move when it's AI's turn
  useEffect(() => {
    if (!vsAI) return;
    if (chess.turn === playerColor) return;
    if (chess.isEnd()) return;

    const aiDests = chessToDests(chess);
    if (aiDests.size === 0) return;

    // Pick a random move
    const entries = Array.from(aiDests.entries());
    const [orig, possibleDests] = entries[Math.floor(Math.random() * entries.length)];
    const dest = possibleDests[Math.floor(Math.random() * possibleDests.length)];

    // Delay the move for better UX
    const timer = setTimeout(() => {
      if (boardRef.current?.api) {
        expectingPlayerMoveRef.current = false;

        // Make the move in chess engine
        const newChess = chess.clone();
        const from = parseSquare(orig);
        const to = parseSquare(dest);
        if (from !== undefined && to !== undefined) {
          // Check for promotion
          const piece = newChess.board.get(from);
          let promotion: Role | undefined;
          if (piece?.role === 'pawn') {
            const destRank = to >> 3;
            if (destRank === 0 || destRank === 7) {
              promotion = 'queen'; // AI always promotes to queen
            }
          }

          newChess.play({ from, to, promotion });
          setChess(newChess);

          // Update board UI
          boardRef.current.api.move(orig, dest);
          setLastMove([orig, dest]);
          setMoveHistory((prev) => [...prev, `${orig}-${dest}`]);

          // Allow player moves again
          expectingPlayerMoveRef.current = true;

          // Play any pending premove after a short delay
          setTimeout(() => {
            if (boardRef.current?.api) {
              boardRef.current.api.playPremove();
            }
          }, 10);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [vsAI, chess, playerColor]);

  // Check if a move is a pawn promotion
  const isPromotion = useCallback((orig: Key, dest: Key): Color | null => {
    const from = parseSquare(orig);
    if (from === undefined) return null;

    const piece = chess.board.get(from);
    if (!piece || piece.role !== 'pawn') return null;

    const destRank = dest[1];
    if (piece.color === 'white' && destRank === '8') return 'white';
    if (piece.color === 'black' && destRank === '1') return 'black';
    return null;
  }, [chess]);

  // Handle promotion selection
  const handlePromotion = useCallback((role: Role) => {
    if (!pendingPromotion || !boardRef.current?.api) return;

    const { orig, dest, color } = pendingPromotion;
    const promotedPiece: Piece = { role, color };

    // Make the move in chess engine with promotion
    const newChess = chess.clone();
    const from = parseSquare(orig);
    const to = parseSquare(dest);
    if (from !== undefined && to !== undefined) {
      newChess.play({ from, to, promotion: role });
      setChess(newChess);
    }

    // Update the piece on the board
    const diff = new Map<Key, Piece | undefined>();
    diff.set(dest, promotedPiece);
    boardRef.current.api.setPieces(diff);

    setPendingPromotion(null);
    expectingPlayerMoveRef.current = true;
  }, [chess, pendingPromotion]);

  // Handle player moves
  const onMoveAfter = useCallback((orig: Key, dest: Key) => {
    // Only process if we're expecting a player move
    if (!expectingPlayerMoveRef.current) return;

    console.log('Player move:', orig, dest);
    expectingPlayerMoveRef.current = false;

    setLastMove([orig, dest]);
    setMoveHistory((prev) => [...prev, `${orig}-${dest}`]);

    // Check for promotion
    const promotionColor = isPromotion(orig, dest);
    if (promotionColor) {
      setPendingPromotion({ orig, dest, color: promotionColor });
      return; // Wait for promotion selection
    }

    // Make the move in chess engine
    const newChess = chess.clone();
    const from = parseSquare(orig);
    const to = parseSquare(dest);
    if (from !== undefined && to !== undefined) {
      newChess.play({ from, to });
      setChess(newChess);
    }

    expectingPlayerMoveRef.current = true;
  }, [chess, isPromotion]);

  const onShapesChange = useCallback((newShapes: DrawShape[]) => {
    setShapes(newShapes);
  }, []);

  const flipBoard = useCallback(() => {
    setOrientation((o) => (o === 'white' ? 'black' : 'white'));
  }, []);

  const resetBoard = useCallback(() => {
    setChess(Chess.default());
    setLastMove(undefined);
    setMoveHistory([]);
    setShapes([]);
    setVsAI(false);
    setIsInCheck(false);
  }, []);

  const toggleAI = useCallback(() => {
    if (vsAI) {
      setVsAI(false);
    } else {
      // Reset and start new game vs AI
      setChess(Chess.default());
      setLastMove(undefined);
      setMoveHistory([]);
      setShapes([]);
      setIsInCheck(false);
      setVsAI(true);
    }
  }, [vsAI]);

  // Game status
  const gameStatus = useMemo(() => {
    if (chess.isCheckmate()) {
      const winner = chess.turn === 'white' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins`;
    }
    if (chess.isStalemate()) {
      return 'Stalemate - Draw';
    }
    if (chess.isInsufficientMaterial()) {
      return 'Insufficient material - Draw';
    }
    if (chess.isCheck()) {
      return `${chess.turn === 'white' ? 'White' : 'Black'} is in check`;
    }
    return null;
  }, [chess]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>@indiefoundry/chessboard</h1>

      <div style={{ width: '480px', maxWidth: '100vw', position: 'relative' }}>
        <Chessboard
          ref={boardRef}
          fen={fen}
          orientation={orientation}
          turnColor={chess.turn}
          lastMove={lastMove}
          check={isInCheck}
          movable={{
            free: false,
            color: vsAI ? playerColor : 'both',
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
          className="cg-wrap"
          style={{ width: '100%', aspectRatio: '1' }}
        />

        {/* Promotion modal */}
        {pendingPromotion && (
          <div style={promotionOverlayStyle}>
            <div style={promotionModalStyle}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 'bold', fontSize: '1rem' }}>
                Promote to:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {PROMOTION_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => handlePromotion(role)}
                    style={promotionButtonStyle}
                    title={role.charAt(0).toUpperCase() + role.slice(1)}
                  >
                    {getPieceSymbol(role, pendingPromotion.color)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={toggleAI} style={vsAI ? activeButtonStyle : buttonStyle}>
          {vsAI ? 'Stop AI' : 'Play vs AI'}
        </button>
        <button onClick={flipBoard} style={buttonStyle}>
          Flip Board
        </button>
        <button onClick={resetBoard} style={buttonStyle}>
          Reset
        </button>
      </div>

      {gameStatus && (
        <div style={{
          fontSize: '1rem',
          fontWeight: 'bold',
          color: gameStatus.includes('Checkmate') ? '#f44' :
                 gameStatus.includes('check') ? '#fa4' : '#4a4'
        }}>
          {gameStatus}
        </div>
      )}

      <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
        <p style={{ margin: '0.25rem 0' }}>Turn: {chess.turn}</p>
        <p style={{ margin: '0.25rem 0' }}>Orientation: {orientation}</p>
        {vsAI && (
          <p style={{ margin: '0.25rem 0' }}>Playing as: {playerColor}</p>
        )}
        {moveHistory.length > 0 && (
          <p style={{ margin: '0.25rem 0' }}>
            Moves: {moveHistory.slice(-5).join(', ')}
          </p>
        )}
      </div>

      <div style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>
        <p style={{ margin: '0.25rem 0' }}>Click/drag pieces to move</p>
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

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#4a9',
};

// Get Unicode chess piece symbol
function getPieceSymbol(role: Role, color: Color): string {
  const symbols: Record<Role, { white: string; black: string }> = {
    king: { white: '\u2654', black: '\u265A' },
    queen: { white: '\u2655', black: '\u265B' },
    rook: { white: '\u2656', black: '\u265C' },
    bishop: { white: '\u2657', black: '\u265D' },
    knight: { white: '\u2658', black: '\u265E' },
    pawn: { white: '\u2659', black: '\u265F' },
  };
  return symbols[role][color];
}

const promotionOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const promotionModalStyle: React.CSSProperties = {
  backgroundColor: '#2a2a2a',
  padding: '1rem 1.5rem',
  borderRadius: '8px',
  textAlign: 'center',
  color: '#fff',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
};

const promotionButtonStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  fontSize: '40px',
  background: '#444',
  border: '2px solid #666',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s, border-color 0.2s',
};
