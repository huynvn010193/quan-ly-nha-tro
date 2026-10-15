import { markInvoicePaidHandler } from '@/backend/invoices/invoice.handlers';

export const runtime = 'nodejs';

export async function PATCH(_request: Request, context: RouteContext<'/api/invoices/[id]/payment'>) {
  const { id } = await context.params;
  return markInvoicePaidHandler(id);
}
