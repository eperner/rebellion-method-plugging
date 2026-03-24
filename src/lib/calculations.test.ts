import { describe, expect, it } from "vitest";
import {
  calculateBalanced,
  calculateDisplacement,
  calculatePlug,
  roundToLegacy,
} from "./calculations";
import {
  defaultBalancedDraft,
  defaultDisplacementDraft,
  defaultPlugDraft,
} from "./storage";

describe("legacy helper rounding", () => {
  it("matches Delphi-style roundTo behavior for integer and decimal precision", () => {
    expect(roundToLegacy(7266.49, 0)).toBe(7266);
    expect(roundToLegacy(38.54, -1)).toBe(38.5);
  });
});

describe("displacement calculations", () => {
  it("matches tubing displacement sample", () => {
    const result = calculateDisplacement(defaultDisplacementDraft());
    expect(result.primary[0]?.value).toBe("38.6 bbl");
    expect(result.primary[1]?.value).toBe("10000 ft");
  });

  it("matches bottoms-up sample", () => {
    const result = calculateDisplacement({
      ...defaultDisplacementDraft(),
      mode: "bottoms-up",
    });
    expect(result.primary[0]?.value).toBe("107.8 bbl");
  });
});

describe("plug calculations", () => {
  it("matches packer sample outputs", () => {
    const result = calculatePlug(defaultPlugDraft());
    expect(result.primary[0]?.value).toBe("8496 ft");
    expect(result.primary[1]?.value).toBe("7266 ft");
    expect(result.primary[2]?.value).toBe("28.1 bbl");
    expect(result.primary[3]?.value).toBe("78.4 bbl");
  });

  it("matches retainer sample outputs", () => {
    const result = calculatePlug({
      ...defaultPlugDraft(),
      mode: "retainer",
    });
    expect(result.primary[0]?.value).toBe("-67.3 bbl");
    expect(result.primary[1]?.value).toBe("10 bbl");
    expect(result.primary[2]?.value).toBe("5 bbl");
    expect(result.secondary[3]?.value).toBe("86.7 bbl");
  });
});

describe("balanced calculations", () => {
  it("matches casing depth solve sample", () => {
    const result = calculateBalanced(defaultBalancedDraft());
    expect(result.primary[0]?.value).toBe("9500 ft");
    expect(result.primary[1]?.value).toBe("36.7 bbl");
    expect(result.primary[2]?.value).toBe("8.2 bbl");
    expect(result.primary[3]?.value).toBe("500 ft");
  });

  it("matches stub open hole volume solve sample", () => {
    const result = calculateBalanced({
      ...defaultBalancedDraft(),
      parameter: "stub-open-hole",
      solveMode: "volume",
      plugVolumeBbl: 50,
    });
    expect(result.primary[0]?.value).toBe("8708 ft");
    expect(result.primary[1]?.value).toBe("33.6 bbl");
    expect(result.primary[3]?.value).toBe("1292 ft");
  });
});
