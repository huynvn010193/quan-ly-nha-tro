import { deleteRoomHandler, updateRoomHandler } from '@/backend/rooms/room.handlers';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: RouteContext<'/api/rooms/[id]'>) {
  const { id } = await context.params;
  return updateRoomHandler(request, id);
}

export async function DELETE(_request: Request, context: RouteContext<'/api/rooms/[id]'>) {
  const { id } = await context.params;
  return deleteRoomHandler(id);
}
