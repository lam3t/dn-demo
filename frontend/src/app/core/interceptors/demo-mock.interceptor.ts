import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { catchError, of, throwError } from 'rxjs';
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
  MOCK_DOCUMENT_FOLDERS,
  MOCK_DOCUMENT_FILES,
} from '../mock/demo-mock-data';
import { LocationSummaryItem } from '../models/admin.models';

export const demoMockInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 1. NEVER mock client/auth errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 409 Conflict, 422 Unprocessable Entity)
      // These are genuine business validation & security errors from the backend that must be displayed to the user.
      if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 409 || error.status === 422) {
        return throwError(() => error);
      }

      // If backend API returns error (500, 502, 503, 504, 404, 0 connection error on static preview without server)
      if (req.url.startsWith('/api')) {
        const url = req.urlWithParams || req.url;
        const method = req.method.toUpperCase();
        const reqAcademicYear = (req.headers.get('X-Academic-Year') || req.params.get('schoolYear') || (url.match(/[?&]schoolYear=([^&]+)/)?.[1]) || '2026-2027').trim();

        // 0. AUTH & LOGIN (Only for static offline demo preview with status === 0 or 404)
        if (url.includes('/api/auth')) {
          if (url.includes('/login') && method === 'POST') {
            // If backend is running and returned any response, do not fake a login
            if (error.status !== 0 && error.status !== 404) {
              return throwError(() => error);
            }

            const body = (req.body || {}) as any;
            const identifier = (body.identifier || '').trim();
            const password = (body.password || '').trim();

            const foundUser = MOCK_USERS.find(
              (u) =>
                u.phone === identifier ||
                u.email?.toLowerCase() === identifier.toLowerCase() ||
                u.id === identifier
            );

            // If user is not found or credentials do not match demo credentials, reject login
            if (!foundUser) {
              return throwError(
                () =>
                  new HttpErrorResponse({
                    error: { success: false, message: 'Tài khoản hoặc mật khẩu không chính xác.' },
                    status: 401,
                    statusText: 'Unauthorized',
                  })
              );
            }

            const userProfile = {
              ...foundUser,
              schoolId: 'school-phuoc-tan',
              schoolName: 'Trường TH và THCS Phước Tân',
              primaryLocationId: foundUser.primaryLocation?.id,
              primaryLocationName: foundUser.primaryLocation?.name,
              primaryOrgUnitId: foundUser.primaryOrgUnit?.id,
              primaryOrgUnitName: foundUser.primaryOrgUnit?.name,
              roles: (foundUser.roles || []).map((r: any) => ({
                role: r.role,
                scopeLocationId: r.scopeLocation?.id || r.scopeLocationId || (r.role === 'PHO_HIEU_TRUONG' ? foundUser.primaryLocation?.id : null),
                scopeLocationName: r.scopeLocation?.name || r.scopeLocationName || (r.role === 'PHO_HIEU_TRUONG' ? foundUser.primaryLocation?.name : undefined),
                scopeOrgUnitId: r.scopeOrgUnit?.id || r.scopeOrgUnitId || (r.role === 'TO_TRUONG' ? foundUser.primaryOrgUnit?.id : null),
                scopeOrgUnitName: r.scopeOrgUnit?.name || r.scopeOrgUnitName || (r.role === 'TO_TRUONG' ? foundUser.primaryOrgUnit?.name : undefined),
              })),
            };

            return of(
              new HttpResponse({
                status: 200,
                body: {
                  success: true,
                  data: {
                    accessToken: `mock-jwt-token-${foundUser.id}`,
                    refreshToken: `mock-refresh-token-${foundUser.id}`,
                    user: userProfile,
                  },
                  message: 'Đăng nhập thành công.',
                },
              })
            );
          }
          if (url.includes('/refresh')) {
            if (error.status !== 0 && error.status !== 404) {
              return throwError(() => error);
            }
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
          if (url.includes('/change-password')) {
            return throwError(() => error);
          }
          if (url.includes('/logout')) {
            return of(new HttpResponse({ status: 200, body: { success: true, message: 'Đăng xuất thành công.' } }));
          }
        }

        // 1. SCHOOL INFO
        if (url.includes('/api/school')) {
          const displayYear = reqAcademicYear.includes('-') && !reqAcademicYear.includes(' - ')
            ? reqAcademicYear.replace('-', ' - ')
            : reqAcademicYear;
          return of(new HttpResponse({ status: 200, body: { success: true, data: { ...MOCK_SCHOOL_INFO, schoolYear: displayYear } } }));
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

            const isArchivedYear = reqAcademicYear === '2025-2026' || reqAcademicYear === '2024-2025';
            const isUpcomingYear = reqAcademicYear === '2027-2028';
            const startYearNum = parseInt(reqAcademicYear.split('-')[0], 10) || 2026;
            const endYearNum = startYearNum + 1;

            const nodeM1 = {
              id: 'plan-m1',
              title: isArchivedYear
                ? `1. Kiện toàn tổ chức bộ máy & quy chế hoạt động (${startYearNum})`
                : isUpcomingYear
                ? `1. Chuẩn bị nhân sự và phương án phân công chuyên môn (${startYearNum})`
                : '1. Ổn định tổ chức bộ máy và nhân sự sau sáp nhập 3 điểm trường',
              description: 'Kiện toàn các tổ chuyên môn, ban hành quy chế làm việc và phân công nhiệm vụ',
              level: 'THANG' as any,
              startDate: `${startYearNum}-08-15`,
              endDate: `${startYearNum}-09-15`,
              progressPercent: isArchivedYear ? 100 : isUpcomingYear ? 0 : 90,
              taskCount: planTasksM1.length,
              completedTaskCount: isArchivedYear ? planTasksM1.length : isUpcomingYear ? 0 : planTasksM1.filter((t) => t.status === 'HOAN_THANH' || t.status === 'DONG').length,
              tasks: planTasksM1 as any[],
              children: [],
            };

            const nodeM2 = {
              id: 'plan-m2',
              title: isArchivedYear
                ? `2. Triển khai kế hoạch giáo dục và nâng cao chất lượng dạy học (${startYearNum})`
                : isUpcomingYear
                ? `2. Dự thảo kế hoạch giáo dục nhà trường & phân phối chương trình (${startYearNum})`
                : '2. Hoàn thiện và công khai Kế hoạch giáo dục nhà trường',
              description: 'Xây dựng ma trận dạy học, phân phối chương trình và các chuyên đề đổi mới PPDH',
              level: 'THANG' as any,
              startDate: `${startYearNum}-08-20`,
              endDate: `${startYearNum}-09-20`,
              progressPercent: isArchivedYear ? 100 : isUpcomingYear ? 0 : 75,
              taskCount: planTasksM2.length,
              completedTaskCount: isArchivedYear ? planTasksM2.length : isUpcomingYear ? 0 : planTasksM2.filter((t) => t.status === 'HOAN_THANH' || t.status === 'DONG').length,
              tasks: planTasksM2 as any[],
              children: [],
            };

            const nodeM3 = {
              id: 'plan-m3',
              title: isArchivedYear
                ? `3. Tổng kết chuyên đề đổi mới PPDH & kiểm tra định kỳ (${startYearNum})`
                : isUpcomingYear
                ? `3. Kế hoạch tập huấn cán bộ quản lý & giáo viên hè (${startYearNum})`
                : '3. Kiểm tra chuyên đề đổi mới phương pháp dạy học & KTĐG',
              description: 'Kiểm tra hồ sơ giáo án, sinh hoạt chuyên môn cụm trường và hoạt động trải nghiệm',
              level: 'THANG' as any,
              startDate: `${startYearNum}-09-01`,
              endDate: `${startYearNum}-09-30`,
              progressPercent: isArchivedYear ? 100 : isUpcomingYear ? 0 : 45,
              taskCount: planTasksM3.length,
              completedTaskCount: isArchivedYear ? planTasksM3.length : isUpcomingYear ? 0 : planTasksM3.filter((t) => t.status === 'HOAN_THANH' || t.status === 'DONG').length,
              tasks: planTasksM3 as any[],
              children: [],
            };

            const monthPlans = [nodeM1, nodeM2, nodeM3];
            const term1TasksCount = monthPlans.reduce((sum, p) => sum + p.taskCount, 0);
            const term1CompletedCount = monthPlans.reduce((sum, p) => sum + p.completedTaskCount, 0);

            const nodeTerm1: any = {
              id: 'plan-term1',
              title: `Kế hoạch Học kỳ I (Năm học ${startYearNum} - ${endYearNum})`,
              description: isArchivedYear ? 'Đã hoàn thành toàn bộ chỉ tiêu học kỳ I' : 'Trọng tâm ổn định bộ máy, chuẩn hóa cơ sở vật chất và nâng cao chất lượng dạy học',
              level: 'HOC_KY' as any,
              startDate: `${startYearNum}-08-15`,
              endDate: `${endYearNum}-01-15`,
              progressPercent: isArchivedYear ? 100 : isUpcomingYear ? 0 : 55,
              taskCount: term1TasksCount,
              completedTaskCount: term1CompletedCount,
              tasks: [] as any[],
              children: monthPlans,
            };

            const nodeYear: any = {
              id: 'plan-year',
              title: `Kế hoạch Chiến lược & Hoạt động Năm học ${startYearNum} - ${endYearNum}${isArchivedYear ? ' (Đã tổng kết & lưu trữ)' : isUpcomingYear ? ' (Dự thảo)' : ''}`,
              description: isArchivedYear ? 'Toàn bộ chỉ tiêu năm học đã hoàn thành xuất sắc.' : 'Kế hoạch tổng thể vận hành trường TH và THCS Phước Tân',
              level: 'NAM' as any,
              startDate: `${startYearNum}-08-01`,
              endDate: `${endYearNum}-05-31`,
              progressPercent: isArchivedYear ? 100 : isUpcomingYear ? 0 : 42,
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
          const locationId = req.params.get('locationId') || (url.match(/[?&]locationId=([^&]+)/)?.[1]) || '';
          const orgUnitId = req.params.get('orgUnitId') || (url.match(/[?&]orgUnitId=([^&]+)/)?.[1]) || '';
          const userId = req.params.get('userId') || (url.match(/[?&]userId=([^&]+)/)?.[1]) || '';
          const role = req.params.get('role') || (url.match(/[?&]role=([^&]+)/)?.[1]) || '';

          let tasks = [...MOCK_TASKS];
          if (locationId) {
            tasks = tasks.filter((t) => t.location?.id === locationId || (t as any).locationId === locationId || (locationId === 'loc-main' && (!t.location || t.location.id === 'loc-main')));
          }
          if (orgUnitId) {
            tasks = tasks.filter((t) => t.orgUnit?.id === orgUnitId || (t as any).orgUnitId === orgUnitId || (orgUnitId === 'org-bgh' && (!t.orgUnit || t.orgUnit.id === 'org-bgh')));
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
            .map((t) => {
              const chuTriAsg = t.assignments?.find((a) => a.role === 'CHU_TRI');
              const chuTriUser = chuTriAsg?.user;
              let reason = 'Đang thực hiện đúng tiến độ';
              let priorityLevel = 1;

              if (t.isOverdue) {
                reason = 'Đã quá hạn hoàn thành';
                priorityLevel = 4;
              } else if (t.status === 'BO_SUNG') {
                reason = 'Yêu cầu bổ sung thông tin/minh chứng';
                priorityLevel = 3;
              } else if (t.status === 'CHO_KIEM_TRA') {
                reason = 'Đã nộp minh chứng, chờ nghiệm thu';
                priorityLevel = 2;
              } else if (t.priority === 'KHAN_CAP') {
                reason = 'Nhiệm vụ khẩn cấp';
                priorityLevel = 2;
              } else if (t.priority === 'CAO') {
                reason = 'Nhiệm vụ trọng tâm';
                priorityLevel = 1;
              }

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
                priorityLevel,
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

          // Sort attention tasks by highest urgency first, then earliest due date
          attentionTasks.sort((a, b) => {
            if (b.priorityLevel !== a.priorityLevel) {
              return b.priorityLevel - a.priorityLevel;
            }
            return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
          });

          const breakdownByLocation = MOCK_LOCATIONS.map((loc) => {
            const locTasks = MOCK_TASKS.filter(
              (t) => (t.location?.id === loc.id || (t as any).locationId === loc.id || (loc.id === 'loc-main' && !t.location)) &&
                     (!orgUnitId || t.orgUnit?.id === orgUnitId || (t as any).orgUnitId === orgUnitId)
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
              (t) => (t.orgUnit?.id === org.id || (t as any).orgUnitId === org.id || (org.id === 'org-bgh' && !t.orgUnit)) &&
                     (!locationId || t.location?.id === locationId || (t as any).locationId === locationId || (locationId === 'loc-main' && !t.location))
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
            attentionTasks: attentionTasks.slice(0, 15),
            breakdownByLocation,
            breakdownByOrgUnit,
          };

          return of(new HttpResponse({ status: 200, body: { success: true, data: overviewData } }));
        }

        // 6. NOTIFICATIONS
        if (url.includes('/api/notifications')) {
          if (url.includes('/read-all') && (method === 'PATCH' || method === 'POST')) {
            MOCK_NOTIFICATIONS.forEach((n) => {
              n.isRead = true;
              n.readAt = new Date().toISOString();
            });
            return of(
              new HttpResponse({
                status: 200,
                body: {
                  success: true,
                  message: 'Đã đánh dấu đọc tất cả thông báo.',
                  data: { count: MOCK_NOTIFICATIONS.length },
                },
              })
            );
          }

          const readSingleMatch = url.match(/\/api\/notifications\/([a-zA-Z0-9_-]+)\/read/);
          if (readSingleMatch && (method === 'PATCH' || method === 'POST')) {
            const notifId = readSingleMatch[1];
            const found = MOCK_NOTIFICATIONS.find((n) => n.id === notifId);
            if (found) {
              found.isRead = true;
              found.readAt = new Date().toISOString();
            }
            return of(
              new HttpResponse({
                status: 200,
                body: {
                  success: true,
                  message: 'Đã đánh dấu đã đọc.',
                  data: found || null,
                },
              })
            );
          }

          if (method === 'GET') {
            const page = parseInt(req.params.get('page') || (url.match(/[?&]page=([^&]+)/)?.[1]) || '1', 10);
            const limit = parseInt(req.params.get('limit') || (url.match(/[?&]limit=([^&]+)/)?.[1]) || '20', 10);
            const unreadOnly = req.params.get('unreadOnly') === 'true' || url.includes('unreadOnly=true');
            const search = (req.params.get('search') || (url.match(/[?&]search=([^&]+)/)?.[1]) || '').trim().toLowerCase();
            const type = (req.params.get('type') || (url.match(/[?&]type=([^&]+)/)?.[1]) || '').trim();

            let filtered = [...MOCK_NOTIFICATIONS];
            if (unreadOnly) {
              filtered = filtered.filter((n) => !n.isRead);
            }
            if (type && type !== 'ALL') {
              filtered = filtered.filter((n) => n.type === type);
            }
            if (search) {
              filtered = filtered.filter(
                (n) =>
                  (n.title && n.title.toLowerCase().includes(search)) ||
                  (n.content && n.content.toLowerCase().includes(search)) ||
                  (n.taskCode && n.taskCode.toLowerCase().includes(search)) ||
                  (n.senderName && n.senderName.toLowerCase().includes(search))
              );
            }

            const total = filtered.length;
            const totalPages = Math.ceil(total / limit) || 1;
            const startIndex = (page - 1) * limit;
            const items = filtered.slice(startIndex, startIndex + limit);
            const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;

            return of(
              new HttpResponse({
                status: 200,
                body: {
                  success: true,
                  data: {
                    items,
                    total,
                    unreadCount,
                    page,
                    pageSize: limit,
                    totalPages,
                  },
                },
              })
            );
          }
        }

        // 7. TASKS
        if (url.includes('/api/tasks') || url.includes('/api/attachments')) {
          // 7.0 Task Attachments: POST /api/tasks/:id/attachments & DELETE /api/attachments/:id
          if (url.includes('/attachments')) {
            const taskIdMatch = url.match(/\/api\/tasks\/([a-zA-Z0-9_-]+)\/attachments/);
            const taskId = taskIdMatch ? taskIdMatch[1] : '';
            let targetTask: any = MOCK_TASKS.find((t) => t.id === taskId || t.code === taskId);
            if (!targetTask && taskId) {
              targetTask = {
                id: taskId,
                title: 'Công việc',
                code: 'CV-' + taskId.slice(-6),
                status: 'DA_GIAO',
                priority: 'TRUNG_BINH',
                assignments: [],
                comments: [],
                logs: [],
                attachments: [],
              } as any;
              MOCK_TASKS.unshift(targetTask);
            }

            let currentUser: any = MOCK_USERS[0];
            try {
              const stored = localStorage.getItem('tn_edu_user_profile') || localStorage.getItem('currentUser');
              if (stored) currentUser = JSON.parse(stored);
            } catch (e) {}

            if (method === 'POST') {
              if (!targetTask.attachments) targetTask.attachments = [];
              const now = new Date();
              const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} ${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}`;
              const newAttId = 'att-' + Date.now();
              const newAtt = {
                id: newAttId,
                taskId: targetTask?.id || taskId,
                fileName: `Minh_chung_ket_qua_${Date.now()}.jpg`,
                originalName: `Minh_chung_ket_qua_${timeStr.replace(/[: /]/g, '_')}.jpg`,
                fileUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
                fileSize: 1024 * 512, // 512 KB
                mimeType: 'image/jpeg',
                uploadedById: currentUser.id || 'u-user',
                uploadedBy: {
                  id: currentUser.id || 'u-user',
                  fullName: currentUser.fullName || 'Người thực hiện',
                  title: currentUser.title || 'Cán bộ',
                  avatarUrl: currentUser.avatarUrl || null,
                },
                createdAt: now.toISOString(),
              };

              targetTask?.attachments?.unshift(newAtt);

              if (targetTask) {
                if (!targetTask.logs) targetTask.logs = [];
                targetTask.logs.unshift({
                  id: 'log-' + Date.now(),
                  taskId: targetTask.id,
                  userId: currentUser.id || 'u-user',
                  action: 'DINH_KEM_MINH_CHUNG',
                  note: `Đã tải lên tệp/ảnh minh chứng kết quả: ${newAtt.originalName}`,
                  createdAt: now.toISOString(),
                  user: currentUser,
                });
              }

              MOCK_NOTIFICATIONS.unshift({
                id: 'notif-' + Date.now(),
                taskId: targetTask?.id || taskId,
                taskCode: targetTask?.code || 'CV-AUTO',
                title: 'Minh chứng mới được tải lên',
                content: `${currentUser.fullName || 'Cán bộ'} đã tải lên tệp/ảnh minh chứng: ${newAtt.originalName} cho việc "${targetTask?.title || 'Công việc'}"`,
                type: 'STATUS_CHANGED',
                isRead: false,
                senderName: currentUser.fullName || 'Người thực hiện',
                senderAvatar: currentUser.avatarUrl || null,
                createdAt: now.toISOString(),
              });

              return of(
                new HttpResponse({
                  status: 201,
                  body: {
                    success: true,
                    message: 'Đã tải lên thành công 1 tệp đính kèm.',
                    data: [newAtt],
                  },
                })
              );
            }

            if (method === 'DELETE') {
              const attIdMatch = url.match(/\/api\/attachments\/([a-zA-Z0-9_-]+)/);
              const attId = attIdMatch ? attIdMatch[1] : '';
              MOCK_TASKS.forEach((t) => {
                if (t.attachments) {
                  t.attachments = t.attachments.filter((a: any) => a.id !== attId);
                }
              });
              return of(
                new HttpResponse({
                  status: 200,
                  body: { success: true, message: 'Xóa tệp đính kèm thành công.' },
                })
              );
            }

            if (method === 'GET') {
              return of(
                new HttpResponse({
                  status: 200,
                  body: { success: true, data: targetTask?.attachments || [] },
                })
              );
            }
          }

          // 7.05 Task Evaluation: POST /api/tasks/:id/evaluate
          if (url.includes('/evaluate') && method === 'POST') {
            const taskIdMatch = url.match(/\/api\/tasks\/([a-zA-Z0-9_-]+)\/evaluate/);
            const taskId = taskIdMatch ? taskIdMatch[1] : '';
            let targetTask: any = MOCK_TASKS.find((t) => t.id === taskId || t.code === taskId);
            const body = (req.body || {}) as any;
            let currentUser: any = MOCK_USERS[0];
            try {
              const stored = localStorage.getItem('tn_edu_user_profile') || localStorage.getItem('currentUser');
              if (stored) currentUser = JSON.parse(stored);
            } catch (e) {}

            if (targetTask) {
              targetTask.evaluationRating = body.rating;
              targetTask.evaluationComment = body.comment || null;
              targetTask.evaluatedAt = new Date().toISOString();
              targetTask.evaluatedById = currentUser.id;
              targetTask.evaluatedBy = currentUser;

              if (!targetTask.logs) targetTask.logs = [];
              targetTask.logs.unshift({
                id: 'log-' + Date.now(),
                taskId: targetTask.id,
                userId: currentUser.id,
                action: 'DANH_GIA_KET_QUA',
                note: `Đánh giá xếp loại: [${body.rating}] ${body.comment ? '— ' + body.comment : ''}`,
                createdAt: new Date().toISOString(),
                user: currentUser,
              });

              MOCK_NOTIFICATIONS.unshift({
                id: 'notif-' + Date.now(),
                taskId: targetTask.id,
                taskCode: targetTask.code || 'CV-AUTO',
                title: `Kết quả nghiệm thu: [${body.rating === 'XUAT_SAC' ? 'Xuất sắc' : body.rating === 'TOT' ? 'Tốt' : body.rating === 'HOAN_THANH' ? 'Hoàn thành' : 'Chưa đạt'}]`,
                content: `${currentUser.fullName || 'Ban Giám hiệu'} đã đánh giá xếp loại công việc "${targetTask.title}". ${body.comment ? 'Nhận xét: ' + body.comment : ''}`,
                type: body.rating === 'CHUA_DAT' ? 'CAN_BO_SUNG' : 'TASK_APPROVED',
                isRead: false,
                senderName: currentUser.fullName || 'Ban Giám hiệu',
                senderAvatar: currentUser.avatarUrl || null,
                createdAt: new Date().toISOString(),
              });
            }

            return of(
              new HttpResponse({
                status: 200,
                body: { success: true, data: targetTask, message: 'Đánh giá kết quả công việc thành công.' },
              })
            );
          }

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

            MOCK_NOTIFICATIONS.unshift({
              id: 'notif-' + Date.now(),
              taskId: targetTask.id,
              taskCode: targetTask.code || 'CV-AUTO',
              title: `Trao đổi mới trong ${targetTask.code || 'công việc'}`,
              content: `${currentUser.fullName || 'Cán bộ'}: "${body.content.length > 80 ? body.content.slice(0, 80) + '...' : body.content}"`,
              type: 'GENERAL',
              isRead: false,
              senderName: currentUser.fullName || 'Cán bộ',
              senderAvatar: currentUser.avatarUrl || null,
              createdAt: new Date().toISOString(),
            });

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

            const statusNames: any = {
              DA_TIEP_NHAN: 'Đã tiếp nhận',
              DANG_THUC_HIEN: 'Bắt đầu thực hiện',
              CHO_KIEM_TRA: 'Chờ kiểm tra / nghiệm thu',
              BO_SUNG: 'Yêu cầu bổ sung',
              HOAN_THANH: 'Đã hoàn thành',
              DONG: 'Đã đóng hồ sơ',
            };
            const sName = statusNames[body.status] || body.status;

            MOCK_NOTIFICATIONS.unshift({
              id: 'notif-' + Date.now(),
              taskId: targetTask.id,
              taskCode: targetTask.code || 'CV-AUTO',
              title: `Chuyển trạng thái: ${sName}`,
              content: `${currentUser.fullName || 'Cán bộ'} đã chuyển việc "${targetTask.title}" sang trạng thái [${sName}]. ${body.note ? 'Ghi chú: ' + body.note : ''}`,
              type: body.status === 'BO_SUNG' ? 'CAN_BO_SUNG' : body.status === 'HOAN_THANH' ? 'DA_HOAN_THANH' : 'STATUS_CHANGED',
              isRead: false,
              senderName: currentUser.fullName || 'Cán bộ',
              senderAvatar: currentUser.avatarUrl || null,
              createdAt: new Date().toISOString(),
            });

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

            MOCK_NOTIFICATIONS.unshift({
              id: 'notif-' + Date.now(),
              taskId: targetTask.id,
              taskCode: targetTask.code || 'CV-AUTO',
              title: `Cập nhật tiến độ: ${targetTask.progressPercent}%`,
              content: `${currentUser.fullName || 'Cán bộ'} đã cập nhật tiến độ công việc "${targetTask.title}" lên ${targetTask.progressPercent}%. ${body.note ? 'Ghi chú: ' + body.note : ''}`,
              type: 'STATUS_CHANGED',
              isRead: false,
              senderName: currentUser.fullName || 'Cán bộ',
              senderAvatar: currentUser.avatarUrl || null,
              createdAt: new Date().toISOString(),
            });

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

            let currentUser: any = MOCK_USERS[0];
            try {
              const stored = localStorage.getItem('tn_edu_user_profile') || localStorage.getItem('currentUser');
              if (stored) currentUser = JSON.parse(stored);
            } catch (e) {}

            if (body.dueDate) {
              MOCK_NOTIFICATIONS.unshift({
                id: 'notif-' + Date.now(),
                taskId: targetTask.id,
                taskCode: targetTask.code || 'CV-AUTO',
                title: 'Thay đổi hạn hoàn thành',
                content: `Hạn hoàn thành của công việc "${targetTask.title}" đã được điều chỉnh sang ngày ${body.dueDate}.`,
                type: 'NHAC_VIEC',
                isRead: false,
                senderName: currentUser.fullName || 'Người giao việc',
                senderAvatar: currentUser.avatarUrl || null,
                createdAt: new Date().toISOString(),
              });
            }

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

            MOCK_NOTIFICATIONS.unshift({
              id: 'notif-' + Date.now(),
              taskId: newTask.id,
              taskCode: newTask.code,
              title: 'Giao nhiệm vụ mới',
              content: `${currentUser.fullName || 'Ban Giám hiệu'} đã phân công nhiệm vụ "${newTask.title}". Hạn: ${newTask.dueDate}.`,
              type: 'GIAO_VIEC',
              isRead: false,
              senderName: currentUser.fullName || 'Ban Giám hiệu',
              senderAvatar: currentUser.avatarUrl || null,
              createdAt: new Date().toISOString(),
            });

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
        if (url.includes('/api/admin/shared-categories')) {
          const typeMatch = url.match(/[?&]type=([^&]+)/);
          const type = typeMatch ? typeMatch[1] : '';
          if (type === 'NAM_HOC' || !type) {
            const academicYearCategories = [
              { id: 'cat-nh-2627', tenantId: 'tenant-phuoc-tan', type: 'NAM_HOC', code: '2026-2027', name: 'Năm học 2026 - 2027', orderIndex: 1, isDefault: true, isActive: true },
              { id: 'cat-nh-2526', tenantId: 'tenant-phuoc-tan', type: 'NAM_HOC', code: '2025-2026', name: 'Năm học 2025 - 2026', orderIndex: 2, isDefault: false, isActive: true },
              { id: 'cat-nh-2425', tenantId: 'tenant-phuoc-tan', type: 'NAM_HOC', code: '2024-2025', name: 'Năm học 2024 - 2025', orderIndex: 3, isDefault: false, isActive: true },
              { id: 'cat-nh-2728', tenantId: 'tenant-phuoc-tan', type: 'NAM_HOC', code: '2027-2028', name: 'Năm học 2027 - 2028', orderIndex: 4, isDefault: false, isActive: true },
            ];
            return of(new HttpResponse({ status: 200, body: { success: true, data: academicYearCategories } }));
          }
        }
        if (url.includes('/api/admin/permissions-matrix')) {
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_PERMISSIONS_MATRIX } }));
        }
        if (url.includes('/api/admin/users') || url.includes('/api/users')) {
          if (url.includes('/recent-collaborators')) {
            return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_USERS.slice(0, 5) } }));
          }

          // Check if URL is requesting a single user by ID: /api/users/:id or /api/admin/users/:id
          const userMatch = url.match(/\/api\/(?:admin\/)?users\/([a-zA-Z0-9_\-\.]+)(?:\?|$)/);
          if (userMatch && userMatch[1] && userMatch[1] !== 'search' && !userMatch[1].startsWith('?')) {
            const targetId = userMatch[1];
            const foundUser = MOCK_USERS.find(
              (u) =>
                u.id === targetId ||
                u.phone === targetId ||
                (u.email && u.email.toLowerCase() === targetId.toLowerCase())
            ) || MOCK_USERS[0];
            return of(new HttpResponse({ status: 200, body: { success: true, data: foundUser } }));
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

        // 9. EVIDENCE REPOSITORY (/api/attachments/repository)
        if (url.includes('/api/attachments/repository')) {
          const searchParam = (req.params.get('search') || (url.match(/[?&]search=([^&]+)/)?.[1]) || '').toLowerCase();
          const mimeParam = req.params.get('mimeType') || (url.match(/[?&]mimeType=([^&]+)/)?.[1]) || 'ALL';
          const locParam = req.params.get('locationId') || (url.match(/[?&]locationId=([^&]+)/)?.[1]) || '';
          const orgParam = req.params.get('orgUnitId') || (url.match(/[?&]orgUnitId=([^&]+)/)?.[1]) || '';
          const pageParam = parseInt(req.params.get('page') || (url.match(/[?&]page=([^&]+)/)?.[1]) || '1', 10);
          const pageSizeParam = parseInt(req.params.get('pageSize') || (url.match(/[?&]pageSize=([^&]+)/)?.[1]) || '10', 10);

          // Build evidence items from tasks attachments & documents
          const sampleEvidences = [
            {
              id: 'ev-1',
              fileName: 'Bien-ban-nghiem-thu-CSVC-Dau-nam.pdf',
              originalName: 'Biên bản nghiệm thu cơ sở vật chất đầu năm học.pdf',
              fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              fileSize: 2450000,
              mimeType: 'application/pdf',
              createdAt: '2026-09-02T09:30:00Z',
              task: { id: 'task-csvc-1', code: 'CV-CSVC-01', title: 'Kiểm kê cơ sở vật chất phòng học đầu năm', locationId: 'loc-main', orgUnitId: 'org-vanphong' },
              uploadedBy: { id: 'u-pht1', fullName: 'Nguyễn Văn Minh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Minh', phone: '0903222333' },
              locationName: 'Điểm chính (Trung tâm)',
              orgUnitName: 'Tổ Văn phòng',
            },
            {
              id: 'ev-2',
              fileName: 'Giao-an-dien-tu-Toan-Khoi-9-T1.docx',
              originalName: 'Kế hoạch bài dạy môn Toán Khối 9 Tuần 1.docx',
              fileUrl: '#',
              fileSize: 850000,
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              createdAt: '2026-09-03T14:15:00Z',
              task: { id: 'task-shcm-1', code: 'CV-TOAN-02', title: 'Soạn và duyệt giáo án Toán khối 9 theo CT GDPT 2018', locationId: 'loc-main', orgUnitId: 'org-toantin' },
              uploadedBy: { id: 'u-totruong-toan', fullName: 'Lê Hoàng Long', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Long', phone: '0903444555' },
              locationName: 'Điểm chính (Trung tâm)',
              orgUnitName: 'Tổ Toán - Tin học',
            },
            {
              id: 'ev-3',
              fileName: 'Bang-tong-hop-Diem-kiem-tra-dau-nam.xlsx',
              originalName: 'Bảng tổng hợp điểm khảo sát chất lượng đầu năm môn Tiếng Anh.xlsx',
              fileUrl: '#',
              fileSize: 1780000,
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              createdAt: '2026-09-05T16:00:00Z',
              task: { id: 'task-ta-1', code: 'CV-ANH-01', title: 'Khảo sát chất lượng tiếng Anh đầu năm các khối', locationId: 'loc-ph1', orgUnitId: 'org-tienganh' },
              uploadedBy: { id: 'u-totruong-ta', fullName: 'Vũ Thị Hoa', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hoa', phone: '0903555666' },
              locationName: 'Phân hiệu 1 (Tân Lập)',
              orgUnitName: 'Tổ Tiếng Anh',
            },
            {
              id: 'ev-4',
              fileName: 'Hinh-anh-khai-giang-nam-hoc-2026.png',
              originalName: 'Ảnh tư liệu Lễ Khai giảng năm học mới 2026-2027.png',
              fileUrl: 'https://picsum.photos/800/600?random=1',
              fileSize: 3120000,
              mimeType: 'image/png',
              createdAt: '2026-09-05T11:00:00Z',
              task: { id: 'task-kg-1', code: 'CV-BGH-01', title: 'Tổ chức Lễ Khai giảng năm học mới 2026-2027', locationId: 'loc-main', orgUnitId: 'org-bgh' },
              uploadedBy: { id: 'u-hieutruong', fullName: 'Phạm Thị Nam', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nam', phone: '0903111222' },
              locationName: 'Điểm chính (Trung tâm)',
              orgUnitName: 'Ban Giám hiệu',
            },
            {
              id: 'ev-5',
              fileName: 'Bien-ban-kiem-tra-chuyen-mon-Van-T9.pdf',
              originalName: 'Biên bản kiểm tra hồ sơ chuyên môn Tổ Ngữ văn tháng 9.pdf',
              fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              fileSize: 1350000,
              mimeType: 'application/pdf',
              createdAt: '2026-09-10T10:45:00Z',
              task: { id: 'task-van-1', code: 'CV-VAN-01', title: 'Kiểm tra nề nếp soạn giảng tổ Văn - Sử - Địa', locationId: 'loc-main', orgUnitId: 'org-vansudia' },
              uploadedBy: { id: 'u-totruong-van', fullName: 'Đặng Thanh Hà', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ha', phone: '0903666777' },
              locationName: 'Điểm chính (Trung tâm)',
              orgUnitName: 'Tổ Ngữ văn - Lịch sử - Địa lý',
            },
            {
              id: 'ev-6',
              fileName: 'Ke-hoach-boi-duong-hoc-sinh-gioi-Khoi-8.pdf',
              originalName: 'Kế hoạch chi tiết bồi dưỡng HSG Khoa học Tự nhiên.pdf',
              fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              fileSize: 920000,
              mimeType: 'application/pdf',
              createdAt: '2026-09-12T15:20:00Z',
              task: { id: 'task-khtn-1', code: 'CV-KHTN-01', title: 'Thành lập đội tuyển và ôn tập HSG các môn KHTN', locationId: 'loc-ph2', orgUnitId: 'org-khtn' },
              uploadedBy: { id: 'u-gv-ly', fullName: 'Bùi Tuấn Anh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TuanAnh', phone: '0903888999' },
              locationName: 'Phân hiệu 2 (Vườn Dừa)',
              orgUnitName: 'Tổ Khoa học Tự nhiên (Lý - Hóa - Sinh)',
            },
            {
              id: 'ev-7',
              fileName: 'Danh-sach-tiem-chung-hoc-sinh-T9.xlsx',
              originalName: 'Danh sách tổng hợp tiêm chủng và khám sức khỏe HS Khối 6.xlsx',
              fileUrl: '#',
              fileSize: 1450000,
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              createdAt: '2026-09-14T08:30:00Z',
              task: { id: 'task-yte-1', code: 'CV-VP-03', title: 'Khám sức khỏe ban đầu cho học sinh toàn trường', locationId: 'loc-main', orgUnitId: 'org-vanphong' },
              uploadedBy: { id: 'u-nv-yte', fullName: 'Ngô Thị Mai', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mai', phone: '0903999000' },
              locationName: 'Điểm chính (Trung tâm)',
              orgUnitName: 'Tổ Văn phòng',
            },
          ];

          let filtered = sampleEvidences.filter((item) => {
            const matchesSearch =
              !searchParam ||
              item.fileName.toLowerCase().includes(searchParam) ||
              item.originalName.toLowerCase().includes(searchParam) ||
              (item.task?.title && item.task.title.toLowerCase().includes(searchParam)) ||
              (item.task?.code && item.task.code.toLowerCase().includes(searchParam)) ||
              (item.uploadedBy?.fullName && item.uploadedBy.fullName.toLowerCase().includes(searchParam));

            const matchesMime =
              mimeParam === 'ALL' ||
              (mimeParam === 'PDF' && item.mimeType.includes('pdf')) ||
              (mimeParam === 'IMAGE' && item.mimeType.startsWith('image/')) ||
              (mimeParam === 'WORD' && item.mimeType.includes('word')) ||
              (mimeParam === 'EXCEL' && (item.mimeType.includes('sheet') || item.mimeType.includes('excel')));

            const matchesLoc = !locParam || item.task?.locationId === locParam;
            const matchesOrg = !orgParam || item.task?.orgUnitId === orgParam;

            return matchesSearch && matchesMime && matchesLoc && matchesOrg;
          });

          const total = filtered.length;
          const totalPages = Math.ceil(total / pageSizeParam) || 1;
          const startIndex = (pageParam - 1) * pageSizeParam;
          const items = filtered.slice(startIndex, startIndex + pageSizeParam);

          return of(
            new HttpResponse({
              status: 200,
              body: {
                success: true,
                data: {
                  items,
                  pagination: {
                    page: pageParam,
                    pageSize: pageSizeParam,
                    total,
                    totalPages,
                  },
                },
              },
            })
          );
        }

        // 10. DOCUMENT MANAGEMENT (/api/documents)
        if (url.includes('/api/documents')) {
          // Initialize in-memory storage from localStorage if available
          const STORAGE_FOLDERS_KEY = 'TN_EDU_DEMO_DOC_FOLDERS';
          const STORAGE_FILES_KEY = 'TN_EDU_DEMO_DOC_FILES';

          let storedFolders: any[] = [];
          try {
            const fRaw = localStorage.getItem(STORAGE_FOLDERS_KEY);
            storedFolders = fRaw ? JSON.parse(fRaw) : [...MOCK_DOCUMENT_FOLDERS];
          } catch {
            storedFolders = [...MOCK_DOCUMENT_FOLDERS];
          }

          let storedFiles: any[] = [];
          try {
            const flRaw = localStorage.getItem(STORAGE_FILES_KEY);
            storedFiles = flRaw ? JSON.parse(flRaw) : [...MOCK_DOCUMENT_FILES];
          } catch {
            storedFiles = [...MOCK_DOCUMENT_FILES];
          }

          const saveStorage = () => {
            try {
              localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(storedFolders));
              localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(storedFiles));
            } catch {}
          };

          // 10.1 Reset/Init sample tree
          if (url.includes('/sample-tree') && method === 'POST') {
            storedFolders = [...MOCK_DOCUMENT_FOLDERS];
            storedFiles = [...MOCK_DOCUMENT_FILES];
            saveStorage();
            return of(new HttpResponse({ status: 200, body: { success: true, data: storedFolders } }));
          }

          // 10.2 Global Search in Documents
          if (url.includes('/api/documents/search')) {
            const query = (req.params.get('search') || (url.match(/[?&]search=([^&]+)/)?.[1]) || '').toLowerCase();
            const results = storedFiles.filter(
              (f) =>
                f.fileName.toLowerCase().includes(query) ||
                (f.originalName && f.originalName.toLowerCase().includes(query)) ||
                (f.description && f.description.toLowerCase().includes(query))
            );
            return of(new HttpResponse({ status: 200, body: { success: true, data: results } }));
          }

          // 10.3 Delete file: /api/documents/files/:id
          const deleteFileMatch = url.match(/\/api\/documents\/files\/([a-zA-Z0-9_\-\.]+)/);
          if (deleteFileMatch && method === 'DELETE') {
            const fileId = deleteFileMatch[1];
            storedFiles = storedFiles.filter((f) => f.id !== fileId);
            saveStorage();
            return of(new HttpResponse({ status: 200, body: { success: true, message: 'Đã xóa tệp tin.' } }));
          }

          // 10.4 Files in a folder: /api/documents/folders/:id/files
          const folderFilesMatch = url.match(/\/api\/documents\/folders\/([a-zA-Z0-9_\-\.]+)\/files/);
          if (folderFilesMatch) {
            const folderId = folderFilesMatch[1];
            if (method === 'GET') {
              const query = (req.params.get('search') || (url.match(/[?&]search=([^&]+)/)?.[1]) || '').toLowerCase();
              let files = storedFiles.filter((f) => f.folderId === folderId);
              if (query) {
                files = files.filter(
                  (f) =>
                    f.fileName.toLowerCase().includes(query) ||
                    (f.originalName && f.originalName.toLowerCase().includes(query))
                );
              }
              return of(new HttpResponse({ status: 200, body: { success: true, data: files } }));
            }
            if (method === 'POST') {
              // Upload mock files
              const newFile: any = {
                id: 'doc-file-' + Date.now(),
                folderId,
                fileName: 'Tai_Lieu_Moi_' + new Date().toISOString().slice(0, 10) + '.pdf',
                originalName: 'Tài liệu vừa tải lên ' + new Date().toLocaleTimeString('vi-VN') + '.pdf',
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                fileSize: 1024 * 1024 * 1.5,
                mimeType: 'application/pdf',
                uploadedById: 'u-hieutruong',
                uploadedBy: { id: 'u-hieutruong', fullName: 'Phạm Thị Nam', phone: '0903111222' },
                tenantId: 'tenant-phuoc-tan',
                academicYear: reqAcademicYear,
                createdAt: new Date().toISOString(),
              };
              storedFiles.unshift(newFile);
              saveStorage();
              return of(new HttpResponse({ status: 201, body: { success: true, data: [newFile] } }));
            }
          }

          // 10.5 Folder single item mutation (PATCH rename / DELETE)
          const singleFolderMatch = url.match(/\/api\/documents\/folders\/([a-zA-Z0-9_\-\.]+)$/);
          if (singleFolderMatch) {
            const folderId = singleFolderMatch[1];
            if (method === 'PATCH') {
              const body = (req.body || {}) as any;
              const idx = storedFolders.findIndex((f) => f.id === folderId);
              if (idx !== -1) {
                storedFolders[idx] = { ...storedFolders[idx], name: body.name || storedFolders[idx].name, updatedAt: new Date().toISOString() };
                saveStorage();
                return of(new HttpResponse({ status: 200, body: { success: true, data: storedFolders[idx] } }));
              }
            }
            if (method === 'DELETE') {
              // Recursive delete folder & subfolders & files
              const idsToDelete = new Set<string>([folderId]);
              let changed = true;
              while (changed) {
                changed = false;
                storedFolders.forEach((f) => {
                  if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
                    idsToDelete.add(f.id);
                    changed = true;
                  }
                });
              }
              storedFolders = storedFolders.filter((f) => !idsToDelete.has(f.id));
              storedFiles = storedFiles.filter((f) => !idsToDelete.has(f.folderId));
              saveStorage();
              return of(new HttpResponse({ status: 200, body: { success: true, message: 'Đã xóa thư mục và tệp tin liên quan.' } }));
            }
          }

          // 10.6 Folders Root: /api/documents/folders (GET tree / POST new folder)
          if (url.includes('/api/documents/folders')) {
            if (method === 'GET') {
              // Build nested tree
              const map = new Map<string, any>();
              storedFolders.forEach((f) => {
                const fl = storedFiles.filter((file) => file.folderId === f.id);
                const totalSize = fl.reduce((sum, item) => sum + (item.fileSize || 0), 0);
                map.set(f.id, {
                  ...f,
                  children: [],
                  fileCount: fl.length,
                  totalSize,
                  isOpen: f.isOpen ?? false,
                });
              });

              const tree: any[] = [];
              storedFolders.forEach((f) => {
                const node = map.get(f.id);
                if (f.parentId && map.has(f.parentId)) {
                  map.get(f.parentId).children.push(node);
                } else {
                  tree.push(node);
                }
              });

              return of(new HttpResponse({ status: 200, body: { success: true, data: tree } }));
            }

            if (method === 'POST') {
              const body = (req.body || {}) as any;
              const newFolder = {
                id: 'f-' + Date.now(),
                name: (body.name || 'Thư mục mới').trim(),
                parentId: body.parentId || null,
                tenantId: 'tenant-phuoc-tan',
                academicYear: body.academicYear || reqAcademicYear,
                orderIndex: storedFolders.length + 1,
                createdAt: new Date().toISOString(),
                isOpen: true,
              };
              storedFolders.push(newFolder);
              saveStorage();
              return of(new HttpResponse({ status: 201, body: { success: true, data: newFolder } }));
            }
          }
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
