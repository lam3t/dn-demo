import { Router } from 'express';
import { systemAdminController } from './system-admin.controller';
import { requireAuth, requireSystemAdmin } from '../auth/auth.middleware';

const router = Router();

// Tất cả API trong module /api/system-admin/* đều yêu cầu đăng nhập & quyền System Admin
router.use(requireAuth, requireSystemAdmin);

// Dashboard
router.get('/dashboard', (req, res, next) => systemAdminController.getDashboard(req, res, next));

// Tenant Management
router.get('/tenants', (req, res, next) => systemAdminController.getTenants(req, res, next));
router.post('/tenants', (req, res, next) => systemAdminController.createTenant(req, res, next));
router.get('/tenants/:id', (req, res, next) => systemAdminController.getTenantById(req, res, next));
router.patch('/tenants/:id', (req, res, next) => systemAdminController.updateTenant(req, res, next));
router.patch('/tenants/:id/status', (req, res, next) => systemAdminController.toggleTenantStatus(req, res, next));

// Package Management
router.get('/packages', (req, res, next) => systemAdminController.getPackages(req, res, next));
router.post('/packages', (req, res, next) => systemAdminController.createPackage(req, res, next));
router.patch('/packages/:id', (req, res, next) => systemAdminController.updatePackage(req, res, next));

// Subscription Management
router.post('/subscriptions', (req, res, next) => systemAdminController.createSubscription(req, res, next));

// System Audit Logs
router.get('/audit-logs', (req, res, next) => systemAdminController.getAuditLogs(req, res, next));

export default router;
