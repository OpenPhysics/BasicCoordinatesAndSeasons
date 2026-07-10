/**
 * GlobeObserverDragNode.ts
 *
 * A transparent drag target laid over the Earth globe. Dragging it moves the
 * observer: the pointer is unprojected to a unit vector on the sphere, its
 * declination becomes the latitude, and its right ascension is converted back to
 * a geographic longitude (accounting for the globe's sidereal-time anchoring, so
 * dropping the marker on a coastline sets that coastline's longitude). Points on
 * the far hemisphere are ignored.
 */

import type { NumberProperty } from "scenerystack/axon";
import { clamp, type Vector2 } from "scenerystack/dot";
import { Circle, DragListener, Node } from "scenerystack/scenery";
import { HOURS_PER_DAY, normalizeHours, radiansToHours, radToDeg } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";

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

    const hitTarget = new Circle(projection.radius, {
      center: projection.center,
      fill: "rgba(0,0,0,0)",
      cursor: "grab",
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

    hitTarget.addInputListener(
      new DragListener({
        drag: (event) => moveObserverTo(event.pointer.point),
      }),
    );
  }
}
