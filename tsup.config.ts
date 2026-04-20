import { defineConfig } from 'tsup';

/**
 * Skelter build configuration.
 *
 * Produces two separate bundles :
 *
 * 1. Web/React bundle (dist/index)
 *    Entry: src/index.ts
 *    Used by React web projects via the "import"/"require" exports
 *
 * 2. React Native bundle (dist/native/index)
 *    Entry: src/native/index.ts
 *    Used by React Native projects via the "react-native" export
 *    Resolved automatically by Metro and other RN bundlers
 *
 * Both bundles are tree-shakable via sideEffects: false in package.json.
 * React and React Native are externalized — not bundled.
 */
export default defineConfig([
  /**
   * Web/React bundle
   * Consumers: Next.js, Vite, CRA, any React web project
   */
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
    external: ['react', 'react-native'],
    outDir: 'dist',
    banner: {
      js: '/* skelter — Stop writing skeleton loaders. */',
    },
  },

  /**
   * React Native bundle
   * Consumers: Expo, bare React Native projects
   * Resolved via "react-native" field in package.json exports
   */
  {
    entry: {
      index: 'src/native/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: false, // Don't clean — web bundle already in dist/
    treeshake: true,
    splitting: false,
    external: ['react', 'react-native'],
    outDir: 'dist/native',
  },
]);