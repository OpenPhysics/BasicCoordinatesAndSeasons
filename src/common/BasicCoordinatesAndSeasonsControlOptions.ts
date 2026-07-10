/**
 * BasicCoordinatesAndSeasonsControlOptions.ts
 *
 * Shared sizing and layout for panel controls (sliders, checkboxes, NumberControls).
 * Import these instead of repeating scale / track-size values in each screen view.
 */

import { NumberControl } from "scenerystack/scenery-phet";
import type { CheckboxOptions, HSliderOptions } from "scenerystack/sun";
import BasicCoordinatesAndSeasonsColors from "../BasicCoordinatesAndSeasonsColors.js";
import {
  CHECKBOX_BOX_WIDTH,
  NUMBER_CONTROL_SLIDER_TRACK_SIZE,
  SLIDER_THUMB_SIZE,
  STANDALONE_SLIDER_TRACK_SIZE,
} from "../BasicCoordinatesAndSeasonsConstants.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "./BasicCoordinatesAndSeasonsButtonOptions.js";

/** Options for standalone HSlider instances in control panels. */
export const SIM_SLIDER_OPTIONS = {
  trackSize: STANDALONE_SLIDER_TRACK_SIZE,
  thumbSize: SLIDER_THUMB_SIZE,
  trackFillEnabled: BasicCoordinatesAndSeasonsColors.textColorProperty,
} satisfies HSliderOptions;

/** Base NumberControl options; spread into each instance and add titleNodeOptions as needed. */
export const SIM_NUMBER_CONTROL_OPTIONS = {
  arrowButtonOptions: { ...FLAT_RECTANGULAR_BUTTON_OPTIONS, scale: 0.75 },
  layoutFunction: NumberControl.createLayoutFunction4({
    sliderPadding: 4,
    arrowButtonSpacing: 3,
    verticalSpacing: 4,
  }),
  sliderOptions: {
    trackSize: NUMBER_CONTROL_SLIDER_TRACK_SIZE,
    thumbSize: SLIDER_THUMB_SIZE,
    trackFillEnabled: BasicCoordinatesAndSeasonsColors.textColorProperty,
  },
};

/** Themed checkbox chrome for dark panel backgrounds. */
export const SIM_CHECKBOX_OPTIONS = {
  boxWidth: CHECKBOX_BOX_WIDTH,
  spacing: 4,
  checkboxColor: BasicCoordinatesAndSeasonsColors.textColorProperty,
  checkboxColorBackground: BasicCoordinatesAndSeasonsColors.panelBackgroundColorProperty,
} satisfies CheckboxOptions;
