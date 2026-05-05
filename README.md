# react-zero-skeleton

**Stop writing skeleton loaders.**

[![npm version](https://img.shields.io/npm/v/react-zero-skeleton)](https://www.npmjs.com/package/react-zero-skeleton)
[![npm downloads](https://img.shields.io/npm/dm/react-zero-skeleton)](https://www.npmjs.com/package/react-zero-skeleton)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-zero-skeleton)](https://bundlephobia.com/package/react-zero-skeleton)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

Wrap your component. Pass two props. react-zero-skeleton measures the real layout and generates one bone per element — automatically, always in sync. Works with **React Native** and **React (web)**.

---

## The Problem

Every skeleton library makes you write the component twice:

```tsx
// 1. Your real component
function ArticleCard({ article }) {
  return (
    <View>
      <Image source={{ uri: article.cover }} style={{ height: 160 }} />
      <Text style={{ fontSize: 16 }}>{article.title}</Text>
      <Text style={{ color: '#888' }}>{article.excerpt}</Text>
    </View>
  )
}

// 2. A skeleton copy you maintain forever
const ArticleCardSkeleton = () => (
  <SkeletonPlaceholder>
    <View style={{ height: 160 }} />
    <View style={{ width: '80%', height: 18 }} />
    <View style={{ width: '60%', height: 14 }} />
  </SkeletonPlaceholder>
)

// Design changes → you update one, forget the other → they drift apart.
```

---

## The Solution

```tsx
import { withSkeleton } from 'react-zero-skeleton'

// Write your component once — no skeleton needed
function ArticleCard({ article }) {
  return (
    <View>
      <Image source={{ uri: article.cover }} style={{ height: 160 }} />
      <Text style={{ fontSize: 16 }}>{article.title}</Text>
      <Text style={{ color: '#888' }}>{article.excerpt}</Text>
    </View>
  )
}

export default withSkeleton(ArticleCard)

// Two props wherever you use it
<ArticleCard hasSkeleton isLoading={isLoading} article={data} />
```

react-zero-skeleton renders your component invisibly, measures every element, and generates a matching bone for each one. Layout changes automatically.

---

## Installation

```bash
npm install react-zero-skeleton
# or
yarn add react-zero-skeleton
```

No native code. No `pod install`. No linking.

The bundler picks the right version automatically:
- **React Native / Metro** → native build (Fiber + `onLayout` + Animated)
- **React / Web (Next.js, Vite…)** → web build (DOM + ResizeObserver + CSS animations)

---

## Quick Start

### 1 — Wrap your component

```tsx
// ArticleCard.tsx
import { withSkeleton } from 'react-zero-skeleton'

function ArticleCard({ article }) {
  return (
    <View>
      <Image source={{ uri: article.cover }} style={{ height: 160 }} />
      <Text style={{ fontSize: 16 }}>{article.title}</Text>
      <Text style={{ color: '#888' }}>{article.excerpt}</Text>
    </View>
  )
}

export default withSkeleton(ArticleCard)
```

### 2 — Use it

```tsx
// Two props. That's it.
<ArticleCard hasSkeleton isLoading={isLoading} article={data} />

// Shorthand — activates hasSkeleton AND isLoading at once
<ArticleCard isLoadingSkeleton article={data} />
```

### 3 — (Optional) Global theme

```tsx
import { SkeletonTheme } from 'react-zero-skeleton'

export default function App() {
  return (
    <SkeletonTheme animation="wave" color="#E0E0E0">
      <YourApp />
    </SkeletonTheme>
  )
}
```

---

## Animations

| Animation | Description |
| --------- | ----------- |
| `pulse` | Soft opacity fade. The default. |
| `wave` | Shimmer that slides left to right. |
| `shiver` | Intense wave — wider amplitude, faster speed. |
| `shatter` | Grid fragmentation — squares fade in/out with stagger. |
| `none` | Static placeholder. Useful for reduced-motion. |

```tsx
// Global via SkeletonTheme
<SkeletonTheme animation="wave">
  <App />
</SkeletonTheme>

// Per component
<ArticleCard
  hasSkeleton
  isLoading={isLoading}
  skeletonConfig={{ animation: 'shatter' }}
/>

// Speed control
skeletonConfig={{ animation: 'wave', speed: 'slow' }}   // 0.5×
skeletonConfig={{ animation: 'wave', speed: 'rapid' }}  // 2×
skeletonConfig={{ animation: 'wave', speed: 1.5 }}      // custom multiplier
```

### wave / shiver on React Native

`wave` and `shiver` require a LinearGradient peer on React Native. Install one:

```sh
# Expo
npx expo install expo-linear-gradient

# Bare React Native
npm install react-native-linear-gradient
```

Both are detected automatically. No extra config needed.

> On **React (web)**, `wave` and `shiver` use CSS gradients — no peer dependency required.

---

## Shatter

Each bone is subdivided into a grid of squares that fade in/out with staggered delays.

```tsx
<ArticleCard
  hasSkeleton
  isLoading={isLoading}
  skeletonConfig={{
    animation: 'shatter',
    shatterConfig: {
      gridSize: 6,        // columns in the grid
      stagger: 80,        // ms delay between squares
      fadeStyle: 'radial' // 'random' | 'cascade' | 'radial'
    }
  }}
/>
```

---

## API Reference

### Props injected by `withSkeleton`

| Prop | Type | Description |
|------|------|-------------|
| `hasSkeleton` | `boolean` | Activates skeleton on this component |
| `isLoading` | `boolean` | Shows the skeleton when true |
| `isLoadingSkeleton` | `boolean` | Shorthand — activates `hasSkeleton` + `isLoading` |
| `skeletonConfig` | `SkeletonConfig` | Local config override (highest priority) |

Config priority: `skeletonConfig` prop > `SkeletonTheme` > defaults.

---

### `SkeletonConfig`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animation` | `'pulse' \| 'wave' \| 'shiver' \| 'shatter' \| 'none'` | `'pulse'` | Animation mode |
| `color` | `string` | `'#E0E0E0'` | Base bone color |
| `highlightColor` | `string` | `'#F5F5F5'` | Highlight color for wave / shiver |
| `speed` | `'slow' \| 'normal' \| 'rapid' \| number` | `'normal'` | Animation speed |
| `borderRadius` | `number` | `4` | Fallback corner radius |
| `direction` | `'ltr' \| 'rtl'` | `'ltr'` | Shimmer direction |
| `minDuration` | `number` | `0` | Minimum ms the skeleton stays visible |
| `disabled` | `boolean` | `false` | Never show skeleton |
| `shatterConfig` | `ShatterConfig` | see below | Shatter-specific settings |

### `ShatterConfig`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gridSize` | `number` | `6` | Number of columns |
| `stagger` | `number` | `80` | Delay in ms between each square |
| `fadeStyle` | `'random' \| 'cascade' \| 'radial'` | `'random'` | Square fade order |

### `SkeletonTheme` props

All `SkeletonConfig` props, plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Your app |

---

### React Native — additional options

The following are available in the React Native build only.

#### `withSkeleton(Component, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `measureStrategy` | `'auto' \| 'root-only'` | `'auto'` | `'auto'` = one bone per element (Fiber walk); `'root-only'` = single root block |
| `maxDepth` | `number` | `8` | Max depth of the Fiber tree traversal |
| `exclude` | `string[]` | `[]` | Component displayNames to skip during Fiber walk |

```tsx
// Opt out of Fiber walk for a heavy screen
export default withSkeleton(Screen, { measureStrategy: 'root-only' })

// Exclude a third-party widget
export default withSkeleton(Screen, { exclude: ['MapView', 'VideoPlayer'] })
```

#### `registerSkeletonLeaf`

Register custom image libraries as leaf elements in the Fiber walk.

```tsx
import { registerSkeletonLeaf } from 'react-zero-skeleton'

// Call once before your first render
registerSkeletonLeaf('FastImage', 'ExpoImage')
```

#### `SkeletonTheme` — `auto` mode (React Native only)

Injects `hasSkeleton` on all children automatically via `React.cloneElement`.

```tsx
<SkeletonTheme
  animation="wave"
  auto
  exclude={['MapView', 'NavigationContainer']}
>
  <App />
</SkeletonTheme>
```

Then anywhere in the tree, just pass `isLoading`:

```tsx
<ArticleCard isLoading={isLoading} />
```

> Use `exclude` to protect third-party components that reject unknown props.

---

## Limitations

### React Native — Fiber walk reads React internals

Per-element measurement reads `_reactInternals` / `_reactFiber` from native View instances. These are undocumented React internals, stable across React 17–18. If the walk fails, react-zero-skeleton falls back to a single root bone automatically.

### React Native — wave / shiver need a gradient peer

Without `expo-linear-gradient` or `react-native-linear-gradient`, these animations fall back to a solid placeholder. See [wave / shiver on React Native](#wave--shiver-on-react-native).

### React Native — shatter falls back to pulse in FlatList

Inside `FlatList` / `FlashList`, `shatter` automatically falls back to `pulse` for performance. This is silent and intentional.

### React Native — animations run on the JS thread

All RN animations use the `Animated` API. On low-end devices with long lists, you may see frame drops. Reanimated worklets are on the roadmap.

---

## Comparison

| Feature | **react-zero-skeleton** | react-native-auto-skeleton | react-content-loader | react-loading-skeleton |
|---------|:-----------------------:|:--------------------------:|:--------------------:|:----------------------:|
| Zero config | ✅ | ✅ | ❌ | ❌ |
| Auto-generated from layout | ✅ | ✅ | ❌ | ❌ |
| React web support | ✅ | ❌ | ✅ | ✅ |
| Shatter animation | ✅ | ❌ | ❌ | ❌ |
| No native code | ✅ | ❌ | ✅ | ✅ |
| RTL support | ✅ | ❌ | ❌ | ✅ |
| Cache aware | ✅ | ❌ | ❌ | ❌ |

---

## Contributing

```bash
npm install
npm run build
npm test
npm run typecheck
```

Open a PR against `main`. Please include a changeset:

```bash
npx changeset
```

---

## License

MIT © [J-Ben](https://github.com/J-Ben)
