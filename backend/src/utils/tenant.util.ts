import prisma from '../prisma';

/**
 * Helper tra cứu tenantId từ schoolId hoặc tenantId hiện hành.
 * Nếu không có, fallback về Tenant đầu tiên để đảm bảo tính liên tục cho các script demo cũ.
 */
export async function resolveTenantId(schoolId?: string | null, tenantId?: string | null): Promise<string> {
  if (tenantId && tenantId !== 'system_bypass') {
    return tenantId;
  }

  if (schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { tenantId: true },
    });
    if (school?.tenantId) {
      return school.tenantId;
    }
  }

  const defaultTenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  return defaultTenant?.id || '';
}
