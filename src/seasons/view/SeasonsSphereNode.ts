/**
 * SeasonsSphereNode.ts
 *
 * The celestial sphere for the Seasons screen: the shared CelestialSphereNode
 * (celestial equator + ecliptic, both toggleable) with the Sun marker riding the
 * ecliptic. A thin composition — the caller supplies the projection (and wires
 * camera rotation).
 */

import { Node } from "scenerystack/scenery";
import type { SkyProjection } from "../../common/SkyProjection.js";
import { CelestialSphereNode } from "../../common/view/CelestialSphereNode.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";
import { SunMarkerNode } from "./SunMarkerNode.js";

export class SeasonsSphereNode extends Node {
  public constructor(projection: SkyProjection, model: SeasonsModel) {
    const sphere = new CelestialSphereNode(projection, {
      celestialEquatorVisibleProperty: model.celestialEquatorVisibleProperty,
      eclipticVisibleProperty: model.eclipticVisibleProperty,
    });
    const sunMarker = new SunMarkerNode(projection, model.sunRightAscensionProperty, model.sunDeclinationProperty);

    super({ children: [sphere.backLayer, sphere.frontLayer, sunMarker] });
  }
}
