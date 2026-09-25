export const ROOM_STATUSES = ['Đang thuê', 'Còn trống', 'Sắp trả'] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export type Room = {
  id: string;
  name: string;
  floor: string;
  tenant: string;
  price: number;
  status: RoomStatus;
  people: number;
  moveInDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateRoomInput = Omit<Room, 'id' | 'createdAt' | 'updatedAt'> & {
  primaryTenantId?: string;
  primaryTenantName?: string;
};
export type UpdateRoomInput = Partial<Omit<CreateRoomInput, 'primaryTenantId' | 'primaryTenantName'>>;

export type RoomListResult = {
  data: Room[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
