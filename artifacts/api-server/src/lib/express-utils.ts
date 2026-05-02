export function firstString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function firstStringOrEmpty(value: string | string[] | undefined): string {
  return firstString(value) ?? "";
}
