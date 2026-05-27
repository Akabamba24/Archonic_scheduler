# Archonic Scheduler Design Notes

## Register

Product UI. Design serves booking, configuration, and dispatch workflows.

## Color Strategy

Restrained product palette:

- Deep green for primary actions and active states.
- Warm amber for demo and attention states.
- Tinted neutral surfaces instead of pure white or pure gray.
- Semantic status colors only where they communicate state.

## Typography

Use one system sans-serif stack for speed, legibility, and familiar product feel. Keep headings compact and avoid display-font theatrics.

## Shape

Use an 8px radius for panels, controls, and cards. Pills are reserved for compact status chips only.

## Interaction

- Hover: subtle border and elevation shift.
- Focus: visible outline with the primary green.
- Active: small press feedback.
- Motion should be 150-250ms and tied to state feedback only.

## Layout

Predictable two-pane product layout:

- Customer booking side: input-first, low-friction.
- Company dashboard side: metrics, configuration, dispatch queue, selected work order.
- Route views isolate booking-only and dashboard-only contexts.
