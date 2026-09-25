import { ObjectId } from 'mongodb';
import { ROOM_STATUSES, type CreateRoomInput, type RoomStatus, type UpdateRoomInput } from './room.types';

export class RoomValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new RoomValidationError(`${label} là bắt buộc.`);
  return value.trim();
}

function positiveNumber(value: unknown, label: string) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new RoomValidationError(`${label} phải lớn hơn 0.`);
  return parsed;
}

function nonNegativeInteger(value: unknown, label: string) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new RoomValidationError(`${label} phải là số nguyên không âm.`);
  return parsed;
}

function roomStatus(value: unknown): RoomStatus {
  if (typeof value !== 'string' || !ROOM_STATUSES.includes(value as RoomStatus)) throw new RoomValidationError('Trạng thái phòng không hợp lệ.');
  return value as RoomStatus;
}

export function validateCreateRoom(payload: unknown): CreateRoomInput {
  if (!isRecord(payload)) throw new RoomValidationError('Dữ liệu phòng không hợp lệ.');

  const status = roomStatus(payload.status);
  const tenant = status === 'Còn trống' ? 'Chưa có người thuê' : requiredText(payload.tenant, 'Người thuê');
  const people = status === 'Còn trống' ? 0 : nonNegativeInteger(payload.people, 'Số người');
  const primaryTenantId = typeof payload.primaryTenantId === 'string' && payload.primaryTenantId.trim() ? payload.primaryTenantId.trim() : undefined;
  const primaryTenantName =
    typeof payload.primaryTenantName === 'string' && payload.primaryTenantName.trim() ? payload.primaryTenantName.trim() : undefined;
  const moveInDate = typeof payload.moveInDate === 'string' && payload.moveInDate.trim() ? new Date(payload.moveInDate) : undefined;
  if (primaryTenantId && !ObjectId.isValid(primaryTenantId)) throw new RoomValidationError('Người thuê không hợp lệ.');
  if (status !== 'Còn trống' && !primaryTenantId && !primaryTenantName) throw new RoomValidationError('Vui lòng nhập tên chủ phòng.');
  if (status !== 'Còn trống' && (!moveInDate || Number.isNaN(moveInDate.getTime()))) {
    throw new RoomValidationError('Ngày bắt đầu thuê không hợp lệ.');
  }
  if (status === 'Còn trống' && (primaryTenantId || primaryTenantName)) throw new RoomValidationError('Phòng trống không thể có chủ phòng.');

  return {
    name: requiredText(payload.name, 'Tên phòng').toUpperCase(),
    floor: requiredText(payload.floor, 'Tầng'),
    tenant,
    price: positiveNumber(payload.price, 'Giá thuê'),
    status,
    people,
    primaryTenantId,
    primaryTenantName,
    moveInDate: moveInDate?.toISOString()
  };
}

export function validateUpdateRoom(payload: unknown): UpdateRoomInput {
  if (!isRecord(payload)) throw new RoomValidationError('Dữ liệu cập nhật không hợp lệ.');

  const output: UpdateRoomInput = {};
  if ('name' in payload) output.name = requiredText(payload.name, 'Tên phòng').toUpperCase();
  if ('floor' in payload) output.floor = requiredText(payload.floor, 'Tầng');
  if ('tenant' in payload) output.tenant = requiredText(payload.tenant, 'Người thuê');
  if ('price' in payload) output.price = positiveNumber(payload.price, 'Giá thuê');
  if ('people' in payload) output.people = nonNegativeInteger(payload.people, 'Số người');
  if ('status' in payload) output.status = roomStatus(payload.status);
  if ('moveInDate' in payload) {
    if (typeof payload.moveInDate !== 'string' || Number.isNaN(new Date(payload.moveInDate).getTime())) {
      throw new RoomValidationError('Ngày bắt đầu thuê không hợp lệ.');
    }
    output.moveInDate = new Date(payload.moveInDate).toISOString();
  }

  if (Object.keys(output).length === 0) throw new RoomValidationError('Không có thông tin nào để cập nhật.');
  if (output.status === 'Còn trống') {
    output.tenant = 'Chưa có người thuê';
    output.people = 0;
  }

  return output;
}
