import { deleteContractHandler, getContractHandler, updateContractHandler } from '@/backend/contracts/contract.handlers';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: RouteContext<'/api/contracts/[id]'>) {
  const { id } = await context.params;
  return getContractHandler(id);
}

export async function PATCH(request: Request, context: RouteContext<'/api/contracts/[id]'>) {
  const { id } = await context.params;
  return updateContractHandler(request, id);
}

export async function DELETE(_request: Request, context: RouteContext<'/api/contracts/[id]'>) {
  const { id } = await context.params;
  return deleteContractHandler(id);
}
