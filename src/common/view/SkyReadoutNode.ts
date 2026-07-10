/**
 * SkyReadoutNode.ts
 *
 * Editable RA/Dec coordinate fields for a point on the sky, styled like the
 * original NAAP lab (two inputs beneath a sky view). Unlike the RotatingSky
 * original this takes plain writable Properties — this sim has no SkyModel and
 * a single, always-present point — so the fields are always enabled and typing
 * a value writes straight back to the bound Property.
 */

import type { PhetioProperty } from "scenerystack/axon";
import { Multilink } from "scenerystack/axon";
import { VBox } from "scenerystack/scenery";
import { StringManager } from "../../i18n/StringManager.js";
import { normalizeHours } from "../SkyCoordinates.js";
import { EditableNumberFieldNode } from "./EditableNumberFieldNode.js";

export type SkyReadoutNodeOptions = {
  /** Right ascension of the point, in hours [0, 24). Type-in wraps into range. */
  raProperty: PhetioProperty<number>;
  /** Declination of the point, in degrees [−90, 90]. Type-in clamps into range. */
  decProperty: PhetioProperty<number>;
};

const COORDINATE_DECIMAL_PLACES = 1;

export class SkyReadoutNode extends VBox {
  public constructor(options: SkyReadoutNodeOptions) {
    const controls = StringManager.getInstance().getControls();
    const { raProperty, decProperty } = options;

    const raField = new EditableNumberFieldNode({
      labelProperty: controls.rightAscensionLongStringProperty,
      unit: " h",
      decimalPlaces: COORDINATE_DECIMAL_PLACES,
      onCommit: (value) => {
        raProperty.value = normalizeHours(value);
      },
    });

    const decField = new EditableNumberFieldNode({
      labelProperty: controls.declinationLongStringProperty,
      unit: " °",
      decimalPlaces: COORDINATE_DECIMAL_PLACES,
      onCommit: (value) => {
        decProperty.value = Math.max(-90, Math.min(90, value));
      },
    });

    super({ align: "left", spacing: 2, children: [raField, decField] });

    raField.setFieldEnabled(true);
    decField.setFieldEnabled(true);

    Multilink.multilink([raProperty, decProperty], (ra, dec) => {
      raField.setDisplayValue(ra);
      decField.setDisplayValue(dec);
    });
  }
}
