# Hubble brand guide

This file defines the canonical visual tokens for Hubble. Product interfaces, documentation, social graphics, and integrations should use these values instead of sampling colors from image assets.

## Signal yellow palette

| Token | Hex | RGB | Recommended use |
|---|---|---|---|
| Signal Yellow | `#F4E435` | `244, 228, 53` | Primary brand accent, active states, key actions, borders, and data highlights |
| Bright Yellow | `#FEF260` | `254, 242, 96` | Brighter UI accents and small highlights where Signal Yellow needs extra lift |
| Highlight Yellow | `#FFFB8D` | `255, 251, 141` | Gradient endpoints, glows, and secondary highlight text |
| Deep Yellow | `#E6D42E` | `230, 212, 46` | Pressed states, dimensional shadows, and darker yellow contrast |

Signal Yellow (`#F4E435`) is the primary and default Hubble yellow. The other yellows support it; they should not replace it as the dominant brand color.

## CSS custom properties

```css
:root {
  --hubble-yellow: #f4e435;
  --hubble-yellow-bright: #fef260;
  --hubble-yellow-highlight: #fffb8d;
  --hubble-yellow-deep: #e6d42e;
}
```

The same tokens are available as a copyable stylesheet at [`assets/brand/hubble-colors.css`](./assets/brand/hubble-colors.css).

## Usage

- Use Signal Yellow for the main call to action, selected navigation, focus indicators, and important live values.
- Use black or near-black text and icons on solid yellow controls.
- Use yellow as a signal color against Hubble's dark surfaces rather than as a large page background.
- Use Highlight Yellow sparingly for gradients and glow effects.
- Use Deep Yellow for depth and interaction states, not for primary calls to action.
- Preserve the exact hex values across web, documentation, and integration assets.

## Core dark pairing

Hubble's current product UI pairs Signal Yellow with near-black surfaces:

| Token | Hex | Recommended use |
|---|---|---|
| Space Black | `#050505` | Primary page background |
| Panel Black | `#0E0E0E` | Cards, panels, and elevated surfaces |
| Hubble White | `#FFFFFF` | Primary text on dark surfaces |
| Muted Gray | `#999999` | Secondary text and supporting labels |

## Logo and artwork

Canonical visual assets are indexed in the [Brand assets section](./README.md#brand-assets) of the project README.
