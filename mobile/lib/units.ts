const WEIGHT_UNITS: Record<string, number> = {
  kg: 1000,
  g: 1,
  gram: 1,
  grams: 1,
  kilogram: 1000,
  kilograms: 1000,
};

const VOLUME_UNITS: Record<string, number> = {
  litre: 1000,
  liter: 1000,
  l: 1000,
  ml: 1,
  millilitre: 1,
  millilitres: 1,
};

export function normalizeToBase(quantity: number, unit: string): [number, string] {
  const u = (unit || "").trim().toLowerCase();
  if (u in WEIGHT_UNITS) {
    return [quantity * WEIGHT_UNITS[u], "g"];
  }
  if (u in VOLUME_UNITS) {
    return [quantity * VOLUME_UNITS[u], "ml"];
  }
  return [quantity, unit];
}

export function toDisplayPair(quantity: number, unit: string): [number, string] {
  const u = (unit || "").trim().toLowerCase();
  if (u === "g" && Math.abs(quantity) >= 1000) {
    return [quantity / 1000, "kg"];
  }
  if (u === "ml" && Math.abs(quantity) >= 1000) {
    return [quantity / 1000, "L"];
  }
  return [quantity, unit];
}

export function formatForDisplay(quantity: number, unit: string): string {
  const u = (unit || "").trim();
  if (u === "g") {
    if (Math.abs(quantity) >= 1000) {
      const val = (quantity / 1000).toFixed(2).replace(/\.?0+$/, "");
      return `${val} kg`;
    }
    return `${Math.round(quantity)} g`;
  }
  if (u === "ml") {
    if (Math.abs(quantity) >= 1000) {
      const val = (quantity / 1000).toFixed(2).replace(/\.?0+$/, "");
      return `${val} L`;
    }
    return `${Math.round(quantity)} ml`;
  }
  return `${Number(quantity.toFixed(2))} ${unit}`;
}
