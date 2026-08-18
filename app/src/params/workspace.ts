export function match(param: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(param);
}
