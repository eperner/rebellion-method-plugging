export function formatNumber(value: number, digits = 1): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(digits);
}

export function withUnit(value: number, unit: string, digits = 1): string {
  return `${formatNumber(value, digits)} ${unit}`;
}

export function titleFromKind(kind: string): string {
  switch (kind) {
    case "displacement":
      return "Displacement";
    case "plug":
      return "Perf and Seal";
    case "balanced":
      return "Balanced Plug";
    default:
      return kind;
  }
}
