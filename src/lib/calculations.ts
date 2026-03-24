import type {
  BalancedDraft,
  CalculationResult,
  DisplacementDraft,
  EffectiveStringSet,
  MixedSegment,
  PlugDraft,
} from "../types";
import { withUnit } from "./format";

export class CalculationError extends Error {}

const PI = Math.PI;

export function roundToLegacy(value: number, exp: number): number {
  const factor = 10 ** -exp;
  return Math.round(value * factor) / factor;
}

export function calcArea(diameterIn: number): number {
  return (PI * diameterIn * diameterIn) / 4 / 144;
}

export function roundPlugVolume(volume: number): number {
  return Math.ceil(volume * 10) / 10;
}

export function roundDisplacementVolume(volume: number): number {
  return Math.floor(volume * 10) / 10;
}

export function calcVol(lengthFt: number, diameterIn: number, type: "Vp" | "Vd" | "No"): number {
  let volume = (lengthFt * calcArea(diameterIn)) / 5.61;
  if (type === "Vp") {
    volume = roundPlugVolume(volume);
  }
  if (type === "Vd") {
    volume = roundDisplacementVolume(volume);
  }
  return volume;
}

function requirePositive(value: number | "", label: string): number {
  if (value === "" || !Number.isFinite(value) || value <= 0) {
    throw new CalculationError(`${label} must be greater than zero.`);
  }
  return value;
}

function requireNonNegative(value: number | "", label: string): number {
  if (value === "" || !Number.isFinite(value) || value < 0) {
    throw new CalculationError(`${label} must be zero or greater.`);
  }
  return value;
}

function effectiveDiameterFromSegments(
  segments: MixedSegment[],
  selector: "innerDiameterIn" | "outerDiameterIn",
): number | undefined {
  if (!segments.length) {
    return undefined;
  }

  let totalLength = 0;
  let totalVolume = 0;
  for (const segment of segments) {
    const length = requirePositive(segment.lengthFt, "Segment length");
    const diameter = selector === "innerDiameterIn"
      ? requirePositive(segment.innerDiameterIn, "Segment inner diameter")
      : requirePositive(segment.outerDiameterIn ?? "", "Segment outer diameter");

    totalLength += length;
    totalVolume += calcVol(length, diameter, "No");
  }

  return roundToLegacy(Math.sqrt((totalVolume * 5.61 * 4 * 144) / (totalLength * PI)), -4);
}

function validateSegmentTotal(
  totalDepthFt: number,
  segments: MixedSegment[],
  label: string,
): void {
  if (!segments.length) {
    return;
  }

  const total = segments.reduce((sum, segment) => sum + requirePositive(segment.lengthFt, label), 0);
  if (roundToLegacy(total, 0) !== roundToLegacy(totalDepthFt, 0)) {
    throw new CalculationError(`${label} lengths must add up to ${totalDepthFt} ft.`);
  }
}

function resolveEffectiveStrings(
  depthFt: number,
  casingSegments: MixedSegment[],
  tubingSegments: MixedSegment[],
): EffectiveStringSet {
  validateSegmentTotal(depthFt, casingSegments, "Casing string");
  validateSegmentTotal(depthFt, tubingSegments, "Tubing string");

  const casingInnerDiameterIn = effectiveDiameterFromSegments(casingSegments, "innerDiameterIn");
  const tubingInnerDiameterIn = effectiveDiameterFromSegments(tubingSegments, "innerDiameterIn");
  const tubingOuterDiameterIn = effectiveDiameterFromSegments(tubingSegments, "outerDiameterIn");

  return {
    casingInnerDiameterIn,
    tubing: tubingInnerDiameterIn && tubingOuterDiameterIn
      ? {
          innerDiameterIn: tubingInnerDiameterIn,
          outerDiameterIn: tubingOuterDiameterIn,
        }
      : undefined,
  };
}

