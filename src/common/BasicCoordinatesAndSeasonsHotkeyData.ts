/**
 * BasicCoordinatesAndSeasonsHotkeyData.ts
 *
 * Single source of truth for the arrow-key bindings shared by the sim's
 * keyboard listeners:
 *   - ARROW_KEYS               — nudge a draggable marker (observer, star, Earth).
 *   - ROTATE_SKY_KEYS          — free-rotate the focused celestial sphere.
 *   - ROTATE_ABOUT_ZENITH_KEYS — rotate the sphere about the zenith only.
 *
 * Keeping the key arrays in one place lets every listener stay in lock-step.
 * The user-facing Keyboard Shortcuts dialog is built from scenerystack's
 * localized help sections (see each screen's *KeyboardHelpContent).
 */

const ARROW_KEYS = ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"] as const;
const ALT_ARROW_KEYS = ["alt+arrowLeft", "alt+arrowRight", "alt+arrowUp", "alt+arrowDown"] as const;

const BasicCoordinatesAndSeasonsHotkeyData = {
  /** Nudge a draggable marker (map/globe observer, sky-map star, orbiting Earth). */
  ARROW_KEYS,

  /** Free-rotate a focused celestial sphere. */
  ROTATE_SKY_KEYS: ARROW_KEYS,

  /** Rotate a focused celestial sphere about its zenith only (Alt + arrows). */
  ROTATE_ABOUT_ZENITH_KEYS: ALT_ARROW_KEYS,
} as const;

export default BasicCoordinatesAndSeasonsHotkeyData;
