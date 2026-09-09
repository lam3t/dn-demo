import bcrypt from 'bcryptjs';
import prisma from '../../prisma';
import { AppError } from '../../middlewares/error.middleware';
import { Role, TaskAssignmentRole, TaskStatus } from '@prisma/client';
import { removeVietnameseAccents, calculateMatchScore } from '../../utils/vietnamese.utils';
import {
  CreateAdminUserDto,
  UpdateAdminUserDto,
  AddUserRoleDto,
  AdminUserFilterDto,
  PermissionMatrixItem,
} from './admin.types';

export class AdminService {
  /**
   * Helper ghi log kiểm toán AdminAuditLog
   */
  async logAudit(
    actorUserId: string,
    action: string,
    targetType: string,
    targetId: string,
    detail?: string
  ) {
    try {
      await prisma.adminAuditLog.create({
        data: {
          actorUserId,
          action,
          targetType,
          targetId,
          detail: detail || null,
        },
      });
    } catch (err) {
      console.error('Lỗi khi ghi AdminAuditLog:', err);
    }
  }

  /**
   * 1. GET /api/admin/users
   * Danh sách đầy đủ tài khoản cho Quản trị viên
   */
  async getUsers(filters: AdminUserFilterDto, schoolId?: string) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const searchQuery = (filters.search || '').trim();

    const where: any = {};

    if (schoolId) {
      where.schoolId = schoolId;
    }

    if (filters.locationId) {
      where.OR = [
        { primaryLocationId: filters.locationId },
        { roles: { some: { scopeLocationId: filters.locationId } } },
      ];
    }

    if (filters.orgUnitId) {
      where.OR = [
        { primaryOrgUnitId: filters.orgUnitId },
        { roles: { some: { scopeOrgUnitId: filters.orgUnitId } } },
      ];
    }

    if (filters.role) {
      where.roles = { some: { role: filters.role } };
    }

    if (filters.status) {
      if (filters.status === 'active' || filters.status === 'true') {
        where.isActive = true;
      } else if (filters.status === 'locked' || filters.status === 'false') {
        where.isActive = false;
      }
    }

