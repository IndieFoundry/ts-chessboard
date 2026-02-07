# @indiefoundry/chessboard

A modular, high-performance React chessboard component with a clean, layered architecture.

## Installation

```bash
npm install @indiefoundry/chessboard
```

## Basic Usage

```tsx
import { Chessboard } from '@indiefoundry/chessboard';

function App() {
  return (
    <div style={{ width: 400, height: 400 }}>
      <Chessboard />
    </div>
  );
}
```

## Theming

The chessboard is fully customizable via CSS custom properties. Simply override the variables on your board container.

### Board Colors

The board pattern uses an embedded SVG for crisp rendering. To customize:

```css
.my-chessboard {
  /* Light square color (background) */
  --cg-board-light: #eeeed2;

  /* Board pattern - provide an SVG with dark squares */
  /* See src/demo/themes.css for examples of different color patterns */
  --cg-board-pattern: url('data:image/svg+xml,...');

  /* Highlight colors */
  --cg-highlight-last-move: rgba(255, 255, 0, 0.4);
  --cg-highlight-selected: rgba(0, 100, 0, 0.5);
  --cg-highlight-check: radial-gradient(ellipse at center, red 0%, transparent 80%);
  --cg-highlight-premove: rgba(20, 30, 85, 0.5);

  /* Move destination indicators */
  --cg-move-dest: radial-gradient(rgba(0, 128, 0, 0.5) 22%, transparent 22%);
  --cg-move-dest-hover: rgba(0, 128, 0, 0.3);
  --cg-move-dest-occupied: radial-gradient(transparent 0%, transparent 80%, rgba(0, 128, 0, 0.3) 80%);

  /* Coordinate label colors */
  --cg-coord-color-light: rgba(255, 255, 255, 0.8);
  --cg-coord-color-dark: rgba(0, 0, 0, 0.8);
}
```

### Custom Piece Set

Override individual pieces by providing URLs to your SVG/PNG files:

```css
.my-chessboard {
  /* White pieces */
  --cg-piece-pawn-white: url('/pieces/wP.svg');
  --cg-piece-knight-white: url('/pieces/wN.svg');
  --cg-piece-bishop-white: url('/pieces/wB.svg');
  --cg-piece-rook-white: url('/pieces/wR.svg');
  --cg-piece-queen-white: url('/pieces/wQ.svg');
  --cg-piece-king-white: url('/pieces/wK.svg');

  /* Black pieces */
  --cg-piece-pawn-black: url('/pieces/bP.svg');
  --cg-piece-knight-black: url('/pieces/bN.svg');
  --cg-piece-bishop-black: url('/pieces/bB.svg');
  --cg-piece-rook-black: url('/pieces/bR.svg');
  --cg-piece-queen-black: url('/pieces/bQ.svg');
  --cg-piece-king-black: url('/pieces/bK.svg');
}
```

### Example Themes

See `src/demo/themes.css` for complete theme examples including green (chess.com style), blue (lichess style), and purple themes. Each theme includes:
- Light square color (`--cg-board-light`)
- Board pattern SVG (`--cg-board-pattern`)
- Highlight colors
- Coordinate colors

Run `npm run dev` to see the theme selector in action.

### All CSS Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `--cg-board-light` | Light square background color | `#f0d9b5` |
| `--cg-board-pattern` | SVG pattern for dark squares | brown checkerboard |
| `--cg-highlight-last-move` | Last move highlight | `rgba(155, 199, 0, 0.41)` |
| `--cg-highlight-selected` | Selected square highlight | `rgba(20, 85, 30, 0.5)` |
| `--cg-highlight-check` | Check highlight gradient | red radial |
| `--cg-highlight-premove` | Premove highlight | `rgba(20, 30, 85, 0.5)` |
| `--cg-move-dest` | Move destination dot | green dot |
| `--cg-move-dest-hover` | Move destination hover | `rgba(20, 85, 30, 0.3)` |
| `--cg-move-dest-occupied` | Capture indicator ring | green ring |
| `--cg-premove-dest` | Premove destination dot | blue dot |
| `--cg-coord-color-light` | Light coordinate labels | `rgba(255, 255, 255, 0.8)` |
| `--cg-coord-color-dark` | Dark coordinate labels | `rgba(72, 72, 72, 0.8)` |
| `--cg-piece-{role}-{color}` | Piece image URL | CBurnett SVG |

## API Reference

Access the board API via ref:

```tsx
import { Chessboard, ChessboardRef } from '@indiefoundry/chessboard';

function App() {
  const boardRef = useRef<ChessboardRef>(null);

  const makeMove = () => {
    boardRef.current?.api.move('e2', 'e4');
  };

  return <Chessboard ref={boardRef} />;
}
```

## License

MIT
