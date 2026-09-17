export interface DocumentFolder {
  id: string;
  name: string;
  parentId: string | null;
  tenantId: string;
  academicYear?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt?: string;
  children?: DocumentFolder[];
  fileCount?: number;
  totalSize?: number;
  isOpen?: boolean; // UI state for tree node expansion
}

export interface DocumentFile {
  id: string;
  folderId: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedById?: string;
  uploadedBy?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    phone?: string;
  };
  tenantId: string;
  academicYear?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
}

export interface CreateFolderDto {
  name: string;
  parentId?: string | null;
  academicYear?: string;
}

export interface UpdateFolderDto {
  name: string;
}

export interface DocumentUploadEvent {
  progress: number;
  completed: boolean;
  data?: DocumentFile[];
}
