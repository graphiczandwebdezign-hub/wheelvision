/**
 * Currency registry — the only place currency knowledge lives. Server and
 * client both resolve through `resolveCurrency`; nothing anywhere hardcodes
 * a currency symbol. Formatting goes through `Intl.NumberFormat` so the
 * host's CLDR data renders the correct symbol, grouping and decimal rules.
 */

export interface Currency {
  /** ISO-4217 code, e.g. `ZAR`. */
  readonly code: string;
  /** Display name, e.g. `South African rand`. */
  readonly name: string;
  /** Minor-unit exponent (cents = 2). */
  readonly fractionDigits: number;
  /** BCP-47 locale used for formatting this currency. */
  readonly locale: string;
}

const CURRENCY_REGISTRY: Readonly<Record<string, Currency>> = {
  ZAR: { code: 'ZAR', name: 'South African rand', fractionDigits: 2, locale: 'en-ZA' },
};

/** Registry seam for future currencies (wholesale/dealer markets arrive with them). */
export function supportedCurrencies(): readonly Currency[] {
  return Object.values(CURRENCY_REGISTRY);
}

export function resolveCurrency(code: string): Currency {
  const currency = CURRENCY_REGISTRY[code.toUpperCase()];
  if (!currency) {
    throw new Error(`Unsupported currency: ${code}`);
  }
  return currency;
}

/** Format integer cents with full CLDR rules (never a hardcoded symbol). */
export function formatCents(amountCents: number, currencyCode: string): string {
  const currency = resolveCurrency(currencyCode);
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.fractionDigits,
    maximumFractionDigits: currency.fractionDigits,
  }).format(amountCents / 10 ** currency.fractionDigits);
}
