/**
 * TerrestrialKeyboardHelpContent.ts
 *
 * Keyboard Shortcuts dialog for the Terrestrial Coordinates screen. The
 * observer marker on the flat map and on the globe is keyboard-draggable
 * (arrow keys nudge latitude/longitude), so a "move draggable items" section
 * documents that alongside the basic actions.
 */

import {
  BasicActionsKeyboardHelpSection,
  MoveDraggableItemsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class TerrestrialKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new MoveDraggableItemsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
