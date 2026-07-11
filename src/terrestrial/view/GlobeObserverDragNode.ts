/**
 * GlobeObserverDragNode.ts
 *
 * A transparent drag target laid over the Earth globe with two pointer modes,
 * mirroring the NAAP longLatDemo `onPressFunc`:
 *   - plain drag                → move the observer (unproject the pointer to
 *                                 lat/long; the far hemisphere is ignored)
 *   - Shift-drag                → rotate the globe itself (its camera azimuth &
 *                                 elevation), the NAAP "simple drag" spin
 *
 * Arrow keys nudge the observer's latitude/longitude in 5° steps, matching the
 * flat map. The node is focusable so keyboard users reach the same controls.
 */

import type { NumberProperty } from "scenerystack/axon";
import { clamp, type Vector2 } from "scenerystack/dot";
import { Circle, DragListener, KeyboardListener, Node } from "scenerystack/scenery";
import { LATITUDE_RANGE, LOCATION_STEP_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../../common/BasicCoordinatesAndSeasonsHotkeyData.js";
import { HOURS_PER_DAY, normalizeHours, radiansToHours, radToDeg } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { StringManager } from "../../i18n/StringManager.js";

/** Radians of globe rotation per pixel of Shift-drag movement. */
const GLOBE_ROTATE_SPEED = 0.01;

/** Positive modulo into [0, n). */
const mod = (value: number, n: number): number => ((value % n) + n) % n;

export type GlobeObserverDragNodeOptions = {
  /** Sidereal time (hours) the globe is drawn at. The Terrestrial globe uses 0. */
  siderealTimeHours?: number;
};

export class GlobeObserverDragNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: NumberProperty,
    longitudeProperty: NumberProperty,
    options?: GlobeObserverDragNodeOptions,
  ) {
    const siderealTimeHours = options?.siderealTimeHours ?? 0;
    const a11y = StringManager.getInstance().getTerrestrialA11yStrings();

    const hitTarget = new Circle(projection.radius, {
      center: projection.center,
      fill: "rgba(0,0,0,0)",
      cursor: "grab",
      tagName: "div",
      focusable: true,
      accessibleName: a11y.controls.globeObserverStringProperty,
      accessibleHelpText: a11y.controls.globeObserverHelpStringProperty,
    });

    super({ children: [hitTarget] });

    const moveObserverTo = (globalPoint: Vector2): void => {
      const parentPoint = this.globalToParentPoint(globalPoint);
      // Ignore drags that fall outside the projected disc (they clamp to the limb).
      if (parentPoint.distance(projection.center) > projection.radius) {
        return;
      }
      const v = projection.unproject(parentPoint);
      const latitudeDeg = radToDeg(Math.asin(clamp(v.z, -1, 1)));
      const raHours = normalizeHours(radiansToHours(Math.atan2(v.y, v.x)));

      // Geography is anchored at GST = siderealTime − longitude/15 (hours). A point
      // at right ascension `raHours` therefore has geographic longitude
      // L = (raHours − GST) · 15°, which we normalize into [−180, 180).
      const gstHours = siderealTimeHours - longitudeProperty.value / (360 / HOURS_PER_DAY);
      const rawLongitude = (raHours - gstHours) * (360 / HOURS_PER_DAY);
      const longitudeDeg = ((((rawLongitude + 180) % 360) + 360) % 360) - 180;

      latitudeProperty.value = clamp(latitudeDeg, latitudeProperty.range.min, latitudeProperty.range.max);
      longitudeProperty.value = clamp(longitudeDeg, longitudeProperty.range.min, longitudeProperty.range.max);
    };

    // Pointer mode is locked at press time (NAAP checks the Shift key once in
    // onPressFunc), so releasing Shift mid-drag does not flip the gesture.
    let rotating = false;
    let lastPoint: Vector2 | null = null;

    hitTarget.addInputListener(
      new DragListener({
        start: (event) => {
          const domEvent = event.domEvent as { shiftKey?: boolean } | null;
          rotating = Boolean(domEvent?.shiftKey);
          lastPoint = event.pointer.point.copy();
          if (!rotating) {
            moveObserverTo(event.pointer.point);
          }
        },
        drag: (event) => {
          if (rotating) {
            if (!lastPoint) {
              lastPoint = event.pointer.point.copy();
              return;
            }
            const p = event.pointer.point;
            const dx = p.x - lastPoint.x;
            const dy = lastPoint.y - p.y; // drag up → tilt up
            projection.rotateBy(dx * GLOBE_ROTATE_SPEED, dy * GLOBE_ROTATE_SPEED);
            lastPoint = p.copy();
          } else {
            moveObserverTo(event.pointer.point);
          }
        },
        end: () => {
          rotating = false;
          lastPoint = null;
        },
      }),
    );

    // Arrow keys nudge the observer's lat/long in 5° steps (left/right wrap).
    hitTarget.addInputListener(
      new KeyboardListener({
        keys: [...BasicCoordinatesAndSeasonsHotkeyData.ARROW_KEYS],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          if (keysPressed === "arrowLeft") {
            longitudeProperty.value = mod(longitudeProperty.value - LOCATION_STEP_DEGREES + 180, 360) - 180;
          } else if (keysPressed === "arrowRight") {
            longitudeProperty.value = mod(longitudeProperty.value + LOCATION_STEP_DEGREES + 180, 360) - 180;
          } else if (keysPressed === "arrowUp") {
            latitudeProperty.value = LATITUDE_RANGE.constrainValue(latitudeProperty.value + LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowDown") {
            latitudeProperty.value = LATITUDE_RANGE.constrainValue(latitudeProperty.value - LOCATION_STEP_DEGREES);
          }
        },
      }),
    );
  }
}
