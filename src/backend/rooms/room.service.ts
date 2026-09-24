import { createRoom, deleteRoom, listRooms, updateRoom } from './room.repository';
import { ROOM_STATUSES, type RoomStatus } from './room.types';
import { validateCreateRoom, validateUpdateRoom } from './room.validation';

export async function getRoomList(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
  const search = searchParams.get('search')?.trim() || undefined;
  const requestedStatus = searchParams.get('status');
  const status = requestedStatus && ROOM_STATUSES.includes(requestedStatus as RoomStatus) ? (requestedStatus as RoomStatus) : undefined;

  return listRooms({ page, limit, search, status });
}

export async function addRoom(payload: unknown) {
  return createRoom(validateCreateRoom(payload));
}

export async function editRoom(id: string, payload: unknown) {
  return updateRoom(id, validateUpdateRoom(payload));
}

export async function removeRoom(id: string) {
  return deleteRoom(id);
}
