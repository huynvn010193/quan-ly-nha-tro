import { MongoServerError, ObjectId, type Filter, type WithId } from 'mongodb';
import { getDatabase } from '@/backend/database/mongodb';
import type { CreateInvoiceInput, Invoice, InvoiceListResult, InvoiceStatus, UtilityReading } from './invoice.types';

type InvoiceDocument = {
  code: string;
  roomId: ObjectId;
  roomName: string;
  tenantId: ObjectId;
  tenantName: string;
  period: string;
  dueDate: Date;
  rentAmount: number;
  electricity: UtilityReading;
  water: UtilityReading;
  extraCosts: { name: string; amount: number }[];
  totalAmount: number;
  status: InvoiceStatus;
  createdAt: Date;
  updatedAt: Date;
};

type RoomDocument = { name: string; roomNumber?: string; price: number };
type RoomMemberDocument = { roomId: ObjectId; tenantId: ObjectId; role: string; isActive: boolean };
type TenantDocument = { fullName: string };

let indexesPromise: Promise<string[]> | undefined;

async function getCollections() {
  const database = await getDatabase();
  const invoices = database.collection<InvoiceDocument>('invoices');
  const rooms = database.collection<RoomDocument>('rooms');
  const roomMembers = database.collection<RoomMemberDocument>('roomMembers');
  const tenants = database.collection<TenantDocument>('tenants');
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      invoices.createIndex({ roomId: 1, period: 1 }, { unique: true, name: 'unique_invoice_room_period' }),
      invoices.createIndex({ period: -1, createdAt: -1 }, { name: 'invoices_by_period' }),
      invoices.createIndex({ status: 1, dueDate: 1 }, { name: 'invoices_by_status_due_date' })
    ]);
  }
  await indexesPromise;
  return { invoices, rooms, roomMembers, tenants };
}

export async function ensureInvoiceDatabase() {
  await getCollections();
}

function toInvoice(document: WithId<InvoiceDocument>): Invoice {
  return {
    id: document._id.toHexString(),
    code: document.code,
    roomId: document.roomId.toHexString(),
    roomName: document.roomName,
    tenantId: document.tenantId.toHexString(),
    tenantName: document.tenantName,
    period: document.period,
    dueDate: document.dueDate.toISOString(),
    rentAmount: document.rentAmount,
    electricity: document.electricity,
    water: document.water,
    extraCosts: document.extraCosts,
    totalAmount: document.totalAmount,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

function calculateUtility(value: CreateInvoiceInput['electricity']): UtilityReading {
  const usage = value.newValue - value.oldValue;
  return { ...value, usage, amount: usage * value.unitPrice };
}

async function resolveRoom(roomId: ObjectId) {
  const { rooms, roomMembers, tenants } = await getCollections();
  const room = await rooms.findOne({ _id: roomId });
  if (!room) throw new Error('ROOM_NOT_FOUND');
  const membership = await roomMembers.findOne({ roomId, role: 'PRIMARY_TENANT', isActive: true });
  if (!membership) throw new Error('PRIMARY_TENANT_NOT_FOUND');
  const tenant = await tenants.findOne({ _id: membership.tenantId });
  if (!tenant) throw new Error('TENANT_NOT_FOUND');
  return { room, tenant, tenantId: membership.tenantId };
}

function invoiceFields(input: CreateInvoiceInput, resolved: Awaited<ReturnType<typeof resolveRoom>>) {
  const electricity = calculateUtility(input.electricity);
  const water = calculateUtility(input.water);
  const extrasTotal = input.extraCosts.reduce((sum, item) => sum + item.amount, 0);
  return {
    roomId: new ObjectId(input.roomId),
    roomName: resolved.room.roomNumber || resolved.room.name,
    tenantId: resolved.tenantId,
    tenantName: resolved.tenant.fullName,
    period: input.period,
    dueDate: new Date(input.dueDate),
    rentAmount: resolved.room.price,
    electricity,
    water,
    extraCosts: input.extraCosts,
    totalAmount: resolved.room.price + electricity.amount + water.amount + extrasTotal
  };
}

export async function listInvoices(options: { page: number; limit: number; period?: string }): Promise<InvoiceListResult> {
  const { invoices } = await getCollections();
  const filter: Filter<InvoiceDocument> = options.period ? { period: options.period } : {};
  const [documents, total] = await Promise.all([
    invoices.find(filter).sort({ period: -1, createdAt: -1 }).skip((options.page - 1) * options.limit).limit(options.limit).toArray(),
    invoices.countDocuments(filter)
  ]);
  return {
    data: documents.map(toInvoice),
    pagination: { page: options.page, limit: options.limit, total, totalPages: Math.max(1, Math.ceil(total / options.limit)) }
  };
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  if (!ObjectId.isValid(id)) return null;
  const { invoices } = await getCollections();
  const document = await invoices.findOne({ _id: new ObjectId(id) });
  return document ? toInvoice(document) : null;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const { invoices } = await getCollections();
  const roomId = new ObjectId(input.roomId);
  const resolved = await resolveRoom(roomId);
  const now = new Date();
  const id = new ObjectId();
  const document: InvoiceDocument = {
    code: `HD-${input.period.replace('-', '')}-${id.toHexString().slice(-4).toUpperCase()}`,
    ...invoiceFields(input, resolved),
    status: 'PENDING',
    createdAt: now,
    updatedAt: now
  };
  try {
    await invoices.insertOne({ _id: id, ...document });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) throw new Error('INVOICE_PERIOD_EXISTS');
    throw error;
  }
  return toInvoice({ _id: id, ...document });
}

export async function updateInvoice(id: string, input: CreateInvoiceInput): Promise<Invoice | null> {
  if (!ObjectId.isValid(id)) return null;
  const { invoices } = await getCollections();
  const invoiceId = new ObjectId(id);
  const current = await invoices.findOne({ _id: invoiceId });
  if (!current) return null;
  const resolved = await resolveRoom(new ObjectId(input.roomId));
  const conflict = await invoices.findOne({ _id: { $ne: invoiceId }, roomId: new ObjectId(input.roomId), period: input.period });
  if (conflict) throw new Error('INVOICE_PERIOD_EXISTS');
  const fields = { ...invoiceFields(input, resolved), updatedAt: new Date() };
  try {
    await invoices.updateOne({ _id: invoiceId }, { $set: fields });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) throw new Error('INVOICE_PERIOD_EXISTS');
    throw error;
  }
  const updated = await invoices.findOne({ _id: invoiceId });
  return updated ? toInvoice(updated) : null;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const { invoices } = await getCollections();
  return (await invoices.deleteOne({ _id: new ObjectId(id) })).deletedCount === 1;
}
