import { ObjectId, type Filter, type WithId } from 'mongodb';
import { getDatabase } from '@/backend/database/mongodb';
import type { Contract, ContractListResult, ContractStatus, CreateContractInput, UpdateContractInput } from './contract.types';

type ContractDocument = {
  roomId: ObjectId;
  ownerTenantId: ObjectId;
  startDate: Date;
  endDate: Date | null;
  rentAmount: number;
  depositAmount: number;
  billingDay: number;
  status: ContractStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};

type RoomDocument = { name?: string; roomNumber?: string; floor?: string; status?: string; updatedAt?: Date };
type TenantDocument = { fullName: string; phone?: string };
type RoomMemberDocument = { roomId: ObjectId; tenantId: ObjectId; role: string; isActive: boolean };

let indexesPromise: Promise<string[]> | undefined;

async function getCollections() {
  const database = await getDatabase();
  const contracts = database.collection<ContractDocument>('contracts');
  const rooms = database.collection<RoomDocument>('rooms');
  const tenants = database.collection<TenantDocument>('tenants');
  const roomMembers = database.collection<RoomMemberDocument>('roomMembers');

  if (!indexesPromise) {
    indexesPromise = Promise.all([
      contracts.createIndex({ roomId: 1, status: 1 }, { name: 'contracts_by_room_status' }),
      contracts.createIndex({ ownerTenantId: 1, createdAt: -1 }, { name: 'contracts_by_owner' }),
      contracts.createIndex({ startDate: -1 }, { name: 'contracts_by_start_date' })
    ]);
  }
  await indexesPromise;
  return { contracts, rooms, tenants, roomMembers };
}

export async function ensureContractDatabase() {
  await getCollections();
}

function isCurrentStatus(status: ContractStatus) {
  return status === 'PENDING' || status === 'ACTIVE';
}

async function ensureReferences(roomId: ObjectId, ownerTenantId: ObjectId, requirePrimary: boolean) {
  const { rooms, tenants, roomMembers } = await getCollections();
  const [room, tenant] = await Promise.all([rooms.findOne({ _id: roomId }), tenants.findOne({ _id: ownerTenantId })]);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (!tenant) throw new Error('TENANT_NOT_FOUND');
  if (requirePrimary && room.status === 'MAINTENANCE') throw new Error('ROOM_MAINTENANCE');
  if (requirePrimary) {
    const membership = await roomMembers.findOne({ roomId, tenantId: ownerTenantId, role: 'PRIMARY_TENANT', isActive: true });
    if (!membership) throw new Error('OWNER_NOT_PRIMARY_TENANT');
  }
}

async function syncRoomStatus(roomId: ObjectId) {
  const { contracts, rooms } = await getCollections();
  const [room, activeContract, pendingContract] = await Promise.all([
    rooms.findOne({ _id: roomId }),
    contracts.findOne({ roomId, status: 'ACTIVE' }),
    contracts.findOne({ roomId, status: 'PENDING' })
  ]);
  if (!room) return;
  const status = activeContract ? 'OCCUPIED' : pendingContract ? 'RESERVED' : room.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE';
  await rooms.updateOne({ _id: roomId }, { $set: { status, updatedAt: new Date() } });
}

async function ensureNoCurrentContract(roomId: ObjectId, status: ContractStatus, excludedId?: ObjectId) {
  if (!isCurrentStatus(status)) return;
  const { contracts } = await getCollections();
  const filter: Filter<ContractDocument> = { roomId, status: { $in: ['PENDING', 'ACTIVE'] } };
  if (excludedId) filter._id = { $ne: excludedId };
  if (await contracts.findOne(filter)) throw new Error('CURRENT_CONTRACT_EXISTS');
}

async function hydrateContracts(documents: WithId<ContractDocument>[]): Promise<Contract[]> {
  if (!documents.length) return [];
  const { rooms, tenants } = await getCollections();
  const roomIds = [...new Set(documents.map((document) => document.roomId.toHexString()))].map((id) => new ObjectId(id));
  const tenantIds = [...new Set(documents.map((document) => document.ownerTenantId.toHexString()))].map((id) => new ObjectId(id));
  const [roomDocuments, tenantDocuments] = await Promise.all([
    rooms.find({ _id: { $in: roomIds } }).toArray(),
    tenants.find({ _id: { $in: tenantIds } }).toArray()
  ]);
  const roomById = new Map(roomDocuments.map((room) => [room._id.toHexString(), room]));
  const tenantById = new Map(tenantDocuments.map((tenant) => [tenant._id.toHexString(), tenant]));

  return documents.map((document) => {
    const room = roomById.get(document.roomId.toHexString());
    const tenant = tenantById.get(document.ownerTenantId.toHexString());
    return {
      id: document._id.toHexString(),
      roomId: document.roomId.toHexString(),
      roomName: room?.roomNumber || room?.name || 'Phòng đã xóa',
      floor: room?.floor || '',
      ownerTenantId: document.ownerTenantId.toHexString(),
      ownerTenantName: tenant?.fullName || 'Người thuê đã xóa',
      ownerPhone: tenant?.phone,
      startDate: document.startDate.toISOString(),
      endDate: document.endDate?.toISOString() || null,
      rentAmount: document.rentAmount,
      depositAmount: document.depositAmount,
      billingDay: document.billingDay,
      status: document.status,
      note: document.note,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString()
    };
  });
}