export function calculateDisplacement(input: DisplacementDraft): CalculationResult {
  const depthFt = requirePositive(input.depthFt, "Depth");
  const effective = resolveEffectiveStrings(depthFt, input.casingSegments, input.tubingSegments);

  const casingInnerDiameterIn =
    effective.casingInnerDiameterIn ?? requirePositive(input.casingInnerDiameterIn, "Casing ID");
  const tubingInnerDiameterIn =
    effective.tubing?.innerDiameterIn ?? requirePositive(input.tubingInnerDiameterIn, "Tubing ID");
  const tubingOuterDiameterIn =
    effective.tubing?.outerDiameterIn ?? requirePositive(input.tubingOuterDiameterIn, "Tubing OD");

  let displacementBbl = 0;
  let displacementLengthFt = depthFt;
  let subtitle = "";

  if (input.mode === "tubing-displacement") {
    displacementBbl = calcVol(depthFt, tubingInnerDiameterIn, "Vd");
    subtitle = "Tubing displacement";
  } else {
    const annulusDiameter = Math.sqrt(
      casingInnerDiameterIn * casingInnerDiameterIn -
        tubingOuterDiameterIn * tubingOuterDiameterIn,
    );
    displacementBbl = calcVol(depthFt, annulusDiameter, "Vp");
    subtitle = "Bottoms-up";
  }

  if (displacementBbl <= 0) {
    throw new CalculationError("Calculated displacement is zero or negative.");
  }

  return {
    title: "Displacement",
    subtitle,
    primary: [
      { label: "V dsp", value: withUnit(displacementBbl, "bbl") },
      { label: "L dis tbg", value: withUnit(displacementLengthFt, "ft", 0) },
    ],
    secondary: [
      { label: "Depth", value: withUnit(depthFt, "ft", 0) },
      { label: "Casing ID", value: withUnit(casingInnerDiameterIn, "in", 3) },
      {
        label: input.mode === "tubing-displacement" ? "Tubing ID" : "Tubing OD",
        value: withUnit(
          input.mode === "tubing-displacement" ? tubingInnerDiameterIn : tubingOuterDiameterIn,
          "in",
          3,
        ),
      },
    ],
    reportSummary: `${subtitle} result generated from ${depthFt} ft using the legacy RES Cement rounding rules.`,
  };
}

