import { getMongoClient } from '@/backend/database/mongodb';
import { listRooms } from '@/backend/rooms/room.repository';
import { ensureTenantDatabase } from '@/backend/tenants/tenant.repository';

try {
  await Promise.all([ensureTenantDatabase(), listRooms({ page: 1, limit: 1 })]);
  console.log('Đã tạo collections và indexes cho rooms, tenants, roomMembers và tenantFiles.');
} finally {
  const client = await getMongoClient();
  await client.close();
}
