import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import {
  SystemAdminService,
  TenantListItem,
  PackageItem,
  CreateTenantPayload,
  SystemAuditLogItem,
} from '../../core/services/system-admin.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

export type SystemAdminTab = 'tenants' | 'packages' | 'audit-logs';

@Component({
  selector: 'app-system-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './system-admin.component.html',
  styleUrls: ['./system-admin.component.scss'],
})
export class SystemAdminComponent implements OnInit {
  authService = inject(AuthService);
  private systemAdminService = inject(SystemAdminService);

  activeTab = signal<SystemAdminTab>('tenants');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Tenants data
  tenants = signal<TenantListItem[]>([]);
  totalTenants = signal(0);
  page = signal(1);
  pageSize = signal(10);
  searchQuery = signal('');
  statusFilter = signal('');

  // Packages data
  packages = signal<PackageItem[]>([]);

  // Audit logs data
  auditLogs = signal<SystemAuditLogItem[]>([]);
  totalLogs = signal(0);
  logPage = signal(1);

  // Modals state
  showCreateTenantModal = signal(false);
  showAssignSubscriptionModal = signal(false);
  showPackageModal = signal(false);
  selectedTenant = signal<TenantListItem | null>(null);
  selectedPackage = signal<PackageItem | null>(null);

  // Create Tenant Form
  newTenant: CreateTenantPayload = {
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    principalName: '',
    schoolYear: '2026-2027',
    totalStudents: 1000,
    totalClasses: 30,
    adminFullName: '',
    adminPhone: '',
    adminEmail: '',
    adminPassword: '',
    packageId: '',
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

  // Metrics
  totalActiveTenants = computed(() => this.tenants().filter((t) => t.status === 'ACTIVE').length);
  totalRegisteredAccounts = computed(() =>
    this.tenants().reduce((acc, t) => acc + (t.stats?.userCount || 0), 0)
  );

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loadTenants();
    this.loadPackages();
  }

  switchTab(tab: SystemAdminTab) {
    this.activeTab.set(tab);
    if (tab === 'tenants') this.loadTenants();
    if (tab === 'packages') this.loadPackages();
    if (tab === 'audit-logs') this.loadAuditLogs();
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

  openCreateTenantModal() {
    this.newTenant = {
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      principalName: '',
      schoolYear: '2026-2027',
      totalStudents: 1000,
      totalClasses: 30,
      adminFullName: '',
      adminPhone: '',
      adminEmail: '',
      adminPassword: '',
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

    this.isLoading.set(true);
    this.systemAdminService.createTenant(this.newTenant).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.showCreateTenantModal.set(false);
        this.successMessage.set(res.message || 'Khởi tạo trường học & tài khoản Quản trị thành công!');
        this.loadTenants();
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Không thể tạo trường học');
      },
    });
  }

  toggleTenantStatus(tenant: TenantListItem) {
    const newStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionName = newStatus === 'SUSPENDED' ? 'tạm dừng' : 'kích hoạt lại';

    if (confirm(`Bạn có chắc chắn muốn ${actionName} thuê bao của trường "${tenant.name}"?`)) {
      this.systemAdminService.updateTenantStatus(tenant.id, newStatus).subscribe({
        next: (res) => {
          this.successMessage.set(res.message || `Đã ${actionName} trường thành công.`);
          this.loadTenants();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Không thể cập nhật trạng thái');
        },
      });
    }
  }

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
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Không thể tạo gói');
        },
      });
    }
  }

  switchToSystemAdmin() {
    this.authService.switchDemoAccount('0900000001').subscribe({
      next: () => {
        this.successMessage.set('Đã chuyển sang tài khoản Quản trị Nền tảng (System Admin)');
        this.loadInitialData();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
    });
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
        return 'Tạm dừng';
      case 'EXPIRED':
        return 'Hết hạn';
      case 'TRIAL':
        return 'Dùng thử';
      default:
        return status;
    }
  }
}
