# Keyboard Input Display

## Overview

When a user presses a key, a large green symbol (from a custom set of weird symbols) appears in the bottom-right corner of the app. This symbol is mapped from the key pressed and is not the literal key. Only remote users' symbols are shown above their eyes in the 3D scene.

## Implementation

- **Domain Model:**
  - `src/lib/domain/keyboard.ts` defines a Zod schema for keyboard input.
- **State Management:**
  - `src/lib/store/keyboardStore.ts` uses Zustand and immer to store the last key pressed and remote key events.
- **UI:**
  - `src/app/components/KeyboardDisplay.tsx` displays the mapped symbol in green in the bottom-right.
  - `src/app/components/RemoteEyes.tsx` displays remote users' symbols above their eyes in the 3D scene.
- **Event Handling:**
  - `src/app/page.tsx` attaches a global keyboard event listener and updates the store.
  - Keyboard events are broadcast to all players and received in real time.

## Extending

- To change the symbol set, edit the `SYMBOLS` array in `KeyboardDisplay.tsx` and `RemoteEyes.tsx`.
- To style differently, edit the respective components.
