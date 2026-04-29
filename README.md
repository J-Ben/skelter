# skelter

**Stop writing skeleton loaders.**

[![npm version](https://img.shields.io/npm/v/skelter)](https://www.npmjs.com/package/skelter)
[![npm downloads](https://img.shields.io/npm/dm/skelter)](https://www.npmjs.com/package/skelter)
[![bundle size](https://img.shields.io/bundlephobia/minzip/skelter)](https://bundlephobia.com/package/skelter)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.70+-61DAFB)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-17+-61DAFB)](https://react.dev/)

Skelter wraps your React Native component and generates a skeleton placeholder from its actual layout — one bone per element, zero config required. Two props. No skeleton written by hand.

> **v0.3.0** — per-element bones by default. One bone per View / Image / Text inside your component, each at the right position, size, and corner radius. See [CHANGELOG](./CHANGELOG.md).

---

## The Problem

Every skeleton loader library makes you do this:

```tsx
// 😩 You write a skeleton by hand for every component
const ArticleCardSkeleton = () => (
  <SkeletonPlaceholder>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {/* Hope this matches the real layout... */}
      <View style={{ width: 80, height: 80, borderRadius: 8 }} />
      <View style={{ marginLeft: 12 }}>
        {/* Update this every time the design changes */}
        <View style={{ width: 200, height: 16, borderRadius: 4 }} />
        <View style={{ width: 150, height: 16, borderRadius: 4, marginTop: 8 }} />
        <View style={{ width: 100, height: 12, borderRadius: 4, marginTop: 8 }} />
      </View>
    </View>
  </SkeletonPlaceholder>
)
```

Design changes. You update the component. You forget to update the skeleton. It breaks.

---

## The Solution

```tsx
// ✅ One line on your component — done forever
import { withSkeleton } from 'skelter'
export default withSkeleton(ArticleCard)

// ✅ Two props wherever you need it
const ArticleList = () => {
  const { data, isLoading } = useArticles()
  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <ArticleCard
          article={item}
          hasSkeleton
          isLoading={isLoading}
        />
      )}
    />
  )
}
```

Skelter renders the component invisibly, walks the React Fiber tree, and measures every native element individually. The skeleton is a set of positioned blocks — one per View, Image, and Text — at the exact position, size, and corner radius of each element. When your layout changes, the skeleton follows automatically.

---

## Installation

```bash
npm install skelter
# or
yarn add skelter
```

No `pod install`. No native linking. No native code.

---

## Quick Start

### Step 1 — Wrap your app once (optional)

```tsx
// App.tsx
import { SkeletonTheme } from 'skelter'

export default function App() {
  return (
    <SkeletonTheme animation="wave" color="#E0E0E0">
      <YourApp />
    </SkeletonTheme>
  )
}
```

Skelter works with sensible defaults if you skip `SkeletonTheme`.

### Step 2 — Wrap your component once

```tsx
// ArticleCard.tsx
import { withSkeleton } from 'skelter'

const ArticleCard = ({ article }) => (
  <View>
    <Image source={{ uri: article.image }} />
    <Text>{article.title}</Text>
    <Text>{article.description}</Text>
  </View>
)

// Default: one bone per element, auto-measured from Fiber tree
export default withSkeleton(ArticleCard)

// v0.2 compat: single root block
// export default withSkeleton(ArticleCard, { measureStrategy: 'root-only' })
```

### Step 3 — Use it anywhere

```tsx
// Two props. That's it.
<ArticleCard hasSkeleton isLoading={isLoading} />

// Shorthand — activates hasSkeleton and isLoading at once
<ArticleCard isLoadingSkeleton />
```

---

## Animations

| Animation | Status | Description |
| --------- | ------ | ----------- |
| `pulse` | ✅ | Soft fade in/out. The default. |
| `wave` | ✅ ⚠️ | Shimmer that slides left to right. Requires a [gradient peer](#wave--shiver-shimmer). |
| `shiver` | ✅ ⚠️ | Intense wave with wider amplitude and faster speed. Requires a [gradient peer](#wave--shiver-shimmer). |
| `shatter` | ✅ ⚠️ | Grid fragmentation effect. Falls back to `pulse` inside FlatList — see below. |
| `none` | ✅ | Static placeholder, no animation. Useful for accessibility. |

```tsx
<SkeletonTheme animation="wave">
  <App />
</SkeletonTheme>

// Or per component
<ArticleCard
  hasSkeleton
  isLoading={isLoading}
  skeletonConfig={{ animation: 'shatter' }}
/>

// Control speed with named presets or a numeric multiplier
<ArticleCard
  hasSkeleton
  isLoading={isLoading}
  skeletonConfig={{ animation: 'wave', speed: 'slow' }}   // 0.5×
/>
<ArticleCard
  hasSkeleton
  isLoading={isLoading}
  skeletonConfig={{ animation: 'wave', speed: 'rapid' }}  // 2×
/>
<ArticleCard
  hasSkeleton
  isLoading={isLoading}
  skeletonConfig={{ animation: 'wave', speed: 1.5 }}      // custom multiplier
/>
```

### wave / shiver shimmer

`wave` and `shiver` require a LinearGradient peer to display the highlight sweep. Without one, they fall back to a solid placeholder (same visual as `pulse`) and log a warning once.

Install one of:

```sh
# Expo
npx expo install expo-linear-gradient

# Bare React Native
npm install react-native-linear-gradient
```

Both are detected automatically at runtime. You do not need to configure anything else.

---

## Shatter ✨

Skelter's signature animation. Each bone is subdivided into a grid of small squares. They fade out and back in with a staggered delay.

**Three fade styles:**

- `random` — squares disappear in a stable random order (deterministic seed per bone)
- `cascade` — left to right, row by row
- `radial` — from the center outward

```tsx
<ArticleCard
  hasSkeleton
  isLoading={isLoading}
  skeletonConfig={{
    animation: 'shatter',
    shatterConfig: {
      gridSize: 6,       // columns in the grid
      stagger: 80,       // ms delay between squares
      fadeStyle: 'radial'
    }
  }}
/>
```

> **FlatList note:** inside a FlatList / FlashList, `shatter` automatically falls back to `pulse`. Each shatter bone allocates one `Animated.Value` per grid square; with 20+ list items this becomes too expensive. The fallback is silent and intentional.

---

## Auto Mode

Enable `auto` on `SkeletonTheme` — Skelter injects `hasSkeleton={true}` on all child components recursively via `React.cloneElement`.

```tsx
<SkeletonTheme
  animation="shatter"
  auto
  exclude={['MapView', 'NavigationContainer', 'VideoPlayer']}
>
  <App />
</SkeletonTheme>
```

Then anywhere in your app:

```tsx
<ArticleCard isLoading={isLoading} />
<ProductCard isLoading={isLoading} />
```

> **Known issue:** `cloneElement` injects `hasSkeleton` on every component in the tree, including third-party ones that may not accept unknown props. Use `exclude` to protect them. If you get "unknown prop" warnings, either add the component to `exclude` or switch to the explicit `withSkeleton` approach.

---

## API Reference

### `SkeletonConfig`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animation` | `'pulse' \| 'wave' \| 'shiver' \| 'shatter' \| 'none'` | `'pulse'` | Animation mode |
| `color` | `string` | `'#E0E0E0'` | Base placeholder color |
| `highlightColor` | `string` | `'#F5F5F5'` | Highlight color for wave/shiver shimmer |
| `speed` | `'slow' \| 'normal' \| 'rapid' \| number` | `'normal'` | Animation speed — named preset or custom multiplier (2.0 = twice as fast) |
| `borderRadius` | `number` | `4` | Fallback corner radius — used when element style has no borderRadius |
| `direction` | `'ltr' \| 'rtl'` | `'ltr'` | Shimmer direction |
| `minDuration` | `number` | `0` | Minimum ms the skeleton stays visible |
| `disabled` | `boolean` | `false` | Never show skeleton if true |
| `maxBonesInList` | `number` | `0` | Max bones rendered in FlatList (0 = unlimited) |
| `shatterConfig` | `ShatterConfig` | see below | Shatter animation config |
| `imageConfig` | `{ aspectRatio: number }` | `{ aspectRatio: 1 }` | Image fallback dimensions |

Since v0.3, `borderRadius` is read from each element's `StyleSheet` style automatically. `config.borderRadius` acts as the fallback when the element has no explicit radius.

### `withSkeleton` options

Second argument — `withSkeleton(Component, options?)`:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `measureStrategy` | `'auto' \| 'root-only'` | `'auto'` | `'auto'` walks the Fiber tree (one bone per element); `'root-only'` restores v0.2 single-block behaviour |
| `maxDepth` | `number` | `8` | Max depth of the Fiber tree traversal |
| `exclude` | `string[]` | `[]` | Component displayNames excluded from the fiber walk (produce no bones) |

```tsx
// Exclude a heavy third-party widget from measurement
export default withSkeleton(Screen, { exclude: ['MapView', 'VideoPlayer'] })

// Opt out of fiber walk entirely
export default withSkeleton(Screen, { measureStrategy: 'root-only' })
```

### `registerSkeletonLeaf`

Registers additional component names as skeleton leaf elements. Use this for custom image libraries that are not detected automatically.

```tsx
import { registerSkeletonLeaf } from 'skelter'

// Call once, before your first render
registerSkeletonLeaf('FastImage', 'ExpoImage')
```

### `ShatterConfig`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gridSize` | `number` | `6` | Number of columns in the grid |
| `stagger` | `number` | `80` | Delay in ms between each square |
| `fadeStyle` | `'random' \| 'cascade' \| 'radial'` | `'random'` | Order squares appear/disappear |

### `SkeletonTheme` props

All `SkeletonConfig` props, plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `auto` | `boolean` | `false` | Inject `hasSkeleton` on all children automatically |
| `exclude` | `string[]` | `[]` | Component displayNames excluded from auto mode |
| `children` | `ReactNode` | — | Your app |

### Props injected by `withSkeleton`

| Prop | Type | Description |
|------|------|-------------|
| `hasSkeleton` | `boolean` | Activates skeleton on this component |
| `isLoading` | `boolean` | Shows/hides the skeleton |
| `isLoadingSkeleton` | `boolean` | Shorthand — activates hasSkeleton + isLoading |
| `skeletonConfig` | `SkeletonConfig` | Local config override (highest priority) |

Config priority chain: `skeletonConfig` prop > `SkeletonTheme` > defaults.

---

## Limitations

These are real constraints in the current version. They are listed here so you can make an informed decision before adopting the library.

### Fiber walk depends on React internals

Per-element measurement reads `_reactInternals` / `_reactFiber` from the native View instance. These are undocumented React internals. They have been stable across React 17–18, but could change in a future React version. If the walk fails (hermetic bundles, test runners, future React), Skelter falls back to a single root bone — same as v0.2.

### Custom image components need manual registration

Third-party image libraries (`FastImage`, `ExpoImage`, etc.) are not in Skelter's built-in leaf list. Call `registerSkeletonLeaf('FastImage')` once at app startup, or they will be invisible to the fiber walker.

### wave and shiver need a gradient peer

Without `expo-linear-gradient` or `react-native-linear-gradient`, these animations show a solid placeholder with no shimmer highlight. Install one — see [wave / shiver shimmer](#wave--shiver-shimmer).

### shatter falls back to pulse in FlatList

This is intentional for performance, but it is silent. If you use `animation: 'shatter'` globally and your component appears in a list, you will see `pulse` instead with no warning.

### auto mode may generate warnings

`auto={true}` injects `hasSkeleton` via `React.cloneElement` on everything in the subtree, including third-party components. Use `exclude` to protect components that reject unknown props.

### Animations run on the JS thread

All animations use React Native's `Animated` API. For long lists or low-end devices, you may see frame drops. `react-native-reanimated` worklets (UI thread) are on the roadmap.

---

## Comparison

| Feature | **skelter** | react-native-auto-skeleton | react-content-loader | react-loading-skeleton |
|---------|:-----------:|:--------------------------:|:--------------------:|:----------------------:|
| Zero config | ✅ | ✅ | ❌ | ❌ |
| Auto-generated from layout | ✅ ¹ | ✅ | ❌ | ❌ |
| React web support | ✅ | ❌ | ✅ | ✅ |
| Shatter animation | ✅ | ❌ | ❌ | ❌ |
| No native code | ✅ | ❌ | ✅ | ✅ |
| Global auto mode | ✅ ² | ❌ | ❌ | ❌ |
| RTL support | ✅ | ❌ | ❌ | ✅ |
| Cache aware | ✅ | ❌ | ❌ | ❌ |

¹ One bone per element by default (v0.3+). `measureStrategy: 'root-only'` falls back to one block per component root.
² Via `cloneElement` injection — may generate warnings on some third-party components.

---

## Roadmap

### v0.3 — Current

- ✅ Per-element bones — one bone per View / Image / Text, auto-measured from Fiber tree
- ✅ Per-element `borderRadius` — read from each element's StyleSheet
- ✅ `withSkeleton(Component, options?)` — `measureStrategy`, `maxDepth`, `exclude`
- ✅ `registerSkeletonLeaf` — add custom image components to the leaf registry
- ✅ FlatList auto-detection — switches to root-only inside VirtualizedList
- ✅ `pulse`, `wave`, `shiver`, `shatter` animations, `AnimationSpeed` presets
- ✅ FlatList optimization, SSR safe, cache aware, RTL, accessibility (reduce motion)

### v1 — Future

- Opt-in Suspense API — `<SkeletonSuspense fallback={<SkeletonOf component={X} />}>`
- Dark mode auto via `useColorScheme`
- Static codegen for FlashList items

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