export function calculatePlug(input: PlugDraft): CalculationResult {
  const bottomInjectionDepthFt = requirePositive(input.bottomInjectionDepthFt, "Bottom injection depth");
  const topInjectionDepthFt = requirePositive(input.topInjectionDepthFt, "Top injection depth");
  if (topInjectionDepthFt >= bottomInjectionDepthFt) {
    throw new CalculationError("Top injection depth must be less than bottom injection depth.");
  }

  const effective = resolveEffectiveStrings(
    bottomInjectionDepthFt,
    input.casingSegments,
    input.tubingSegments,
  );

  const casingInnerDiameterIn =
    effective.casingInnerDiameterIn ?? requirePositive(input.casingInnerDiameterIn, "Casing ID");
  const tubingInnerDiameterIn =
    effective.tubing?.innerDiameterIn ?? requirePositive(input.tubingInnerDiameterIn, "Tubing ID");
  const tubingOuterDiameterIn =
    effective.tubing?.outerDiameterIn ?? requirePositive(input.tubingOuterDiameterIn, "Tubing OD");

  if (input.mode === "packer") {
    const plugLengthFt = requirePositive(input.plugLengthFt, "Plug length");
    const cementInTubingBbl = requirePositive(input.cementInTubingBbl, "Cement in tubing");
    if (plugLengthFt > bottomInjectionDepthFt) {
      throw new CalculationError("Plug length cannot exceed bottom injection depth.");
    }

    const totalMixedBbl = roundPlugVolume((plugLengthFt * calcArea(casingInnerDiameterIn)) / 5.61 + cementInTubingBbl);
    const adjustedPlugLengthFt = totalMixedBbl / (calcArea(casingInnerDiameterIn) / 5.61);
    const packerDepthFt = roundToLegacy(
      topInjectionDepthFt - (totalMixedBbl * 5.61) / calcArea(casingInnerDiameterIn),
      0,
    );
    const tubingDisplacementBbl = roundDisplacementVolume(
      packerDepthFt * (calcArea(tubingInnerDiameterIn) / 5.61),
    );
    const finalPlugVolumeBbl = roundPlugVolume(adjustedPlugLengthFt * (calcArea(casingInnerDiameterIn) / 5.61)) - cementInTubingBbl;
    const plugTopDepthFt = roundToLegacy(
      topInjectionDepthFt - (finalPlugVolumeBbl * 5.61) / calcArea(casingInnerDiameterIn),
      0,
    );
    const bottomsUpBbl = roundPlugVolume(
      packerDepthFt * ((calcArea(casingInnerDiameterIn) - calcArea(tubingOuterDiameterIn)) / 5.61),
    );

    return {
      title: "Perf and Seal",
      subtitle: "Packer mode",
      primary: [
        { label: "D plg top", value: withUnit(plugTopDepthFt, "ft", 0) },
        { label: "D pkr", value: withUnit(packerDepthFt, "ft", 0) },
        { label: "V dsp tbg", value: withUnit(tubingDisplacementBbl, "bbl") },
        { label: "Btms up", value: withUnit(bottomsUpBbl, "bbl") },
      ],
      secondary: [
        { label: "V cmt", value: withUnit(roundPlugVolume(adjustedPlugLengthFt * (calcArea(casingInnerDiameterIn) / 5.61)), "bbl") },
        { label: "V plg final", value: withUnit(finalPlugVolumeBbl, "bbl") },
        { label: "Plug length (adj)", value: withUnit(adjustedPlugLengthFt, "ft") },
        { label: "Cement in tubing", value: withUnit(cementInTubingBbl, "bbl") },
      ],
      reportSummary: `Packer workflow calculated using plug length and tubing cement inputs with legacy RES Cement rounding.`,
    };
  }

  const totalCementMixedBbl = requirePositive(input.totalCementMixedBbl, "Total cement mixed");
  const initialInjectionBbl = requireNonNegative(input.initialInjectionBbl, "Initial injection");
  const hesitationOneBbl = requireNonNegative(input.hesitationOneBbl, "Hesitation one");
  const hesitationTwoBbl = requireNonNegative(input.hesitationTwoBbl, "Hesitation two");
  const perforationLengthFt = requirePositive(input.perforationLengthFt, "Perforation length");
  const retainerDepthFt = requirePositive(input.retainerDepthFt, "Retainer depth");

  const cementInWellInitialBbl = roundToLegacy(totalCementMixedBbl - initialInjectionBbl, -1);
  const cementBelowRetainerBbl = roundToLegacy(
    (calcArea(casingInnerDiameterIn) / 5.61) * ((perforationLengthFt + topInjectionDepthFt) - retainerDepthFt),
    -1,
  );
  const tubingDisplacementBeforeHesitationBbl = roundToLegacy(
    retainerDepthFt * calcArea(tubingInnerDiameterIn) / 5.61,
    -1,
  );
  const cementInTubingInitialBbl = roundToLegacy(cementInWellInitialBbl - cementBelowRetainerBbl, -1);
  const dispBeforeH1Bbl = roundToLegacy(
    tubingDisplacementBeforeHesitationBbl - cementInTubingInitialBbl,
    -1,
  );
  const cementAfterH1Bbl = roundToLegacy(cementInTubingInitialBbl - hesitationOneBbl, -1);
  const cementAfterH2Bbl = roundToLegacy(cementAfterH1Bbl - hesitationTwoBbl, -1);
  const dispH1Bbl = cementInTubingInitialBbl - cementAfterH1Bbl;
  const dispH2Bbl = cementAfterH1Bbl - cementAfterH2Bbl;
  const dumpedCementBbl = cementAfterH2Bbl;
  const dumpedCementLengthFt = roundToLegacy(dumpedCementBbl * 5.61 / calcArea(casingInnerDiameterIn), -1);
  const plugLengthInCasingFt = roundToLegacy((topInjectionDepthFt + perforationLengthFt) - retainerDepthFt, -1);
  const cementBypassPipeBbl = roundToLegacy(initialInjectionBbl + hesitationOneBbl + hesitationTwoBbl, -1);
  const bottomsUpBbl = roundToLegacy(
    (retainerDepthFt - dumpedCementLengthFt) *
      (calcArea(Math.sqrt(casingInnerDiameterIn ** 2 - tubingOuterDiameterIn ** 2)) / 5.61),
    -1,
  );
  const bottomsUpReverseBbl = roundToLegacy(
    (retainerDepthFt - dumpedCementLengthFt) * calcArea(tubingInnerDiameterIn) / 5.61,
    -1,
  );

  return {
    title: "Perf and Seal",
    subtitle: "Retainer mode",
    primary: [
      { label: "Disp bfr h1", value: withUnit(dispBeforeH1Bbl, "bbl") },
      { label: "Disp h1", value: withUnit(dispH1Bbl, "bbl") },
      { label: "Disp h2", value: withUnit(dispH2Bbl, "bbl") },
      { label: "Btms up", value: withUnit(bottomsUpBbl, "bbl") },
    ],
    secondary: [
      { label: "Btms up rev", value: withUnit(bottomsUpReverseBbl, "bbl") },
      { label: "L plg csg", value: withUnit(plugLengthInCasingFt, "ft") },
      { label: "V cb pipe", value: withUnit(cementBypassPipeBbl, "bbl") },
      { label: "V cmt dmp", value: withUnit(dumpedCementBbl, "bbl") },
      { label: "L cmt dmp", value: withUnit(dumpedCementLengthFt, "ft") },
    ],
    reportSummary: `Retainer workflow calculated using total cement, hesitation volumes, and retainer depth with legacy RES Cement rounding.`,
  };
}

