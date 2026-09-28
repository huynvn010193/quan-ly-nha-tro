export const CONTRACT_STATUSES = ['PENDING', 'ACTIVE', 'ENDED', 'CANCELLED'] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export type Contract = {
  id: string;
  roomId: string;
  roomName: string;
  floor: string;
  ownerTenantId: string;
  ownerTenantName: string;
  ownerPhone?: string;
  startDate: string;
  endDate: string | null;
  rentAmount: number;
  depositAmount: number;
  billingDay: number;
  status: ContractStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateContractInput = Pick<
  Contract,
  'roomId' | 'ownerTenantId' | 'startDate' | 'endDate' | 'rentAmount' | 'depositAmount' | 'billingDay' | 'status' | 'note'
>;

export type UpdateContractInput = Partial<CreateContractInput>;

export type ContractListResult = {
  data: Contract[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
