/**
 * MonthSelectorNode.ts
 *
 * A horizontal strip of the twelve month abbreviations (Jan … Dec). Clicking a
 * month jumps the Sun to the first of that month (setting λ☉ via the day-of-year
 * conversion); the current month is highlighted and marked with a small pointer,
 * following the NAAP original's date scrubber.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { FireListener, type Font, HBox, Line, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { eclipticLongitudeForDayOfYear, firstDayOfYearForMonth } from "../../common/SunPosition.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

const MONTH_SPACING = 10;

export class MonthSelectorNode extends Node {
  public constructor(model: SeasonsModel) {
    const months = StringManager.getInstance().getControls().months;
    const monthProps: TReadOnlyProperty<string>[] = [
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

    const font: Font = new PhetFont(CONTROL_FONT_SIZE);
    const textColor = BasicCoordinatesAndSeasonsColors.textColorProperty;
    const highlightColor = BasicCoordinatesAndSeasonsColors.observerColorProperty;

    const labels: Text[] = monthProps.map((prop, monthIndex) => {
      const abbrevProperty = new DerivedProperty([prop], (name) => name.substring(0, 3));
      const label = new Text(abbrevProperty, { font, fill: textColor, cursor: "pointer" });
      label.addInputListener(
        new FireListener({
          fire: () => {
            model.sunEclipticLongitudeProperty.value = eclipticLongitudeForDayOfYear(
              firstDayOfYearForMonth(monthIndex),
            );
          },
        }),
      );
      return label;
    });

    // Thin dividers between months (and at both ends), like the NAAP strip.
    const makeDivider = (): Line =>
      new Line(0, 0, 0, CONTROL_FONT_SIZE + 4, {
        stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
        lineWidth: 1,
      });
    const rowChildren: Node[] = [makeDivider()];
    for (const label of labels) {
      rowChildren.push(label, makeDivider());
    }
    const row = new HBox({ spacing: MONTH_SPACING, align: "center", children: rowChildren });

    // A small triangle that points down at the current month.
    const caret = new Path(new Shape().moveTo(-5, 0).lineTo(5, 0).lineTo(0, 7).close(), { fill: highlightColor });

    super({ children: [caret, row] });
    row.top = caret.bottom + 2;

    Multilink.multilink([model.monthDayProperty], ({ monthIndex }) => {
      labels.forEach((label, i) => {
        label.fill = i === monthIndex ? highlightColor : textColor;
      });
      const current = labels[monthIndex];
      if (current) {
        caret.centerX = this.globalToLocalBounds(current.globalBounds).centerX;
        caret.top = 0;
      }
    });
  }
}
