export const ROOM_STATUSES = ['Đang thuê', 'Còn trống', 'Sắp trả'] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

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
};
export type UpdateRoomInput = Partial<Omit<CreateRoomInput, 'primaryTenantName'>>;

export type RoomListResult = {
  data: Room[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
