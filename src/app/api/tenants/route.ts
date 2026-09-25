import { createTenantHandler, getTenantsHandler } from '@/backend/tenants/tenant.handlers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return getTenantsHandler(request);
}

export async function POST(request: Request) {
  return createTenantHandler(request);
}
