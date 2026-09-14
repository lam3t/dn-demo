import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth, requireRole, requirePermission } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Tất cả các route quản trị bên dưới yêu cầu đăng nhập và có vai trò ADMIN hoặc HIEU_TRUONG
router.use(requireAuth);
router.use(requireRole(Role.ADMIN));

// 1. Quản lý tài khoản
router.get('/users', requirePermission('account.view'), (req, res, next) => adminController.getUsers(req, res, next));
router.post('/users', requirePermission('account.create'), (req, res, next) => adminController.createUser(req, res, next));
router.patch('/users/:id', requirePermission('account.update'), (req, res, next) => adminController.updateUser(req, res, next));
router.patch('/users/:id/status', requirePermission('account.lock'), (req, res, next) => adminController.toggleUserStatus(req, res, next));
router.post('/users/:id/reset-password', requirePermission('account.reset_password'), (req, res, next) => adminController.resetPassword(req, res, next));
router.delete('/users/:id', requirePermission('account.update'), (req, res, next) => adminController.deleteUser(req, res, next));

// 2. Gán vai trò + phạm vi cho tài khoản
router.post('/users/:id/roles', requirePermission('account.assign_role'), (req, res, next) => adminController.addUserRole(req, res, next));
router.delete('/users/:id/roles/:userRoleId', requirePermission('account.assign_role'), (req, res, next) => adminController.removeUserRole(req, res, next));

// 3. Dynamic Permissions Catalog & Roles Management
router.get('/permissions', requirePermission('role.view'), (req, res, next) => adminController.getPermissions(req, res, next));
router.get('/permissions-matrix', requirePermission('role.view'), (req, res, next) => adminController.getPermissionsMatrix(req, res, next));
router.get('/roles', requirePermission('role.view'), (req, res, next) => adminController.getRoles(req, res, next));
router.post('/roles', requirePermission('role.create'), (req, res, next) => adminController.createRole(req, res, next));
router.patch('/roles/:id', requirePermission('role.update'), (req, res, next) => adminController.updateRole(req, res, next));
router.put('/roles/:id/permissions', requirePermission('role.update'), (req, res, next) => adminController.updateRolePermissions(req, res, next));
router.delete('/roles/:id', requirePermission('role.delete'), (req, res, next) => adminController.deleteRole(req, res, next));

// 4. Danh mục dùng chung (Shared Categories)
router.get('/categories', (req, res, next) => adminController.getCategories(req, res, next));
router.post('/categories', requirePermission('org.manage_categories'), (req, res, next) => adminController.createCategory(req, res, next));
router.patch('/categories/:id', requirePermission('org.manage_categories'), (req, res, next) => adminController.updateCategory(req, res, next));
router.delete('/categories/:id', requirePermission('org.manage_categories'), (req, res, next) => adminController.deleteCategory(req, res, next));

// 5. Cấu hình chỉ số KPI (KPI Definitions)
router.get('/kpi-definitions', (req, res, next) => adminController.getKPIDefinitions(req, res, next));
router.post('/kpi-definitions', requirePermission('kpi.config'), (req, res, next) => adminController.createKPIDefinition(req, res, next));
router.patch('/kpi-definitions/:id', requirePermission('kpi.config'), (req, res, next) => adminController.updateKPIDefinition(req, res, next));
router.delete('/kpi-definitions/:id', requirePermission('kpi.config'), (req, res, next) => adminController.deleteKPIDefinition(req, res, next));

// 6. Hạn mức tài nguyên & Gói cước
router.get('/quota', requirePermission('system.view_quota'), (req, res, next) => adminController.getTenantQuota(req, res, next));

export default router;

