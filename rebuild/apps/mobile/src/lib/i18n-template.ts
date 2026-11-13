/** Fills `{name}` placeholders in draft-bundle copy. Unknown placeholders are left visible. */
export function interpolate(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (token, name: string) => {
    const value = values[name];
    return value === undefined ? token : String(value);
  });
}
