import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import {
  SystemAdminService,
  TenantListItem,
  PackageItem,
  CreateTenantPayload,
  UpdateTenantPayload,
  SystemAuditLogItem,
  DashboardStats,
  TenantAdminItem,
  TenantReportItem,
} from '../../core/services/system-admin.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

export type SystemAdminTab = 'dashboard' | 'tenants' | 'packages' | 'reports' | 'audit-logs';

@Component({
  selector: 'app-system-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './system-admin.component.html',
  styleUrls: ['./system-admin.component.scss'],
})
export class SystemAdminComponent implements OnInit {
  readonly Math = Math;
  authService = inject(AuthService);
  private systemAdminService = inject(SystemAdminService);

  activeTab = signal<SystemAdminTab>('dashboard');
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Dashboard stats data
  dashboardStats = signal<DashboardStats | null>(null);

  // Tenants list data
  tenants = signal<TenantListItem[]>([]);
  totalTenants = signal(0);
  page = signal(1);
  pageSize = signal(10);
  searchQuery = signal('');
  statusFilter = signal('');

  // Packages data
  packages = signal<PackageItem[]>([]);

  // Reports data
  reports = signal<TenantReportItem[]>([]);
  reportSearchQuery = signal('');

  // Audit logs data
  auditLogs = signal<SystemAuditLogItem[]>([]);
  totalLogs = signal(0);
  logPage = signal(1);

  // Modals & Drawers state
  showCreateTenantModal = signal(false);
  showEditTenantModal = signal(false);
  showTenantDetailDrawer = signal(false);
  showTenantAdminModal = signal(false);
  showAssignSubscriptionModal = signal(false);
  showPackageModal = signal(false);

  selectedTenant = signal<TenantListItem | null>(null);
  selectedTenantDetail = signal<any | null>(null);
  selectedPackage = signal<PackageItem | null>(null);

  // Tenant Admin Management State
  tenantAdmins = signal<TenantAdminItem[]>([]);
  tenantUsers = signal<any[]>([]); // All users for replace dropdown
  adminModalTab = signal<'list' | 'edit' | 'reset-pass' | 'replace' | 'init'>('list');
  selectedAdmin = signal<TenantAdminItem | null>(null);

  adminForm = {
    fullName: '',
    email: '',
    phone: '',
    title: '',
    isActive: true,
    newPassword: '',
  };

  resetPassForm = {
    newPassword: '',
    confirmPassword: '',
  };

  replaceAdminForm = {
    mode: 'EXISTING_USER' as 'EXISTING_USER' | 'NEW_USER',
    existingUserId: '',
    newAdminName: '',
    newAdminEmail: '',
    newAdminPhone: '',
    newAdminPassword: '123456',
    newAdminTitle: 'Quản trị hệ thống (Admin trường)',
    archiveOldAdmin: true,
  };

  initAdminForm = {
    fullName: '',
    email: '',
    phone: '',
    password: '123456',
    title: 'Quản trị hệ thống (Admin trường)',
  };

  // Create Tenant Form
  newTenant: CreateTenantPayload = {
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    principalName: '',
    schoolYear: '2026-2027',
    totalStudents: 0,
    totalClasses: 0,
    totalStaff: 0,
    description: '',
    adminFullName: '',
    adminPhone: '',
    adminEmail: '',
    adminPassword: '',
    adminTitle: 'Quản trị hệ thống (Admin trường)',
    packageId: '',
  };

  // Edit Tenant Form
  editTenantForm: UpdateTenantPayload = {
    name: '',
    status: 'ACTIVE',
    address: '',
    phone: '',
    email: '',
    website: '',
    principalName: '',
    schoolYear: '2026-2027',
    totalStudents: 0,
    totalFemaleStudents: 0,
    totalClasses: 0,
    totalStaff: 0,
    description: '',
  };

  // Subscription Form
  subscriptionForm = {
    tenantId: '',
    packageId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
  };

  // Package Form
  packageForm: Partial<PackageItem> = {
    name: '',
    code: '',
    maxAccounts: 100,
    storageQuotaGB: 20,
    price: 0,
    description: '',
    enabledModules: '["PLANS", "TASKS", "REPORTS", "KPI"]',
  };

