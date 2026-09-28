import { createContractHandler, getContractsHandler } from '@/backend/contracts/contract.handlers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return getContractsHandler(request);
}

export async function POST(request: Request) {
  return createContractHandler(request);
}
