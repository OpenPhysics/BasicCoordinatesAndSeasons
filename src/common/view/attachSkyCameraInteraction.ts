/**
 * attachSkyCameraInteraction.ts
 *
 * Pointer + keyboard camera control for a sky/globe projection region:
 *   - plain drag / arrow keys   → free camera rotate
 *   - Alt-drag / Alt+arrows     → rotate about zenith only
 *
 * Projection-only: unlike the RotatingSky original this has no SkyModel
 * dependency — the sidereal-time drag mode and the shift-click "add star" mode
 * are not needed here, so they are dropped.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Vector2 } from "scenerystack/dot";
import { DragListener, KeyboardListener, type Node } from "scenerystack/scenery";
import BasicCoordinatesAndSeasonsHotkeyData from "../BasicCoordinatesAndSeasonsHotkeyData.js";
import type { SkyProjection } from "../SkyProjection.js";

/** Radians of camera rotation per pixel of pointer movement. */
export const SKY_ROTATE_SPEED = 0.01;

/** Radians of camera rotation per keyboard arrow press. */
const KEYBOARD_ROTATE_STEP = 0.1;

export type AttachSkyCameraInteractionOptions = {
  projection: SkyProjection;
  /** Localized accessible name for the focusable sky region. */
  accessibleNameProperty: TReadOnlyProperty<string>;
  /** Localized help text describing the arrow / Alt drag modes. */
  accessibleHelpTextProperty?: TReadOnlyProperty<string>;
};

/**
 * Makes `target` a focusable sky-camera control with pointer drag and keyboard
 * equivalents. Returns `target` for chaining.
 */
export const attachSkyCameraInteraction = <T extends Node>(
  target: T,
  options: AttachSkyCameraInteractionOptions,
): T => {
  const { projection, accessibleNameProperty, accessibleHelpTextProperty } = options;

  target.tagName = "div";
  target.focusable = true;
  target.accessibleName = accessibleNameProperty;
  if (accessibleHelpTextProperty) {
    target.accessibleHelpText = accessibleHelpTextProperty;
  }

  let lastPoint: Vector2 | null = null;
  let dragMode: "simple" | "zenith" = "simple";

  target.addInputListener(
    new DragListener({
      start: (event) => {
        const domEvent = event.domEvent as { altKey?: boolean } | null;
        lastPoint = event.pointer.point.copy();
        dragMode = domEvent?.altKey ? "zenith" : "simple";
      },
      drag: (event) => {
        if (!lastPoint) {
          return;
        }
        const p = event.pointer.point;
        const dx = p.x - lastPoint.x;
        const dy = lastPoint.y - p.y;
        if (dragMode === "zenith") {
          projection.rotateAboutZenith(dx * SKY_ROTATE_SPEED);
        } else {
          projection.rotateBy(dx * SKY_ROTATE_SPEED, dy * SKY_ROTATE_SPEED);
        }
        lastPoint = p.copy();
      },
      end: () => {
        lastPoint = null;
      },
    }),
  );

  target.addInputListener(
    new KeyboardListener({
      keys: [
        ...BasicCoordinatesAndSeasonsHotkeyData.ROTATE_SKY_KEYS,
        ...BasicCoordinatesAndSeasonsHotkeyData.ROTATE_ABOUT_ZENITH_KEYS,
      ],
      fireOnHold: true,
      fire: (_event, keysPressed) => {
        if (
          keysPressed === "alt+arrowLeft" ||
          keysPressed === "alt+arrowRight" ||
          keysPressed === "alt+arrowUp" ||
          keysPressed === "alt+arrowDown"
        ) {
          const sign = keysPressed === "alt+arrowLeft" || keysPressed === "alt+arrowDown" ? -1 : 1;
          projection.rotateAboutZenith(sign * KEYBOARD_ROTATE_STEP);
          return;
        }

        // Plain arrows: free camera rotate (left/right = azimuth, up/down = elevation).
        if (keysPressed === "arrowLeft") {
          projection.rotateBy(-KEYBOARD_ROTATE_STEP, 0);
        } else if (keysPressed === "arrowRight") {
          projection.rotateBy(KEYBOARD_ROTATE_STEP, 0);
        } else if (keysPressed === "arrowUp") {
          projection.rotateBy(0, KEYBOARD_ROTATE_STEP);
        } else if (keysPressed === "arrowDown") {
          projection.rotateBy(0, -KEYBOARD_ROTATE_STEP);
        }
      },
    }),
  );

  return target;
};
