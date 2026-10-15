import { markInvoicesPaidHandler } from '@/backend/invoices/invoice.handlers';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  return markInvoicesPaidHandler(request);
}
