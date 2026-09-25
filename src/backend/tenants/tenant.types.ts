export const TENANT_GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export const ROOM_MEMBER_ROLES = ['PRIMARY_TENANT', 'MEMBER'] as const;

export type TenantGender = (typeof TENANT_GENDERS)[number];
export type RoomMemberRole = (typeof ROOM_MEMBER_ROLES)[number];

export type TenantAttachment = {
  fileName: string;
  fileKey: string;
  mimeType: string;
  size: number;
};

export type Tenant = {
  id: string;
  fullName: string;
  phone?: string;
  birthDate?: string;
  birthYear?: number;
  cccd?: string;
  cccdImages: {
    front?: string;
    back?: string;
  };
  gender?: TenantGender;
  ethnicity?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  attachments: TenantAttachment[];
  profileCompleted: boolean;
  activeRoom: {
    roomMemberId: string;
    roomId: string;
    roomNumber: string;
    floor: string;
    role: RoomMemberRole;
    moveInDate: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTenantInput = {
  fullName: string;
  phone: string;
  birthDate: Date;
  birthYear: number;
  cccd: string;
  gender: TenantGender;
  ethnicity: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  roomId: string;
  role: RoomMemberRole;
  moveInDate: Date;
};

export type UpdateTenantInput = Partial<
  Pick<Tenant, 'fullName' | 'phone' | 'birthYear' | 'cccd' | 'gender' | 'ethnicity' | 'permanentAddress' | 'temporaryAddress'>
> & {
  birthDate?: Date;
  roomId?: string;
  role?: RoomMemberRole;
  moveInDate?: Date;
};

export type TenantListResult = {
  data: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type TenantUploadFiles = {
  citizenIdFront?: File;
  citizenIdBack?: File;
  attachments: File[];
};
