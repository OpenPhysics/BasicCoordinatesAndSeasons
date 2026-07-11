/**
 * CelestialKeyboardHelpContent.ts
 *
 * Keyboard Shortcuts dialog for the Celestial Coordinates screen. The star on
 * the flat sky map and the guide star on the celestial sphere are keyboard-
 * draggable (arrow keys nudge right ascension/declination), and the sphere
 * itself rotates with the arrow keys when focused — both covered by the
 * "move draggable items" section.
 */

import {
  BasicActionsKeyboardHelpSection,
  MoveDraggableItemsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class CelestialKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new MoveDraggableItemsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
