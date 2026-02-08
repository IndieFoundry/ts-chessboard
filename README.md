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
  --chess-board-light: #eeeed2;

  /* Board pattern - provide an SVG with dark squares */
  /* See src/demo/themes.css for examples of different color patterns */
  --chess-board-pattern: url('data:image/svg+xml,...');

  /* Highlight colors */
  --chess-highlight-last-move: rgba(255, 255, 0, 0.4);
  --chess-highlight-selected: rgba(0, 100, 0, 0.5);
  --chess-highlight-check: radial-gradient(ellipse at center, red 0%, transparent 80%);
  --chess-highlight-premove: rgba(20, 30, 85, 0.5);

  /* Move destination indicators */
  --chess-move-dest: radial-gradient(rgba(0, 128, 0, 0.5) 22%, transparent 22%);
  --chess-move-dest-hover: rgba(0, 128, 0, 0.3);
  --chess-move-dest-occupied: radial-gradient(transparent 0%, transparent 80%, rgba(0, 128, 0, 0.3) 80%);

  /* Coordinate label colors */
  --chess-coord-color-light: rgba(255, 255, 255, 0.8);
  --chess-coord-color-dark: rgba(0, 0, 0, 0.8);
}
```

### Custom Piece Set

Override individual pieces by providing URLs to your SVG/PNG files:

```css
.my-chessboard {
  /* White pieces */
  --chess-piece-pawn-white: url('/pieces/wP.svg');
  --chess-piece-knight-white: url('/pieces/wN.svg');
  --chess-piece-bishop-white: url('/pieces/wB.svg');
  --chess-piece-rook-white: url('/pieces/wR.svg');
  --chess-piece-queen-white: url('/pieces/wQ.svg');
  --chess-piece-king-white: url('/pieces/wK.svg');

  /* Black pieces */
  --chess-piece-pawn-black: url('/pieces/bP.svg');
  --chess-piece-knight-black: url('/pieces/bN.svg');
  --chess-piece-bishop-black: url('/pieces/bB.svg');
  --chess-piece-rook-black: url('/pieces/bR.svg');
  --chess-piece-queen-black: url('/pieces/bQ.svg');
  --chess-piece-king-black: url('/pieces/bK.svg');
}
```

### Example Themes

See `src/demo/themes.css` for complete theme examples including green (chess.com style), blue (lichess style), and purple themes. Each theme includes:
- Light square color (`--chess-board-light`)
- Board pattern SVG (`--chess-board-pattern`)
- Highlight colors
- Coordinate colors

Run `npm run dev` to see the theme selector in action.

### All CSS Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `--chess-board-light` | Light square background color | `#f0d9b5` |
| `--chess-board-pattern` | SVG pattern for dark squares | brown checkerboard |
| `--chess-highlight-last-move` | Last move highlight | `rgba(155, 199, 0, 0.41)` |
| `--chess-highlight-selected` | Selected square highlight | `rgba(20, 85, 30, 0.5)` |
| `--chess-highlight-check` | Check highlight gradient | red radial |
| `--chess-highlight-premove` | Premove highlight | `rgba(20, 30, 85, 0.5)` |
| `--chess-move-dest` | Move destination dot | green dot |
| `--chess-move-dest-hover` | Move destination hover | `rgba(20, 85, 30, 0.3)` |
| `--chess-move-dest-occupied` | Capture indicator ring | green ring |
| `--chess-premove-dest` | Premove destination dot | blue dot |
| `--chess-coord-color-light` | Light coordinate labels | `rgba(255, 255, 255, 0.8)` |
| `--chess-coord-color-dark` | Dark coordinate labels | `rgba(72, 72, 72, 0.8)` |
| `--chess-piece-{role}-{color}` | Piece image URL | CBurnett SVG |

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
