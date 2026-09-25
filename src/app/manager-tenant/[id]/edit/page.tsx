import { BoardingHouseDashboard } from '../../../ui/boarding-house-dashboard';

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardingHouseDashboard initialView='tenant-create' editingTenantId={id} />;
}
