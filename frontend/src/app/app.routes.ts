import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'school-info',
        loadComponent: () =>
          import('./features/school-info/school-info.component').then((m) => m.SchoolInfoComponent),
      },
      {
        path: 'my-tasks',
        loadComponent: () =>
          import('./features/my-tasks/my-tasks.component').then((m) => m.MyTasksComponent),
      },
      {
        path: 'plans',
        loadComponent: () =>
          import('./features/plans/plans.component').then((m) => m.PlansComponent),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
      },
      {
        path: 'tasks/:id',
        loadComponent: () =>
          import('./features/tasks/task-detail.component').then((m) => m.TaskDetailComponent),
      },
      {
        path: 'org',
        loadComponent: () =>
          import('./features/org/org.component').then((m) => m.OrgComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent),
      },
      {
        path: 'admin-settings',
        canActivate: [authGuard],
        data: { roles: ['ADMIN', 'HIEU_TRUONG'] },
        loadComponent: () =>
          import('./features/admin-settings/admin-settings.component').then(
            (m) => m.AdminSettingsComponent
          ),
      },
      {
        path: 'dev/people-picker',
        loadComponent: () =>
          import('./features/dev/people-picker-demo.component').then((m) => m.PeoplePickerDemoComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
