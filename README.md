# react-zero-skeleton

[![npm version](https://img.shields.io/npm/v/react-zero-skeleton)](https://www.npmjs.com/package/react-zero-skeleton)
[![npm downloads](https://img.shields.io/npm/dm/react-zero-skeleton)](https://www.npmjs.com/package/react-zero-skeleton)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-zero-skeleton)](https://bundlephobia.com/package/react-zero-skeleton)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-%E2%9C%93-green)](https://reactnative.dev)
[![React](https://img.shields.io/badge/React%20web-%E2%9C%93-61dafb)](https://react.dev)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**[→ Live demo](https://skelter.dev/demo) · [Docs](https://skelter.dev/docs)**

<img width="800" height="450" alt="skelter paysage" src="https://github.com/user-attachments/assets/4048023e-f3ed-4543-b679-a35e3833d52c" />



---

The skeleton loader is the first contact between your app and your user. That moment deserves care, not an afterthought maintained in a separate file that drifts from reality the moment you touch the real component.

react-zero-skeleton changes the relationship. **The component IS its skeleton.** Wrap it once. The library measures the real layout at runtime, generates one bone per element, and keeps everything in sync automatically. Forever.

```tsx
// Before: two things to write, two things to maintain, two things to break.
function ArticleCard({ article }) { /* real component */ }
const ArticleCardSkeleton = () => ( /* a copy you'll forget to update */ )

// After: one thing.
const ArticleCard = withSkeleton(function ArticleCard({ article }) {
  return (
    <View>
      <Image source={{ uri: article.cover }} style={{ height: 160 }} />
      <Text style={s.title}>{article.title}</Text>
      <Text style={s.excerpt}>{article.excerpt}</Text>
    </View>
  )
})

<ArticleCard hasSkeleton isLoading={isLoading} article={data} />
```

---

## Installation

```bash
npm install react-zero-skeleton
```

No native code. No `pod install`. No linking.

The bundler resolves the right build automatically:
- **React Native / Metro** → native build (Fiber walk · `onLayout` · `Animated`)
- **React web / Next.js / Vite** → web build (DOM · `ResizeObserver` · CSS animations)

---

## How it works

On the first render, the component renders invisibly. react-zero-skeleton walks the React Fiber tree (on native) or the DOM (on web), measures every View / Image / Text, and captures position, size, and corner radius. The overlay - one bone per element, positioned exactly - replaces the hidden content until `isLoading` becomes false.

Layout changes propagate automatically. If you add a field to the card, the skeleton gains a bone. No manual sync required.

---

## Quick start

### Wrap once

```tsx
import { withSkeleton } from 'react-zero-skeleton'

function ProfileCard({ user }) {
  return (
    <View style={s.wrap}>
      <Image source={{ uri: user.avatar }} style={s.avatar} />
      <Text style={s.name}>{user.name}</Text>
      <Text style={s.bio}>{user.bio}</Text>
    </View>
  )
}

export default withSkeleton(ProfileCard)
```

### Use it

```tsx
// Two props. That's it.
<ProfileCard hasSkeleton isLoading={isLoading} user={data} />

// Shorthand: activates hasSkeleton + isLoading at once
<ProfileCard isLoadingSkeleton user={data} />
```

### Global theme

```tsx
import { SkeletonTheme } from 'react-zero-skeleton'

<SkeletonTheme animation="wave" color="#E0E0E0" highlightColor="#F5F5F5">
  <App />
</SkeletonTheme>
```

Config priority: `skeletonConfig` prop > `SkeletonTheme` > defaults.

---

## Animations

Nine animations. Each has a reason to exist.

| Animation | Character |
|-----------|-----------|
| `pulse` | Soft opacity fade. The default. Works everywhere, no dependencies. |
| `wave` | Shimmer left to right. Classic and readable. |
| `shiver` | Wider, more energetic wave. Good for large image placeholders. |
| `drip` | Vertical shimmer sweeping top to bottom, each bone phase-shifted. |
| `slide` | Bones drift upward while fading in. A gentle breathing effect. |
| `beat` | Double heartbeat: scale + opacity. Ideal for health and real-time data UIs. |
| `shaker` | A rapid horizontal tremor burst, then silence. For alert-style states. |
| `shatter` | Each bone fragments into a grid of squares. The signature animation. |
| `none` | Static placeholder. Useful with `prefers-reduced-motion`. |

```tsx
// Global
<SkeletonTheme animation="shatter">…</SkeletonTheme>

// Per component
<ProfileCard hasSkeleton isLoading={isLoading} skeletonConfig={{ animation: 'beat' }} />

// Speed
skeletonConfig={{ animation: 'wave', speed: 'slow' }}   // 0.5×
skeletonConfig={{ animation: 'wave', speed: 'rapid' }}  // 2×
skeletonConfig={{ animation: 'wave', speed: 1.5 }}      // custom multiplier
```

> `wave` and `shiver` require a LinearGradient peer on **React Native**:
> `npx expo install expo-linear-gradient` or `npm install react-native-linear-gradient`.
> On web, CSS gradients are used: no peer needed.

### Cascade

When `cascade > 0`, each bone's animation starts delayed by `bone.y × cascade` ms, creating a top-to-bottom sequential wave through the component.

```tsx
<SkeletonTheme animation="pulse" cascade={3}>
  {/* bone at y=0 starts immediately, bone at y=100 starts 300ms later */}
</SkeletonTheme>
```

### Shatter

```tsx
<ProfileCard
  hasSkeleton
  isLoading={isLoading}
  skeletonConfig={{
    animation: 'shatter',
    shatterConfig: {
      cellSize: 24,        // px - overrides column count
      stagger: 80,         // ms delay between squares
      fadeStyle: 'radial'  // 'random' | 'cascade' | 'radial'
    }
  }}
/>
```

---

## Loading experience

The transition into and out of the skeleton is part of the experience. react-zero-skeleton gives you control over both.

### Enter animation

Played when the skeleton first appears.

```tsx
<SkeletonTheme enter="fadeUp">…</SkeletonTheme>
// 'fade' | 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'none'
```

### Exit animation

Played when the skeleton disappears and content takes over.

```tsx
<SkeletonTheme animation="shatter" exit="fadeUp" revealOnExit>…</SkeletonTheme>
```

`revealOnExit` keeps the real content visible underneath while the skeleton fades out, creating a reveal effect instead of an abrupt swap.

---

## SkeletonBox

By default, container divs are skipped: only their text and image children receive bones. When a container is itself a visually meaningful shape (a stat card, a chip, a badge), wrap it with `SkeletonBox` to emit the box as a semi-transparent bone with its children rendered on top.

```tsx
import { SkeletonBox } from 'react-zero-skeleton'

function Stat({ label, value }) {
  return (
    <SkeletonBox style={{ flex: 1, backgroundColor: '#eee', borderRadius: 10, padding: 12 }}>
      <Text style={{ width: 'fit-content' }}>{label}</Text>
      <Text style={{ fontWeight: '700', width: 'fit-content' }}>{value}</Text>
    </SkeletonBox>
  )
}
```

The box bone is always static (no animation). Children animate normally.

---

## SkeletonIgnore

Wraps elements that should never receive a skeleton bone and always remain visible during loading: section headers, timestamps, decorative labels.

```tsx
import { SkeletonIgnore } from 'react-zero-skeleton'

function PriceCard({ data }) {
  return (
    <View style={s.wrap}>
      <SkeletonIgnore>
        <Text style={s.label}>Live price</Text>
      </SkeletonIgnore>
      <Text style={s.value}>{data.price}</Text>
      <Text style={s.change}>{data.change}</Text>
    </View>
  )
}
```

The measurement layer skips `SkeletonIgnore` entirely. The text stays visible while the dynamic content animates around it.

---

## API Reference

### Props added by `withSkeleton`

| Prop | Type | Description |
|------|------|-------------|
| `hasSkeleton` | `boolean` | Activates skeleton mode on this instance |
| `isLoading` | `boolean` | Shows the skeleton when `true` |
| `isLoadingSkeleton` | `boolean` | Shorthand: activates `hasSkeleton + isLoading` |
| `skeletonConfig` | `SkeletonConfig` | Per-instance config override |

### `SkeletonConfig`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animation` | `'pulse' \| 'wave' \| 'shiver' \| 'drip' \| 'slide' \| 'beat' \| 'shaker' \| 'shatter' \| 'none'` | `'pulse'` | Animation style |
| `color` | `string` | `'#E0E0E0'` | Base bone color |
| `highlightColor` | `string` | `'#F5F5F5'` | Highlight for wave / shiver / drip |
| `speed` | `'slow' \| 'normal' \| 'rapid' \| number` | `'normal'` | Animation speed multiplier |
| `borderRadius` | `number` | `4` | Fallback corner radius |
| `direction` | `'ltr' \| 'rtl'` | `'ltr'` | Shimmer direction |
| `cascade` | `number` | `0` | Stagger ms per pixel of vertical position |
| `enter` | `'fade' \| 'fadeUp' \| 'fadeDown' \| 'fadeLeft' \| 'fadeRight' \| 'none'` | `'none'` | Skeleton enter animation |
| `exit` | `'fade' \| 'fadeUp' \| 'fadeDown' \| 'fadeLeft' \| 'fadeRight' \| 'none'` | `'fade'` | Skeleton exit animation |
| `revealOnExit` | `boolean` | `false` | Show real content under skeleton during exit |
| `minDuration` | `number` | `0` | Minimum ms the skeleton stays visible |
| `disabled` | `boolean` | `false` | Disables skeleton entirely |
| `shatterConfig` | `ShatterConfig` | - | Shatter animation config |
| `maxBonesInList` | `number` | `0` | Max bones in FlatList (0 = unlimited) |

### `withSkeleton(Component, options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `measureStrategy` | `'auto' \| 'root-only'` | `'auto'` | `auto` = one bone per element; `root-only` = single block |
| `maxDepth` | `number` | `8` | Max Fiber tree depth |
| `exclude` | `string[]` | `[]` | Component displayNames to skip |
| `mockProps` | `object` | `{}` | Props for the invisible warmup render |

#### `mockProps`: cold start

When real props carry no data on first load, `mockProps` provides a realistic layout for the warmup render:

```tsx
withSkeleton(ArticleCard, {
  mockProps: { article: { title: 'Lorem ipsum', image: null } }
})
```

### `ShatterConfig`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cellSize` | `number` | `0` (auto) | Fixed cell size in px - overrides column count |
| `stagger` | `number` | `80` | ms delay between squares |
| `fadeStyle` | `'random' \| 'cascade' \| 'radial'` | `'random'` | Square fade order |

### `registerSkeletonLeaf` (React Native)

Registers custom image components as leaf elements in the Fiber walk:

```tsx
import { registerSkeletonLeaf } from 'react-zero-skeleton'
registerSkeletonLeaf('FastImage', 'ExpoImage')
```

### `SkeletonTheme` auto mode (React Native)

Injects `hasSkeleton` on all children via `cloneElement`. Then anywhere in the tree, only `isLoading` is needed:

```tsx
<SkeletonTheme auto animation="wave" exclude={['MapView']}>
  <App />
</SkeletonTheme>

// Anywhere in the tree:
<ArticleCard isLoading={isLoading} />
```

---

## FlatList

```tsx
const items = isLoading ? Array(6).fill(null) : realData

<FlatList
  data={items}
  renderItem={({ item }) => (
    <ArticleCard
      article={item}
      hasSkeleton
      isLoading={item === null}
    />
  )}
/>
```

`shatter` falls back to `pulse` automatically inside `FlatList` / `FlashList` for performance. `maxBonesInList` caps the number of bones per cell when lists are long.

---

## Accurate bones: `fit-content`

Block-level elements expand to fill their container by default, so their bone fills the full width even if the text is short. Add `width: 'fit-content'` (web) or `alignSelf: 'flex-start'` (React Native) to make each bone match the actual content width.

```tsx
// Web
<p style={{ fontSize: 16, width: 'fit-content' }}>{title}</p>

// React Native
<Text style={{ fontSize: 16, alignSelf: 'flex-start' }}>{title}</Text>
```

---

## Comparison

| Feature | **react-zero-skeleton** | react-native-auto-skeleton | react-content-loader | react-loading-skeleton |
|---------|:-:|:-:|:-:|:-:|
| Zero config | ✅ | ✅ | ❌ | ❌ |
| Auto-generated from live layout | ✅ | ✅ | ❌ | ❌ |
| React web support | ✅ | ❌ | ✅ | ✅ |
| Enter / exit transitions | ✅ | ❌ | ❌ | ❌ |
| Cascade stagger | ✅ | ❌ | ❌ | ❌ |
| Shatter animation | ✅ | ❌ | ❌ | ❌ |
| SkeletonBox / SkeletonIgnore | ✅ | ❌ | ❌ | ❌ |
| No native code | ✅ | ❌ | ✅ | ✅ |
| RTL support | ✅ | ❌ | ❌ | ✅ |

---

## Limitations

**Fiber walk reads React internals**: per-element measurement accesses `_reactInternals` / `_reactFiber`, which are undocumented but stable across React 17-18-19. If the walk fails, react-zero-skeleton falls back to a single root bone silently.

**wave / shiver require a gradient peer on React Native**: without `expo-linear-gradient` or `react-native-linear-gradient`, they fall back to a solid placeholder.

**Animations run on the JS thread**: all React Native animations use the `Animated` API. Reanimated worklets are on the roadmap for long lists on low-end devices.

---

## Contributing

```bash
npm install
npm run build
npm test
```

Open a PR against `main` with a changeset:

```bash
npx changeset
```

---

## License

MIT © [J-Ben](https://github.com/J-Ben)
