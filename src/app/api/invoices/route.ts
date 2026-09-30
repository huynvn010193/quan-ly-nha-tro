import { createInvoiceHandler, getInvoicesHandler } from '@/backend/invoices/invoice.handlers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return getInvoicesHandler(request);
}

export async function POST(request: Request) {
  return createInvoiceHandler(request);
}
