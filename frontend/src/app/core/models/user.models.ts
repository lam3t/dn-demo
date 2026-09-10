export interface UserPickerItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  title?: string | null;
  avatarUrl?: string | null;
  primaryLocation?: { id: string; name: string; code?: string } | null;
  primaryOrgUnit?: { id: string; name: string; code?: string } | null;
  roles?: {
    role: string;
    scopeLocationId?: string | null;
    scopeOrgUnitId?: string | null;
    scopeLocation?: { id: string; name: string } | null;
    scopeOrgUnit?: { id: string; name: string } | null;
  }[];
  currentTaskLoad: number;
  sharedTaskCount?: number;
  isToTruong?: boolean;
}

export interface LocationItem {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
}

export interface OrgUnitItem {
  id: string;
  name: string;
  code: string;
  type?: string | null;
  parentId?: string | null;
}

export interface OrgTreeNode {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  orderIndex: number;
  leader?: {
    id: string;
    fullName: string;
    title: string | null;
    phone: string;
    avatarUrl: string | null;
  } | null;
  userCount: number;
  taskCount: number;
  users?: UserPickerItem[];
  children: OrgTreeNode[];
}

