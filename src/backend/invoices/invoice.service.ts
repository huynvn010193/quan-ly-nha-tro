import { createInvoice, deleteInvoice, getInvoiceById, listInvoices, updateInvoice } from './invoice.repository';
import { ObjectId } from 'mongodb';
import { InvoiceValidationError, validateInvoice } from './invoice.validation';

export async function getInvoiceList(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
  const period = searchParams.get('period') || undefined;
  const roomId = searchParams.get('roomId') || undefined;
  if (roomId && !ObjectId.isValid(roomId)) throw new InvoiceValidationError('Phòng không hợp lệ.');
  const unpaidOnly = searchParams.get('unpaidOnly') === 'true';
  return listInvoices({ page, limit, period, roomId, unpaidOnly });
}

export async function getInvoice(id: string) {
  return getInvoiceById(id);
}

export async function addInvoice(payload: unknown) {
  return createInvoice(validateInvoice(payload));
}

export async function editInvoice(id: string, payload: unknown) {
  return updateInvoice(id, validateInvoice(payload));
}

export async function removeInvoice(id: string) {
  return deleteInvoice(id);
}
