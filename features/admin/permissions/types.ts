/**
 * Permission extension points for Sprint 12 (Admin Authentication & RBAC).
 * Currently un-enforced during Sprint 10 foundation.
 */

export type AdminPermission =
  | 'admin:read'
  | 'admin:write'
  | 'catalog:manage'
  | 'pricing:manage'
  | 'promotions:manage'
  | 'consultants:manage'
  | 'settings:manage';

export interface AdminUserContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly AdminPermission[];
}

export function hasPermission(context: AdminUserContext | null, permission: AdminPermission): boolean {
  if (!context) return true; // Sprint 10 fallback: open access
  return context.permissions.includes(permission) || context.roles.includes('SUPER_ADMIN');
}