    // Fetch all records matching structured filters
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        primaryLocation: {
          select: { id: true, name: true, code: true },
        },
        primaryOrgUnit: {
          select: { id: true, name: true, code: true },
        },
        roles: {
          include: {
            scopeLocation: { select: { id: true, name: true, code: true } },
            scopeOrgUnit: { select: { id: true, name: true, code: true } },
          },
        },
        taskAssignments: {
          where: {
            role: { in: [TaskAssignmentRole.CHU_TRI, TaskAssignmentRole.PHOI_HOP] },
            task: {
              status: {
                notIn: [TaskStatus.DONG, TaskStatus.HUY, TaskStatus.HOAN_THANH],
              },
            },
          },
          select: { id: true },
        },
      },
    });

    // Score & Vietnamese search matching
    let scoredUsers = users.map((u) => {
      let score = 1;
      if (searchQuery) {
        const nameScore = calculateMatchScore(u.fullName, searchQuery);
        const titleScore = u.title ? calculateMatchScore(u.title, searchQuery) : 0;
        const phoneScore = calculateMatchScore(u.phone, searchQuery);
        const emailScore = calculateMatchScore(u.email, searchQuery);

        score = Math.max(nameScore * 3, titleScore * 2, phoneScore * 2, emailScore);
      }

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        title: u.title,
        avatarUrl: u.avatarUrl,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        primaryLocation: u.primaryLocation,
        primaryOrgUnit: u.primaryOrgUnit,
        roles: u.roles.map((r) => ({
          id: r.id,
          role: r.role,
          scopeLocationId: r.scopeLocationId,
          scopeOrgUnitId: r.scopeOrgUnitId,
          scopeLocation: r.scopeLocation,
          scopeOrgUnit: r.scopeOrgUnit,
          createdAt: r.createdAt,
        })),
        currentTaskLoad: u.taskAssignments.length,
        score,
      };
    });

    if (searchQuery) {
      scoredUsers = scoredUsers.filter((u) => u.score > 0);
      scoredUsers.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.fullName.localeCompare(b.fullName, 'vi');
      });
    }

    const total = scoredUsers.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedItems = scoredUsers.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginatedItems.map(({ score, ...item }) => item),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 2. POST /api/admin/users
   * Tạo tài khoản mới với mật khẩu mặc định 123456
   */
  async createUser(actorUserId: string, schoolId: string, data: CreateAdminUserDto) {
    const email = data.email?.toLowerCase().trim();
    const phone = data.phone?.trim();

    if (!data.fullName || !data.fullName.trim()) {
      throw new AppError('Họ và tên không được để trống.', 400);
    }
    if (!phone) {
      throw new AppError('Số điện thoại không được để trống.', 400);
    }
    if (!email) {
      throw new AppError('Email không được để trống.', 400);
    }

    // Kiểm tra trùng SĐT
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new AppError('Số điện thoại này đã được sử dụng bởi một tài khoản khác.', 400);
    }

    // Kiểm tra trùng Email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AppError('Địa chỉ email này đã được sử dụng bởi một tài khoản khác.', 400);
    }

    const rawPassword = data.password || '123456';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const initialRoles = data.roles && data.roles.length > 0
      ? data.roles.map((r) => ({
          role: r.role,
          scopeLocationId: r.scopeLocationId || null,
          scopeOrgUnitId: r.scopeOrgUnitId || null,
        }))
      : [{ role: Role.GIAO_VIEN, scopeLocationId: data.locationId || null, scopeOrgUnitId: data.orgUnitId || null }];

    const newUser = await prisma.user.create({
      data: {
        schoolId,
        fullName: data.fullName.trim(),
        email,
        phone,
        passwordHash,
        title: data.position || null,
        primaryLocationId: data.locationId || null,
        primaryOrgUnitId: data.orgUnitId || null,
        avatarUrl:
          data.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=1F3864&color=fff`,
        isActive: true,
        roles: {
          create: initialRoles,
        },
      },
      include: {
        primaryLocation: true,
        primaryOrgUnit: true,
        roles: {
          include: {
            scopeLocation: true,
            scopeOrgUnit: true,
          },
        },
      },
    });

    // Audit log
    await this.logAudit(
      actorUserId,
      'CREATE_USER',
      'USER',
      newUser.id,
      `Tạo tài khoản người dùng mới: ${newUser.fullName} (${newUser.email})`
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * 3. PATCH /api/admin/users/:id
   * Cập nhật thông tin cơ bản của người dùng
   */
  async updateUser(actorUserId: string, id: string, data: UpdateAdminUserDto) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    if (data.phone && data.phone.trim() !== existing.phone) {
      const duplicatePhone = await prisma.user.findUnique({ where: { phone: data.phone.trim() } });
      if (duplicatePhone) {
        throw new AppError('Số điện thoại mới đã được sử dụng bởi một tài khoản khác.', 400);
      }
    }

    if (data.email && data.email.toLowerCase().trim() !== existing.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (duplicateEmail) {
        throw new AppError('Địa chỉ email mới đã được sử dụng bởi một tài khoản khác.', 400);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName && { fullName: data.fullName.trim() }),
        ...(data.phone && { phone: data.phone.trim() }),
        ...(data.email && { email: data.email.toLowerCase().trim() }),
        ...(data.position !== undefined && { title: data.position }),
        ...(data.locationId !== undefined && { primaryLocationId: data.locationId }),
        ...(data.orgUnitId !== undefined && { primaryOrgUnitId: data.orgUnitId }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      include: {
        primaryLocation: true,
        primaryOrgUnit: true,
        roles: {
          include: {
            scopeLocation: true,
            scopeOrgUnit: true,
          },
        },
      },
    });

    await this.logAudit(
      actorUserId,
      'UPDATE_USER',
      'USER',
      id,
      `Cập nhật thông tin tài khoản: ${updatedUser.fullName}`
    );

    const { passwordHash: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  /**
   * 4. PATCH /api/admin/users/:id/status
   * Khoá hoặc mở khoá tài khoản
   */
  async toggleUserStatus(actorUserId: string, id: string, isActive: boolean) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    // Không cho phép tự khoá tài khoản của chính mình
    if (id === actorUserId && !isActive) {
      throw new AppError('Không thể tự khoá tài khoản đang đăng nhập.', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    await this.logAudit(
      actorUserId,
      isActive ? 'UNLOCK_USER' : 'LOCK_USER',
      'USER',
      id,
      `${isActive ? 'Mở khoá' : 'Khoá'} tài khoản: ${updated.fullName} (${updated.email})`
    );

    return updated;
  }

  /**
   * 5. POST /api/admin/users/:id/reset-password
   * Đặt lại mật khẩu về mặc định 123456
   */
  async resetPassword(actorUserId: string, id: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    const passwordHash = await bcrypt.hash('123456', 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.logAudit(
      actorUserId,
      'RESET_PASSWORD',
      'USER',
      id,
      `Đặt lại mật khẩu mặc định "123456" cho tài khoản: ${existing.fullName} (${existing.email})`
    );

    return {
      success: true,
      message: 'Mật khẩu đã được đặt lại về mặc định "123456".',
    };
  }

  /**
   * 6. DELETE /api/admin/users/:id
   * Xoá tài khoản nếu chưa từng là CHU_TRI hoặc PHOI_HOP của bất kỳ Task nào
   */
  async deleteUser(actorUserId: string, id: string) {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        taskAssignments: {
          where: {
            role: { in: [TaskAssignmentRole.CHU_TRI, TaskAssignmentRole.PHOI_HOP] },
          },
          select: { id: true },
        },
        createdTasks: {
          select: { id: true },
        },
        createdPlans: {
          select: { id: true },
        },
      },
    });

    if (!existing) {
      throw new AppError('Không tìm thấy thông tin tài khoản người dùng.', 404);
    }

    if (id === actorUserId) {
      throw new AppError('Không thể tự xoá tài khoản đang đăng nhập của chính mình.', 400);
    }

    const hasTasks = existing.taskAssignments.length > 0;
    const hasCreatedTasks = existing.createdTasks.length > 0;
    const hasCreatedPlans = existing.createdPlans.length > 0;

    if (hasTasks || hasCreatedTasks || hasCreatedPlans) {
      throw new AppError(
        'Không thể xoá tài khoản này vì đã có dữ liệu công việc/kế hoạch liên quan trong hệ thống. Vui lòng sử dụng tính năng "Khoá tài khoản" thay vì xoá.',
        400
      );
    }

    // Xoá an toàn
    await prisma.user.delete({ where: { id } });

    await this.logAudit(
      actorUserId,
      'DELETE_USER',
      'USER',
      id,
      `Xoá tài khoản người dùng: ${existing.fullName} (${existing.email})`
    );

    return {
      success: true,
      message: 'Xoá tài khoản thành công.',
    };
  }

  /**
   * 7. POST /api/admin/users/:id/roles
   * Thêm 1 dòng UserRole (role, scopeLocationId, scopeOrgUnitId)
   */
  async addUserRole(actorUserId: string, userId: string, data: AddUserRoleDto) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new AppError('Không tìm thấy thông tin người dùng.', 404);
    }

    const scopeLoc = data.scopeLocationId || null;
    const scopeOrg = data.scopeOrgUnitId || null;

    // Kiểm tra trùng lặp y hệt (cùng role + cùng scope)
    const isDuplicate = user.roles.some(
      (r) =>
        r.role === data.role &&
        r.scopeLocationId === scopeLoc &&
        r.scopeOrgUnitId === scopeOrg
    );

    if (isDuplicate) {
      throw new AppError('Vai trò và phạm vi này đã tồn tại cho người dùng.', 400);
    }

    const newRole = await prisma.userRole.create({
      data: {
        userId,
        role: data.role,
        scopeLocationId: scopeLoc,
        scopeOrgUnitId: scopeOrg,
      },
      include: {
        scopeLocation: { select: { id: true, name: true, code: true } },
        scopeOrgUnit: { select: { id: true, name: true, code: true } },
      },
    });

    await this.logAudit(
      actorUserId,
      'ADD_USER_ROLE',
      'ROLE',
      newRole.id,
      `Gán vai trò [${data.role}] cho người dùng ${user.fullName}`
    );

    return newRole;
  }

  /**
   * 8. DELETE /api/admin/users/:id/roles/:userRoleId
   * Gỡ 1 vai trò/phạm vi khỏi tài khoản (chặn nếu đây là vai trò cuối cùng)
   */
  async removeUserRole(actorUserId: string, userId: string, userRoleId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new AppError('Không tìm thấy thông tin người dùng.', 404);
    }

    const roleToDelete = user.roles.find((r) => r.id === userRoleId);
    if (!roleToDelete) {
      throw new AppError('Không tìm thấy vai trò cần gỡ của người dùng này.', 404);
    }

    if (user.roles.length <= 1) {
      throw new AppError(
        'Không thể gỡ vai trò cuối cùng của tài khoản. Mỗi tài khoản phải còn ít nhất 1 vai trò.',
        400
      );
    }

    await prisma.userRole.delete({ where: { id: userRoleId } });

    await this.logAudit(
      actorUserId,
      'REMOVE_USER_ROLE',
      'ROLE',
      userRoleId,
      `Gỡ vai trò [${roleToDelete.role}] khỏi người dùng ${user.fullName}`
    );

    return {
      success: true,
      message: 'Gỡ vai trò thành công.',
    };
  }

  /**
   * 9. GET /api/admin/permissions-matrix
   * Bảng ma trận phân quyền tĩnh mô tả 6 vai trò trong SRS
   */
  getPermissionsMatrix(): PermissionMatrixItem[] {
    return [
      {
        role: Role.HIEU_TRUONG,
        roleName: 'Hiệu trưởng',
        scope: 'Toàn trường (Tất cả điểm trường & tổ bộ phận)',
        description:
          'Lãnh đạo cao nhất của nhà trường, toàn quyền chỉ đạo điều hành, phê duyệt kế hoạch, giám sát và đóng việc.',
        capabilities: [
          {
            category: 'Kế hoạch & Chủ trương',
            details: [
              'Lập & duyệt kế hoạch năm học, học kỳ, quý, tháng, tuần toàn trường',
              'Xem tất cả kế hoạch của các tổ chuyên môn và điểm trường',
            ],
          },
          {
            category: 'Quản lý Công việc',
            details: [
              'Giao việc trực tiếp cho bất kỳ nhân sự nào thuộc nhà trường',
              'Chỉ đạo công việc phối hợp liên điểm trường / liên tổ',
              'Kiểm tra, phê duyệt kết quả hoàn thành và Đóng công việc',
            ],
          },
          {
            category: 'Giám sát & Báo cáo',
            details: [
              'Xem Dashboard tổng quan toàn trường thời gian thực',
              'Xem cảnh báo công việc quá hạn, nghẽn tiến độ',
              'Xem thống kê hiệu suất theo điểm trường và tổ chuyên môn',
            ],
          },
          {
            category: 'Quản trị hệ thống',
            details: [
              'Quản lý danh sách tài khoản toàn trường',
              'Phân quyền vai trò và phạm vi phụ trách cho cán bộ/giáo viên',
              'Quản lý danh mục điểm trường và cơ cấu tổ chức',
            ],
          },
        ],
      },
      {
        role: Role.PHO_HIEU_TRUONG,
        roleName: 'Phó Hiệu trưởng',
        scope: 'Toàn trường hoặc Điểm trường / Khối chuyên môn được phân công',
        description:
          'Phụ trách khối chuyên môn hoặc cơ sở/điểm trường theo phân công của Hiệu trưởng.',
        capabilities: [
          {
            category: 'Kế hoạch chuyên môn',
            details: [
              'Lập kế hoạch chuyên môn, kế hoạch tháng/tuần theo mảng phụ trách',
              'Tham mưu xây dựng kế hoạch năm học và học kỳ',
            ],
          },
          {
            category: 'Quản lý Công việc',
            details: [
              'Giao việc cho Tổ trưởng, Giáo viên thuộc phạm vi phụ trách',
              'Kiểm tra, đánh giá minh chứng và xác nhận kết quả công việc',
              'Theo dõi tiến độ phối hợp giữa các điểm trường',
            ],
          },
          {
            category: 'Giám sát & Thống kê',
            details: [
              'Xem Dashboard chuyên môn / điểm trường phụ trách',
              'Cảnh báo và đôn đốc các công việc sắp hoặc quá hạn',
            ],
          },
        ],
      },
      {
        role: Role.TO_TRUONG,
        roleName: 'Tổ trưởng chuyên môn / Trưởng bộ phận',
        scope: 'Tổ chuyên môn / Bộ phận trực thuộc',
        description:
          'Quản lý điều hành các hoạt động giảng dạy, sinh hoạt chuyên môn trong tổ.',
        capabilities: [
          {
            category: 'Kế hoạch Tổ',
            details: [
              'Xây dựng kế hoạch hoạt động tháng/tuần của tổ chuyên môn',
              'Cụ thể hoá kế hoạch nhà trường thành các đầu việc của tổ',
            ],
          },
          {
            category: 'Quản lý Công việc',
            details: [
              'Phân công nhiệm vụ (Chủ trì, Phối hợp) cho giáo viên trong tổ',
              'Theo dõi, đôn đốc tiến độ thực hiện nhiệm vụ của các thành viên',
              'Kiểm tra minh chứng, duyệt hoàn thành công việc cấp tổ',
            ],
          },
          {
            category: 'Báo cáo',
            details: [
              'Báo cáo tiến độ và chất lượng công việc của tổ cho Ban Giám hiệu',
            ],
          },
        ],
      },
      {
        role: Role.GIAO_VIEN,
        roleName: 'Giáo viên',
        scope: 'Điểm trường và Tổ chuyên môn đang công tác',
        description:
          'Trực tiếp thực hiện công tác giảng dạy, giáo dục và các nhiệm vụ chuyên môn được phân công.',
        capabilities: [
          {
            category: 'Thực hiện Công việc',
            details: [
              'Tiếp nhận công việc được giao (vai trò Chủ trì hoặc Phối hợp)',
              'Cập nhật tiến độ (% hoàn thành) và nhật ký thực hiện',
              'Tải lên minh chứng kết quả (hình ảnh, tài liệu, file đính kèm)',
              'Gửi yêu cầu kiểm tra khi hoàn thành công việc',
            ],
          },
          {
            category: 'Trao đổi & Phối hợp',
            details: [
              'Bình luận, trao đổi nhanh với người giao việc và người phối hợp',
              'Báo cáo khó khăn, vướng mắc trong quá trình thực hiện',
            ],
          },
        ],
      },
      {
        role: Role.NHAN_VIEN,
        roleName: 'Nhân viên (Văn thư, Kế toán, Y tế, Thư viện, Thiết bị...)',
        scope: 'Phòng ban / Bộ phận hành chính đang công tác',
        description:
          'Thực hiện các nghiệp vụ hỗ trợ giáo dục, quản trị cơ sở vật chất, hành chính văn thư.',
        capabilities: [
          {
            category: 'Thực hiện Nhiệm vụ',
            details: [
              'Tiếp nhận và xử lý các nhiệm vụ hành chính, phục vụ chuyên môn',
              'Cập nhật tiến độ và nộp chứng từ/hồ sơ minh chứng hoàn thành',
            ],
          },
          {
            category: 'Phối hợp công việc',
            details: [
              'Phối hợp với Ban Giám hiệu, Tổ trưởng và Giáo viên theo yêu cầu công tác',
            ],
          },
        ],
      },
      {
        role: Role.ADMIN,
        roleName: 'Quản trị hệ thống (System Administrator)',
        scope: 'Toàn bộ hệ thống kỹ thuật',
        description:
          'Quản trị tài khoản người dùng, cấu hình điểm trường, phân quyền vai trò và bảo trì hệ thống.',
        capabilities: [
          {
            category: 'Quản lý Tài khoản',
            details: [
              'Tạo mới, chỉnh sửa thông tin nhân sự',
              'Khoá / Mở khoá tài khoản người dùng',
              'Đặt lại mật khẩu về mặc định 123456',
              'Xoá tài khoản chưa phát sinh dữ liệu công việc',
            ],
          },
          {
            category: 'Phân quyền & Phạm vi',
            details: [
              'Gán vai trò và phạm vi phụ trách cho từng tài khoản',
              'Gỡ vai trò (đảm bảo mỗi tài khoản có ít nhất 1 vai trò)',
              'Xem ma trận phân quyền hệ thống',
            ],
          },
          {
            category: 'Quản lý Điểm trường & Danh mục',
            details: [
              'Tạo mới, sửa thông tin điểm trường, chỉ định người phụ trách',
              'Kiểm soát xoá điểm trường (chặn nếu còn nhân sự/công việc)',
              'Xem thống kê tổng quan điểm trường',
            ],
          },
          {
            category: 'Nhật ký Kiểm toán',
            details: [
              'Hệ thống tự động ghi vết toàn bộ thao tác quản trị vào AdminAuditLog',
            ],
          },
        ],
      },
    ];
  }
}

export const adminService = new AdminService();
