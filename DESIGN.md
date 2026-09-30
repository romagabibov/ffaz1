# AZ/FSHN — Haute Couture & Editorial Design System (DESIGN.md)
> Based on the VoltAgent `awesome-design-md` standard for AI coding agents and luxury digital design systems.

---

## 1. Visual Mood & Brand Identity
* **Aesthetic**: Brutalist Luxury & Editorial Haute Couture.
* **Atmosphere**: Ultra-crisp, high-contrast monochrome with deep crimson/burgundy accents (`#7A0000` / `#9E1414`), structured serif elegance, and Swiss brutalist typography.
* **Inspirations**: Saint Laurent, Vogue Runway, Balenciaga Digital, Celine, and Linear precision.
* **Core Philosophy**: Zero generic AI clichés, zero rounded bubble cards, strictly mathematical spacing, crisp 1.5px/2px keylines, pure typography hierarchy, and deliberate micro-interactions.

---

## 2. Color Palette & Design Tokens

### Light Theme (Default / Editorial Print)
| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| `--brand-light` | `#FFFFFF` | Primary canvas & modal surfaces |
| `--brand-muted` | `#F7F5F3` | Subtle greige card backgrounds & table stripes |
| `--brand-dark` | `#000000` | High-contrast typography, primary buttons, borders |
| `--brand-accent` | `#7A0000` | Crimson focal points, active states, key tags |
| `--brand-greige` | `#D2C8BE` | Editorial dividers & muted secondary borders |
| `--brand-espresso` | `#574944` | Rich subtitle copy and muted timestamps |

### Dark Theme (Runway Noir)
| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| `--brand-light` | `#0D0D0D` | Dark runway background |
| `--brand-muted` | `#1A1715` | Elevated dark surfaces & card panels |
| `--brand-dark` | `#F5F2EE` | High-contrast white typography & light borders |
| `--brand-accent` | `#9E1414` | High-visibility crimson glow & CTA highlights |
| `--brand-greige` | `#4A423E` | Subdued borders & separators |

---

## 3. Typography Architecture

### Font Families
* **Display / Headings**: `"Syne"`, `"Plus Jakarta Sans"`, sans-serif (Weights: 700, 800, 900, Uppercase, Tight tracking `-0.03em`).
* **Editorial Serif**: `"Italiana"`, `"Playfair Display"`, Georgia, serif (Used for quotes, fashion titles, issue tags).
* **Body Text**: `"Plus Jakarta Sans"`, Helvetica Neue, sans-serif (Weights: 400, 500, 600, Line height 1.6).
* **Metadata & Badges**: `"Space Mono"`, monospace (Weights: 700, Uppercase, Tracking `0.15em`).

### Mathematical Scale & Hierarchy
* **Display H1**: `text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-[0.95]`
* **Editorial H2**: `text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight`
* **Section Title H3**: `text-lg sm:text-xl font-bold uppercase tracking-wide`
* **Body Lead**: `text-base sm:text-lg font-normal leading-relaxed`
* **Mono Badge / Tag**: `text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest`

---

## 4. Layout & Spacing Rules

* **Container Max Width**: `max-w-7xl mx-auto px-4 sm:px-8 md:px-12`.
* **Outer vs Inner Padding Math**: Outer container padding MUST always be $\ge$ inner component spacing.
* **Borders & Shapes**:
  * Default card borders: `1.5px solid var(--brand-dark)` or `2px solid var(--brand-dark)`.
  * Sharp corners or minimal mathematical radius (`rounded-none` or `rounded-xs`).
  * High-fashion flat silhouettes: clean, crisp keylines with no hard drop shadows.
* **Dividers**: Crisp solid keylines `border-brand-dark` or `border-brand-dark/15`.

---

## 5. Component Patterns

### Buttons & Interactive Controls
1. **Primary Button (`.brand-button`)**:
   * Solid black background, white text, 1.5px border, uppercase mono tracking.
   * Hover: Crimson background (`#7A0000`), smooth translate `-2px`, box-shadow `0 6px 20px rgba(122,0,0,0.25)`.
   * Active: Translate `0px` scale `0.98`.
2. **Outline Button (`.brand-button-outline`)**:
   * Transparent background, black border, uppercase mono tracking.
   * Hover: Inverted black background, white text.
3. **Accent Button (`.brand-button-red`)**:
   * Crimson background, white text, uppercase bold.

### Editorial Cards (`.card-brutal`)
* Clean white canvas with crisp dark borders.
* Subtle image zoom on hover (`scale-105 duration-500`).
* Crisp border accent transition on hover (`hover:border-brand-accent`).

### Marquee Bar (`.marquee-container`)
* Continuous horizontal ticker with uppercase bold announcements and runway schedule updates.

---

## 6. Micro-Interactions & Animation
* **Transitions**: Use Cubic-Bezier timing `cubic-bezier(0.16, 1, 0.3, 1)` for snappy, physical responsiveness.
* **Page & Modal Transitions**: Framer Motion `opacity` + subtle translation `y: 10` (no disorienting bounces).
* **Interactive Cursors**: Precision dot cursor with magnetic hover highlights on desktop pointers.

---

## 7. Anti-Patterns (Forbidden)
* ❌ No neon gradients or purple/cyan tech-slop.
* ❌ No excessive pill badges or round soft bubbly cards (`rounded-3xl` on cards is forbidden).
* ❌ No blurry low-contrast gray text on colored backgrounds.
* ❌ No inconsistent button sizes or wrapping pill labels.
