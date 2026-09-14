import prisma from '../prisma';
import { SYSTEM_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions.constant';

interface CacheEntry {
  permissions: string[];
  expiresAt: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Lấy danh sách permission keys của một người dùng trong tenant hiện hành.
 * Sử dụng quan hệ UserRole -> RoleModel -> RolePermission -> Permission.
 */
export async function getTenantUserPermissions(
  userId: string,
  tenantId?: string | null,
  isSystemAdmin = false
): Promise<string[]> {
  if (isSystemAdmin) {
    return SYSTEM_PERMISSIONS.map((p) => p.key);
  }

  const cacheKey = `${userId}:${tenantId || 'global'}`;
  const now = Date.now();
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.permissions;
  }

  // Truy vấn UserRole kèm RoleModel & RolePermission
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      roleModel: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const permissionSet = new Set<string>();

  for (const ur of userRoles) {
    if (ur.roleModel && ur.roleModel.rolePermissions.length > 0) {
      for (const rp of ur.roleModel.rolePermissions) {
        if (rp.permission?.key) {
          permissionSet.add(rp.permission.key);
        }
      }
    } else if (ur.role && DEFAULT_ROLE_PERMISSIONS[ur.role]) {
      // Fallback nếu roleId chưa được gán
      for (const key of DEFAULT_ROLE_PERMISSIONS[ur.role]) {
        permissionSet.add(key);
      }
    }
  }

  const result = Array.from(permissionSet);
  permissionCache.set(cacheKey, {
    permissions: result,
    expiresAt: now + CACHE_TTL_MS,
  });

  return result;
}

/**
 * Xóa cache permission khi cấu hình role/quyền thay đổi
 */
export function invalidateUserPermissions(userId?: string, tenantId?: string) {
  if (userId && tenantId) {
    permissionCache.delete(`${userId}:${tenantId}`);
  } else if (tenantId) {
    for (const key of permissionCache.keys()) {
      if (key.endsWith(`:${tenantId}`)) {
        permissionCache.delete(key);
      }
    }
  } else if (userId) {
    for (const key of permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        permissionCache.delete(key);
      }
    }
  } else {
    permissionCache.clear();
  }
}

/**
 * Kiểm tra xem người dùng có ít nhất một permission trong danh sách yêu cầu hay không
 */
export function hasPermission(
  userPermissions: string[],
  required: string | string[],
  isSystemAdmin = false
): boolean {
  if (isSystemAdmin) return true;
  const requiredKeys = Array.isArray(required) ? required : [required];
  return requiredKeys.some((k) => userPermissions.includes(k) || userPermissions.includes('*'));
}
