# Keyboard Input Display

## Overview

This feature displays the last key pressed by the user in the bottom-right corner of the app. It is implemented in a type-safe, concise, and idiomatic way using Zustand, immer, and Zod.

## Implementation

- **Domain Model:**
  - `src/lib/domain/keyboard.ts` defines a Zod schema for keyboard input.
- **State Management:**
  - `src/lib/store/keyboardStore.ts` uses Zustand and immer to store the last key pressed.
- **UI:**
  - `src/app/components/KeyboardDisplay.tsx` displays the last key pressed.
- **Event Handling:**
  - `src/app/layout.tsx` attaches a global keyboard event listener and updates the store.

## Extending

- To display more information (modifiers, key codes), extend the Zod schema and update the store/component accordingly.
- To style differently, edit `KeyboardDisplay.tsx`.
