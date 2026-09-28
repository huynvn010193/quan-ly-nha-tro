export const ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  AVAILABLE: 'Phòng trống',
  OCCUPIED: 'Đang thuê',
  RESERVED: 'Đã đặt',
  MAINTENANCE: 'Bảo trì'
};

export type CreateRoomContractInput = {
  status: 'PENDING' | 'ACTIVE';
  startDate: string;
  endDate?: string | null;
  depositAmount: number;
  billingDay: number;
  note?: string;
};

export type RoomMemberSummary = {
  tenantId: string;
  fullName: string;
  role: 'PRIMARY_TENANT' | 'MEMBER';
  moveInDate: string;
};

export type Room = {
  id: string;
  name: string;
  floor: string;
  tenant: string;
  price: number;
  status: RoomStatus;
  people: number;
  primaryTenantId?: string;
  members?: RoomMemberSummary[];
  moveInDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateRoomInput = Omit<Room, 'id' | 'createdAt' | 'updatedAt' | 'primaryTenantId' | 'members'> & {
  primaryTenantId?: string;
  primaryTenantName?: string;
  contract?: CreateRoomContractInput;
};
export type UpdateRoomInput = Partial<Omit<CreateRoomInput, 'primaryTenantName' | 'contract'>>;

export type RoomListResult = {
  data: Room[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
