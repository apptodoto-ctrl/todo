/** Monedas en las que puede trabajar una terapeuta */
export const CURRENCIES = ["CLP", "ARS", "COP", "USD"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<string, string> = {
  CLP: "Peso chileno (CLP)",
  ARS: "Peso argentino (ARS)",
  COP: "Peso colombiano (COP)",
  USD: "Dólar (USD)",
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}
