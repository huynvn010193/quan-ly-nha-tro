import { ObjectId, type Collection, type Filter, type WithId } from 'mongodb';
import { getDatabase } from '@/backend/database/mongodb';
import type { CreateRoomInput, Room, RoomListResult, RoomStatus, UpdateRoomInput } from './room.types';

type RoomDocument = CreateRoomInput & {
  createdAt: Date;
  updatedAt: Date;
};

let indexPromise: Promise<string[]> | undefined;

async function getRoomsCollection(): Promise<Collection<RoomDocument>> {
  const database = await getDatabase();
  const collection = database.collection<RoomDocument>('rooms');

  if (!indexPromise) {
    indexPromise = Promise.all([
      collection.createIndex({ name: 1 }, { unique: true, name: 'unique_room_name' }),
      collection.createIndex({ status: 1 }, { name: 'room_status' }),
      collection.createIndex({ tenant: 1 }, { name: 'room_tenant' })
    ]);
  }
  await indexPromise;

  return collection;
}

function toRoom(document: WithId<RoomDocument>): Room {
  return {
    id: document._id.toHexString(),
    name: document.name,
    floor: document.floor,
    tenant: document.tenant,
    price: document.price,
    status: document.status,
    people: document.people,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listRooms(options: { page: number; limit: number; search?: string; status?: RoomStatus }): Promise<RoomListResult> {
  const collection = await getRoomsCollection();
  const filter: Filter<RoomDocument> = {};

  if (options.status) filter.status = options.status;
  if (options.search) {
    const pattern = new RegExp(escapeRegex(options.search), 'i');
    filter.$or = [{ name: pattern }, { tenant: pattern }, { floor: pattern }];
  }

  const [documents, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ name: 1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .toArray(),
    collection.countDocuments(filter)
  ]);

  return {
    data: documents.map(toRoom),
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / options.limit))
    }
  };
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const collection = await getRoomsCollection();
  const now = new Date();
  const document: RoomDocument = { ...input, createdAt: now, updatedAt: now };
  const result = await collection.insertOne(document);
  return toRoom({ ...document, _id: result.insertedId });
}

export async function updateRoom(id: string, input: UpdateRoomInput): Promise<Room | null> {
  if (!ObjectId.isValid(id)) return null;
  const collection = await getRoomsCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  return result ? toRoom(result) : null;
}

export async function deleteRoom(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await getRoomsCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
