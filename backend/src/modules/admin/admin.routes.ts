import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Tất cả các route bên dưới chỉ cho phép ADMIN và HIEU_TRUONG
router.use(requireAuth);
router.use(requireRole(Role.ADMIN, Role.HIEU_TRUONG));

// 1. Quản lý tài khoản
router.get('/users', (req, res, next) => adminController.getUsers(req, res, next));
router.post('/users', (req, res, next) => adminController.createUser(req, res, next));
router.patch('/users/:id', (req, res, next) => adminController.updateUser(req, res, next));
router.patch('/users/:id/status', (req, res, next) => adminController.toggleUserStatus(req, res, next));
router.post('/users/:id/reset-password', (req, res, next) => adminController.resetPassword(req, res, next));
router.delete('/users/:id', (req, res, next) => adminController.deleteUser(req, res, next));

// 2. Cấu hình phân quyền (gán vai trò + phạm vi)
router.post('/users/:id/roles', (req, res, next) => adminController.addUserRole(req, res, next));
router.delete('/users/:id/roles/:userRoleId', (req, res, next) => adminController.removeUserRole(req, res, next));
router.get('/permissions-matrix', (req, res, next) => adminController.getPermissionsMatrix(req, res, next));

export default router;
