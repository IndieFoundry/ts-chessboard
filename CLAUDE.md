# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React chessboard component (`@indiefoundry/chessboard`). A modular, well-architected chess UI library for React applications with a clean, layered architecture. The component handles only UI - legal moves must be provided externally via `movable.dests`.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite build (ES + CommonJS)
npm run test         # Run Vitest tests
npm run lint         # ESLint on src/
npm run typecheck    # TypeScript type checking
```

## Architecture

```
src/
├── index.ts                    # Public exports
├── Chessboard.tsx              # React wrapper (forwardRef, exposes API via ref)
│
├── core/                       # Pure chess logic (no DOM dependencies)
│   ├── types.ts                # Core types (Color, Role, Key, Piece, etc.)
│   ├── position.ts             # FEN parsing/writing
│   ├── squares.ts              # Position/key conversions, square utilities
│   ├── moves.ts                # Move execution, selection, castling
│   └── premoves.ts             # Premove calculation
│
├── engine/                     # State management and orchestration
│   ├── state.ts                # State interface and defaults
│   ├── config.ts               # Configuration and merging
│   ├── api.ts                  # Public API (move, setPieces, etc.)
│   └── controller.ts           # Board factory and lifecycle
│
├── rendering/                  # DOM/SVG rendering
│   ├── board-dom.ts            # Board DOM structure creation
│   ├── pieces-renderer.ts      # Piece element synchronization
│   └── svg/
│       ├── shapes.ts           # SVG arrows, circles, custom shapes
│       └── auto-pieces.ts      # Auto-generated piece rendering
│
├── interactions/               # User event handling
│   ├── events.ts               # Event binding
│   ├── drag-handler.ts         # Drag and drop
│   ├── draw-handler.ts         # Shape drawing (arrows, circles)
│   └── drop-handler.ts         # Piece dropping (crazyhouse)
│
├── animation/                  # Animation system
│   └── animator.ts             # RequestAnimationFrame-based animations
│
├── effects/                    # Visual effects
│   └── explosion.ts            # Atomic chess explosion effect
│
├── utils/                      # Generic utilities
│   ├── dom.ts                  # DOM helpers (createEl, translate)
│   ├── math.ts                 # Geometric calculations
│   ├── memo.ts                 # Memoization
│   └── timer.ts                # Timing utilities
│
├── styles/                     # CSS
│   ├── base.css                # Base layout styles
│   ├── theme-brown.css         # Brown board theme
│   └── pieces-cburnett.css     # CBurnett piece set
│
└── demo/                       # Interactive demo app
    ├── App.tsx
    └── main.tsx
```

## Key Patterns

- **Layered architecture**: `core/` (pure logic) → `engine/` (state) → `rendering/` (DOM) → `interactions/` (events)
- **React wrapper around vanilla JS**: `Chessboard.tsx` mounts the engine on a div and exposes its API via `useImperativeHandle`
- **Imperative API via ref**: Access `ref.current.api` to call methods (`move`, `setPieces`, `setShapes`, etc.)
- **Config diffing**: The wrapper tracks previous config and only calls `api.set()` with changed properties
- **Board representation**: `Map<Key, Piece>` for positions; `Key` is template literal `${File}${Rank}` (e.g., `'e4'`)
- **Path alias**: `@/*` maps to `src/*`

## Type System

Core types in `src/core/types.ts`:
- `Color`: `'white' | 'black'`
- `Role`: `'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'`
- `Key`: Square identifier like `'e4'`
- `Pieces`: `Map<Key, Piece>` - board position
- `Dests`: `Map<Key, Key[]>` - legal destinations per square

## Build Output

- ES module: `dist/index.js`
- CommonJS: `dist/index.cjs`
- Types: `dist/index.d.ts`
- Styles: bundled with JS