  // Computed Metrics
  totalActiveTenants = computed(() => this.dashboardStats()?.activeTenants || 0);
  totalSuspendedTenants = computed(() => this.dashboardStats()?.suspendedTenants || 0);
  totalRegisteredAccounts = computed(() => this.dashboardStats()?.totalUsers || 0);
  filteredReports = computed(() => {
    const q = this.reportSearchQuery().toLowerCase().trim();
    if (!q) return this.reports();
    return this.reports().filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.principalName.toLowerCase().includes(q) ||
        r.packageName.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loadDashboardStats();
    this.loadTenants();
    this.loadPackages();
  }

  switchTab(tab: SystemAdminTab) {
    this.activeTab.set(tab);
    if (tab === 'dashboard') this.loadDashboardStats();
    if (tab === 'tenants') this.loadTenants();
    if (tab === 'packages') this.loadPackages();
    if (tab === 'reports') this.loadReports();
    if (tab === 'audit-logs') this.loadAuditLogs();
  }

  loadDashboardStats() {
    this.systemAdminService.getDashboardStats().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.dashboardStats.set(res.data);
        }
      },
      error: (err) => {
        console.error('Không thể tải Dashboard Stats:', err);
      },
    });
  }

  loadTenants() {
    this.isLoading.set(true);
    this.systemAdminService
      .getTenants(this.page(), this.pageSize(), this.searchQuery(), this.statusFilter())
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.tenants.set(res.data.items || []);
            this.totalTenants.set(res.data.total || 0);
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Không thể tải danh sách trường học');
          this.isLoading.set(false);
        },
      });
  }

  loadPackages() {
    this.systemAdminService.getPackages().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.packages.set(res.data || []);
          if (res.data.length > 0 && !this.newTenant.packageId) {
            this.newTenant.packageId = res.data[0].id;
          }
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể tải danh sách gói dịch vụ');
      },
    });
  }

  loadReports() {
    this.isLoading.set(true);
    this.systemAdminService.getTenantReports().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reports.set(res.data || []);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể tải báo cáo khai thác tài nguyên');
        this.isLoading.set(false);
      },
    });
  }

  loadAuditLogs() {
    this.isLoading.set(true);
    this.systemAdminService.getAuditLogs(this.logPage(), 20).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.auditLogs.set(res.data.items || []);
          this.totalLogs.set(res.data.total || 0);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể tải nhật ký kiểm toán hệ thống');
        this.isLoading.set(false);
      },
    });
  }

  onSearchChange() {
    this.page.set(1);
    this.loadTenants();
  }

  onStatusFilterChange() {
    this.page.set(1);
    this.loadTenants();
  }

  onPageChange(newPage: number) {
    this.page.set(newPage);
    this.loadTenants();
  }

  // ==========================================
  // CREATE TENANT
  // ==========================================
  openCreateTenantModal() {
    this.newTenant = {
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      principalName: '',
      schoolYear: '2026-2027',
      totalStudents: 0,
      totalClasses: 0,
      totalStaff: 0,
      description: '',
      adminFullName: '',
      adminPhone: '',
      adminEmail: '',
      adminPassword: '',
      adminTitle: 'Quản trị hệ thống (Admin trường)',
      packageId: this.packages().length > 0 ? this.packages()[0].id : '',
    };
    this.errorMessage.set(null);
    this.showCreateTenantModal.set(true);
  }

  closeCreateTenantModal() {
    this.showCreateTenantModal.set(false);
  }

  submitCreateTenant() {
    if (!this.newTenant.name || !this.newTenant.code) {
      this.errorMessage.set('Vui lòng nhập tên trường và mã định danh trường.');
      return;
    }
    if (!this.newTenant.adminFullName || !this.newTenant.adminEmail || !this.newTenant.adminPhone) {
      this.errorMessage.set('Vui lòng nhập đầy đủ Họ tên, Email và Số điện thoại của Quản trị viên trường.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // Đồng bộ payload
    const payload: CreateTenantPayload = {
      ...this.newTenant,
      adminName: this.newTenant.adminFullName,
    };

    this.systemAdminService.createTenant(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showCreateTenantModal.set(false);
        this.successMessage.set(res.message || 'Khởi tạo trường học & tài khoản Quản trị thành công!');
        this.loadTenants();
        this.loadDashboardStats();
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Không thể tạo trường học');
      },
    });
  }

  // ==========================================
  // EDIT TENANT
  // ==========================================
  openEditTenantModal(tenant: TenantListItem) {
    this.selectedTenant.set(tenant);
    this.editTenantForm = {
      name: tenant.name,
      status: tenant.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      logoUrl: tenant.logoUrl || '',
      address: tenant.school?.address || '',
      phone: tenant.school?.phone || '',
      email: tenant.school?.email || '',
      website: '',
      principalName: tenant.school?.principalName || '',
      schoolYear: tenant.school?.schoolYear || '2026-2027',
      totalStudents: tenant.school?.totalStudents || 0,
      totalClasses: tenant.school?.totalClasses || 0,
      totalStaff: tenant.school?.totalStaff || 0,
      description: tenant.school?.description || '',
    };
    this.errorMessage.set(null);
    this.showEditTenantModal.set(true);
  }

  closeEditTenantModal() {
    this.showEditTenantModal.set(false);
    this.selectedTenant.set(null);
  }

  submitEditTenant() {
    const tenant = this.selectedTenant();
    if (!tenant) return;

    if (!this.editTenantForm.name) {
      this.errorMessage.set('Tên trường học không được để trống.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.systemAdminService.updateTenant(tenant.id, this.editTenantForm).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showEditTenantModal.set(false);
        this.successMessage.set(res.message || 'Cập nhật thông tin trường học thành công!');
        this.loadTenants();
        this.loadDashboardStats();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Không thể cập nhật thông tin trường học');
      },
    });
  }

  // ==========================================
  // TENANT 360 DETAIL DRAWER
  // ==========================================
  openTenantDetailDrawer(tenant: TenantListItem) {
    this.selectedTenant.set(tenant);
    this.selectedTenantDetail.set(null);
    this.showTenantDetailDrawer.set(true);

    this.systemAdminService.getTenantById(tenant.id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedTenantDetail.set(res.data);
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể tải chi tiết trường');
      },
    });
  }

  closeTenantDetailDrawer() {
    this.showTenantDetailDrawer.set(false);
    this.selectedTenantDetail.set(null);
  }

  // ==========================================
  // TENANT ADMIN SUITE MANAGEMENT
  // ==========================================
  openTenantAdminModal(tenant: TenantListItem) {
    this.selectedTenant.set(tenant);
    this.adminModalTab.set('list');
    this.errorMessage.set(null);
    this.showTenantAdminModal.set(true);
    this.loadTenantAdminsAndUsers(tenant.id);
  }

  closeTenantAdminModal() {
    this.showTenantAdminModal.set(false);
    this.selectedTenant.set(null);
    this.selectedAdmin.set(null);
    this.tenantAdmins.set([]);
  }

  loadTenantAdminsAndUsers(tenantId: string) {
    this.isLoading.set(true);
    this.systemAdminService.getTenantAdmins(tenantId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.tenantAdmins.set(res.data || []);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể tải danh sách Quản trị viên trường');
        this.isLoading.set(false);
      },
    });

    // Tải toàn bộ user của tenant để phục vụ thay thế admin
    this.systemAdminService.getTenantById(tenantId).subscribe({
      next: (res) => {
        if (res.success && res.data?.users) {
          this.tenantUsers.set(res.data.users || []);
        }
      },
    });
  }

  openEditAdminForm(admin: TenantAdminItem) {
    this.selectedAdmin.set(admin);
    this.adminForm = {
      fullName: admin.fullName,
      email: admin.email,
      phone: admin.phone,
      title: admin.title || '',
      isActive: admin.isActive,
      newPassword: '',
    };
    this.adminModalTab.set('edit');
  }

  openResetPasswordForm(admin: TenantAdminItem) {
    this.selectedAdmin.set(admin);
    this.resetPassForm = {
      newPassword: '',
      confirmPassword: '',
    };
    this.adminModalTab.set('reset-pass');
  }

  openReplaceAdminForm() {
    this.replaceAdminForm = {
      mode: 'EXISTING_USER',
      existingUserId: this.tenantUsers().length > 0 ? this.tenantUsers()[0].id : '',
      newAdminName: '',
      newAdminEmail: '',
      newAdminPhone: '',
      newAdminPassword: '123456',
      newAdminTitle: 'Quản trị hệ thống (Admin trường)',
      archiveOldAdmin: true,
    };
    this.adminModalTab.set('replace');
  }

  openInitAdminForm() {
    this.initAdminForm = {
      fullName: '',
      email: '',
      phone: '',
      password: '123456',
      title: 'Quản trị hệ thống (Admin trường)',
    };
    this.adminModalTab.set('init');
  }

  submitUpdateAdmin() {
    const tenant = this.selectedTenant();
    const admin = this.selectedAdmin();
    if (!tenant || !admin) return;

    if (!this.adminForm.fullName || !this.adminForm.email || !this.adminForm.phone) {
      this.errorMessage.set('Vui lòng nhập đầy đủ Họ tên, Email và Số điện thoại.');
      return;
    }

    this.isSubmitting.set(true);
    this.systemAdminService.updateTenantAdmin(tenant.id, admin.id, this.adminForm).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(res.message || 'Cập nhật thông tin Quản trị viên thành công!');
        this.loadTenantAdminsAndUsers(tenant.id);
        this.loadTenants();
        this.adminModalTab.set('list');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Không thể cập nhật quản trị viên');
      },
    });
  }

  submitResetAdminPassword() {
    const tenant = this.selectedTenant();
    const admin = this.selectedAdmin();
    if (!tenant || !admin) return;

    const newPass = this.resetPassForm.newPassword.trim();
    if (!newPass || newPass.length < 6) {
      this.errorMessage.set('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPass !== this.resetPassForm.confirmPassword.trim()) {
      this.errorMessage.set('Xác nhận mật khẩu không khớp.');
      return;
    }

    this.isSubmitting.set(true);
    this.systemAdminService.resetTenantAdminPassword(tenant.id, admin.id, newPass).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(res.message || 'Đặt lại mật khẩu Admin thành công!');
        this.adminModalTab.set('list');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Không thể đặt lại mật khẩu');
      },
    });
  }

  submitReplaceAdmin() {
    const tenant = this.selectedTenant();
    if (!tenant) return;

    if (this.replaceAdminForm.mode === 'EXISTING_USER' && !this.replaceAdminForm.existingUserId) {
      this.errorMessage.set('Vui lòng chọn cán bộ hiện có để chuyển giao quyền Admin.');
      return;
    }
    if (this.replaceAdminForm.mode === 'NEW_USER') {
      if (
        !this.replaceAdminForm.newAdminName ||
        !this.replaceAdminForm.newAdminEmail ||
        !this.replaceAdminForm.newAdminPhone
      ) {
        this.errorMessage.set('Vui lòng nhập đầy đủ thông tin Admin mới.');
        return;
      }
    }

    this.isSubmitting.set(true);
    this.systemAdminService.replaceTenantAdmin(tenant.id, this.replaceAdminForm).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(res.message || 'Đã chuyển giao quyền Quản trị viên trường thành công!');
        this.loadTenantAdminsAndUsers(tenant.id);
        this.loadTenants();
        this.adminModalTab.set('list');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Không thể chuyển giao quyền quản trị');
      },
    });
  }

  submitInitAdmin() {
    const tenant = this.selectedTenant();
    if (!tenant) return;

    if (!this.initAdminForm.fullName || !this.initAdminForm.email || !this.initAdminForm.phone) {
      this.errorMessage.set('Vui lòng nhập đầy đủ Họ tên, Email và Số điện thoại.');
      return;
    }

    this.isSubmitting.set(true);
    this.systemAdminService.initializeTenantAdmin(tenant.id, this.initAdminForm).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set(res.message || 'Khởi tạo tài khoản Quản trị viên trường thành công!');
        this.loadTenantAdminsAndUsers(tenant.id);
        this.loadTenants();
        this.adminModalTab.set('list');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Không thể khởi tạo quản trị viên');
      },
    });
  }

  // ==========================================
  // LOCK / UNLOCK TENANT
  // ==========================================
  toggleTenantStatus(tenant: TenantListItem) {
    const newStatus: 'ACTIVE' | 'SUSPENDED' = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionName = newStatus === 'SUSPENDED' ? 'TẠM DỪNG / KHÓA' : 'MỞ KHÓA / KÍCH HOẠT LẠI';
    const confirmPrompt =
      newStatus === 'SUSPENDED'
        ? `CẢNH BÁO: Khi tạm khóa trường "${tenant.name}", TOÀN BỘ cán bộ, giáo viên và học sinh thuộc trường này sẽ BỊ CHẶN ĐĂNG NHẬP ngay lập tức.\n\nBạn có chắc chắn muốn khóa trường này?`
        : `Bạn có muốn kích hoạt lại trường "${tenant.name}"? Người dùng sẽ có thể đăng nhập bình thường.`;

    if (confirm(confirmPrompt)) {
      this.systemAdminService.updateTenantStatus(tenant.id, newStatus).subscribe({
        next: (res) => {
          this.successMessage.set(res.message || `Đã ${actionName} trường thành công.`);
          // Cập nhật trạng thái ngay trong mảng signals
          this.tenants.update((list) =>
            list.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t))
          );
          this.loadDashboardStats();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Không thể cập nhật trạng thái trường học');
        },
      });
    }
  }

  // ==========================================
  // SUBSCRIPTION & PACKAGE
  // ==========================================
  openAssignSubscriptionModal(tenant: TenantListItem) {
    this.selectedTenant.set(tenant);
    this.subscriptionForm = {
      tenantId: tenant.id,
      packageId: this.packages().length > 0 ? this.packages()[0].id : '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    };
    this.showAssignSubscriptionModal.set(true);
  }

  openAssignSubscriptionForExpiring(exp: any) {
    const tenantItem: any = {
      id: exp.tenantId,
      name: exp.tenantName,
      code: exp.tenantCode,
      status: 'ACTIVE',
      logoUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.openAssignSubscriptionModal(tenantItem);
  }

  closeAssignSubscriptionModal() {
    this.showAssignSubscriptionModal.set(false);
    this.selectedTenant.set(null);
  }

  submitAssignSubscription() {
    if (!this.subscriptionForm.tenantId || !this.subscriptionForm.packageId) {
      return;
    }

    this.isLoading.set(true);
    this.systemAdminService
      .assignSubscription({
        tenantId: this.subscriptionForm.tenantId,
        packageId: this.subscriptionForm.packageId,
        startDate: this.subscriptionForm.startDate,
        endDate: this.subscriptionForm.endDate,
      })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.showAssignSubscriptionModal.set(false);
          this.successMessage.set(res.message || 'Gán gói dịch vụ cho trường thành công!');
          this.loadTenants();
          this.loadDashboardStats();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Không thể gán gói dịch vụ');
        },
      });
  }

  openPackageModal(pkg?: PackageItem) {
    if (pkg) {
      this.selectedPackage.set(pkg);
      this.packageForm = { ...pkg };
    } else {
      this.selectedPackage.set(null);
      this.packageForm = {
        name: '',
        code: '',
        maxAccounts: 100,
        storageQuotaGB: 20,
        price: 0,
        description: '',
        enabledModules: '["PLANS", "TASKS", "REPORTS", "KPI"]',
      };
    }
    this.showPackageModal.set(true);
  }

  closePackageModal() {
    this.showPackageModal.set(false);
    this.selectedPackage.set(null);
  }

  submitPackageForm() {
    if (!this.packageForm.name || !this.packageForm.code) {
      this.errorMessage.set('Vui lòng nhập tên và mã gói dịch vụ.');
      return;
    }

    const currentPkg = this.selectedPackage();
    this.isLoading.set(true);

    if (currentPkg) {
      this.systemAdminService.updatePackage(currentPkg.id, this.packageForm).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.showPackageModal.set(false);
          this.successMessage.set(res.message || 'Cập nhật gói dịch vụ thành công!');
          this.loadPackages();
          this.loadDashboardStats();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Không thể cập nhật gói');
        },
      });
    } else {
      this.systemAdminService.createPackage(this.packageForm).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.showPackageModal.set(false);
          this.successMessage.set(res.message || 'Tạo mới gói dịch vụ thành công!');
          this.loadPackages();
          this.loadDashboardStats();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Không thể tạo gói');
        },
      });
    }
  }

  // Export report to CSV
  exportReportsToCSV() {
    const data = this.reports();
    if (!data || data.length === 0) {
      alert('Không có dữ liệu báo cáo để xuất.');
      return;
    }

    const headers = [
      'Mã trường',
      'Tên trường',
      'Trạng thái',
      'Hiệu trưởng',
      'Số điện thoại',
      'Email',
      'Gói cước',
      'Tài khoản đã dùng',
      'Hạn mức TK',
      'Tỷ lệ sử dụng (%)',
      'Dung lượng GB',
      'Số điểm trường',
      'Số tổ CM',
      'Số kế hoạch',
      'Số công việc',
      'Admin trường',
      'Email Admin',
      'Hạn thuê bao',
    ];

    const rows = data.map((r) => [
      `"${r.code}"`,
      `"${r.name}"`,
      `"${r.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}"`,
      `"${r.principalName}"`,
      `"${r.phone}"`,
      `"${r.email}"`,
      `"${r.packageName}"`,
      r.userCount,
      r.maxAccounts,
      `${r.utilizationRate}%`,
      r.storageQuotaGB,
      r.locationsCount,
      r.orgUnitsCount,
      r.plansCount,
      r.tasksCount,
      `"${r.adminFullName}"`,
      `"${r.adminEmail}"`,
      `"${r.subscriptionEndDate ? new Date(r.subscriptionEndDate).toLocaleDateString('vi-VN') : '-'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TN_EDU_Bao_cao_Truong_Hoc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'badge-active';
      case 'SUSPENDED':
        return 'badge-suspended';
      case 'EXPIRED':
        return 'badge-expired';
      case 'TRIAL':
        return 'badge-trial';
      default:
        return 'badge-neutral';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Đang hoạt động';
      case 'SUSPENDED':
        return 'Tạm dừng / Đã khóa';
      case 'EXPIRED':
        return 'Hết hạn';
      case 'TRIAL':
        return 'Dùng thử';
      default:
        return status;
    }
  }
}
