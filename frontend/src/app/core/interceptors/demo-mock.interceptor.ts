import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import {
  MOCK_SCHOOL_INFO,
  MOCK_LOCATIONS,
  MOCK_LOCATIONS_SUMMARY,
  MOCK_ORG_UNITS,
  MOCK_USERS,
  MOCK_PLANS,
  MOCK_PLAN_TREE,
  MOCK_TASKS,
  MOCK_NOTIFICATIONS,
  MOCK_DASHBOARD_OVERVIEW,
  MOCK_PERMISSIONS_MATRIX,
} from '../mock/demo-mock-data';
import { LocationSummaryItem } from '../models/admin.models';

export const demoMockInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If backend API returns error (500, 502, 503, 504, 404, 0 connection error on Vercel without PostgreSQL)
      if (req.url.startsWith('/api')) {
        const url = req.url;
        const method = req.method.toUpperCase();

        // 0. AUTH & LOGIN (Demo Account Switcher Support)
        if (url.includes('/api/auth')) {
          if (url.includes('/login') && method === 'POST') {
            const body = (req.body || {}) as any;
            const identifier = (body.identifier || '').trim();
            const foundUser =
              MOCK_USERS.find(
                (u) =>
                  u.phone === identifier ||
                  u.email?.toLowerCase() === identifier.toLowerCase() ||
                  u.id === identifier
              ) || MOCK_USERS[0];

            return of(
              new HttpResponse({
                status: 200,
                body: {
                  success: true,
                  data: {
                    accessToken: `mock-jwt-token-${foundUser.id}`,
                    refreshToken: `mock-refresh-token-${foundUser.id}`,
                    user: foundUser,
                  },
                  message: 'Đăng nhập thành công (Chế độ mô phỏng demo).',
                },
              })
            );
          }
          if (url.includes('/refresh')) {
            return of(
              new HttpResponse({
                status: 200,
                body: {
                  success: true,
                  data: {
                    accessToken: 'mock-jwt-refreshed-' + Date.now(),
                    refreshToken: 'mock-refresh-' + Date.now(),
                  },
                },
              })
            );
          }
          if (url.includes('/logout')) {
            return of(new HttpResponse({ status: 200, body: { success: true, message: 'Đăng xuất thành công.' } }));
          }
        }

        // 1. SCHOOL INFO
        if (url.includes('/api/school')) {
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_SCHOOL_INFO } }));
        }

        // 2. LOCATIONS
        if (url.includes('/api/locations')) {
          if (url.includes('/summary')) {
            const idMatch = url.match(/\/api\/locations\/([^/?]+)\/summary/);
            const targetId = idMatch ? idMatch[1] : '';
            const found =
              MOCK_LOCATIONS_SUMMARY.find((l) => l.id === targetId || url.includes(l.id)) ||
              MOCK_LOCATIONS_SUMMARY[0];
            return of(new HttpResponse({ status: 200, body: { success: true, data: found } }));
          }
          if (method === 'GET') {
            return of(
              new HttpResponse({ status: 200, body: { success: true, data: MOCK_LOCATIONS_SUMMARY } })
            );
          }
          if (method === 'POST') {
            const body = (req.body || {}) as any;
            const newId = 'loc-' + Date.now();
            const newLoc: LocationSummaryItem = {
              id: newId,
              name: body.name || 'Điểm trường mới',
              code: (body.code || 'PH_MOI').toUpperCase(),
              address: body.address || '',
              phone: body.phone || '',
              isMain: Boolean(body.isMain),
              manager: null,
              userCount: 0,
              totalTaskCount: 0,
              inProgressTaskCount: 0,
              overdueTaskCount: 0,
              completedTaskCount: 0,
            };
            if (body.managerId) {
              const mgr = MOCK_USERS.find((u) => u.id === body.managerId);
              if (mgr) {
                newLoc.manager = {
                  id: mgr.id,
                  fullName: mgr.fullName,
                  phone: mgr.phone,
                  email: mgr.email,
                  title: mgr.title || 'Phụ trách',
                };
              }
            }
            if (newLoc.isMain) {
              MOCK_LOCATIONS_SUMMARY.forEach((l) => (l.isMain = false));
              MOCK_LOCATIONS.forEach((l) => ((l as any).isMain = false));
              MOCK_SCHOOL_INFO.locations?.forEach((l) => (l.isMain = false));
            }
            MOCK_LOCATIONS_SUMMARY.push(newLoc);
            MOCK_LOCATIONS.push({
              id: newLoc.id,
              name: newLoc.name,
              code: newLoc.code,
              address: newLoc.address,
              phone: newLoc.phone,
            });
            MOCK_SCHOOL_INFO.locations?.push({
              id: newLoc.id,
              name: newLoc.name,
              code: newLoc.code,
              address: newLoc.address || undefined,
              phone: newLoc.phone || undefined,
              studentCount: 0,
              femaleStudentCount: 0,
              classCount: 0,
              userCount: 0,
              isMain: newLoc.isMain,
            });
            return of(
              new HttpResponse({
                status: 201,
                body: { success: true, message: 'Tạo mới điểm trường thành công.', data: newLoc },
              })
            );
          }
          if (method === 'PATCH' || method === 'PUT') {
            const idMatch = url.match(/\/api\/locations\/([^/?]+)/);
            const targetId = idMatch ? idMatch[1] : '';
            const body = (req.body || {}) as any;
            const found =
              MOCK_LOCATIONS_SUMMARY.find((l) => l.id === targetId) || MOCK_LOCATIONS_SUMMARY[0];
            if (found) {
              if (body.name !== undefined) found.name = body.name;
              if (body.code !== undefined) found.code = body.code.toUpperCase();
              if (body.address !== undefined) found.address = body.address;
              if (body.phone !== undefined) found.phone = body.phone;
              if (body.isMain !== undefined) {
                found.isMain = Boolean(body.isMain);
                if (found.isMain) {
                  MOCK_LOCATIONS_SUMMARY.forEach((l) => {
                    if (l.id !== found.id) l.isMain = false;
                  });
                  MOCK_LOCATIONS.forEach((l) => {
                    if (l.id !== found.id) (l as any).isMain = false;
                    else (l as any).isMain = true;
                  });
                  MOCK_SCHOOL_INFO.locations?.forEach((l) => {
                    if (l.id !== found.id) l.isMain = false;
                    else l.isMain = true;
                  });
                }
              }
              if (body.managerId !== undefined) {
                if (!body.managerId) {
                  found.manager = null;
                } else {
                  const mgr = MOCK_USERS.find((u) => u.id === body.managerId);
                  if (mgr) {
                    found.manager = {
                      id: mgr.id,
                      fullName: mgr.fullName,
                      phone: mgr.phone,
                      email: mgr.email,
                      title: mgr.title || 'Phụ trách',
                    };
                  }
                }
              }
              const mockLoc = MOCK_LOCATIONS.find((l) => l.id === found.id);
              if (mockLoc) {
                mockLoc.name = found.name;
                mockLoc.code = found.code;
                mockLoc.address = found.address;
                mockLoc.phone = found.phone;
              }
              const schLoc = MOCK_SCHOOL_INFO.locations?.find((l) => l.id === found.id);
              if (schLoc) {
                schLoc.name = found.name;
                schLoc.code = found.code;
                schLoc.address = found.address || undefined;
                schLoc.phone = found.phone || undefined;
                schLoc.isMain = found.isMain;
              }
              return of(
                new HttpResponse({
                  status: 200,
                  body: { success: true, message: 'Cập nhật điểm trường thành công.', data: found },
                })
              );
            }
          }
          if (method === 'DELETE') {
            const idMatch = url.match(/\/api\/locations\/([^/?]+)/);
            const targetId = idMatch ? idMatch[1] : '';
            const idx = MOCK_LOCATIONS_SUMMARY.findIndex((l) => l.id === targetId);
            if (idx >= 0) MOCK_LOCATIONS_SUMMARY.splice(idx, 1);
            const idx2 = MOCK_LOCATIONS.findIndex((l) => l.id === targetId);
            if (idx2 >= 0) MOCK_LOCATIONS.splice(idx2, 1);
            const idx3 = MOCK_SCHOOL_INFO.locations?.findIndex((l) => l.id === targetId) ?? -1;
            if (idx3 >= 0 && MOCK_SCHOOL_INFO.locations)
              MOCK_SCHOOL_INFO.locations.splice(idx3, 1);
            return of(
              new HttpResponse({
                status: 200,
                body: { success: true, message: 'Xóa điểm trường thành công.' },
              })
            );
          }
          return of(
            new HttpResponse({
              status: 200,
              body: { success: true, data: MOCK_LOCATIONS_SUMMARY[0], message: 'Thành công' },
            })
          );
        }

        // 3. ORG UNITS & ORG TREE
        if (url.includes('/api/org/tree')) {
          const orgTree = MOCK_ORG_UNITS.map((org, index) => ({
            id: org.id,
            name: org.name,
            code: org.code,
            parentId: null,
            orderIndex: index + 1,
            userCount: MOCK_USERS.filter((u) => u.primaryOrgUnit?.id === org.id).length,
            taskCount: 6,
            users: MOCK_USERS.filter((u) => u.primaryOrgUnit?.id === org.id),
            children: [],
          }));
          return of(new HttpResponse({ status: 200, body: { success: true, data: orgTree } }));
        }
        if (url.includes('/api/org')) {
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_ORG_UNITS } }));
        }

        // 4. PLANS
        if (url.includes('/api/plans')) {
          if (url.includes('/api/plans/tree')) {
            const rootMatch = url.match(/[?&]rootPlanId=([^&]+)/);
            const rootPlanId = rootMatch ? rootMatch[1] : undefined;

            // Dynamically build plan tree with actual child tasks
            const planTasksM1 = MOCK_TASKS.slice(0, 8).map((t) => ({
              ...t,
              planId: 'plan-m1',
              plan: MOCK_PLANS.find((p) => p.id === 'plan-m1'),
            }));
            const planTasksM2 = MOCK_TASKS.slice(8, 18).map((t) => ({
              ...t,
              planId: 'plan-m2',
              plan: MOCK_PLANS.find((p) => p.id === 'plan-m2'),
            }));
            const planTasksM3 = MOCK_TASKS.slice(18, 25).map((t) => ({
              ...t,
              planId: 'plan-m3',
              plan: MOCK_PLANS.find((p) => p.id === 'plan-m3'),
            }));

            const nodeM1 = {
              id: 'plan-m1',
              title: '1. Ổn định tổ chức bộ máy và nhân sự sau sáp nhập 3 điểm trường',
              description: 'Kiện toàn các tổ chuyên môn, ban hành quy chế làm việc và phân công nhiệm vụ',
              level: 'THANG' as any,
              startDate: '2026-08-15',
              endDate: '2026-09-15',
              progressPercent: 90,
              taskCount: planTasksM1.length,
              completedTaskCount: planTasksM1.filter((t) => t.status === 'HOAN_THANH' || t.status === 'DONG').length,
              tasks: planTasksM1 as any[],
              children: [],
            };

            const nodeM2 = {
              id: 'plan-m2',
              title: '2. Hoàn thiện và công khai Kế hoạch giáo dục nhà trường',
              description: 'Xây dựng ma trận dạy học, phân phối chương trình và các chuyên đề đổi mới PPDH',
              level: 'THANG' as any,
              startDate: '2026-08-20',
              endDate: '2026-09-20',
              progressPercent: 75,
              taskCount: planTasksM2.length,
              completedTaskCount: planTasksM2.filter((t) => t.status === 'HOAN_THANH' || t.status === 'DONG').length,
              tasks: planTasksM2 as any[],
              children: [],
            };

            const nodeM3 = {
              id: 'plan-m3',
              title: '3. Kiểm tra chuyên đề đổi mới phương pháp dạy học & KTĐG',
              description: 'Kiểm tra hồ sơ giáo án, sinh hoạt chuyên môn cụm trường và hoạt động trải nghiệm',
              level: 'THANG' as any,
              startDate: '2026-09-01',
              endDate: '2026-09-30',
              progressPercent: 45,
              taskCount: planTasksM3.length,
              completedTaskCount: planTasksM3.filter((t) => t.status === 'HOAN_THANH' || t.status === 'DONG').length,
              tasks: planTasksM3 as any[],
              children: [],
            };

            const monthPlans = [nodeM1, nodeM2, nodeM3];
            const term1TasksCount = monthPlans.reduce((sum, p) => sum + p.taskCount, 0);
            const term1CompletedCount = monthPlans.reduce((sum, p) => sum + p.completedTaskCount, 0);

            const nodeTerm1: any = {
              id: 'plan-term1',
              title: 'Kế hoạch Học kỳ I (Năm học 2026 - 2027)',
              description: 'Trọng tâm ổn định bộ máy, chuẩn hóa cơ sở vật chất và nâng cao chất lượng dạy học',
              level: 'HOC_KY' as any,
              startDate: '2026-08-15',
              endDate: '2027-01-15',
              progressPercent: 55,
              taskCount: term1TasksCount,
              completedTaskCount: term1CompletedCount,
              tasks: [] as any[],
              children: monthPlans,
            };

            const nodeYear: any = {
              id: 'plan-year',
              title: 'Kế hoạch Chiến lược & Hoạt động Năm học 2026 - 2027',
              description: 'Kế hoạch tổng thể vận hành trường TH và THCS Phước Tân sau sáp nhập 3 điểm trường',
              level: 'NAM' as any,
              startDate: '2026-08-01',
              endDate: '2027-05-31',
              progressPercent: 42,
              taskCount: term1TasksCount,
              completedTaskCount: term1CompletedCount,
              tasks: [] as any[],
              children: [nodeTerm1],
            };

            let resultTree: any[] = [nodeYear];
            if (rootPlanId === 'plan-term1') resultTree = [nodeTerm1];
            else if (rootPlanId === 'plan-m1') resultTree = [nodeM1];
            else if (rootPlanId === 'plan-m2') resultTree = [nodeM2];
            else if (rootPlanId === 'plan-m3') resultTree = [nodeM3];

            return of(new HttpResponse({ status: 200, body: { success: true, data: resultTree } }));
          }
          if (url.includes('/duplicate')) {
            const body = (req.body || {}) as any;
            const newId = 'plan-' + Date.now();
            const newPlan: any = {
              id: newId,
              schoolId: 'school-phuoc-tan',
              title: body.newTitle || 'Kế hoạch sao chép',
              level: 'THANG',
              startDate: body.newStartDate || '2026-10-01',
              endDate: body.newEndDate || '2026-10-31',
              progressPercent: 0,
              createdById: 'u-hieutruong',
              createdAt: new Date().toISOString(),
              _count: { childrenPlans: 0, tasks: 0 },
            };
            MOCK_PLANS.push(newPlan);
            return of(new HttpResponse({ status: 201, body: { success: true, data: newPlan, message: 'Sao chép kế hoạch thành công.' } }));
          }
          if (url.includes('/generate-tasks')) {
            const body = (req.body || []) as any[];
            const tasksList = Array.isArray(body) ? body : [body];
            const created = tasksList.map((t, idx) => ({
              id: 'task-gen-' + Date.now() + '-' + idx,
              schoolId: 'school-phuoc-tan',
              code: 'CV_KH_' + (idx + 1),
              title: t.title || 'Công việc từ kế hoạch',
              description: t.description || '',
              status: 'DA_GIAO',
              priority: t.priority || 'TRUNG_BINH',
              progressPercent: 0,
              startDate: t.startDate || new Date().toISOString().slice(0, 10),
              dueDate: t.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
              createdById: t.chuTriId || 'u-hieutruong',
              createdAt: new Date().toISOString(),
            }));
            MOCK_TASKS.unshift(...(created as any[]));
            return of(new HttpResponse({ status: 201, body: { success: true, data: created, message: 'Đã tạo công việc từ kế hoạch.' } }));
          }
          if (method === 'GET') {
            const planIdMatch = url.match(/\/api\/plans\/([a-zA-Z0-9_-]+)/);
            if (planIdMatch && planIdMatch[1] && planIdMatch[1] !== 'tree') {
              const found = MOCK_PLANS.find((p) => p.id === planIdMatch[1]) || MOCK_PLANS[0];
              return of(new HttpResponse({ status: 200, body: { success: true, data: found } }));
            }
            return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_PLANS } }));
          }
          if (method === 'POST') {
            const body = (req.body || {}) as any;
            const newId = 'plan-' + Date.now();
            const newPlan: any = {
              id: newId,
              schoolId: 'school-phuoc-tan',
              title: body.title || 'Kế hoạch mới',
              description: body.description || '',
              level: body.level || 'TUAN',
              parentPlanId: body.parentPlanId || null,
              startDate: body.startDate || new Date().toISOString().slice(0, 10),
              endDate: body.endDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
              progressPercent: 0,
              createdById: 'u-hieutruong',
              createdAt: new Date().toISOString(),
              _count: { childrenPlans: 0, tasks: 0 },
            };
            MOCK_PLANS.push(newPlan);
            return of(new HttpResponse({ status: 201, body: { success: true, data: newPlan, message: 'Tạo kế hoạch thành công.' } }));
          }
          if (method === 'PATCH' || method === 'PUT') {
            const planIdMatch = url.match(/\/api\/plans\/([a-zA-Z0-9_-]+)/);
            const targetId = planIdMatch ? planIdMatch[1] : '';
            const body = (req.body || {}) as any;
            const target = MOCK_PLANS.find((p) => p.id === targetId);
            if (target) {
              if (body.title !== undefined) target.title = body.title;
              if (body.description !== undefined) target.description = body.description;
              if (body.level !== undefined) target.level = body.level;
              if (body.parentPlanId !== undefined) target.parentPlanId = body.parentPlanId;
              if (body.startDate !== undefined) target.startDate = body.startDate;
              if (body.endDate !== undefined) target.endDate = body.endDate;
              return of(new HttpResponse({ status: 200, body: { success: true, data: target, message: 'Cập nhật kế hoạch thành công.' } }));
            }
          }
          if (method === 'DELETE') {
            const planIdMatch = url.match(/\/api\/plans\/([a-zA-Z0-9_-]+)/);
            const targetId = planIdMatch ? planIdMatch[1] : '';
            const idx = MOCK_PLANS.findIndex((p) => p.id === targetId);
            if (idx >= 0) MOCK_PLANS.splice(idx, 1);
            return of(new HttpResponse({ status: 200, body: { success: true, message: 'Xóa kế hoạch thành công.' } }));
          }
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_PLANS[0], message: 'Thành công' } }));
        }

        // 5. DASHBOARD
        if (url.includes('/api/dashboard/overview')) {
          const locMatch = url.match(/[?&]locationId=([^&]+)/);
          const orgMatch = url.match(/[?&]orgUnitId=([^&]+)/);
          const locationId = locMatch ? locMatch[1] : '';
          const orgUnitId = orgMatch ? orgMatch[1] : '';

          let tasks = MOCK_TASKS;
          if (locationId) {
            tasks = tasks.filter((t) => t.location?.id === locationId || (t as any).locationId === locationId);
          }
          if (orgUnitId) {
            tasks = tasks.filter((t) => t.orgUnit?.id === orgUnitId || (t as any).orgUnitId === orgUnitId);
          }

          const completedStatuses = ['HOAN_THANH', 'XAC_NHAN', 'DONG'];
          const inProgressStatuses = ['DA_GIAO', 'DA_TIEP_NHAN', 'DANG_THUC_HIEN'];
          const pendingReviewStatuses = ['CHO_KIEM_TRA', 'BO_SUNG'];

          const totalTasks = tasks.length;
          const completedCount = tasks.filter((t) => completedStatuses.includes(t.status)).length;
          const inProgressCount = tasks.filter((t) => inProgressStatuses.includes(t.status)).length;
          const pendingReviewCount = tasks.filter((t) => pendingReviewStatuses.includes(t.status)).length;
          const overdueCount = tasks.filter((t) => Boolean(t.isOverdue)).length;

          const byStatus: any = {
            NHAP: 0,
            DA_GIAO: 0,
            DA_TIEP_NHAN: 0,
            DANG_THUC_HIEN: 0,
            CHO_KIEM_TRA: 0,
            BO_SUNG: 0,
            HOAN_THANH: 0,
            XAC_NHAN: 0,
            DONG: 0,
            TAM_DUNG: 0,
            HUY: 0,
          };
          tasks.forEach((t) => {
            if (byStatus[t.status] !== undefined) byStatus[t.status]++;
          });

          const attentionTasks = tasks
            .filter((t) => t.isOverdue || t.status === 'CHO_KIEM_TRA' || t.status === 'BO_SUNG' || t.priority === 'KHAN_CAP' || t.priority === 'CAO')
            .slice(0, 15)
            .map((t) => {
              const chuTriAsg = t.assignments?.find((a) => a.role === 'CHU_TRI');
              const chuTriUser = chuTriAsg?.user;
              let reason = 'Đang thực hiện đúng tiến độ';
              if (t.isOverdue) reason = 'Đã quá hạn hoàn thành';
              else if (t.status === 'CHO_KIEM_TRA') reason = 'Đã nộp minh chứng, chờ nghiệm thu';
              else if (t.status === 'BO_SUNG') reason = 'Yêu cầu bổ sung thông tin/minh chứng';
              else if (t.priority === 'KHAN_CAP') reason = 'Nhiệm vụ khẩn cấp';
              else if (t.priority === 'CAO') reason = 'Nhiệm vụ trọng tâm';

              return {
                id: t.id,
                code: t.code || 'CV-' + t.id.slice(-5),
                title: t.title,
                status: t.status,
                priority: t.priority,
                progressPercent: t.progressPercent || 0,
                dueDate: t.dueDate,
                isOverdue: Boolean(t.isOverdue),
                reason,
                priorityLevel: t.priority === 'KHAN_CAP' ? 3 : t.priority === 'CAO' ? 2 : 1,
                locationName: t.location?.name || 'Điểm chính',
                orgUnitName: t.orgUnit?.name || 'Ban Giám hiệu',
                chuTri: chuTriUser
                  ? {
                      id: chuTriUser.id,
                      fullName: chuTriUser.fullName,
                      title: chuTriUser.title || 'Cán bộ',
                      phone: chuTriUser.phone || '0903111222',
                      avatarUrl: chuTriUser.avatarUrl,
                      locationName: chuTriUser.primaryLocation?.name || 'Điểm chính',
                    }
                  : null,
              };
            });

          const breakdownByLocation = MOCK_LOCATIONS.map((loc) => {
            const locTasks = MOCK_TASKS.filter(
              (t) => t.location?.id === loc.id || (t as any).locationId === loc.id || (loc.id === 'loc-main' && !t.location)
            );
            const cCount = locTasks.filter((t) => completedStatuses.includes(t.status)).length;
            const pCount = locTasks.filter((t) => inProgressStatuses.includes(t.status)).length;
            const prCount = locTasks.filter((t) => pendingReviewStatuses.includes(t.status)).length;
            const oCount = locTasks.filter((t) => Boolean(t.isOverdue)).length;
            return {
              id: loc.id,
              name: loc.name,
              code: loc.code,
              isMain: loc.code === 'DIEM_CHINH' || (loc as any).isMain === true,
              totalTasks: locTasks.length,
              completedTasks: cCount,
              inProgressTasks: pCount,
              pendingReviewTasks: prCount,
              overdueTasks: oCount,
              completionRate: locTasks.length > 0 ? Math.round((cCount / locTasks.length) * 100) : 0,
            };
          });

          const breakdownByOrgUnit = MOCK_ORG_UNITS.map((org) => {
            const orgTasks = MOCK_TASKS.filter(
              (t) => t.orgUnit?.id === org.id || (t as any).orgUnitId === org.id || (org.id === 'org-bgh' && !t.orgUnit)
            );
            const cCount = orgTasks.filter((t) => completedStatuses.includes(t.status)).length;
            const pCount = orgTasks.filter((t) => inProgressStatuses.includes(t.status)).length;
            const prCount = orgTasks.filter((t) => pendingReviewStatuses.includes(t.status)).length;
            const oCount = orgTasks.filter((t) => Boolean(t.isOverdue)).length;
            return {
              id: org.id,
              name: org.name,
              code: org.code,
              totalTasks: orgTasks.length,
              completedTasks: cCount,
              inProgressTasks: pCount,
              pendingReviewTasks: prCount,
              overdueTasks: oCount,
              completionRate: orgTasks.length > 0 ? Math.round((cCount / orgTasks.length) * 100) : 0,
            };
          });

          const overviewData = {
            totalTasks,
            byStatus,
            overdueCount,
            completedCount,
            inProgressCount,
            pendingReviewCount,
            attentionTasks,
            breakdownByLocation,
            breakdownByOrgUnit,
          };

          return of(new HttpResponse({ status: 200, body: { success: true, data: overviewData } }));
        }

        // 6. NOTIFICATIONS
        if (url.includes('/api/notifications')) {
          return of(
            new HttpResponse({
              status: 200,
              body: {
                success: true,
                data: {
                  items: MOCK_NOTIFICATIONS,
                  total: MOCK_NOTIFICATIONS.length,
                  unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length,
                  page: 1,
                  pageSize: 20,
                  totalPages: 1,
                },
              },
            })
          );
        }

        // 7. TASKS
        if (url.includes('/api/tasks')) {
          // 7.1 Comments Endpoint: POST /api/tasks/:id/comments
          if (url.includes('/comments') && method === 'POST') {
            const taskIdMatch = url.match(/\/api\/tasks\/([a-zA-Z0-9_-]+)\/comments/);
            const taskId = taskIdMatch ? taskIdMatch[1] : '';
            let targetTask: any = MOCK_TASKS.find((t) => t.id === taskId || t.code === taskId);
            if (!targetTask) {
              targetTask = {
                id: taskId,
                title: 'Công việc',
                code: 'CV-' + taskId.slice(-6),
                status: 'DA_GIAO',
                priority: 'TRUNG_BINH',
                assignments: [],
                comments: [],
                logs: [],
              } as any;
              MOCK_TASKS.unshift(targetTask);
            }
            const body = (req.body || {}) as any;
            let currentUser: any = MOCK_USERS[0];
            try {
              const stored = localStorage.getItem('tn_edu_user_profile') || localStorage.getItem('currentUser');
              if (stored) currentUser = JSON.parse(stored);
            } catch (e) {}

            const newComment = {
              id: 'cmt-' + Date.now(),
              taskId: targetTask.id,
              userId: currentUser.id || 'u-hieutruong',
              content: body.content || '',
              createdAt: new Date().toISOString(),
              user: {
                id: currentUser.id || 'u-hieutruong',
                fullName: currentUser.fullName || 'Thầy Hiệu Trưởng',
                title: currentUser.title || 'Hiệu trưởng',
                avatarUrl: currentUser.avatarUrl || null,
                phone: currentUser.phone || '',
              },
            };

            if (!targetTask.comments) targetTask.comments = [];
            targetTask.comments.push(newComment as any);

            return of(
              new HttpResponse({
                status: 201,
                body: { success: true, data: newComment, message: 'Thêm trao đổi thành công.' },
              })
            );
          }

          // 7.2 Status Update: PATCH /api/tasks/:id/status
          if (url.includes('/status') && method === 'PATCH') {
            const taskIdMatch = url.match(/\/api\/tasks\/([a-zA-Z0-9_-]+)\/status/);
            const taskId = taskIdMatch ? taskIdMatch[1] : '';
            let targetTask: any = MOCK_TASKS.find((t) => t.id === taskId || t.code === taskId);
            if (!targetTask) {
              targetTask = {
                id: taskId,
                title: 'Công việc',
                code: 'CV-' + taskId.slice(-6),
                status: 'DA_GIAO',
                priority: 'TRUNG_BINH',
                assignments: [],
                comments: [],
                logs: [],
              } as any;
              MOCK_TASKS.unshift(targetTask);
            }
            const body = (req.body || {}) as any;
            const oldStatus = targetTask.status;
            targetTask.status = body.status;
            if (body.status === 'HOAN_THANH') {
              targetTask.progressPercent = 100;
              targetTask.completedAt = new Date().toISOString();
            }

            let currentUser: any = MOCK_USERS[0];
            try {
              const stored = localStorage.getItem('tn_edu_user_profile') || localStorage.getItem('currentUser');
              if (stored) currentUser = JSON.parse(stored);
            } catch (e) {}

            if (!targetTask.logs) targetTask.logs = [];
            targetTask.logs.unshift({
              id: 'log-' + Date.now(),
              taskId: targetTask.id,
              userId: currentUser.id || 'u-hieutruong',
              action: `CHUYEN_TRANG_THAI_${body.status}`,
              oldStatus,
              newStatus: body.status,
              oldProgress: targetTask.progressPercent,
              newProgress: targetTask.progressPercent,
              note: body.note || `Chuyển trạng thái sang ${body.status}`,
              createdAt: new Date().toISOString(),
              user: currentUser,
            } as any);

            return of(
              new HttpResponse({
                status: 200,
                body: { success: true, data: targetTask, message: 'Cập nhật trạng thái thành công.' },
              })
            );
          }

          // 7.3 Progress Update: PATCH /api/tasks/:id/progress
          if (url.includes('/progress') && method === 'PATCH') {
            const taskIdMatch = url.match(/\/api\/tasks\/([a-zA-Z0-9_-]+)\/progress/);
            const taskId = taskIdMatch ? taskIdMatch[1] : '';
            let targetTask: any = MOCK_TASKS.find((t) => t.id === taskId || t.code === taskId);
            if (!targetTask) {
              targetTask = {
                id: taskId,
                title: 'Công việc',
                code: 'CV-' + taskId.slice(-6),
                status: 'DA_GIAO',
                priority: 'TRUNG_BINH',
                assignments: [],
                comments: [],
                logs: [],
              } as any;
              MOCK_TASKS.unshift(targetTask);
            }
            const body = (req.body || {}) as any;
            const oldProg = targetTask.progressPercent;
            targetTask.progressPercent = Number(body.progressPercent) || 0;

            let currentUser: any = MOCK_USERS[0];
            try {
              const stored = localStorage.getItem('tn_edu_user_profile') || localStorage.getItem('currentUser');
              if (stored) currentUser = JSON.parse(stored);
            } catch (e) {}

            if (!targetTask.logs) targetTask.logs = [];
            targetTask.logs.unshift({
              id: 'log-' + Date.now(),
              taskId: targetTask.id,
              userId: currentUser.id || 'u-hieutruong',
              action: 'CAP_NHAT_TIEN_DO',
              oldProgress: oldProg,
              newProgress: targetTask.progressPercent,
              note: body.note || `Cập nhật tiến độ lên ${targetTask.progressPercent}%`,
              createdAt: new Date().toISOString(),
              user: currentUser,
            } as any);

            return of(
              new HttpResponse({
                status: 200,
                body: { success: true, data: targetTask, message: 'Cập nhật tiến độ thành công.' },
              })
            );
          }

          // 7.4 General Task Update: PATCH / PUT /api/tasks/:id
          if (method === 'PATCH' || method === 'PUT') {
            const taskIdMatch = url.match(/\/api\/tasks\/([a-zA-Z0-9_-]+)/);
            const taskId = taskIdMatch ? taskIdMatch[1] : '';
            let targetTask: any = MOCK_TASKS.find((t) => t.id === taskId || t.code === taskId);
            if (!targetTask) {
              targetTask = {
                id: taskId,
                title: 'Công việc',
                code: 'CV-' + taskId.slice(-6),
                status: 'DA_GIAO',
                priority: 'TRUNG_BINH',
                assignments: [],
                comments: [],
                logs: [],
              } as any;
              MOCK_TASKS.unshift(targetTask);
            }
            const body = (req.body || {}) as any;
            if (body.dueDate !== undefined) targetTask.dueDate = body.dueDate;
            if (body.startDate !== undefined) targetTask.startDate = body.startDate;
            if (body.title !== undefined) targetTask.title = body.title;
            if (body.description !== undefined) targetTask.description = body.description;
            if (body.locationId !== undefined) {
              targetTask.locationId = body.locationId;
              const loc = MOCK_LOCATIONS.find((l) => l.id === body.locationId);
              if (loc) (targetTask as any).location = loc;
            }
            if (body.priority !== undefined) targetTask.priority = body.priority;

            return of(
              new HttpResponse({
                status: 200,
                body: { success: true, data: targetTask, message: 'Cập nhật công việc thành công.' },
              })
            );
          }

          // 7.5 Create Task: POST /api/tasks
          if (method === 'POST') {
            const body = (req.body || {}) as any;
            let currentUser: any = MOCK_USERS[0];
            try {
              const stored = localStorage.getItem('tn_edu_user_profile') || localStorage.getItem('currentUser');
              if (stored) currentUser = JSON.parse(stored);
            } catch (e) {}

            const newId = 'task-' + Date.now();
            const loc = body.locationId ? MOCK_LOCATIONS.find((l) => l.id === body.locationId) : null;
            const newTask: any = {
              id: newId,
              schoolId: 'school-phuoc-tan',
              code: 'CV-' + Date.now().toString().slice(-6),
              title: body.title || 'Công việc mới',
              description: body.description || '',
              planId: body.planId || null,
              locationId: body.locationId || null,
              location: loc || undefined,
              priority: body.priority || 'TRUNG_BINH',
              status: body.assignments && body.assignments.length > 0 ? 'DA_GIAO' : 'NHAP',
              progressPercent: 0,
              requireAttachment: body.requireAttachment ?? false,
              startDate: body.startDate || new Date().toISOString().slice(0, 10),
              dueDate: body.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
              createdById: currentUser.id || 'u-hieutruong',
              createdBy: currentUser,
              createdAt: new Date().toISOString(),
              assignments: (body.assignments || []).map((a: any) => {
                const user = MOCK_USERS.find((u) => u.id === a.userId) || currentUser;
                return {
                  id: 'asg-' + Math.random().toString(36).slice(2, 8),
                  taskId: newId,
                  userId: a.userId,
                  role: a.role,
                  note: a.note,
                  user,
                };
              }),
              attachments: [],
              comments: [],
              logs: [
                {
                  id: 'log-' + Date.now(),
                  taskId: newId,
                  userId: currentUser.id || 'u-hieutruong',
                  action: 'TAO_MOI',
                  note: 'Tạo mới công việc',
                  createdAt: new Date().toISOString(),
                  user: currentUser,
                },
              ],
            };
            MOCK_TASKS.unshift(newTask);
            return of(
              new HttpResponse({
                status: 201,
                body: { success: true, data: newTask, message: 'Tạo công việc thành công.' },
              })
            );
          }

          // 7.6 GET /api/tasks & /api/tasks/:id
          if (method === 'GET') {
            // Task Detail: /api/tasks/:id or /api/tasks/:id/full
            const taskIdMatch = url.match(/\/api\/tasks\/([a-zA-Z0-9_-]+)(?:\/full)?(?:\?.*)?$/);
            if (taskIdMatch && taskIdMatch[1] && taskIdMatch[1] !== 'my' && taskIdMatch[1] !== 'recent') {
              const taskId = taskIdMatch[1];
              let found = MOCK_TASKS.find((t) => t.id === taskId || t.code === taskId);
              if (found) {
                return of(new HttpResponse({ status: 200, body: { success: true, data: found } }));
              }
              // If not found in static array, create a synthesized task for that ID
              const synthesizedTask: any = {
                id: taskId,
                schoolId: 'school-phuoc-tan',
                code: 'CV-' + taskId.slice(-6).toUpperCase(),
                title: 'Sinh hoạt chuyên môn cụm tổ Toán - Tin học',
                description: 'Trao đổi phương pháp giảng dạy liên phân hiệu và thống nhất đề kiểm tra giữa kỳ.',
                status: 'DA_GIAO',
                priority: 'TRUNG_BINH',
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                progressPercent: 0,
                requireAttachment: true,
                createdById: 'u-hieutruong',
                createdBy: MOCK_USERS[0],
                createdAt: new Date().toISOString(),
                assignments: [
                  {
                    id: 'asg-' + Date.now(),
                    taskId: taskId,
                    userId: 'u-gv-nhung',
                    role: 'CHU_TRI',
                    user: MOCK_USERS[6],
                  },
                ],
                attachments: [],
                comments: [],
                logs: [],
              };
              MOCK_TASKS.unshift(synthesizedTask);
              return of(new HttpResponse({ status: 200, body: { success: true, data: synthesizedTask } }));
            }

            // Tasks List with dynamic filters
            let filtered = [...MOCK_TASKS];
            const myTasksParam = req.params.get('myTasks');
            const searchParam = req.params.get('search');
            const statusParam = req.params.get('status');
            const priorityParam = req.params.get('priority');

            const assigneeIdParam = req.params.get('assigneeId');

            if (myTasksParam === 'true' || assigneeIdParam) {
              let curUserId = assigneeIdParam || '';
              let curUserPhone = '';
              let curUserName = '';
              try {
                const stored = localStorage.getItem('tn_edu_user_profile') || localStorage.getItem('currentUser');
                if (stored) {
                  const u = JSON.parse(stored);
                  if (!curUserId && u.id) curUserId = u.id;
                  if (u.phone) curUserPhone = u.phone;
                  if (u.fullName) curUserName = u.fullName;
                }
              } catch (e) {}

              filtered = filtered.filter((t) =>
                t.assignments?.some((a: any) => {
                  const aid = a.userId || a.user?.id;
                  const aphone = a.user?.phone;
                  const aname = a.user?.fullName;
                  return (
                    (curUserId && aid === curUserId) ||
                    (curUserPhone && aphone === curUserPhone) ||
                    (curUserName && aname && aname.trim().toLowerCase() === curUserName.trim().toLowerCase())
                  );
                })
              );
            }

            if (searchParam && searchParam.trim()) {
              const q = searchParam.toLowerCase().trim();
              filtered = filtered.filter(
                (t) =>
                  t.title.toLowerCase().includes(q) ||
                  (t.code && t.code.toLowerCase().includes(q)) ||
                  (t.description && t.description.toLowerCase().includes(q))
              );
            }

            if (statusParam) {
              filtered = filtered.filter((t) => t.status === statusParam);
            }

            if (priorityParam) {
              filtered = filtered.filter((t) => t.priority === priorityParam);
            }

            return of(
              new HttpResponse({
                status: 200,
                body: {
                  success: true,
                  data: {
                    items: filtered,
                    total: filtered.length,
                    page: 1,
                    pageSize: filtered.length,
                    totalPages: 1,
                  },
                },
              })
            );
          }
        }

        // 8. USERS & ADMIN
        if (url.includes('/api/admin/permissions-matrix')) {
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_PERMISSIONS_MATRIX } }));
        }
        if (url.includes('/api/admin/users') || url.includes('/api/users')) {
          if (url.includes('/recent-collaborators')) {
            return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_USERS.slice(0, 5) } }));
          }
          return of(
            new HttpResponse({
              status: 200,
              body: {
                success: true,
                data: {
                  items: MOCK_USERS,
                  total: MOCK_USERS.length,
                  page: 1,
                  pageSize: 20,
                  totalPages: 1,
                },
              },
            })
          );
        }

        // Default generic success response for mutations (POST/PUT/PATCH/DELETE)
        if (method !== 'GET') {
          return of(new HttpResponse({ status: 200, body: { success: true, message: 'Thao tác đã được ghi nhận.' } }));
        }
      }

      return of(new HttpResponse({ status: 200, body: { success: true, data: {} } }));
    })
  );
};
