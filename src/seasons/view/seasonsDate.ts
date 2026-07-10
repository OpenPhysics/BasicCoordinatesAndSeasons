/**
 * seasonsDate.ts
 *
 * Builds a localized "month day" (or locale-specific order) date StringProperty
 * from the SeasonsModel's derived month/day, using the `controls.months` names
 * and `controls.datePattern`. Shared by the panel readout and the a11y summary.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

export function createSeasonsDateProperty(model: SeasonsModel): TReadOnlyProperty<string> {
  const controls = StringManager.getInstance().getControls();
  const months = controls.months;
  const monthProps = [
    months.januaryStringProperty,
    months.februaryStringProperty,
    months.marchStringProperty,
    months.aprilStringProperty,
    months.mayStringProperty,
    months.juneStringProperty,
    months.julyStringProperty,
    months.augustStringProperty,
    months.septemberStringProperty,
    months.octoberStringProperty,
    months.novemberStringProperty,
    months.decemberStringProperty,
  ];

  return DerivedProperty.deriveAny([model.monthDayProperty, controls.datePatternStringProperty, ...monthProps], () => {
    const monthDay = model.monthDayProperty.value;
    const monthName = monthProps[monthDay.monthIndex]?.value ?? "";
    return controls.datePatternStringProperty.value
      .replace("{{month}}", monthName)
      .replace("{{day}}", String(monthDay.dayOfMonth));
  });
}
