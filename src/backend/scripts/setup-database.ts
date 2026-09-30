import { getMongoClient } from '@/backend/database/mongodb';
import { ensureContractDatabase } from '@/backend/contracts/contract.repository';
import { ensureInvoiceDatabase } from '@/backend/invoices/invoice.repository';
import { listRooms } from '@/backend/rooms/room.repository';
import { ensureTenantDatabase } from '@/backend/tenants/tenant.repository';

try {
  await Promise.all([ensureTenantDatabase(), ensureContractDatabase(), ensureInvoiceDatabase(), listRooms({ page: 1, limit: 1 })]);
  console.log('Đã tạo collections và indexes cho rooms, tenants, roomMembers, contracts, invoices và tenantFiles.');
} finally {
  const client = await getMongoClient();
  await client.close();
}
