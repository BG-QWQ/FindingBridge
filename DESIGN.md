# oh-my-triage setup design system

## 1. Atmosphere & Identity

The setup wizard feels like a local security triage console: quiet, compact, and trustworthy. Its signature is a deep charcoal workspace with warm amber command accents, editorial serif headings, and mono metadata that make configuration feel deliberate rather than generic.

## 2. Color

### Palette

| Role | Token | Dark | Usage |
|------|-------|------|-------|
| Background | `--bg` | `oklch(14% 0.012 260)` | Page canvas |
| Surface | `--surface` | `oklch(18% 0.015 260)` | Sidebar, cards, inputs |
| Elevated | `--elevated` | `oklch(23% 0.018 260)` | Active nav, preview headers, hover base |
| Hover | `--hover` | `oklch(27% 0.020 260)` | Hovered controls |
| Text primary | `--fg` | `oklch(92% 0.008 80)` | Body and headings |
| Text secondary | `--muted` | `oklch(62% 0.012 80)` | Descriptions and help text |
| Text subtle | `--subtle` | `oklch(56% 0.010 80)` | Metadata and disabled context |
| Accent | `--accent` | `oklch(72% 0.135 85)` | Primary actions, active nav, focus |
| Accent hover | `--accent-hover` | `oklch(78% 0.13 85)` | Primary hover |
| Accent dim | `--accent-dim` | `oklch(72% 0.135 85 / 0.18)` | Focus halo |
| Accent dull | `--accent-dull` | `oklch(72% 0.10 85)` | Links and overlines |
| Border | `--border` | `oklch(32% 0.015 260)` | Default separators |
| Border strong | `--border-strong` | `oklch(42% 0.018 260)` | Inputs and prominent outlines |
| Success | `--success` | `oklch(70% 0.14 145)` | Connected states |
| Error | `--error` | `oklch(65% 0.18 25)` | Validation and failed calls |
| Warning | `--warning` | `oklch(78% 0.15 85)` | Cautions |
| Info | `--info` | `oklch(65% 0.12 255)` | Informational setup status |

### Rules

- Use amber only for command emphasis: CTAs, focus, active step, selected cards, and links.
- Use tonal dark surfaces plus borders for depth; do not add drop shadows.
- Status colors are semantic and must remain paired with their dim background tokens.

## 3. Typography

### Scale

| Level | Token | Size | Weight | Line Height | Tracking | Usage |
|-------|-------|------|--------|-------------|----------|-------|
| Display | `--fs-h1` | `clamp(30px, 4vw, 42px)` | 700 | 1.2 | default | Welcome headline |
| H2 | `--fs-h2` | `24px` | 700 | 1.3 | `-0.02em` | Step headings |
| H3 | `--fs-h3` | `17px` | 700 | 1.4 | default | Section titles |
| Lead | `--fs-lead` | `15px` | 400 | 1.6 | default | Step subtitles |
| Body | `--fs-body` | `14px` | 400 | 1.55 | default | Default text and controls |
| Meta | `--fs-meta` | `12px` | 400-600 | 1.4 | `0.04em-0.06em` | Overlines and labels |

### Font Stack

- Display: `Georgia, 'Times New Roman', serif`
- Body: `'Segoe UI', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif`
- Mono: `'Cascadia Code', 'Fira Code', 'SF Mono', Consolas, monospace`

### Rules

- Headings use the serif display stack; operational labels and counts use the mono stack.
- Body text never drops below 12px, and primary form text stays at 14px.
- Use `text-wrap: balance` for headings and `text-wrap: pretty` for paragraphs.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a compact 4px grid.

| Token | Value | Usage |
|-------|-------|-------|
| `--gap-xs` | `6px` | Tight inline details |
| `--gap-sm` | `10px` | Compact controls |
| `--gap-md` | `16px` | Default group spacing |
| `--gap-lg` | `24px` | Panel and sidebar sections |
| `--gap-xl` | `36px` | Major form/action separation |
| `--gap-2xl` | `56px` | Welcome hero spacing |

### Grid

- Sidebar: fixed 260px desktop console rail.
- Main content: 760px maximum with 56px horizontal padding on desktop.
- Scanner modules: 2 columns desktop, 1 column below 820px.
- Mobile: sidebar becomes a top rail, step labels collapse, main padding becomes 18px.

### Rules

- Layout should feel dense and command-oriented, not roomy SaaS marketing.
- Navigation and form controls use compact spacing; action groups keep a 28px top separator.
- The production welcome step keeps a compact hero, live setup status, and primary `Start setup` CTA even when visual references show a blank demonstration state; beginner discoverability is part of the shipped composition.

## 5. Components

### Button

- **Structure**: `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, optional `.btn-sm`.
- **Spacing**: 9px by 18px default; 5px by 10px small.
- **States**: hover background shift, 1px active translate, visible focus outline, disabled opacity.
- **Accessibility**: native `<button>` elements only.
- **Motion**: 50ms press transform; 120ms color/border transitions.

### Scanner module card

- **Structure**: `.checkbox-card` containing hidden checkbox, `.check-indicator`, `.card-top`, `.card-indicator`, `.card-title`, `.card-desc`.
- **Variants**: default, hover, selected, focus-visible.
- **Spacing**: 18px by 16px; 12px card-top gap.
- **States**: selected card uses amber border, dim amber fill, and check indicator.
- **Accessibility**: label wraps the checkbox; focus uses `:has(input:focus-visible)`.

### Form field

- **Structure**: `.form-group`, label or `.field-label`, optional `.input-wrapper`, `.input`, `.form-hint`.
- **Variants**: text, password with `.toggle-password`, select, textarea.
- **States**: amber focus border and dim halo; placeholder uses subtle text.
- **Accessibility**: labels connect through `for`; hints use `aria-describedby` when present.

### Radio option

- **Structure**: `.radio-group` with `.radio-option`, radio input, `.radio-label`, `.radio-desc`.
- **States**: hover tonal shift, selected amber border and dim amber fill, focus-within outline.
- **Accessibility**: fieldsets and legends wrap semantic groups.

### Config preview

- **Structure**: `.config-preview`, `.config-preview-header`, `.config-preview-dots`, `.config-preview-title`, `pre`.
- **Spacing**: 8px by 12px header, 14px code padding.
- **Depth**: bordered terminal panel with elevated header.

### Summary readout and scanner list

- **Structure**: `.summary-readout`, `.summary-item`, `.summary-value`, `.summary-label`, `.scanner-list`, `.scanner-item`.
- **States**: connected scanner dot uses `--success`; untested dot uses `--subtle`.
- **Typography**: serif numeric values, mono uppercase labels.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Press | `0.05s` | `ease` | Button active translate |
| Micro | `0.12s` | `ease` | Hover, border, focus |
| Panel | `0.2s` | `ease` | Step panel entry |
| Loading | `0.6s` | `linear` | Spinner rotation |

### Rules

- Animate only transform and opacity for panel entry.
- Every interactive primitive has hover, focus, and disabled treatment.
- Keep motion restrained to preserve the console feel.

## 7. Depth & Surface

### Strategy

Use mixed tonal-shift and borders. Surfaces move from `--bg` to `--surface`, `--elevated`, and `--hover`; borders define cards, inputs, preview panels, and sidebar separation. Shadows are intentionally absent.
