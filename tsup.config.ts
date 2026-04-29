/// <reference types="node" />
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
   *
   * platform: 'node' tells esbuild that require() is always available in the
   * target runtime (Metro provides it). Without this, esbuild wraps every
   * require() inside a try/catch with a __require() shim — Metro's static
   * analysis does not recognize __require() and fails to bundle optional peers
   * (expo-linear-gradient, react-native-linear-gradient) even when installed.
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
    platform: 'node',
    external: [
      'react',
      'react-native',
      'expo-linear-gradient',
      'react-native-linear-gradient',
    ],
    outDir: 'dist/native',
    onSuccess: async () => {
      // esbuild wraps require() calls inside try/catch with __require() — a shim
      // that Metro's static dependency analyzer does not recognize. Metro must see
      // bare require('expo-linear-gradient') / require('react-native-linear-gradient')
      // calls to add the optional gradient peers to the app bundle.
      //
      // Metro's collect-dependencies plugin treats require() inside try/catch as
      // optional: it bundles the module when installed and silently skips it when
      // absent — exactly the behaviour the original try/catch was meant to provide.
      //
      // This post-process restores that semantic in the CJS output.
      const { readFileSync, writeFileSync } = await import('fs');
      const OPTIONAL_PEERS = ['expo-linear-gradient', 'react-native-linear-gradient'];
      for (const out of ['dist/native/index.js', 'dist/native/index.mjs']) {
        const src = readFileSync(out, 'utf-8');
        const fixed = OPTIONAL_PEERS.reduce(
          (s, pkg) => s.replace(new RegExp(`__require\\("${pkg}"\\)`, 'g'), `require("${pkg}")`),
          src
        );
        if (fixed !== src) writeFileSync(out, fixed, 'utf-8');
      }
    },
  },
]);