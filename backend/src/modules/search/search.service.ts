import prisma from '../../prisma';
import { Prisma } from '@prisma/client';

export interface GlobalSearchParams {
  tenantId: string;
  query: string;
  type?: 'ALL' | 'TASKS' | 'PLANS' | 'USERS' | 'ATTACHMENTS';
  status?: string;
  limit?: number;
}

export class SearchService {
  /**
   * Tìm kiếm toàn hệ thống theo tenant (TT 022)
   */
  public static async searchGlobal(params: GlobalSearchParams) {
    const { tenantId, query, type = 'ALL', limit = 15 } = params;
    const cleanQ = query.trim();

    if (!cleanQ) {
      return {
        tasks: [],
        plans: [],
        users: [],
        attachments: [],
        total: 0,
      };
    }

    const results: {
      tasks: any[];
      plans: any[];
      users: any[];
      attachments: any[];
      total: number;
    } = {
      tasks: [],
      plans: [],
      users: [],
      attachments: [],
      total: 0,
    };

    // 1. Search Tasks
    if (type === 'ALL' || type === 'TASKS') {
      const taskWhere: Prisma.TaskWhereInput = {
        tenantId,
        OR: [
          { title: { contains: cleanQ, mode: 'insensitive' } },
          { description: { contains: cleanQ, mode: 'insensitive' } },
          { code: { contains: cleanQ, mode: 'insensitive' } },
        ],
      };

      if (params.status && params.status !== 'ALL') {
        taskWhere.status = params.status as any;
      }

      const tasks = await prisma.task.findMany({
        where: taskWhere,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          priority: true,
          progressPercent: true,
          dueDate: true,
          plan: { select: { id: true, title: true } },
          assignedOrgUnit: { select: { id: true, name: true } },
          assignments: {
            where: { role: 'CHU_TRI' },
            select: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
          },
        },
      });

      results.tasks = tasks.map((t) => ({
        ...t,
        assignee: t.assignments[0]?.user || null,
        type: 'TASK',
      }));
    }

    // 2. Search Plans
    if (type === 'ALL' || type === 'PLANS') {
      const plans = await prisma.plan.findMany({
        where: {
          tenantId,
          OR: [
            { title: { contains: cleanQ, mode: 'insensitive' } },
            { description: { contains: cleanQ, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          level: true,
          progressPercent: true,
          startDate: true,
          endDate: true,
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      results.plans = plans.map((p) => ({
        ...p,
        type: 'PLAN',
      }));
    }

    // 3. Search Users
    if (type === 'ALL' || type === 'USERS') {
      const users = await prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { fullName: { contains: cleanQ, mode: 'insensitive' } },
            { email: { contains: cleanQ, mode: 'insensitive' } },
            { phone: { contains: cleanQ, mode: 'insensitive' } },
            { title: { contains: cleanQ, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          title: true,
          avatarUrl: true,
          primaryOrgUnit: { select: { id: true, name: true } },
          primaryLocation: { select: { id: true, name: true } },
        },
      });

      results.users = users.map((u) => ({
        ...u,
        type: 'USER',
      }));
    }

    // 4. Search Attachments (Minh chứng)
    if (type === 'ALL' || type === 'ATTACHMENTS') {
      const attachments = await prisma.attachment.findMany({
        where: {
          tenantId,
          OR: [
            { fileName: { contains: cleanQ, mode: 'insensitive' } },
            { originalName: { contains: cleanQ, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, fullName: true } },
          task: { select: { id: true, title: true, code: true } },
        },
      });

      results.attachments = attachments.map((a) => ({
        ...a,
        type: 'ATTACHMENT',
      }));
    }

    results.total =
      results.tasks.length + results.plans.length + results.users.length + results.attachments.length;
    return results;
  }
}

