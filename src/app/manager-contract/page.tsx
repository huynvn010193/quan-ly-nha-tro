import { BoardingHouseDashboard } from '../ui/boarding-house-dashboard';

export default async function ManagerContractPage({ searchParams }: { searchParams: Promise<{ roomId?: string }> }) {
  const { roomId } = await searchParams;
  return <BoardingHouseDashboard initialView='contracts' initialContractRoomId={roomId} />;
}
