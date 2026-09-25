import { ObjectId, type ClientSession, type Collection, type Db, type Filter, type WithId } from 'mongodb';
import { getDatabase, getMongoClient } from '@/backend/database/mongodb';
import { deleteTenantFiles } from '@/backend/tenants/tenant.repository';
import type { CreateRoomInput, Room, RoomListResult, RoomStatus, UpdateRoomInput } from './room.types';

type RoomDocument = Omit<CreateRoomInput, 'primaryTenantId' | 'primaryTenantName' | 'moveInDate'> & {
  moveInDate?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type RoomMemberDocument = {
  roomId: ObjectId;
  tenantId: ObjectId;
  role: 'PRIMARY_TENANT' | 'MEMBER';
  moveInDate: Date;
  moveOutDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type RoomSummary = {
  tenant: string;
  people: number;
  primaryTenantId?: string;
  members: Room['members'];
  moveInDate?: Date;
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

function toRoom(document: WithId<RoomDocument>, summary?: RoomSummary): Room {
  return {
    id: document._id.toHexString(),
    name: document.name,
    floor: document.floor,
    tenant: summary?.tenant ?? document.tenant,
    price: document.price,
    status: document.status,
    people: summary?.people ?? document.people,
    primaryTenantId: summary?.primaryTenantId,
    members: summary?.members,
    moveInDate: summary?.moveInDate?.toISOString() ?? document.moveInDate?.toISOString(),
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

  const database = await getDatabase();
  const roomIds = documents.map((document) => document._id);
  const memberships = roomIds.length
    ? await database
        .collection<{ roomId: ObjectId; tenantId: ObjectId; role: 'PRIMARY_TENANT' | 'MEMBER'; moveInDate: Date; isActive: boolean }>('roomMembers')
        .find({ roomId: { $in: roomIds }, isActive: true })
        .toArray()
    : [];
  const tenantIds = [...new Set(memberships.map((membership) => membership.tenantId.toHexString()))].map((id) => new ObjectId(id));
  const tenants = tenantIds.length
    ? await database
        .collection<{ fullName: string }>('tenants')
        .find({ _id: { $in: tenantIds } })
        .toArray()
    : [];
  const tenantById = new Map(tenants.map((tenant) => [tenant._id.toHexString(), tenant.fullName]));
  const summaryByRoom = new Map<string, RoomSummary>();
  for (const roomId of roomIds) {
    const roomMemberships = memberships.filter((membership) => membership.roomId.equals(roomId));
    if (!roomMemberships.length) continue;
    const primary = roomMemberships.find((membership) => membership.role === 'PRIMARY_TENANT') || roomMemberships[0];
    summaryByRoom.set(roomId.toHexString(), {
      tenant: tenantById.get(primary.tenantId.toHexString()) || 'Chưa có chủ phòng',
      people: roomMemberships.length,
      primaryTenantId: primary.tenantId.toHexString(),
      members: roomMemberships.map((membership) => ({
        tenantId: membership.tenantId.toHexString(),
        fullName: tenantById.get(membership.tenantId.toHexString()) || 'Người thuê đã xóa',
        role: membership.role,
        moveInDate: membership.moveInDate.toISOString()
      })),
      moveInDate: primary.moveInDate
    });
  }

  return {
    data: documents.map((document) => toRoom(document, summaryByRoom.get(document._id.toHexString()))),
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / options.limit))
    }
  };
}

async function syncRoomFromMembers(database: Db, roomId: ObjectId, session: ClientSession) {
  const roomMembers = database.collection<RoomMemberDocument>('roomMembers');
  const activeMembers = await roomMembers.find({ roomId, isActive: true }, { session }).toArray();
  const primary = activeMembers.find((membership) => membership.role === 'PRIMARY_TENANT');
  const primaryTenant = primary ? await database.collection<{ fullName: string }>('tenants').findOne({ _id: primary.tenantId }, { session }) : null;
  await database.collection<RoomDocument>('rooms').updateOne(
    { _id: roomId },
    {
      $set: {
        people: activeMembers.length,
        tenant: primaryTenant?.fullName || (activeMembers.length ? 'Chưa có chủ phòng' : 'Chưa có người thuê'),
        status: activeMembers.length ? 'Đang thuê' : 'Còn trống',
        updatedAt: new Date()
      }
    },
    { session }
  );
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const collection = await getRoomsCollection();
  const now = new Date();
  const { primaryTenantId, primaryTenantName, moveInDate, ...roomInput } = input;

  if (!primaryTenantId && !primaryTenantName) {
    const document: RoomDocument = { ...roomInput, createdAt: now, updatedAt: now };
    const result = await collection.insertOne(document);
    return toRoom({ ...document, _id: result.insertedId });
  }

  const client = await getMongoClient();
  const database = await getDatabase();
  const session = client.startSession();
  let createdRoom: WithId<RoomDocument> | undefined;
  try {
    await session.withTransaction(async () => {
      const tenants = database.collection<{
        fullName: string;
        cccdImages: Record<string, string>;
        attachments: unknown[];
        profileCompleted: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>('tenants');
      let tenantId: ObjectId;
      let tenantName: string;
      if (primaryTenantId) {
        tenantId = new ObjectId(primaryTenantId);
        const tenant = await tenants.findOne({ _id: tenantId }, { session });
        if (!tenant) throw new Error('TENANT_NOT_FOUND');
        tenantName = tenant.fullName;
      } else {
        tenantName = primaryTenantName!;
        tenantId = (
          await tenants.insertOne(
            {
              fullName: tenantName,
              cccdImages: {},
              attachments: [],
              profileCompleted: false,
              createdAt: now,
              updatedAt: now
            },
            { session }
          )
        ).insertedId;
      }

      const roomMembers = database.collection<RoomMemberDocument>('roomMembers');
      const currentMembership = await roomMembers.findOne({ tenantId, isActive: true }, { session });
      if (currentMembership) {
        await roomMembers.updateOne({ _id: currentMembership._id }, { $set: { isActive: false, moveOutDate: now, updatedAt: now } }, { session });
      }

      const document: RoomDocument = {
        ...roomInput,
        tenant: tenantName,
        people: 1,
        status: roomInput.status === 'Còn trống' ? 'Đang thuê' : roomInput.status,
        createdAt: now,
        updatedAt: now
      };
      const result = await collection.insertOne(document, { session });
      createdRoom = { ...document, _id: result.insertedId };
      await roomMembers.insertOne(
        {
          roomId: result.insertedId,
          tenantId,
          role: 'PRIMARY_TENANT',
          moveInDate: moveInDate ? new Date(moveInDate) : now,
          moveOutDate: null,
          isActive: true,
          createdAt: now,
          updatedAt: now
        },
        { session }
      );
      if (currentMembership) await syncRoomFromMembers(database, currentMembership.roomId, session);
    });
  } finally {
    await session.endSession();
  }

  if (!createdRoom) throw new Error('Không thể tạo phòng.');
  return toRoom(createdRoom);
}

export async function updateRoom(id: string, input: UpdateRoomInput): Promise<Room | null> {
  if (!ObjectId.isValid(id)) return null;
  const collection = await getRoomsCollection();
  const database = await getDatabase();
  const client = await getMongoClient();
  const session = client.startSession();
  const roomId = new ObjectId(id);
  let found = false;

  try {
    await session.withTransaction(async () => {
      const currentRoom = await collection.findOne({ _id: roomId }, { session });
      if (!currentRoom) return;
      found = true;

      const roomMembers = database.collection<RoomMemberDocument>('roomMembers');
      const activeMembers = await roomMembers.find({ roomId, isActive: true }, { session }).toArray();
      if (activeMembers.length && input.status === 'Còn trống') throw new Error('ROOM_HAS_ACTIVE_MEMBERS');

      const now = new Date();
      const moveInDateValue = input.moveInDate ? new Date(input.moveInDate) : undefined;
      const nextStatus = input.status ?? currentRoom.status;
      if (!activeMembers.length && nextStatus !== 'Còn trống') {
        const tenantName = input.tenant?.trim();
        if (!tenantName || tenantName === 'Chưa có người thuê') throw new Error('TENANT_NAME_REQUIRED');

        const tenants = database.collection<{
          fullName: string;
          cccdImages: Record<string, string>;
          attachments: unknown[];
          profileCompleted: boolean;
          createdAt: Date;
          updatedAt: Date;
        }>('tenants');
        const tenantId = (
          await tenants.insertOne(
            {
              fullName: tenantName,
              cccdImages: {},
              attachments: [],
              profileCompleted: false,
              createdAt: now,
              updatedAt: now
            },
            { session }
          )
        ).insertedId;
        const membership: RoomMemberDocument = {
          roomId,
          tenantId,
          role: 'PRIMARY_TENANT',
          moveInDate: moveInDateValue || now,
          moveOutDate: null,
          isActive: true,
          createdAt: now,
          updatedAt: now
        };
        const membershipId = (await roomMembers.insertOne(membership, { session })).insertedId;
        activeMembers.push({ ...membership, _id: membershipId });
      }

      let activePrimary = activeMembers.find((member) => member.role === 'PRIMARY_TENANT') || activeMembers[0];
      if (input.primaryTenantId) {
        const selectedTenantId = new ObjectId(input.primaryTenantId);
        const selectedMember = activeMembers.find((member) => member.tenantId.equals(selectedTenantId));
        if (!selectedMember) throw new Error('TENANT_NOT_IN_ROOM');

        if (!activePrimary || !activePrimary.tenantId.equals(selectedTenantId) || activePrimary.role !== 'PRIMARY_TENANT') {
          const now = new Date();
          if (activePrimary?.role === 'PRIMARY_TENANT') {
            await roomMembers.updateOne({ _id: activePrimary._id }, { $set: { role: 'MEMBER', updatedAt: now } }, { session });
          }
          await roomMembers.updateOne({ _id: selectedMember._id }, { $set: { role: 'PRIMARY_TENANT', updatedAt: now } }, { session });
          activePrimary = { ...selectedMember, role: 'PRIMARY_TENANT', updatedAt: now };
        }
      }

      if (moveInDateValue && activePrimary) {
        await roomMembers.updateOne({ _id: activePrimary._id }, { $set: { moveInDate: moveInDateValue, updatedAt: now } }, { session });
      }
      const primaryTenant = activePrimary
        ? await database.collection<{ fullName: string }>('tenants').findOne({ _id: activePrimary.tenantId }, { session })
        : null;

      const roomFields: Partial<RoomDocument> = {
        ...(input.name ? { name: input.name } : {}),
        ...(input.floor ? { floor: input.floor } : {}),
        ...(input.price ? { price: input.price } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(moveInDateValue ? { moveInDate: moveInDateValue } : {}),
        tenant: primaryTenant?.fullName || (activeMembers.length ? 'Chưa có chủ phòng' : input.tenant || currentRoom.tenant),
        people: activeMembers.length || input.people || 0,
        updatedAt: now
      };
      await collection.updateOne({ _id: roomId }, { $set: roomFields }, { session });
    });
  } finally {
    await session.endSession();
  }

  if (!found) return null;
  const result = await collection.findOne({ _id: roomId });
  return result ? toRoom(result) : null;
}

export async function deleteRoom(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await getRoomsCollection();
  const database = await getDatabase();
  const client = await getMongoClient();
  const session = client.startSession();
  const roomId = new ObjectId(id);
  const fileKeys: string[] = [];
  let deleted = false;

  try {
    await session.withTransaction(async () => {
      const room = await collection.findOne({ _id: roomId }, { session });
      if (!room) return;

      const roomMembers = database.collection<RoomMemberDocument>('roomMembers');
      const activeMembers = await roomMembers.find({ roomId, isActive: true }, { session }).toArray();
      const tenantIds = [...new Map(activeMembers.map((member) => [member.tenantId.toHexString(), member.tenantId])).values()];

      if (tenantIds.length) {
        const tenants = database.collection<{
          cccdImages?: { front?: string; back?: string };
          attachments?: { fileKey: string }[];
        }>('tenants');
        const tenantDocuments = await tenants.find({ _id: { $in: tenantIds } }, { session }).toArray();
        for (const tenant of tenantDocuments) {
          if (tenant.cccdImages?.front) fileKeys.push(tenant.cccdImages.front);
          if (tenant.cccdImages?.back) fileKeys.push(tenant.cccdImages.back);
          fileKeys.push(...(tenant.attachments || []).map((attachment) => attachment.fileKey));
        }

        await roomMembers.deleteMany({ tenantId: { $in: tenantIds } }, { session });
        await tenants.deleteMany({ _id: { $in: tenantIds } }, { session });
      }

      await roomMembers.deleteMany({ roomId }, { session });
      await collection.deleteOne({ _id: roomId }, { session });
      deleted = true;
    });
  } finally {
    await session.endSession();
  }

  if (deleted) await deleteTenantFiles(fileKeys);
  return deleted;
}
