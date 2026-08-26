# Editorial Playground

A warm, editorial portfolio theme built around serif display type, a six-accent color mosaic, and a light/dark system toggled with a circular reveal. Clean borders and tinted card fills in light mode; transparent cards and inverted contrast in dark mode.

## Color Palette

### Light mode (default)

| Token | Hex | Role |
| --- | --- | --- |
| **Background** | `#FFFFFF` | Page surface |
| **Primary** | `#000000` | Body text, borders, nav chrome |
| **Secondary** | `#336666` | Teal accent — headings, links, scrollbar hover |
| **Tertiary** | `#FF9966` | Coral accent — highlights, scrollbar thumb |
| **Quaternary** | `#99CC99` | Sage accent — grid cards, list markers |
| **Quinary** | `#996699` | Plum accent — quote cards, decorative blocks |
| **Senary** | `#FFCC99` | Peach accent — image cards, warm fills |
| **Muted** | `#808080` | Supporting copy, captions, italics |

### Dark mode (`[data-theme="dark"]`)

| Token | Hex | Role |
| --- | --- | --- |
| **Background** | `#0A0A0A` | Page surface |
| **Primary** | `#FFFFFF` | Body text, borders |
| **Secondary** | `#4A9D9D` | Teal accent (lifted for contrast) |
| **Tertiary** | `#FFAA77` | Coral accent |
| **Quaternary** | `#AADDAA` | Sage accent |
| **Quinary** | `#815A81` | Plum accent |
| **Senary** | `#FFDDAA` | Peach accent |
| **Muted** | `#AFAFAF` | Supporting copy |

### Browser chrome

- Light `theme-color`: `#336666`
- Dark `theme-color`: `#0A0A0A`

## Typography

| Role | Font | Tailwind class | CSS variable |
| --- | --- | --- | --- |
| **Display / headings** | Abril Fatface | `font-abril-fatface` | `--font-heading` |
| **Body** | Lato | `font-lato` (default on `html`) | `--font-body` |
| **Accent / quotes / subtitles** | Playfair Display | `font-playfair-display` | `--font-serif` |

**Pairing logic:** Abril Fatface carries hero and section titles; Lato handles readable UI and resume body; Playfair Display adds editorial italics for taglines, dates, and pull quotes.

**Google Fonts load:** Abril Fatface, Lato (100–900, italic), Playfair Display (400–900, italic).

## Semantic usage

| Context | Typical classes / tokens |
| --- | --- |
| Page background | `bg-background` |
| Primary text | `text-primary` (default on `body`) |
| Section headings | `font-abril-fatface`, often `text-secondary` |
| Subtitles & dates | `font-playfair-display italic`, `text-muted` |
| Accent bullets | `text-tertiary`, `text-quaternary` by section |
| Skill / tag pills | `border-2 border-primary bg-background text-primary rounded-full` |
| Section dividers | `border-b-2 border-primary` |

## Layout & components

### Navigation

- Pill-shaped nav bar: `border border-primary rounded-[48px]`
- Circular logo avatar on `bg-primary`
- Circular theme toggle: `size-8 rounded-full border-primary bg-background`

### Bento grid cards

Each grid cell uses a **border color + tinted fill** pairing in light mode:

| Class | Border | Light fill (20% opacity) |
| --- | --- | --- |
| `card-bg-primary` | `border-primary` | `rgba(0, 0, 0, 0.2)` |
| `card-bg-secondary` | `border-secondary` | `rgba(51, 102, 102, 0.2)` |
| `card-bg-tertiary` | `border-tertiary` | `rgba(255, 153, 102, 0.2)` |
| `card-bg-quaternary` | `border-quaternary` | `rgba(153, 204, 153, 0.2)` |
| `card-bg-quinary` | `border-quinary` | `rgba(153, 102, 153, 0.2)` |
| `card-bg-senary` | `border-senary` | `rgba(255, 204, 153, 0.2)` |

In dark mode, all `card-bg-*` backgrounds become **transparent**; color comes from borders and content only.

### Buttons & links

- Primary CTA pattern: `bg-background border border-primary text-primary rounded-full`
- Hover: `hover:bg-primary/80 hover:text-background`
- Nav / card links: `hover:opacity-80 transition-opacity`

### Scrollbars

- Light: thumb `#FF9966` (tertiary) on white track
- Dark: thumb `#4A9D9D` (secondary) on `#0A0A0A` track
- Width: `10px`, thumb radius `5px`

## Theme switching

- Attribute: `data-theme="light" | "dark"` on `<html>`
- Persistence: `localStorage.theme`
- Fallback: `prefers-color-scheme`
- Transition: circular overlay with `mix-blend-mode: difference` expanding from the upper-right corner (inspired by juliacodes.com)

FOUC prevention: inline script in `<head>` sets theme before paint.

## Tailwind v4 source of truth

Defined in `src/styles/global.css` under `@theme`:

```css
@theme {
  --font-abril-fatface: "Abril Fatface", serif;
  --font-lato: "Lato", sans-serif;
  --font-playfair-display: "Playfair Display", serif;

  --font-heading: var(--font-abril-fatface);
  --font-body: var(--font-lato);
  --font-serif: var(--font-playfair-display);

  --color-background: #FFFFFF;
  --color-primary: #000000;
  --color-secondary: #336666;
  --color-tertiary: #FF9966;
  --color-quaternary: #99CC99;
  --color-quinary: #996699;
  --color-senary: #FFCC99;
  --color-muted: #808080;
}
```

Dark overrides live in `[data-theme="dark"] { ... }`.

## Visual identity

- **Mood:** Creative developer portfolio — playful but literate
- **Structure:** Bento mosaic grid with one accent color per card
- **Contrast:** High-contrast black/white base; color reserved for structure and emphasis
- **Motion:** Smooth scroll (Lenis), theme circle reveal, subtle hover opacity shifts

## Best used for

Personal portfolios, developer blogs, interactive demo grids, resume pages, and any artifact that should feel like a **designed playground** rather than a corporate template.

## Applying this theme elsewhere

1. Load the three Google Fonts listed above.
2. Copy the `@theme` color and font tokens (plus dark overrides).
3. Use primary for text/borders, secondary–senary for structural accents, muted for de-emphasized copy.
4. Prefer `font-abril-fatface` for titles, `font-playfair-display` for editorial accents, Lato for body.
5. For card layouts, pair each accent border with a 20% tint of the same hue in light mode; go border-only in dark mode.