export async function listContracts(options: { page: number; limit: number; status?: ContractStatus }): Promise<ContractListResult> {
  const { contracts } = await getCollections();
  const filter: Filter<ContractDocument> = options.status ? { status: options.status } : {};
  const [documents, total] = await Promise.all([
    contracts
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .toArray(),
    contracts.countDocuments(filter)
  ]);
  return {
    data: await hydrateContracts(documents),
    pagination: { page: options.page, limit: options.limit, total, totalPages: Math.max(1, Math.ceil(total / options.limit)) }
  };
}

export async function getContractById(id: string): Promise<Contract | null> {
  if (!ObjectId.isValid(id)) return null;
  const { contracts } = await getCollections();
  const document = await contracts.findOne({ _id: new ObjectId(id) });
  return document ? (await hydrateContracts([document]))[0] : null;
}

export async function createContract(input: CreateContractInput): Promise<Contract> {
  const { contracts } = await getCollections();
  const roomId = new ObjectId(input.roomId);
  const ownerTenantId = new ObjectId(input.ownerTenantId);
  await ensureReferences(roomId, ownerTenantId, true);
  await ensureNoCurrentContract(roomId, input.status);
  const now = new Date();
  const result = await contracts.insertOne({
    roomId,
    ownerTenantId,
    startDate: new Date(input.startDate),
    endDate: input.endDate ? new Date(input.endDate) : null,
    rentAmount: input.rentAmount,
    depositAmount: input.depositAmount,
    billingDay: input.billingDay,
    status: input.status,
    note: input.note,
    createdAt: now,
    updatedAt: now
  });
  await syncRoomStatus(roomId);
  const contract = await getContractById(result.insertedId.toHexString());
  if (!contract) throw new Error('Không thể đọc hợp đồng vừa tạo.');
  return contract;
}

export async function updateContract(id: string, input: UpdateContractInput): Promise<Contract | null> {
  if (!ObjectId.isValid(id)) return null;
  const { contracts } = await getCollections();
  const contractId = new ObjectId(id);
  const current = await contracts.findOne({ _id: contractId });
  if (!current) return null;

  const roomId = input.roomId ? new ObjectId(input.roomId) : current.roomId;
  const ownerTenantId = input.ownerTenantId ? new ObjectId(input.ownerTenantId) : current.ownerTenantId;
  const status = input.status || current.status;
  const startDate = input.startDate ? new Date(input.startDate) : current.startDate;
  const endDate = input.endDate === undefined ? current.endDate : input.endDate ? new Date(input.endDate) : null;
  if (endDate && endDate < startDate) throw new Error('INVALID_DATE_RANGE');

  await ensureReferences(roomId, ownerTenantId, isCurrentStatus(status));
  await ensureNoCurrentContract(roomId, status, contractId);

  const setFields: Partial<ContractDocument> = {
    roomId,
    ownerTenantId,
    startDate,
    endDate,
    rentAmount: input.rentAmount ?? current.rentAmount,
    depositAmount: input.depositAmount ?? current.depositAmount,
    billingDay: input.billingDay ?? current.billingDay,
    status,
    updatedAt: new Date()
  };
  if (input.note) setFields.note = input.note;

  await contracts.updateOne(
    { _id: contractId },
    input.note === undefined
      ? { $set: setFields, ...(Object.prototype.hasOwnProperty.call(input, 'note') ? { $unset: { note: '' } } : {}) }
      : { $set: setFields }
  );
  await Promise.all([syncRoomStatus(current.roomId), ...(current.roomId.equals(roomId) ? [] : [syncRoomStatus(roomId)])]);
  return getContractById(id);
}

export async function deleteContract(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const { contracts } = await getCollections();
  const contractId = new ObjectId(id);
  const current = await contracts.findOne({ _id: contractId });
  if (!current) return false;
  const deleted = (await contracts.deleteOne({ _id: contractId })).deletedCount === 1;
  if (deleted) await syncRoomStatus(current.roomId);
  return deleted;
}
