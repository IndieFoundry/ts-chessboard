// React component
export { Chessboard } from './Chessboard';
export type { ChessboardProps, ChessboardRef } from './Chessboard';

// Core types
export * from './core/types';

// Configuration
export type { Config } from './engine/config';

// API
export type { Api } from './engine/api';

// Drawing types
export type { DrawShape, DrawBrush, DrawBrushes, DrawModifiers, DrawShapePiece } from './interactions/draw-handler';

// CSS imports
import './styles/base.css';
import './styles/theme-brown.css';
import './styles/pieces-staunty.css';
