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
            avatarUrl: true,
            roles: {
              select: {
                role: true,
                scopeOrgUnitId: true,
              },
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
          u.roles.some((r) => r.role === Role.TO_TRUONG && r.scopeOrgUnitId === org.id) ||
          u.roles.some((r) => r.role === Role.HIEU_TRUONG && org.code === 'BGH')
      );

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
