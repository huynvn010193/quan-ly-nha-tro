import { GridFSBucket, ObjectId, type ClientSession, type Collection, type Filter, type WithId } from 'mongodb';
import { getDatabase, getMongoClient } from '@/backend/database/mongodb';
import type {
  CreateTenantInput,
  RoomMemberRole,
  Tenant,
  TenantAttachment,
  TenantGender,
  TenantListResult,
  TenantUploadFiles,
  UpdateTenantInput
} from './tenant.types';

type TenantDocument = {
  fullName: string;
  phone?: string;
  birthYear?: number;
  cccd?: string;
  cccdImages: { front?: string; back?: string };
  gender?: TenantGender;
  ethnicity?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  attachments: TenantAttachment[];
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type RoomMemberDocument = {
  roomId: ObjectId;
  tenantId: ObjectId;
  role: RoomMemberRole;
  moveInDate: Date;
  moveOutDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type RoomDocument = {
  name?: string;
  roomNumber?: string;
  floor?: string;
  status?: string;
  people?: number;
  maxPeople?: number;
  tenant?: string;
  updatedAt?: Date;
};

let indexesPromise: Promise<void> | undefined;

async function ensureOptionalUniqueIndex(collection: Collection<TenantDocument>, field: 'phone' | 'cccd', oldName: string, name: string) {
  const indexes = await collection.listIndexes().toArray();
  if (indexes.some((index) => index.name === oldName)) await collection.dropIndex(oldName);
  await collection.createIndex({ [field]: 1 }, { unique: true, sparse: true, name });
}

async function getCollections() {
  const database = await getDatabase();
  const tenants = database.collection<TenantDocument>('tenants');
  const roomMembers = database.collection<RoomMemberDocument>('roomMembers');
  const rooms = database.collection<RoomDocument>('rooms');

  if (!indexesPromise) {
    indexesPromise = (async () => {
      await Promise.all([
        ensureOptionalUniqueIndex(tenants, 'phone', 'unique_tenant_phone', 'unique_tenant_phone_when_present'),
        ensureOptionalUniqueIndex(tenants, 'cccd', 'unique_tenant_cccd', 'unique_tenant_cccd_when_present'),
        tenants.createIndex({ fullName: 1 }, { name: 'tenant_full_name' }),
        roomMembers.createIndex({ tenantId: 1 }, { unique: true, partialFilterExpression: { isActive: true }, name: 'one_active_room_per_tenant' }),
        roomMembers.createIndex(
          { roomId: 1, role: 1 },
          {
            unique: true,
            partialFilterExpression: { isActive: true, role: 'PRIMARY_TENANT' },
            name: 'one_active_primary_tenant_per_room'
          }
        ),
        roomMembers.createIndex({ roomId: 1, isActive: 1 }, { name: 'active_members_by_room' }),
        roomMembers.createIndex({ tenantId: 1, createdAt: -1 }, { name: 'tenant_room_history' }),
        database.collection('tenantFiles.files').createIndex({ filename: 1, uploadDate: 1 }, { name: 'gridfs_file_lookup' }),
        database.collection('tenantFiles.chunks').createIndex({ files_id: 1, n: 1 }, { unique: true, name: 'gridfs_chunk_order' })
      ]);
    })();
  }
  await indexesPromise;

  return { database, tenants, roomMembers, rooms };
}

export async function ensureTenantDatabase() {
  await getCollections();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toAttachment(file: File, fileKey: string): TenantAttachment {
  return { fileName: file.name, fileKey, mimeType: file.type || 'application/octet-stream', size: file.size };
}

function isTenantProfileCompleted(tenant: Partial<TenantDocument>) {
  return Boolean(tenant.fullName && tenant.phone && tenant.birthYear && tenant.cccd && tenant.gender && tenant.ethnicity);
}

async function uploadFile(file: File, metadata: Record<string, string>) {
  const { database } = await getCollections();
  const bucket = new GridFSBucket(database, { bucketName: 'tenantFiles' });
  const stream = bucket.openUploadStream(file.name, { metadata: { ...metadata, mimeType: file.type } });
  const fileKey = stream.id.toHexString();

  await new Promise<void>(async (resolve, reject) => {
    stream.once('error', reject);
    stream.once('finish', resolve);
    stream.end(Buffer.from(await file.arrayBuffer()));
  });
  return fileKey;
}

export async function uploadTenantFiles(files: TenantUploadFiles) {
  const uploadedKeys: string[] = [];
  try {
    const cccdImages: TenantDocument['cccdImages'] = {};
    if (files.citizenIdFront) {
      cccdImages.front = await uploadFile(files.citizenIdFront, { category: 'CCCD_FRONT' });
      uploadedKeys.push(cccdImages.front);
    }
    if (files.citizenIdBack) {
      cccdImages.back = await uploadFile(files.citizenIdBack, { category: 'CCCD_BACK' });
      uploadedKeys.push(cccdImages.back);
    }

    const attachments: TenantAttachment[] = [];
    for (const file of files.attachments) {
      const fileKey = await uploadFile(file, { category: 'ATTACHMENT' });
      uploadedKeys.push(fileKey);
      attachments.push(toAttachment(file, fileKey));
    }

    return {
      cccdImages,
      attachments,
      uploadedKeys
    };
  } catch (error) {
    await deleteTenantFiles(uploadedKeys);
    throw error;
  }
}

export async function deleteTenantFiles(fileKeys: string[]) {
  if (!fileKeys.length) return;
  const { database } = await getCollections();
  const bucket = new GridFSBucket(database, { bucketName: 'tenantFiles' });
  await Promise.all(
    fileKeys.filter(ObjectId.isValid).map(async (fileKey) => {
      try {
        await bucket.delete(new ObjectId(fileKey));
      } catch {
        // A failed cleanup must not hide the original API error.
      }
    })
  );
}

export async function getTenantFile(fileId: string) {
  if (!ObjectId.isValid(fileId)) return null;
  const { database } = await getCollections();
  const files = database.collection<{ filename: string; contentType?: string; metadata?: { mimeType?: string }; length: number }>(
    'tenantFiles.files'
  );
  const file = await files.findOne({ _id: new ObjectId(fileId) });
  if (!file) return null;

  const bucket = new GridFSBucket(database, { bucketName: 'tenantFiles' });
  return {
    stream: bucket.openDownloadStream(new ObjectId(fileId)),
    fileName: file.filename,
    mimeType: file.metadata?.mimeType || file.contentType || 'application/octet-stream',
    length: file.length
  };
}

async function syncRoomSummary(roomId: ObjectId, session: ClientSession) {
  const { tenants, roomMembers, rooms } = await getCollections();
  const activeMembers = await roomMembers.find({ roomId, isActive: true }, { session }).toArray();
  const primary = activeMembers.find((member) => member.role === 'PRIMARY_TENANT');
  const primaryTenant = primary ? await tenants.findOne({ _id: primary.tenantId }, { session }) : null;

  await rooms.updateOne(
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

async function ensureRoomAvailable(roomId: ObjectId, role: RoomMemberRole, session: ClientSession, excludedTenantId?: ObjectId) {
  const { roomMembers, rooms } = await getCollections();
  const room = await rooms.findOne({ _id: roomId }, { session });
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.status === 'Đang sửa chữa' || room.status === 'MAINTENANCE') throw new Error('ROOM_MAINTENANCE');

  const tenantFilter = excludedTenantId ? { tenantId: { $ne: excludedTenantId } } : {};
  const activeCount = await roomMembers.countDocuments({ roomId, isActive: true, ...tenantFilter }, { session });
  if (typeof room.maxPeople === 'number' && room.maxPeople > 0 && activeCount >= room.maxPeople) throw new Error('ROOM_FULL');
  if (role === 'PRIMARY_TENANT' && (await roomMembers.countDocuments({ roomId, role, isActive: true, ...tenantFilter }, { session }))) {
    throw new Error('PRIMARY_TENANT_EXISTS');
  }
  return room;
}

export async function createTenantWithMembership(
  input: CreateTenantInput,
  cccdImages: TenantDocument['cccdImages'],
  attachments: TenantAttachment[]
): Promise<Tenant> {
  const { tenants, roomMembers } = await getCollections();
  const client = await getMongoClient();
  const session = client.startSession();
  let tenantId: ObjectId | undefined;

  try {
    await session.withTransaction(async () => {
      const roomId = new ObjectId(input.roomId);
      await ensureRoomAvailable(roomId, input.role, session);
      const now = new Date();
      const tenantDocument: TenantDocument = {
        fullName: input.fullName,
        phone: input.phone,
        birthYear: input.birthYear,
        cccd: input.cccd,
        cccdImages,
        gender: input.gender,
        ethnicity: input.ethnicity,
        permanentAddress: input.permanentAddress,
        temporaryAddress: input.temporaryAddress,
        attachments,
        profileCompleted: true,
        createdAt: now,
        updatedAt: now
      };
      tenantId = (await tenants.insertOne(tenantDocument, { session })).insertedId;
      await roomMembers.insertOne(
        {
          roomId,
          tenantId,
          role: input.role,
          moveInDate: input.moveInDate,
          moveOutDate: null,
          isActive: true,
          createdAt: now,
          updatedAt: now
        },
        { session }
      );
      await syncRoomSummary(roomId, session);
    });
  } finally {
    await session.endSession();
  }

  if (!tenantId) throw new Error('Không thể tạo người thuê.');
  const tenant = await getTenantById(tenantId.toHexString());
  if (!tenant) throw new Error('Không thể đọc dữ liệu người thuê vừa tạo.');
  return tenant;
}

async function hydrateTenants(documents: WithId<TenantDocument>[]): Promise<Tenant[]> {
  if (!documents.length) return [];
  const { roomMembers, rooms } = await getCollections();
  const tenantIds = documents.map((document) => document._id);
  const memberships = await roomMembers.find({ tenantId: { $in: tenantIds }, isActive: true }).toArray();
  const roomIds = [...new Set(memberships.map((membership) => membership.roomId.toHexString()))].map((id) => new ObjectId(id));
  const roomDocuments = roomIds.length ? await rooms.find({ _id: { $in: roomIds } }).toArray() : [];
  const membershipByTenant = new Map(memberships.map((membership) => [membership.tenantId.toHexString(), membership]));
  const roomById = new Map(roomDocuments.map((room) => [room._id.toHexString(), room]));

  return documents.map((document) => {
    const membership = membershipByTenant.get(document._id.toHexString());
    const room = membership ? roomById.get(membership.roomId.toHexString()) : undefined;
    return {
      id: document._id.toHexString(),
      fullName: document.fullName,
      phone: document.phone,
      birthYear: document.birthYear,
      cccd: document.cccd,
      cccdImages: document.cccdImages || {},
      gender: document.gender,
      ethnicity: document.ethnicity,
      permanentAddress: document.permanentAddress,
      temporaryAddress: document.temporaryAddress,
      attachments: document.attachments || [],
      profileCompleted: document.profileCompleted ?? isTenantProfileCompleted(document),
      activeRoom:
        membership && room
          ? {
              roomMemberId: membership._id.toHexString(),
              roomId: room._id.toHexString(),
              roomNumber: room.roomNumber || room.name || 'Chưa đặt tên',
              floor: room.floor || '',
              role: membership.role,
              moveInDate: membership.moveInDate.toISOString()
            }
          : null,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString()
    };
  });
}

export async function listTenants(options: { page: number; limit: number; search?: string }): Promise<TenantListResult> {
  const { tenants } = await getCollections();
  const filter: Filter<TenantDocument> = {};
  if (options.search) {
    const pattern = new RegExp(escapeRegex(options.search), 'i');
    filter.$or = [{ fullName: pattern }, { phone: pattern }, { cccd: pattern }];
  }
  const [documents, total] = await Promise.all([
    tenants
      .find(filter)
      .sort({ fullName: 1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .toArray(),
    tenants.countDocuments(filter)
  ]);

  return {
    data: await hydrateTenants(documents),
    pagination: { page: options.page, limit: options.limit, total, totalPages: Math.max(1, Math.ceil(total / options.limit)) }
  };
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  if (!ObjectId.isValid(id)) return null;
  const { tenants } = await getCollections();
  const document = await tenants.findOne({ _id: new ObjectId(id) });
  if (!document) return null;
  return (await hydrateTenants([document]))[0] ?? null;
}

export async function updateTenantWithMembership(
  id: string,
  input: UpdateTenantInput,
  files?: { cccdImages: TenantDocument['cccdImages']; attachments: TenantAttachment[] }
): Promise<Tenant | null> {
  if (!ObjectId.isValid(id)) return null;
  const { tenants, roomMembers } = await getCollections();
  const client = await getMongoClient();
  const session = client.startSession();
  const tenantId = new ObjectId(id);
  let found = false;

  try {
    await session.withTransaction(async () => {
      const currentTenant = await tenants.findOne({ _id: tenantId }, { session });
      if (!currentTenant) return;
      found = true;
      const currentMembership = await roomMembers.findOne({ tenantId, isActive: true }, { session });
      const { roomId: nextRoomId, role: nextRole, moveInDate: nextMoveInDate, ...tenantFields } = input;
      const hasNewImages = Boolean(files?.cccdImages.front || files?.cccdImages.back);
      const fileFields = {
        ...(hasNewImages ? { cccdImages: { ...(currentTenant.cccdImages || {}), ...files?.cccdImages } } : {}),
        ...(files?.attachments.length ? { attachments: [...(currentTenant.attachments || []), ...files.attachments] } : {})
      };
      if (Object.keys(tenantFields).length || Object.keys(fileFields).length) {
        await tenants.updateOne(
          { _id: tenantId },
          {
            $set: {
              ...tenantFields,
              ...fileFields,
              profileCompleted: isTenantProfileCompleted({ ...currentTenant, ...tenantFields }),
              updatedAt: new Date()
            }
          },
          { session }
        );
      }

      if (nextRoomId && nextRole) {
        const roomId = new ObjectId(nextRoomId);
        await ensureRoomAvailable(roomId, nextRole, session, tenantId);
        const now = new Date();
        if (currentMembership) {
          await roomMembers.updateOne({ _id: currentMembership._id }, { $set: { isActive: false, moveOutDate: now, updatedAt: now } }, { session });
        }
        await roomMembers.insertOne(
          {
            roomId,
            tenantId,
            role: nextRole,
            moveInDate: nextMoveInDate || now,
            moveOutDate: null,
            isActive: true,
            createdAt: now,
            updatedAt: now
          },
          { session }
        );
        if (currentMembership) await syncRoomSummary(currentMembership.roomId, session);
        await syncRoomSummary(roomId, session);
      } else if (currentMembership?.role === 'PRIMARY_TENANT' && tenantFields.fullName) {
        await syncRoomSummary(currentMembership.roomId, session);
      }
    });
  } finally {
    await session.endSession();
  }

  return found ? getTenantById(id) : null;
}

export async function getRoomMemberHistory(tenantId: string) {
  if (!ObjectId.isValid(tenantId)) return [];
  const { roomMembers, rooms } = await getCollections();
  const documents = await roomMembers
    .find({ tenantId: new ObjectId(tenantId) })
    .sort({ moveInDate: -1 })
    .toArray();
  const roomIds = [...new Set(documents.map((item) => item.roomId.toHexString()))].map((id) => new ObjectId(id));
  const roomDocuments = roomIds.length ? await rooms.find({ _id: { $in: roomIds } }).toArray() : [];
  const roomById = new Map(roomDocuments.map((room) => [room._id.toHexString(), room]));
  return documents.map((document) => {
    const room = roomById.get(document.roomId.toHexString());
    return {
      id: document._id.toHexString(),
      roomId: document.roomId.toHexString(),
      roomNumber: room?.roomNumber || room?.name || 'Phòng đã xóa',
      floor: room?.floor || '',
      role: document.role,
      moveInDate: document.moveInDate.toISOString(),
      moveOutDate: document.moveOutDate?.toISOString() || null,
      isActive: document.isActive
    };
  });
}
