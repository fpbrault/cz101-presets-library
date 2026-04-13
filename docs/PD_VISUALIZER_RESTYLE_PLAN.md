# Phase Distortion Visualizer — CZ-101 Hardware Restyle Plan

## Goal

Restyle `src/components/PhaseDistortionVisualizer.tsx` from its current
"retro-cyber / synthwave web UI" look to an authentic **Casio CZ-101
hardware panel** aesthetic.

**Explicitly excluded:** wood end-caps / wood panels. The CZ-101 does not have them.

---

## Reference: CZ-101 Visual Identity

| Attribute | Value |
|-----------|-------|
| Body color | Dark charcoal (`#222223`) |
| Panel surface | Flat dark plastic (`#2c2c2e`) |
| Inset/recessed | `#181818` |
| Accent color | Orange (`#e87722`) |
| Label text | Cream (`#c8bfab`) |
| Muted label | `#7a7060` |
| LCD display bg | `#051005` |
| LCD trace / fg | `#3dff3d` |
| Panel border | `#3a3a3c` |
| Page background | `#1a1a1a` |

No wood end-caps. No neon rainbow / synthwave glow palette.

---

## Typography

- Section labels: `font-mono uppercase tracking-[0.3em] text-[#7a7060]`
- LCD readouts: `font-mono text-[#3dff3d]`
- Branding: "CASIO CZ-101" orange mono, "PHASE DISTORTION LAB" cream mono

---

## Implementation Steps

### Step 1 — Plan document (this file)
Write `docs/PD_VISUALIZER_RESTYLE_PLAN.md`
→ commit: `docs: add CZ-101 restyle plan for PhaseDistortionVisualizer`

### Step 2 — Page background + sidebar panel + branding header
- Outer wrapper: `bg-[#1a1a1a]`, remove pink/cyan radial gradients
- Sidebar Card: `bg-[#222223] border-[#3a3a3c] rounded-sm`
- Header: "CASIO CZ-101" in orange mono, "PHASE DISTORTION LAB" in cream
→ commit: `style: restyle page background and sidebar panel`

### Step 3 — Oscilloscope / scope section
- Scope wrapper: `bg-[#051005] border-[#3a3a3c]`
- CSS scanline overlay: `repeating-linear-gradient` dark stripes
- Hz / CH1 labels: `text-[#3dff3d] font-mono`
- Scope ControlKnob color: uniform `#e87722`
- Canvas `useEffect` code: update grid color to `rgba(0,120,0,0.25)`, center line `rgba(0,180,0,0.5)`, trace `#3dff3d`
→ commit: `style: restyle oscilloscope panel with CRT phosphor display`

### Step 4 — Collapsible section titles + sidebar section backgrounds
- All section label text → `text-[#7a7060] font-mono uppercase tracking-[0.3em]`
- Collapse/Card borders → `border-[#3a3a3c]`
- Background of collapsible cards → `bg-[#222223]`
- Inset content backgrounds → `bg-[#181818]`
→ commit: `style: restyle sidebar section headers to engraved hardware label style`

### Step 5 — All buttons, selects, and inputs
- Active/selected buttons: `bg-[#e87722] text-[#111111] border-[#e87722] rounded-sm` (solid orange fill — LED button style)
- Inactive buttons: `bg-[#2c2c2e] text-[#c8bfab] border-[#3a3a3c] rounded-sm`
- Remove all `btn-primary` (blue) — replace with orange inline classes
- Selects: `bg-[#181818] border-[#3a3a3c] text-[#c8bfab] font-mono`
- Text inputs: same as selects
→ commit: `style: restyle all buttons, selects, and inputs to CZ-101 hardware look`

### Step 6 — Main area panels
- All main `Card variant="panel"` → `bg-[#222223] border-[#3a3a3c] rounded-sm`
- Section labels in main area → orange mono uppercase
- Phase Lines tabs: orange active, dark inactive
→ commit: `style: restyle main content panels (line select, FX rack, phase lines)`

### Step 7 — Lint + build verification
- `bun run lint:fix`
- `bun run build`
→ commit any lint fixes: `style: fix lint issues from CZ-101 restyle`

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/PhaseDistortionVisualizer.tsx` | className + canvas color updates |

## Non-Goals

- No wood end-caps / wood panel
- No neon rainbow / synthwave palette  
- No font imports
- No logic/audio/state changes

## Checklist

- [ ] Outer wrapper background → `#1a1a1a`
- [ ] Sidebar card → `#222223` flat
- [ ] Header branding → orange mono + cream
- [ ] Scope panel → LCD bg, scanline overlay, orange knobs
- [ ] Section titles → engraved cream-dim mono
- [ ] Buttons → orange solid fill active / dark inactive
- [ ] Selects / inputs → dark inset, cream text
- [ ] Main panels → flat charcoal panels
- [ ] Canvas drawing code updated
- [ ] `bun run lint` passes
- [ ] `bun run build` passes
