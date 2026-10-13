/**
 * País de la terapeuta: define su moneda y el documento de identidad que
 * se le pide a cada paciente. Lo pide el registro y se puede cambiar en
 * el perfil.
 */

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  /** Cómo se llama el documento en ese país */
  documentLabel: string;
  documentPlaceholder: string;
  /** Pistas para la terapeuta bajo el campo */
  documentHint: string;
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: "CL",
    name: "Chile",
    currency: "CLP",
    documentLabel: "RUT",
    documentPlaceholder: "12.345.678-9",
    documentHint: "Se formatea solo con puntos y guion.",
  },
  {
    code: "AR",
    name: "Argentina",
    currency: "ARS",
    documentLabel: "DNI",
    documentPlaceholder: "12.345.678",
    documentHint: "Sin guion ni dígito verificador.",
  },
  {
    code: "CO",
    name: "Colombia",
    currency: "COP",
    documentLabel: "Cédula o tarjeta de identidad",
    documentPlaceholder: "1.234.567.890",
    documentHint: "Cédula de ciudadanía o tarjeta de identidad.",
  },
  {
    code: "OT",
    name: "Otro país",
    currency: "USD",
    documentLabel: "Documento de identidad",
    documentPlaceholder: "Documento o pasaporte",
    documentHint: "",
  },
];

export const DEFAULT_COUNTRY = "CL";

export function countryConfig(code: string | undefined | null): CountryConfig {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

export function isCountry(value: unknown): boolean {
  return typeof value === "string" && COUNTRIES.some((c) => c.code === value);
}

/** País equivalente a una moneda, para las cuentas creadas antes de pedir el país */
export function countryFromCurrency(currency: string): string {
  return COUNTRIES.find((c) => c.currency === currency)?.code ?? "OT";
}

/**
 * Da formato al documento según el país. Solo toca lo que es claramente
 * numérico: un pasaporte o un documento con letras se deja tal cual.
 */
export function formatDocument(value: string, country: string): string {
  const config = countryConfig(country);

  if (config.code === "CL") {
    if (!/^[0-9.\-kK]*$/.test(value)) return value.toUpperCase();
    const clean = value.replace(/[^0-9kK]/g, "").toUpperCase();
    if (clean.length === 0) return "";
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return dotted ? `${dotted}-${dv}` : dv;
  }

  if (config.code === "AR" || config.code === "CO") {
    // Solo dígitos separados en miles: ni guion ni dígito verificador
    if (!/^[0-9.\s]*$/.test(value)) return value.toUpperCase();
    const clean = value.replace(/\D/g, "");
    if (clean.length === 0) return "";
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  return value;
}
