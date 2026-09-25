import { getTenantHandler, updateTenantHandler } from '@/backend/tenants/tenant.handlers';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: RouteContext<'/api/tenants/[id]'>) {
  const { id } = await context.params;
  return getTenantHandler(id);
}

export async function PATCH(request: Request, context: RouteContext<'/api/tenants/[id]'>) {
  const { id } = await context.params;
  return updateTenantHandler(request, id);
}
