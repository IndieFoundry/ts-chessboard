import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Chessground } from './engine/controller';
import type { Api } from './engine/api';
import type { Config } from './engine/config';

export interface ChessboardProps extends Config {
  className?: string;
  style?: React.CSSProperties;
}

export interface ChessboardRef {
  api: Api | null;
}

export const Chessboard = forwardRef<ChessboardRef, ChessboardProps>(
  function Chessboard({ className, style, ...config }, ref) {
    const boardRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<Api | null>(null);
    const configRef = useRef<Config>(config);

    // Initialize chessground
    useEffect(() => {
      if (boardRef.current && !apiRef.current) {
        apiRef.current = Chessground(boardRef.current, config);
        configRef.current = config;
      }
      return () => {
        apiRef.current?.destroy();
        apiRef.current = null;
      };
    }, []);

    // Update config when props change - but don't reset FEN unless it actually changed
    useEffect(() => {
      if (apiRef.current) {
        const prev = configRef.current;
        const updates: Config = {};

        // Only include changed properties
        if (config.fen !== prev.fen) updates.fen = config.fen;
        if (config.orientation !== prev.orientation) updates.orientation = config.orientation;
        if (config.turnColor !== prev.turnColor) updates.turnColor = config.turnColor;
        if (config.lastMove !== prev.lastMove) updates.lastMove = config.lastMove;
        if (config.check !== prev.check) updates.check = config.check;
        if (config.selected !== prev.selected) updates.selected = config.selected;
        if (config.coordinates !== prev.coordinates) updates.coordinates = config.coordinates;
        if (config.viewOnly !== prev.viewOnly) updates.viewOnly = config.viewOnly;
        if (config.movable !== prev.movable) updates.movable = config.movable;
        if (config.premovable !== prev.premovable) updates.premovable = config.premovable;
        if (config.predroppable !== prev.predroppable) updates.predroppable = config.predroppable;
        if (config.draggable !== prev.draggable) updates.draggable = config.draggable;
        if (config.selectable !== prev.selectable) updates.selectable = config.selectable;
        if (config.animation !== prev.animation) updates.animation = config.animation;
        if (config.highlight !== prev.highlight) updates.highlight = config.highlight;
        if (config.drawable !== prev.drawable) updates.drawable = config.drawable;
        if (config.events !== prev.events) updates.events = config.events;

        if (Object.keys(updates).length > 0) {
          apiRef.current.set(updates);
        }

        configRef.current = config;
      }
    });

    // Expose API via ref
    useImperativeHandle(ref, () => ({
      get api() {
        return apiRef.current;
      },
    }));

    return (
      <div
        ref={boardRef}
        className={className}
        style={style}
      />
    );
  }
);
