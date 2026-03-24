import type {
  BalancedDraft,
  DisplacementDraft,
  PersistedDrafts,
  PlugDraft,
  ReportRecord,
} from "../types";

const DRAFTS_KEY = "res-cement-drafts";
const REPORTS_KEY = "res-cement-reports";

export const defaultDisplacementDraft = (): DisplacementDraft => ({
  wellName: "",
  mode: "tubing-displacement",
  depthFt: 10000,
  casingInnerDiameterIn: 4.09,
  tubingInnerDiameterIn: 1.995,
  tubingOuterDiameterIn: 2.375,
  casingSegments: [],
  tubingSegments: [],
});

export const defaultPlugDraft = (): PlugDraft => ({
  wellName: "",
  mode: "packer",
  casingInnerDiameterIn: 4.09,
  tubingInnerDiameterIn: 1.995,
  tubingOuterDiameterIn: 2.375,
  bottomInjectionDepthFt: 10000,
  topInjectionDepthFt: 9000,
  plugLengthFt: 500,
  cementInTubingBbl: 20,
  totalCementMixedBbl: 120,
  initialInjectionBbl: 15,
  hesitationOneBbl: 10,
  hesitationTwoBbl: 5,
  perforationLengthFt: 100,
  retainerDepthFt: 8900,
  casingSegments: [],
  tubingSegments: [],
});

export const defaultBalancedDraft = (): BalancedDraft => ({
  wellName: "",
  parameter: "casing",
  solveMode: "depth",
  casingInnerDiameterIn: 4.09,
  tubingInnerDiameterIn: 1.995,
  tubingOuterDiameterIn: 2.375,
  holeDiameterIn: 6.5,
  stubInnerDiameterIn: 4,
  baseDepthFt: 10000,
  plugTopDepthFt: 9500,
  plugVolumeBbl: 40,
  plugLengthInStubFt: 120,
  plugLengthInHoleFt: 140,
  plugLengthInCasingFt: 120,
  casingSegments: [],
  tubingSegments: [],
});

function defaultDrafts(): PersistedDrafts {
  return {
    displacement: defaultDisplacementDraft(),
    plug: defaultPlugDraft(),
    balanced: defaultBalancedDraft(),
  };
}

export function loadDrafts(): PersistedDrafts {
  if (typeof window === "undefined") {
    return defaultDrafts();
  }

  try {
    const stored = window.localStorage.getItem(DRAFTS_KEY);
    if (!stored) {
      return defaultDrafts();
    }

    const parsed = JSON.parse(stored) as Partial<PersistedDrafts>;
    return {
      displacement: { ...defaultDisplacementDraft(), ...parsed.displacement },
      plug: { ...defaultPlugDraft(), ...parsed.plug },
      balanced: { ...defaultBalancedDraft(), ...parsed.balanced },
    };
  } catch {
    return defaultDrafts();
  }
}

export function saveDrafts(drafts: PersistedDrafts): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function loadReports(): ReportRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(REPORTS_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as ReportRecord[];
  } catch {
    return [];
  }
}

export function saveReports(reports: ReportRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}
