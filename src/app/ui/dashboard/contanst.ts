type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'MAINTENANCE';

export const getRoomStatusText = (status: RoomStatus): string => {
  switch (status) {
    case 'OCCUPIED':
      return 'Hợp đồng đang hiệu lực';

    case 'RESERVED':
      return 'Hợp đồng chờ hiệu lực';

    case 'MAINTENANCE':
      return 'Tạm ngưng cho thuê';

    default:
      return 'Sẵn sàng cho thuê';
  }
};