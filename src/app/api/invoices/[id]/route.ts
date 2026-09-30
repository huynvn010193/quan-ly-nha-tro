import { deleteInvoiceHandler, getInvoiceHandler, updateInvoiceHandler } from '@/backend/invoices/invoice.handlers';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: RouteContext<'/api/invoices/[id]'>) {
  const { id } = await context.params;
  return getInvoiceHandler(id);
}

export async function PATCH(request: Request, context: RouteContext<'/api/invoices/[id]'>) {
  const { id } = await context.params;
  return updateInvoiceHandler(request, id);
}

export async function DELETE(_request: Request, context: RouteContext<'/api/invoices/[id]'>) {
  const { id } = await context.params;
  return deleteInvoiceHandler(id);
}
