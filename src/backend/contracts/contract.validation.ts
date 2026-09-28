import { ObjectId } from 'mongodb';
import { CONTRACT_STATUSES, type ContractStatus, type CreateContractInput, type UpdateContractInput } from './contract.types';

export class ContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function objectId(value: unknown, label: string) {
  if (typeof value !== 'string' || !ObjectId.isValid(value)) throw new ContractValidationError(`${label} không hợp lệ.`);
  return value;
}

function dateValue(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new ContractValidationError(`${label} là bắt buộc.`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new ContractValidationError(`${label} không hợp lệ.`);
  return parsed.toISOString();
}

function optionalEndDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return dateValue(value, 'Ngày kết thúc');
}

function nonNegativeNumber(value: unknown, label: string) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new ContractValidationError(`${label} phải là số không âm.`);
  return parsed;
}

function billingDay(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) throw new ContractValidationError('Ngày đóng tiền phải từ 1 đến 31.');
  return parsed;
}

function contractStatus(value: unknown): ContractStatus {
  if (typeof value !== 'string' || !CONTRACT_STATUSES.includes(value as ContractStatus)) {
    throw new ContractValidationError('Trạng thái hợp đồng không hợp lệ.');
  }
  return value as ContractStatus;
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validateDateRange(startDate?: string, endDate?: string | null) {
  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    throw new ContractValidationError('Ngày kết thúc không được trước ngày bắt đầu.');
  }
}

export function validateCreateContract(payload: unknown): CreateContractInput {
  if (!isRecord(payload)) throw new ContractValidationError('Dữ liệu hợp đồng không hợp lệ.');
  const startDate = dateValue(payload.startDate, 'Ngày bắt đầu');
  const endDate = optionalEndDate(payload.endDate);
  validateDateRange(startDate, endDate);

  return {
    roomId: objectId(payload.roomId, 'Phòng'),
    ownerTenantId: objectId(payload.ownerTenantId, 'Chủ phòng'),
    startDate,
    endDate,
    rentAmount: nonNegativeNumber(payload.rentAmount, 'Tiền thuê'),
    depositAmount: nonNegativeNumber(payload.depositAmount, 'Tiền cọc'),
    billingDay: billingDay(payload.billingDay),
    status: contractStatus(payload.status),
    note: optionalText(payload.note)
  };
}

export function validateUpdateContract(payload: unknown): UpdateContractInput {
  if (!isRecord(payload)) throw new ContractValidationError('Dữ liệu cập nhật hợp đồng không hợp lệ.');
  const output: UpdateContractInput = {};

  if ('roomId' in payload) output.roomId = objectId(payload.roomId, 'Phòng');
  if ('ownerTenantId' in payload) output.ownerTenantId = objectId(payload.ownerTenantId, 'Chủ phòng');
  if ('startDate' in payload) output.startDate = dateValue(payload.startDate, 'Ngày bắt đầu');
  if ('endDate' in payload) output.endDate = optionalEndDate(payload.endDate);
  if ('rentAmount' in payload) output.rentAmount = nonNegativeNumber(payload.rentAmount, 'Tiền thuê');
  if ('depositAmount' in payload) output.depositAmount = nonNegativeNumber(payload.depositAmount, 'Tiền cọc');
  if ('billingDay' in payload) output.billingDay = billingDay(payload.billingDay);
  if ('status' in payload) output.status = contractStatus(payload.status);
  if ('note' in payload) output.note = optionalText(payload.note);

  if (!Object.keys(output).length) throw new ContractValidationError('Không có thông tin hợp đồng nào để cập nhật.');
  validateDateRange(output.startDate, output.endDate);
  return output;
}
