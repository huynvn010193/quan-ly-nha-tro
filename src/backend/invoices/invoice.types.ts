export const INVOICE_STATUSES = ['PENDING', 'PAID', 'OVERDUE'] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type UtilityReading = {
  oldValue: number;
  newValue: number;
  unitPrice: number;
  usage: number;
  amount: number;
};

export type InvoiceExtraCost = {
  name: string;
  amount: number;
};

export type Invoice = {
  id: string;
  code: string;
  roomId: string;
  roomName: string;
  tenantId: string;
  tenantName: string;
  period: string;
  dueDate: string;
  rentAmount: number;
  electricity: UtilityReading;
  water: UtilityReading;
  extraCosts: InvoiceExtraCost[];
  totalAmount: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateInvoiceInput = {
  roomId: string;
  period: string;
  dueDate: string;
  electricity: Pick<UtilityReading, 'oldValue' | 'newValue' | 'unitPrice'>;
  water: Pick<UtilityReading, 'oldValue' | 'newValue' | 'unitPrice'>;
  extraCosts: InvoiceExtraCost[];
};

export type InvoiceListResult = {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
