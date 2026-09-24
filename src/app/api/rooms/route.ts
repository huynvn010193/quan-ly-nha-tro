import { createRoomHandler, getRoomsHandler } from '@/backend/rooms/room.handlers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return getRoomsHandler(request);
}

export async function POST(request: Request) {
  return createRoomHandler(request);
}
