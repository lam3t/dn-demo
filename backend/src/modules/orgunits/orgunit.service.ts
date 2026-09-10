import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { Role } from '@prisma/client';

export interface OrgTreeNode {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  orderIndex: number;
  leader?: {
    id: string;
    fullName: string;
    title: string | null;
    phone: string;
    avatarUrl: string | null;
  } | null;
  userCount: number;
  taskCount: number;
  users?: {
    id: string;
    fullName: string;
    title: string | null;
    phone: string;
    email: string;
    avatarUrl: string | null;
    primaryLocation?: { id: string; name: string; code?: string } | null;
    roles: { role: Role; scopeOrgUnitId: string | null; scopeLocationId: string | null }[];
    currentTaskLoad?: number;
    isToTruong: boolean;
  }[];
  children: OrgTreeNode[];
}

export class OrgUnitService {
  async getAll(schoolId?: string) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;

    return prisma.orgUnit.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: { select: { users: true, tasks: true, children: true } },
      },
    });
  }

  async getTree(schoolId?: string): Promise<OrgTreeNode[]> {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;

    const orgs = await prisma.orgUnit.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            title: true,
            phone: true,
            email: true,
            avatarUrl: true,
            primaryLocation: { select: { id: true, name: true, code: true } },
            roles: {
              select: {
                role: true,
                scopeOrgUnitId: true,
                scopeLocationId: true,
              },
            },
            taskAssignments: {
              where: {
                task: {
                  status: {
                    notIn: ['DONG', 'HUY', 'HOAN_THANH'],
                  },
                },
              },
              select: { id: true },
            },
          },
        },
        _count: {
          select: {
            users: true,
            tasks: true,
          },
        },
      },
    });

    // Map leader for each org
    const nodes: OrgTreeNode[] = orgs.map((org) => {
      // Tìm tổ trưởng / trưởng bộ phận
      const leaderUser = org.users.find(
        (u) =>
          u.roles.some((r) => r.role === Role.TO_TRUONG && (r.scopeOrgUnitId === org.id || !r.scopeOrgUnitId)) ||
          u.roles.some((r) => r.role === Role.HIEU_TRUONG && org.code === 'BGH')
      );

      const mappedUsers = org.users.map((u) => {
        const isLeader =
          u.roles.some((r) => r.role === Role.TO_TRUONG && (r.scopeOrgUnitId === org.id || !r.scopeOrgUnitId)) ||
          (org.code === 'BGH' && u.roles.some((r) => r.role === Role.HIEU_TRUONG));
        return {
          id: u.id,
          fullName: u.fullName,
          title: u.title,
          phone: u.phone,
          email: u.email,
          avatarUrl: u.avatarUrl,
          primaryLocation: u.primaryLocation,
          roles: u.roles,
          currentTaskLoad: u.taskAssignments?.length || 0,
          isToTruong: isLeader,
        };
      });

      // Sắp xếp: Tổ trưởng lên đầu, sau đó theo Tên A-Z
      mappedUsers.sort((a, b) => {
        if (a.isToTruong !== b.isToTruong) return b.isToTruong ? 1 : -1;
        return a.fullName.localeCompare(b.fullName, 'vi');
      });

      return {
        id: org.id,
        name: org.name,
        code: org.code,
        parentId: org.parentId,
        orderIndex: org.orderIndex,
        leader: leaderUser
          ? {
              id: leaderUser.id,
              fullName: leaderUser.fullName,
              title: leaderUser.title,
              phone: leaderUser.phone,
              avatarUrl: leaderUser.avatarUrl,
            }
          : null,
        userCount: org._count.users,
        taskCount: org._count.tasks,
        users: mappedUsers,
        children: [],
      };
    });

    // Xây dựng cây phân cấp cha - con
    const map = new Map<string, OrgTreeNode>();
    nodes.forEach((node) => map.set(node.id, node));

    const tree: OrgTreeNode[] = [];
    nodes.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  }

  async getById(id: string) {
    const org = await prisma.orgUnit.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        users: {
          select: {
            id: true,
            fullName: true,
            title: true,
            phone: true,
            email: true,
            avatarUrl: true,
            primaryLocation: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { users: true, tasks: true },
        },
      },
    });

    if (!org) {
      throw new AppError('Không tìm thấy thông tin tổ chức/phòng ban.', 404);
    }

    return org;
  }

  async create(data: {
    schoolId: string;
    name: string;
    code: string;
    parentId?: string;
    orderIndex?: number;
  }) {
    if (data.parentId) {
      const parent = await prisma.orgUnit.findUnique({ where: { id: data.parentId } });
      if (!parent) {
        throw new AppError('Tổ chức cha không tồn tại.', 400);
      }
    }

    return prisma.orgUnit.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        code: data.code.toUpperCase().trim(),
        parentId: data.parentId || null,
        orderIndex: data.orderIndex ?? 0,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      code?: string;
      parentId?: string | null;
      orderIndex?: number;
    }
  ) {
    const existing = await prisma.orgUnit.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tổ chức/phòng ban.', 404);
    }

    if (data.parentId) {
      if (data.parentId === id) {
        throw new AppError('Tổ chức không thể làm cha của chính nó.', 400);
      }
      const parent = await prisma.orgUnit.findUnique({ where: { id: data.parentId } });
      if (!parent) {
        throw new AppError('Tổ chức cha không tồn tại.', 400);
      }
    }

    return prisma.orgUnit.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code.toUpperCase().trim() }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      },
    });
  }

  async delete(id: string) {
    const existing = await prisma.orgUnit.findUnique({
      where: { id },
      include: {
        children: true,
        _count: { select: { users: true, tasks: true } },
      },
    });

    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tổ chức/phòng ban.', 404);
    }

    if (existing.children.length > 0) {
      throw new AppError('Không thể xóa tổ chức đang có tổ/bộ phận con.', 400);
    }

    if (existing._count.users > 0 || existing._count.tasks > 0) {
      throw new AppError(
        'Không thể xóa tổ chức đang có nhân sự hoặc công việc gắn kết.',
        400
      );
    }

    return prisma.orgUnit.delete({ where: { id } });
  }
}

export const orgUnitService = new OrgUnitService();
