import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import obfuscator from 'rollup-plugin-obfuscator';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    exclude: ['**/node_modules/**'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/demo/**'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Chessboard',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
      plugins: [
        obfuscator({
          options: {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            identifierNamesGenerator: 'hexadecimal',
            renameGlobals: false,
            selfDefending: false,
            stringArray: true,
            stringArrayEncoding: [],
            stringArrayThreshold: 0.5,
            transformObjectKeys: true,
            unicodeEscapeSequence: false,
          },
        }),
      ],
    },
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
