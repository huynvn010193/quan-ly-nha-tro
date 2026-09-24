import { MongoServerError } from 'mongodb';
import { addRoom, editRoom, getRoomList, removeRoom } from './room.service';
import { RoomValidationError } from './room.validation';

function errorResponse(error: unknown) {
  if (error instanceof RoomValidationError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof MongoServerError && error.code === 11000) return Response.json({ error: 'Tên phòng đã tồn tại.' }, { status: 409 });

  console.error('Room API error:', error instanceof Error ? error.message : 'Unknown error');
  return Response.json({ error: 'Không thể xử lý yêu cầu. Vui lòng thử lại.' }, { status: 500 });
}

export async function getRoomsHandler(request: Request) {
  try {
    const result = await getRoomList(new URL(request.url).searchParams);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function createRoomHandler(request: Request) {
  try {
    const room = await addRoom(await request.json());
    return Response.json({ data: room }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function updateRoomHandler(request: Request, id: string) {
  try {
    const room = await editRoom(id, await request.json());
    if (!room) return Response.json({ error: 'Không tìm thấy phòng.' }, { status: 404 });
    return Response.json({ data: room });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function deleteRoomHandler(id: string) {
  try {
    const deleted = await removeRoom(id);
    if (!deleted) return Response.json({ error: 'Không tìm thấy phòng.' }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
