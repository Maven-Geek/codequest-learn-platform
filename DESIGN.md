---
name: CodeQuest
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dae0'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4fa'
  surface-container: '#ebeef4'
  surface-container-high: '#e5e8ef'
  surface-container-highest: '#e0e2e9'
  on-surface: '#181c21'
  on-surface-variant: '#404751'
  inverse-surface: '#2d3136'
  inverse-on-surface: '#eef1f7'
  outline: '#707882'
  outline-variant: '#bfc7d2'
  surface-tint: '#00639c'
  primary: '#00639c'
  on-primary: '#ffffff'
  primary-container: '#4dabf7'
  on-primary-container: '#003d64'
  inverse-primary: '#97cbff'
  secondary: '#725c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed33a'
  on-secondary-container: '#715b00'
  tertiary: '#805600'
  on-tertiary: '#ffffff'
  tertiary-container: '#db980f'
  on-tertiary-container: '#513500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cee5ff'
  primary-fixed-dim: '#97cbff'
  on-primary-fixed: '#001d33'
  on-primary-fixed-variant: '#004a77'
  secondary-fixed: '#ffe082'
  secondary-fixed-dim: '#ecc228'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#564500'
  tertiary-fixed: '#ffddaf'
  tertiary-fixed-dim: '#ffba42'
  on-tertiary-fixed: '#281800'
  on-tertiary-fixed-variant: '#614000'
  background: '#f7f9ff'
  on-background: '#181c21'
  surface-variant: '#e0e2e9'
typography:
  display-lg:
    fontFamily: Quicksand
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  code-block:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1200px
---

## Brand & Style
The design system is engineered to transform the intimidating world of logic into a digital playground. It targets children aged 6-12, prioritizing an emotional response of curiosity, confidence, and "magical" discovery. 

The visual style is a hybrid of **Minimalism** and **Tactile Play**. It utilizes high-contrast primary colors against clean, expansive white space to reduce cognitive load, while employing "squishy" physical metaphors for interactive elements. This approach ensures the interface feels like a toy rather than a tool, encouraging exploration without the fear of making mistakes.

## Colors
The palette is built on "Energetic Primaries." These colors are intentionally saturated to stand out clearly against the off-white background, aiding in visual hierarchy and functional grouping.

- **Sky Blue (Primary):** Used for main actions and navigation.
- **Sunny Yellow (Secondary):** Used for highlights, achievements, and "Eureka" moments.
- **Grass Green (Success):** Used for correct code execution and progress indicators.
- **Soft Orange (Accent):** Used for warning states or secondary interactive elements to provide warmth.
- **Neutral Tones:** The background uses a soft off-white to prevent eye strain, while pure white is reserved for interactive cards to make them "pop."

## Typography
The typography strategy prioritizes approachability and legibility. 

**Quicksand** is used for all headings. Its rounded terminals mirror the "bouncy" nature of the brand. For body text, **Be Vietnam Pro** offers a contemporary, clean look with high x-heights, making it easy for young readers to parse instructions. 

- Use **Display** sizes for celebratory screens and level starts.
- Use **Headline** sizes for section titles and card headers.
- Use **Body-lg** for story-based content to ensure it feels inviting.
- **Label-bold** should be used for button text and UI micro-copy.

## Layout & Spacing
This design system utilizes a **Fluid Grid** with generous internal padding to create a sense of openness. 

- **Desktop:** 12-column grid with 24px gutters. Content is centered in a max-width container to prevent overwhelming line lengths.
- **Tablet:** 8-column grid with 20px gutters. 
- **Mobile:** 4-column grid with 16px margins. 

Spacing follows an 8px base unit. Interaction targets (buttons/links) should never be smaller than 48px to accommodate developing motor skills. Use vertical "rhythm" spacing of 32px or 48px between major content sections to keep the layout breathable.

## Elevation & Depth
Hierarchy is established using **Ambient Shadows** and **Tonal Layers**. This system avoids harsh lines in favor of depth that suggests "touchability."

1. **Surface Level (0):** The `#f8f9fa` background.
2. **Card Level (1):** Pure white `#ffffff` with a soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.05)).
3. **Interactive Level (2):** Buttons and active blocks have a slightly deeper shadow and a 2px "inset" bottom border to mimic a physical button that can be pressed.
4. **Floating Level (3):** Modals and tooltips use a high-spread shadow (0px 12px 32px rgba(0,0,0,0.1)) to appear as if they are floating closer to the user.

## Shapes
The shape language is strictly **Pill-shaped** and extremely rounded. There are no sharp corners in this design system.

- **Small elements (Tags/Chips):** Full pill radius.
- **Medium elements (Buttons/Inputs):** 1rem (16px) radius.
- **Large elements (Cards/Containers):** 2rem (32px) radius.

This "bubble" aesthetic reduces the perceived complexity of the software and makes the UI feel friendly and safe.

## Components

### Buttons
Primary buttons are large, pill-shaped, and use the Sky Blue palette. They should feature a "3D press" effect: a darker bottom border (2px) that disappears when the button is active/pressed, simulating a physical click.

### Instruction Blocks
Reminiscent of Lego or Scratch, these are horizontal containers with a "tab" on top and a "socket" on the bottom to visually communicate how code connects. Each category of code (logic, loops, variables) should use a different primary/secondary color.

### Cards
Cards are the primary container for quests and lessons. They use a pure white surface, a 32px corner radius, and a subtle external shadow. Hovering over a card should cause it to lift (move up 4px) and the shadow to deepen.

### Input Fields
Inputs are oversized with a 16px corner radius. The border should be a thick 2px light gray, turning Sky Blue when focused. Use large, friendly icons within inputs to provide visual cues for the expected data (e.g., a magnifying glass for search).

### Progress Bars
Progress bars should be thick (12px+) and use the Grass Green color. The "track" should be a semi-transparent version of the green to show the path ahead. Include a small "star" or "badge" icon at the end of the bar as a visual reward.