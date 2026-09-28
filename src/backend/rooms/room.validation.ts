import { ObjectId } from 'mongodb';
import { ROOM_STATUSES, type CreateRoomContractInput, type CreateRoomInput, type RoomStatus, type UpdateRoomInput } from './room.types';

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

function nonNegativeNumber(value: unknown, label: string) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new RoomValidationError(`${label} không được âm.`);
  return parsed;
}

function roomStatus(value: unknown): RoomStatus {
  if (typeof value !== 'string' || !ROOM_STATUSES.includes(value as RoomStatus)) throw new RoomValidationError('Trạng thái phòng không hợp lệ.');
  return value as RoomStatus;
}

export function validateCreateRoom(payload: unknown): CreateRoomInput {
  if (!isRecord(payload)) throw new RoomValidationError('Dữ liệu phòng không hợp lệ.');

  let contract: CreateRoomContractInput | undefined;
  if ('contract' in payload && payload.contract !== undefined && payload.contract !== null) {
    if (!isRecord(payload.contract)) throw new RoomValidationError('Thông tin hợp đồng không hợp lệ.');
    const contractStatus = payload.contract.status;
    if (contractStatus !== 'PENDING' && contractStatus !== 'ACTIVE') {
      throw new RoomValidationError('Hợp đồng khi tạo phòng chỉ có thể ở trạng thái Chờ hiệu lực hoặc Đang hiệu lực.');
    }
    const startDate = new Date(requiredText(payload.contract.startDate, 'Ngày bắt đầu thuê'));
    if (Number.isNaN(startDate.getTime())) throw new RoomValidationError('Ngày bắt đầu thuê không hợp lệ.');
    const endDateValue = typeof payload.contract.endDate === 'string' && payload.contract.endDate.trim() ? new Date(payload.contract.endDate) : null;
    if (endDateValue && Number.isNaN(endDateValue.getTime())) throw new RoomValidationError('Ngày kết thúc không hợp lệ.');
    if (endDateValue && endDateValue < startDate) throw new RoomValidationError('Ngày kết thúc không được trước ngày bắt đầu.');
    const billingDay = nonNegativeInteger(payload.contract.billingDay, 'Ngày đóng tiền');
    if (billingDay < 1 || billingDay > 31) throw new RoomValidationError('Ngày đóng tiền phải từ 1 đến 31.');
    contract = {
      status: contractStatus,
      startDate: startDate.toISOString(),
      endDate: endDateValue?.toISOString() || null,
      depositAmount: nonNegativeNumber(payload.contract.depositAmount, 'Tiền cọc'),
      billingDay,
      note: typeof payload.contract.note === 'string' && payload.contract.note.trim() ? payload.contract.note.trim() : undefined
    };
  }

  const status: RoomStatus = contract?.status === 'ACTIVE' ? 'OCCUPIED' : contract ? 'RESERVED' : 'AVAILABLE';
  const tenant = contract ? requiredText(payload.tenant, 'Chủ phòng') : 'Chưa có người thuê';
  const people = contract ? 1 : 0;
  const primaryTenantId = typeof payload.primaryTenantId === 'string' && payload.primaryTenantId.trim() ? payload.primaryTenantId.trim() : undefined;
  const primaryTenantName =
    typeof payload.primaryTenantName === 'string' && payload.primaryTenantName.trim() ? payload.primaryTenantName.trim() : undefined;
  const moveInDate = contract ? new Date(contract.startDate) : undefined;
  if (primaryTenantId && !ObjectId.isValid(primaryTenantId)) throw new RoomValidationError('Người thuê không hợp lệ.');
  if (contract && !primaryTenantId && !primaryTenantName) throw new RoomValidationError('Vui lòng nhập tên chủ phòng.');
  if (!contract && (primaryTenantId || primaryTenantName)) throw new RoomValidationError('Cần tạo hợp đồng khi khai báo chủ phòng.');

  return {
    name: requiredText(payload.name, 'Tên phòng').toUpperCase(),
    floor: requiredText(payload.floor, 'Tầng'),
    tenant,
    price: positiveNumber(payload.price, 'Giá thuê'),
    status,
    people,
    primaryTenantId,
    primaryTenantName,
    moveInDate: moveInDate?.toISOString(),
    contract
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
  if ('primaryTenantId' in payload) {
    if (typeof payload.primaryTenantId !== 'string' || !ObjectId.isValid(payload.primaryTenantId)) {
      throw new RoomValidationError('Chủ phòng được chọn không hợp lệ.');
    }
    output.primaryTenantId = payload.primaryTenantId;
  }

  if (Object.keys(output).length === 0) throw new RoomValidationError('Không có thông tin nào để cập nhật.');
  if (output.status === 'AVAILABLE') {
    output.tenant = 'Chưa có người thuê';
    output.people = 0;
  }

  return output;
}