export function calculateBalanced(input: BalancedDraft): CalculationResult {
  const baseDepthFt = requirePositive(input.baseDepthFt, "Base depth");
  const effective = resolveEffectiveStrings(baseDepthFt, input.casingSegments, input.tubingSegments);
  const casingInnerDiameterIn =
    effective.casingInnerDiameterIn ?? requirePositive(input.casingInnerDiameterIn, "Casing ID");
  const tubingInnerDiameterIn =
    effective.tubing?.innerDiameterIn ?? requirePositive(input.tubingInnerDiameterIn, "Tubing ID");
  const tubingOuterDiameterIn =
    effective.tubing?.outerDiameterIn ?? requirePositive(input.tubingOuterDiameterIn, "Tubing OD");

  const holeDiameterIn = input.parameter === "casing"
    ? undefined
    : requirePositive(input.holeDiameterIn, "Hole diameter");
  const stubInnerDiameterIn =
    input.parameter === "stub-open-hole" || input.parameter === "stub-open-hole-casing"
      ? requirePositive(input.stubInnerDiameterIn, "Stub diameter")
      : undefined;

  let displacementDepthFt = 0;
  let displacementVolumeBbl = 0;
  let finalPlugVolumeBbl = 0;
  let finalPlugLengthFt = 0;

  if (input.solveMode === "depth") {
    const plugTopDepthFt = requirePositive(input.plugTopDepthFt, "Plug top depth");
    if (plugTopDepthFt >= baseDepthFt) {
      throw new CalculationError("Plug top depth must be less than base depth.");
    }
    const plugLengthFt = baseDepthFt - plugTopDepthFt;

    switch (input.parameter) {
      case "casing":
        finalPlugVolumeBbl = calcVol(plugLengthFt, casingInnerDiameterIn, "Vp");
        break;
      case "stub-open-hole":
        finalPlugVolumeBbl = roundPlugVolume(
          (requirePositive(input.plugLengthInStubFt, "Plug length in stub") * calcArea(stubInnerDiameterIn!)) / 5.61 +
            ((plugLengthFt - requirePositive(input.plugLengthInStubFt, "Plug length in stub")) * calcArea(holeDiameterIn!)) / 5.61,
        );
        break;
      case "stub-open-hole-casing":
        finalPlugVolumeBbl = roundPlugVolume(
          (requirePositive(input.plugLengthInStubFt, "Plug length in stub") * calcArea(stubInnerDiameterIn!)) / 5.61 +
            (requirePositive(input.plugLengthInHoleFt, "Plug length in hole") * calcArea(holeDiameterIn!)) / 5.61 +
            ((plugLengthFt -
              (requirePositive(input.plugLengthInStubFt, "Plug length in stub") +
                requirePositive(input.plugLengthInHoleFt, "Plug length in hole"))) *
              calcArea(casingInnerDiameterIn)) /
              5.61,
        );
        break;
      case "open-hole-casing":
        finalPlugVolumeBbl = roundPlugVolume(
          (requirePositive(input.plugLengthInCasingFt, "Plug length in casing") * calcArea(casingInnerDiameterIn)) / 5.61 +
            ((plugLengthFt - requirePositive(input.plugLengthInCasingFt, "Plug length in casing")) * calcArea(holeDiameterIn!)) / 5.61,
        );
        break;
    }

    finalPlugLengthFt = plugLengthFt;
    displacementDepthFt = roundToLegacy(baseDepthFt - plugLengthFt, 0);
    displacementVolumeBbl = calcVol(displacementDepthFt, tubingInnerDiameterIn, "Vd");
  } else {
    const plugVolumeBbl = requirePositive(input.plugVolumeBbl, "Plug volume");
    finalPlugVolumeBbl = roundPlugVolume(plugVolumeBbl);

    switch (input.parameter) {
      case "casing":
        finalPlugLengthFt = roundToLegacy((finalPlugVolumeBbl * 5.61) / calcArea(casingInnerDiameterIn), 0);
        break;
      case "stub-open-hole":
        finalPlugLengthFt = roundToLegacy(
          (((finalPlugVolumeBbl * 5.61) -
            (requirePositive(input.plugLengthInStubFt, "Plug length in stub") * calcArea(stubInnerDiameterIn!))) /
            calcArea(holeDiameterIn!)) +
            requirePositive(input.plugLengthInStubFt, "Plug length in stub"),
          0,
        );
        break;
      case "stub-open-hole-casing":
        finalPlugLengthFt = roundToLegacy(
          (((finalPlugVolumeBbl * 5.61) -
            (requirePositive(input.plugLengthInStubFt, "Plug length in stub") * calcArea(stubInnerDiameterIn!)) -
            (requirePositive(input.plugLengthInHoleFt, "Plug length in hole") * calcArea(holeDiameterIn!))) /
            calcArea(casingInnerDiameterIn)) +
            requirePositive(input.plugLengthInStubFt, "Plug length in stub") +
            requirePositive(input.plugLengthInHoleFt, "Plug length in hole"),
          0,
        );
        break;
      case "open-hole-casing":
        finalPlugLengthFt = roundToLegacy(
          (((finalPlugVolumeBbl * 5.61) -
            (requirePositive(input.plugLengthInCasingFt, "Plug length in casing") * calcArea(casingInnerDiameterIn))) /
            calcArea(holeDiameterIn!)) +
            requirePositive(input.plugLengthInCasingFt, "Plug length in casing"),
          0,
        );
        break;
    }

    displacementDepthFt = baseDepthFt - finalPlugLengthFt;
    displacementVolumeBbl = calcVol(displacementDepthFt, tubingInnerDiameterIn, "Vd");
  }

  if (displacementVolumeBbl <= 0) {
    throw new CalculationError("Calculated displacement is zero or negative.");
  }

  return {
    title: "Balanced Plug",
    subtitle: `${input.parameter.replace(/-/g, " ")} / ${input.solveMode === "depth" ? "depth" : "volume"} solve`,
    primary: [
      { label: "L dsp", value: withUnit(displacementDepthFt, "ft", 0) },
      { label: "V dsp", value: withUnit(displacementVolumeBbl, "bbl") },
      { label: "V plg final", value: withUnit(finalPlugVolumeBbl, "bbl") },
      { label: "L plg final", value: withUnit(finalPlugLengthFt, "ft", 0) },
    ],
    secondary: [
      { label: "Base depth", value: withUnit(baseDepthFt, "ft", 0) },
      { label: "Casing ID", value: withUnit(casingInnerDiameterIn, "in", 3) },
      { label: "Tubing ID", value: withUnit(tubingInnerDiameterIn, "in", 3) },
      { label: "Tubing OD", value: withUnit(tubingOuterDiameterIn, "in", 3) },
      ...(holeDiameterIn ? [{ label: "Hole ID", value: withUnit(holeDiameterIn, "in", 3) }] : []),
      ...(stubInnerDiameterIn
        ? [{ label: "Stub ID", value: withUnit(stubInnerDiameterIn, "in", 3) }]
        : []),
    ],
    reportSummary: `Balanced plug result solved by ${input.solveMode} for the ${input.parameter.replace(/-/g, " ")} geometry using legacy RES Cement formulas.`,
  };
}
