import { getTenantHistoryHandler } from '@/backend/tenants/tenant.handlers';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: RouteContext<'/api/tenants/[id]/room-history'>) {
  const { id } = await context.params;
  return getTenantHistoryHandler(id);
}
