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

export const demoMockInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If backend API returns error (500, 502, 503, 504, 404, 0 connection error on Vercel without PostgreSQL)
      if (req.url.startsWith('/api')) {
        const url = req.url;
        const method = req.method.toUpperCase();

        // 1. SCHOOL INFO
        if (url.includes('/api/school')) {
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_SCHOOL_INFO } }));
        }

        // 2. LOCATIONS
        if (url.includes('/api/locations')) {
          if (url.includes('/summary')) {
            const found = MOCK_LOCATIONS_SUMMARY.find((l) => url.includes(l.id)) || MOCK_LOCATIONS_SUMMARY[0];
            return of(new HttpResponse({ status: 200, body: { success: true, data: found } }));
          }
          if (method === 'GET') {
            return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_LOCATIONS } }));
          }
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_LOCATIONS[0], message: 'Thành công' } }));
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
            return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_PLAN_TREE } }));
          }
          if (method === 'GET') {
            const planIdMatch = url.match(/\/api\/plans\/([a-zA-Z0-9_-]+)/);
            if (planIdMatch && planIdMatch[1] && planIdMatch[1] !== 'tree') {
              const found = MOCK_PLANS.find((p) => p.id === planIdMatch[1]) || MOCK_PLANS[0];
              return of(new HttpResponse({ status: 200, body: { success: true, data: found } }));
            }
            return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_PLANS } }));
          }
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_PLANS[0], message: 'Thành công' } }));
        }

        // 5. DASHBOARD
        if (url.includes('/api/dashboard/overview')) {
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_DASHBOARD_OVERVIEW } }));
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
          if (method === 'GET') {
            // Task Detail
            const taskIdMatch = url.match(/\/api\/tasks\/([a-zA-Z0-9_-]+)/);
            if (taskIdMatch && taskIdMatch[1] && taskIdMatch[1] !== 'my' && taskIdMatch[1] !== 'recent') {
              const taskId = taskIdMatch[1];
              const found = MOCK_TASKS.find((t) => t.id === taskId) || MOCK_TASKS[0];
              return of(new HttpResponse({ status: 200, body: { success: true, data: found } }));
            }

            // Tasks List
            return of(
              new HttpResponse({
                status: 200,
                body: {
                  success: true,
                  data: {
                    items: MOCK_TASKS,
                    total: MOCK_TASKS.length,
                    page: 1,
                    pageSize: 20,
                    totalPages: 1,
                  },
                },
              })
            );
          }
          // Mutations
          return of(new HttpResponse({ status: 200, body: { success: true, data: MOCK_TASKS[0], message: 'Thao tác thành công.' } }));
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
