export function isAdmin(user: { role: string } | null | undefined): boolean {
  return user?.role === 'ADMIN';
}

export function filterNavForUser<T extends { adminOnly?: boolean }>(
  items: T[],
  user: { role: string } | null | undefined
): T[] {
  return items.filter((item) => !item.adminOnly || isAdmin(user));
}
