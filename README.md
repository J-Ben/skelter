# skelter
Stop writing skeleton loaders. Auto-generated from your component layout.
# Skelter

**Stop writing skeleton loaders.**

[![npm version](https://img.shields.io/npm/v/skelter)](https://www.npmjs.com/package/skelter)
[![npm downloads](https://img.shields.io/npm/dm/skelter)](https://www.npmjs.com/package/skelter)
[![bundle size](https://img.shields.io/bundlephobia/minzip/skelter)](https://bundlephobia.com/package/skelter)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.70+-61DAFB)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-17+-61DAFB)](https://react.dev/)

Skelter automatically generates skeleton placeholders from your real component layout.
Zero config. Zero skeletons written by hand. Two props.

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

// 😩 Then you manage the switch manually
const ArticleList = () => {
  const { data, isLoading } = useArticles()
  if (isLoading) return <ArticleCardSkeleton /> // Don't forget to update this too
  return <FlatList data={data} renderItem={({ item }) => <ArticleCard article={item} />} />
}
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

Skelter measures your real component layout at runtime and generates the skeleton automatically.
When your UI changes, the skeleton updates itself. Zero maintenance.

---

## Installation

```bash
npm install skelter
# or
yarn add skelter
```

No `pod install`. No native linking. No native code at all.

---

## Quick Start

### Step 1 — Wrap your app once

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

This is optional — Skelter works with sensible defaults if you skip it.

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

export default withSkeleton(ArticleCard)
```

### Step 3 — Use it anywhere

```tsx
// Two props. That's it.
<ArticleCard hasSkeleton isLoading={isLoading} />

// Shorthand — activates hasSkeleton and isLoading at once
<ArticleCard isLoadingSkeleton />
```

---

## Auto Mode

Don't want to call `withSkeleton` on every component?
Enable auto mode on `SkeletonTheme` — Skelter injects `hasSkeleton` on
every child component automatically.

```tsx
<SkeletonTheme
  animation="shatter"
  auto
  exclude={['MapView', 'NavigationContainer', 'VideoPlayer']}
>
  <App />
</SkeletonTheme>
```

Then anywhere in your app — no imports, no `withSkeleton`:

```tsx
<ArticleCard isLoading={isLoading} />
<ProductCard isLoading={isLoading} />
<UserProfile isLoading={isLoading} />
```

The `exclude` prop protects third-party components that don't accept unknown props.

---

## Animations

| Animation | Description |
|-----------|-------------|
| `pulse` | Soft fade in/out. The default. |
| `wave` | Shimmer that slides left to right (or right to left with `direction: 'rtl'`). |
| `shiver` | Intense wave with wider amplitude and faster speed. |
| `shatter` | ✨ Skelter's signature — grid fragmentation effect. See below. |
| `none` | Static placeholder, no animation. Useful for accessibility. |

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
```

---

## Shatter ✨

Skelter's signature animation. Each bone is subdivided into a grid of small squares.
They fade out and back in with a staggered delay — creating a unique fragmentation effect
you won't find in any other skeleton library.

```
Before (isLoading: true)          After (isLoading: false)

┌─────────────────────────┐       ┌─────────────────────────┐
│ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓│       │  React Native is great  │
│ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░│  →    │  by John Doe            │
│ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓ ░░ ▓▓│       │  Apr 20, 2026           │
└─────────────────────────┘       └─────────────────────────┘
  Squares fade in and out
  with staggered delays
```

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

---

## API Reference

### `SkeletonConfig`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animation` | `'pulse' \| 'wave' \| 'shiver' \| 'shatter' \| 'none'` | `'pulse'` | Animation mode |
| `color` | `string` | `'#E0E0E0'` | Base placeholder color |
| `highlightColor` | `string` | `'#F5F5F5'` | Highlight color for shimmer |
| `speed` | `number` | `1.0` | Speed multiplier — 2.0 is twice as fast |
| `borderRadius` | `number` | `4` | Corner radius for all bones |
| `direction` | `'ltr' \| 'rtl'` | `'ltr'` | Animation direction |
| `minDuration` | `number` | `0` | Minimum ms the skeleton stays visible |
| `disabled` | `boolean` | `false` | Never show skeleton if true |
| `maxBonesInList` | `number` | `0` | Max bones in FlatList (0 = unlimited) |
| `shatterConfig` | `ShatterConfig` | see below | Shatter animation config |
| `imageConfig` | `{ aspectRatio: number }` | `{ aspectRatio: 1 }` | Image fallback dimensions |

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
| `skeletonConfig` | `SkeletonConfig` | Local config override |

---

## Comparison

| Feature | **skelter** | react-native-auto-skeleton | react-content-loader | react-loading-skeleton |
|---------|:-----------:|:--------------------------:|:--------------------:|:----------------------:|
| Zero config | ✅ | ✅ | ❌ | ❌ |
| Auto-generated from layout | ✅ | ✅ | ❌ | ❌ |
| React web support | ✅ | ❌ | ✅ | ✅ |
| Shatter animation | ✅ | ❌ | ❌ | ❌ |
| No native code | ✅ | ❌ | ✅ | ✅ |
| Global auto mode | ✅ | ❌ | ❌ | ❌ |
| RTL support | ✅ | ❌ | ❌ | ✅ |
| Cache aware | ✅ | ❌ | ❌ | ❌ |

---

## Roadmap

**v1 — Current**
- React Native + React web
- Four animations: pulse, wave, shiver, shatter
- Auto mode — zero touch on individual components
- FlatList optimization, SSR safe, cache aware

**v2 — Coming**
- Text masks — skeleton overlaid directly on text elements
- Shatter on text masks for the full signature experience

**v3 — Future**
- Visual animation builder — create custom animations online
- Export as `skeletonConfig` and drop into your project

---

## Contributing

Contributions are welcome.

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Typecheck
npm run typecheck
```

Open a PR against `main`. Please include a changeset:

```bash
npx changeset
```

---

## License

MIT © [J-Ben](https://github.com/J-Ben)