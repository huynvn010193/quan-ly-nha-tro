import { ObjectId } from 'mongodb';
import type { CreateInvoiceInput, InvoiceExtraCost } from './invoice.types';

export class InvoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegativeNumber(value: unknown, label: string) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new InvoiceValidationError(`${label} phải là số không âm.`);
  return parsed;
}

function utility(value: unknown, label: string) {
  if (!isRecord(value)) throw new InvoiceValidationError(`Thông tin ${label.toLowerCase()} không hợp lệ.`);
  const oldValue = nonNegativeNumber(value.oldValue, `Chỉ số ${label.toLowerCase()} cũ`);
  const newValue = nonNegativeNumber(value.newValue, `Chỉ số ${label.toLowerCase()} mới`);
  const unitPrice = nonNegativeNumber(value.unitPrice, `Đơn giá ${label.toLowerCase()}`);
  if (newValue < oldValue) throw new InvoiceValidationError(`Chỉ số ${label.toLowerCase()} mới không được nhỏ hơn chỉ số cũ.`);
  if (unitPrice <= 0) throw new InvoiceValidationError(`Đơn giá ${label.toLowerCase()} phải lớn hơn 0.`);
  return { oldValue, newValue, unitPrice };
}

function extraCosts(value: unknown): InvoiceExtraCost[] {
  if (!Array.isArray(value)) return [];
  if (value.length > 20) throw new InvoiceValidationError('Hóa đơn chỉ được có tối đa 20 chi phí khác.');
  return value.map((item, index) => {
    if (!isRecord(item)) throw new InvoiceValidationError(`Chi phí thứ ${index + 1} không hợp lệ.`);
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) throw new InvoiceValidationError(`Vui lòng nhập tên chi phí thứ ${index + 1}.`);
    return { name, amount: nonNegativeNumber(item.amount, `Số tiền ${name}`) };
  });
}

export function validateInvoice(payload: unknown): CreateInvoiceInput {
  if (!isRecord(payload)) throw new InvoiceValidationError('Dữ liệu hóa đơn không hợp lệ.');
  if (typeof payload.roomId !== 'string' || !ObjectId.isValid(payload.roomId)) throw new InvoiceValidationError('Phòng không hợp lệ.');
  if (typeof payload.period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(payload.period)) {
    throw new InvoiceValidationError('Kỳ hóa đơn không hợp lệ.');
  }
  if (typeof payload.dueDate !== 'string' || Number.isNaN(new Date(payload.dueDate).getTime())) {
    throw new InvoiceValidationError('Hạn thanh toán không hợp lệ.');
  }
  return {
    roomId: payload.roomId,
    period: payload.period,
    dueDate: new Date(payload.dueDate).toISOString(),
    electricity: utility(payload.electricity, 'Điện'),
    water: utility(payload.water, 'Nước'),
    extraCosts: extraCosts(payload.extraCosts)
  };
}
