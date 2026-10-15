import { getRoomInvoiceSummariesHandler } from '@/backend/invoices/invoice.handlers';

export const runtime = 'nodejs';

export async function GET() {
  return getRoomInvoiceSummariesHandler();
}
