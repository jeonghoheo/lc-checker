const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function requireObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('AI response is not a JSON object.');
  }

  return raw as Record<string, unknown>;
}

export function requireString(
  data: Record<string, unknown>,
  field: string,
  label = field,
): string {
  const value = data[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `Invalid or missing field "${label}": expected a non-empty string.`,
    );
  }

  return value.trim();
}

export function requireNumber(
  data: Record<string, unknown>,
  field: string,
  label = field,
): number {
  const value = data[field];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid or missing field "${label}": expected a number.`);
  }

  return value;
}

export function requireBoolean(
  data: Record<string, unknown>,
  field: string,
  label = field,
): boolean {
  const value = data[field];

  if (typeof value !== 'boolean') {
    throw new Error(`Invalid or missing field "${label}": expected a boolean.`);
  }

  return value;
}

export function requireIsoDate(
  data: Record<string, unknown>,
  field: string,
  label = field,
): string {
  const value = requireString(data, field, label);

  if (!ISO_DATE.test(value)) {
    throw new Error(
      `Invalid field "${label}": expected an ISO date (yyyy-mm-dd).`,
    );
  }

  return value;
}

export function optionalIsoDate(
  data: Record<string, unknown>,
  field: string,
  label = field,
): string | null {
  const value = data[field];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new Error(
      `Invalid field "${label}": expected an ISO date (yyyy-mm-dd) or null.`,
    );
  }

  return value;
}
