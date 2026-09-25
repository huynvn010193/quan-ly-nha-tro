import { ObjectId } from 'mongodb';
import {
  ROOM_MEMBER_ROLES,
  TENANT_GENDERS,
  type CreateTenantInput,
  type RoomMemberRole,
  type TenantGender,
  type TenantUploadFiles,
  type UpdateTenantInput
} from './tenant.types';

export class TenantValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new TenantValidationError(`${label} là bắt buộc.`);
  return value.trim();
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function birthYear(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > currentYear) throw new TenantValidationError('Năm sinh không hợp lệ.');
  return parsed;
}

function gender(value: unknown): TenantGender {
  if (typeof value !== 'string' || !TENANT_GENDERS.includes(value as TenantGender)) throw new TenantValidationError('Giới tính không hợp lệ.');
  return value as TenantGender;
}

function role(value: unknown): RoomMemberRole {
  if (typeof value !== 'string' || !ROOM_MEMBER_ROLES.includes(value as RoomMemberRole)) {
    throw new TenantValidationError('Vai trò trong phòng không hợp lệ.');
  }
  return value as RoomMemberRole;
}

function roomId(value: unknown) {
  const id = requiredText(value, 'Phòng');
  if (!ObjectId.isValid(id)) throw new TenantValidationError('Phòng không hợp lệ.');
  return id;
}

function moveInDate(value: unknown) {
  const parsed = new Date(requiredText(value, 'Ngày vào ở'));
  if (Number.isNaN(parsed.getTime())) throw new TenantValidationError('Ngày vào ở không hợp lệ.');
  return parsed;
}

function validatePhone(value: unknown) {
  const phone = requiredText(value, 'Số điện thoại').replace(/\s/g, '');
  if (!/^(?:\+84|0)\d{9,10}$/.test(phone)) throw new TenantValidationError('Số điện thoại không hợp lệ.');
  return phone;
}

function validateCccd(value: unknown) {
  const cccd = requiredText(value, 'Số CCCD');
  if (!/^\d{12}$/.test(cccd)) throw new TenantValidationError('Số CCCD phải gồm đúng 12 chữ số.');
  return cccd;
}

export function validateCreateTenant(payload: unknown): CreateTenantInput {
  if (!isRecord(payload)) throw new TenantValidationError('Dữ liệu người thuê không hợp lệ.');

  return {
    fullName: requiredText(payload.fullName, 'Họ và tên'),
    phone: validatePhone(payload.phone),
    birthYear: birthYear(payload.birthYear),
    cccd: validateCccd(payload.cccd),
    gender: gender(payload.gender),
    ethnicity: requiredText(payload.ethnicity, 'Dân tộc'),
    permanentAddress: optionalText(payload.permanentAddress),
    temporaryAddress: optionalText(payload.temporaryAddress),
    roomId: roomId(payload.roomId),
    role: role(payload.role),
    moveInDate: moveInDate(payload.moveInDate)
  };
}

export function validateUpdateTenant(payload: unknown): UpdateTenantInput {
  if (!isRecord(payload)) throw new TenantValidationError('Dữ liệu cập nhật không hợp lệ.');

  const output: UpdateTenantInput = {};
  if ('fullName' in payload) output.fullName = requiredText(payload.fullName, 'Họ và tên');
  if ('phone' in payload) output.phone = validatePhone(payload.phone);
  if ('birthYear' in payload) output.birthYear = birthYear(payload.birthYear);
  if ('cccd' in payload) output.cccd = validateCccd(payload.cccd);
  if ('gender' in payload) output.gender = gender(payload.gender);
  if ('ethnicity' in payload) output.ethnicity = requiredText(payload.ethnicity, 'Dân tộc');
  if ('permanentAddress' in payload) output.permanentAddress = optionalText(payload.permanentAddress);
  if ('temporaryAddress' in payload) output.temporaryAddress = optionalText(payload.temporaryAddress);
  if ('roomId' in payload) output.roomId = roomId(payload.roomId);
  if ('role' in payload) output.role = role(payload.role);
  if ('moveInDate' in payload) output.moveInDate = moveInDate(payload.moveInDate);

  if (Object.keys(output).length === 0) throw new TenantValidationError('Không có thông tin nào để cập nhật.');
  if ((output.roomId && !output.role) || (!output.roomId && output.role)) {
    throw new TenantValidationError('Phòng và vai trò phải được cập nhật cùng nhau.');
  }
  return output;
}

function optionalImage(value: FormDataEntryValue | null, label: string): File | undefined {
  if (!(value instanceof File) || value.size === 0) return undefined;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(value.type)) throw new TenantValidationError(`${label} phải là ảnh JPG, PNG hoặc WEBP.`);
  if (value.size > 5 * 1024 * 1024) throw new TenantValidationError(`${label} không được vượt quá 5MB.`);
  return value;
}

export function validateTenantFiles(formData: FormData): TenantUploadFiles {
  const attachments = formData
    .getAll('attachments')
    .filter((value): value is File => value instanceof File && value.size > 0)
    .slice(0, 5);

  if (attachments.some((file) => file.size > 10 * 1024 * 1024)) throw new TenantValidationError('Mỗi file đính kèm không được vượt quá 10MB.');

  return {
    citizenIdFront: optionalImage(formData.get('citizenIdFront'), 'Mặt trước CCCD'),
    citizenIdBack: optionalImage(formData.get('citizenIdBack'), 'Mặt sau CCCD'),
    attachments
  };
}
