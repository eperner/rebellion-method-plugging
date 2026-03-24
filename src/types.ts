export type CalculatorKind = "displacement" | "plug" | "balanced";

export type DisplacementMode = "tubing-displacement" | "bottoms-up";
export type PlugMode = "packer" | "retainer";
export type BalancedParameter =
  | "casing"
  | "stub-open-hole"
  | "stub-open-hole-casing"
  | "open-hole-casing";
export type BalancedSolveMode = "depth" | "volume";

export interface LookupItem {
  id: string;
  label: string;
  outerDiameterIn?: number;
  innerDiameterIn: number;
}

export interface MixedSegment {
  lengthFt: number | "";
  innerDiameterIn: number | "";
  outerDiameterIn?: number | "";
}

export interface EffectiveTubing {
  innerDiameterIn: number;
  outerDiameterIn: number;
}

export interface EffectiveStringSet {
  casingInnerDiameterIn?: number;
  tubing?: EffectiveTubing;
}

export interface DisplacementDraft {
  wellName: string;
  mode: DisplacementMode;
  depthFt: number | "";
  casingInnerDiameterIn: number | "";
  tubingInnerDiameterIn: number | "";
  tubingOuterDiameterIn: number | "";
  casingSegments: MixedSegment[];
  tubingSegments: MixedSegment[];
}

export interface PlugDraft {
  wellName: string;
  mode: PlugMode;
  casingInnerDiameterIn: number | "";
  tubingInnerDiameterIn: number | "";
  tubingOuterDiameterIn: number | "";
  bottomInjectionDepthFt: number | "";
  topInjectionDepthFt: number | "";
  plugLengthFt: number | "";
  cementInTubingBbl: number | "";
  totalCementMixedBbl: number | "";
  initialInjectionBbl: number | "";
  hesitationOneBbl: number | "";
  hesitationTwoBbl: number | "";
  perforationLengthFt: number | "";
  retainerDepthFt: number | "";
  casingSegments: MixedSegment[];
  tubingSegments: MixedSegment[];
}

export interface BalancedDraft {
  wellName: string;
  parameter: BalancedParameter;
  solveMode: BalancedSolveMode;
  casingInnerDiameterIn: number | "";
  tubingInnerDiameterIn: number | "";
  tubingOuterDiameterIn: number | "";
  holeDiameterIn: number | "";
  stubInnerDiameterIn: number | "";
  baseDepthFt: number | "";
  plugTopDepthFt: number | "";
  plugVolumeBbl: number | "";
  plugLengthInStubFt: number | "";
  plugLengthInHoleFt: number | "";
  plugLengthInCasingFt: number | "";
  casingSegments: MixedSegment[];
  tubingSegments: MixedSegment[];
}

export interface ReportRecord {
  id: string;
  createdAt: string;
  calculator: CalculatorKind;
  title: string;
  summary: string;
  outputs: Array<{ label: string; value: string }>;
}

export interface ResultField {
  label: string;
  value: string;
}

export interface CalculationResult {
  title: string;
  subtitle: string;
  primary: ResultField[];
  secondary: ResultField[];
  reportSummary: string;
}

export interface PersistedDrafts {
  displacement: DisplacementDraft;
  plug: PlugDraft;
  balanced: BalancedDraft;
}
