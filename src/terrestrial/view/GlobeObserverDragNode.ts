/**
 * GlobeObserverDragNode.ts
 *
 * Pointer + keyboard interaction for the fixed-geography Earth globe, built on the
 * same split as the Celestial Sphere screen (background rotates, marker moves):
 *
 *   - Background disc → rotate the globe's camera (plain drag / arrow keys, plus
 *     Alt-drag to spin about the vertical axis). This is the shared
 *     {@link attachSkyCameraInteraction} used by the celestial sphere.
 *   - Observer marker (a small transparent target riding on the observer dot) →
 *     move the observer. Because the geography stands still (EarthGlobeNode
 *     `observerAnchored: false`), the marker can snap straight to the *absolute*
 *     unprojected pointer position and follow the cursor freely in both longitude
 *     and latitude — exactly like the celestial-sphere guide star.
 *
 * The marker sits on top of the background, so pressing it moves the observer while
 * pressing anywhere else rotates the globe. It is disabled (falls through to the
 * background) whenever the observer is on the far side of the globe.
 *
 * Assumes the geography is pinned at sidereal time 0 (as the Terrestrial screen
 * sets), so the observer's world right ascension equals its longitude.
 */

import { Multilink, type NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp } from "scenerystack/dot";
import { Circle, DragListener, KeyboardListener, Node } from "scenerystack/scenery";
import { LATITUDE_RANGE, LOCATION_STEP_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../../common/BasicCoordinatesAndSeasonsHotkeyData.js";
import { HOURS_PER_DAY, raDecToVector3, radiansToHours, radToDeg } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { attachSkyCameraInteraction } from "../../common/view/attachSkyCameraInteraction.js";
import { speakValueOnFocus } from "../../common/view/speakValueOnFocus.js";
import { StringManager } from "../../i18n/StringManager.js";

const DEGREES_PER_HOUR = 360 / HOURS_PER_DAY;

/** Radius (px) of the transparent grab target over the observer dot. */
const MARKER_GRAB_RADIUS = 12;

/** Positive modulo into [0, n). */
const mod = (value: number, n: number): number => ((value % n) + n) % n;

/** Wrap a longitude into [−180, 180). */
const wrapLongitude = (deg: number): number => mod(deg + 180, 360) - 180;

export class GlobeObserverDragNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: NumberProperty,
    longitudeProperty: NumberProperty,
    accessibleObjectResponseProperty?: TReadOnlyProperty<string>,
  ) {
    const a11y = StringManager.getInstance().getTerrestrialA11yStrings();

    // Background: the whole globe disc rotates the camera (plain drag / arrows / Alt-drag).
    const cameraTarget = new Circle(projection.radius, {
      center: projection.center,
      fill: "rgba(0,0,0,0)",
      cursor: "grab",
    });
    attachSkyCameraInteraction(cameraTarget, {
      projection,
      accessibleNameProperty: a11y.controls.globeOrientationStringProperty,
      accessibleHelpTextProperty: a11y.controls.globeOrientationHelpStringProperty,
    });

    // Marker: a transparent grab target that tracks the observer dot and moves the
    // observer. Sits above the background so pressing it moves the observer.
    const markerTarget = new Circle(MARKER_GRAB_RADIUS, {
      fill: "rgba(0,0,0,0)",
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: a11y.controls.globeObserverStringProperty,
      accessibleHelpText: a11y.controls.globeObserverHelpStringProperty,
    });

    super({ children: [cameraTarget, markerTarget] });

    // Keyboard should reach the observer before the globe-orientation control.
    this.pdomOrder = [markerTarget, cameraTarget];

    // Speak the observer's latitude/longitude to screen readers as a keyboard user
    // nudges the marker.
    if (accessibleObjectResponseProperty) {
      speakValueOnFocus(markerTarget, accessibleObjectResponseProperty);
    }

    // Keep the marker over the observer dot, and let the pointer fall through to the
    // background whenever the observer is on the far side (matching EarthGlobeNode's
    // front-hemisphere cull of the dot). Sidereal time is 0, so RA = longitude.
    Multilink.multilink([projection.viewMatrixProperty, latitudeProperty, longitudeProperty], (_m, lat, lon) => {
      const observerRaHours = lon / DEGREES_PER_HOUR;
      const { point, depth } = projection.projectWithDepth(raDecToVector3(observerRaHours, lat));
      markerTarget.center = point;
      markerTarget.pickable = depth >= 0;
    });

    // Marker drag → observer position. The geography is fixed, so the point under the
    // pointer never moves and the marker can follow the cursor absolutely; unproject
    // clamps off-disc points to the limb, so no null-check is needed.
    markerTarget.addInputListener(
      new DragListener({
        drag: (event) => {
          const v = projection.unproject(this.globalToParentPoint(event.pointer.point));
          longitudeProperty.value = wrapLongitude(radiansToHours(Math.atan2(v.y, v.x)) * DEGREES_PER_HOUR);
          latitudeProperty.value = LATITUDE_RANGE.constrainValue(radToDeg(Math.asin(clamp(v.z, -1, 1))));
        },
      }),
    );

    // Arrow keys nudge the observer's lat/long in 5° steps (left/right wrap).
    markerTarget.addInputListener(
      new KeyboardListener({
        keys: [...BasicCoordinatesAndSeasonsHotkeyData.ARROW_KEYS],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          if (keysPressed === "arrowLeft") {
            longitudeProperty.value = wrapLongitude(longitudeProperty.value - LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowRight") {
            longitudeProperty.value = wrapLongitude(longitudeProperty.value + LOCATION_STEP_DEGREES);
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
