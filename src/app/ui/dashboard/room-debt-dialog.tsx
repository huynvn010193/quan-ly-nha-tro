'use client';

import { useQuery } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react';
import type { Invoice, InvoiceListResult } from '@/backend/invoices/invoice.types';
import type { Room } from '@/backend/rooms/room.types';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { InvoicePaymentButton, invoicePeriodLabel } from './invoices-view';
import { formatMoney } from './shared';

async function getRoomDebt(roomId: string): Promise<Invoice[]> {
  const invoices: Invoice[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await fetch(`/api/invoices?roomId=${roomId}&unpaidOnly=true&limit=100&page=${page}`, { cache: 'no-store' });
    const payload = (await response.json()) as InvoiceListResult & { error?: string };
    if (!response.ok) throw new Error(payload.error || 'Không thể tải công nợ của phòng.');
    invoices.push(...payload.data);
    totalPages = payload.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);
  return invoices.sort((a, b) => a.period.localeCompare(b.period));
}

export function RoomDebtDialog({ room, onClose }: { room: Room; onClose: () => void }) {
  const debtQuery = useQuery({
    queryKey: ['invoices', 'room-debt', room.id],
    queryFn: () => getRoomDebt(room.id)
  });
  const invoices = debtQuery.data || [];
  const total = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader className='pr-10'>
          <DialogTitle>{room.name} — Công nợ</DialogTitle>
          <DialogDescription>{room.tenant}</DialogDescription>
        </DialogHeader>
        {debtQuery.isLoading ? (
          <div role='status' className='grid min-h-40 place-items-center'><Spinner className='size-6 text-blue-600' /></div>
        ) : debtQuery.isError ? (
          <div role='alert' className='mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-600'>
            <p>{debtQuery.error.message}</p>
            <button type='button' onClick={() => void debtQuery.refetch()} className='mt-2 font-semibold underline'>Thử lại</button>
          </div>
        ) : invoices.length === 0 ? (
          <div className='my-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-700'>
            <CircleCheck className='size-5 shrink-0' /> Phòng không còn hóa đơn chưa thanh toán.
          </div>
        ) : (
          <>
            <div className='mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200'>
              {invoices.map((invoice) => (
                <article key={invoice.id} className='flex flex-wrap items-start justify-between gap-4 p-5'>
                  <div>
                    <h3 className='text-base font-bold text-slate-800'>Hóa đơn {invoicePeriodLabel(invoice.period)}</h3>
                    <p className='mt-1 text-[11px] text-slate-400'>{invoice.code}</p>
                    <p className='mt-3 text-xs text-slate-500'>
                      Hạn thanh toán: {new Intl.DateTimeFormat('en-GB').format(new Date(invoice.dueDate))}
                    </p>
                  </div>
                  <div className='flex flex-col items-end gap-3'>
                    <Badge variant={invoice.status === 'OVERDUE' ? 'destructive' : 'warning'}>
                      {invoice.status === 'OVERDUE' ? 'Quá hạn' : 'Chưa thanh toán'}
                    </Badge>
                    <p className='text-lg font-bold tabular-nums text-slate-900'>{formatMoney(invoice.totalAmount)}</p>
                    <InvoicePaymentButton invoice={invoice} />
                  </div>
                </article>
              ))}
            </div>
            <div className='mt-4 flex items-center justify-between gap-4 rounded-xl bg-rose-50 p-4'>
              <span className='text-sm font-semibold text-slate-700'>Tổng còn nợ ({invoices.length} hóa đơn)</span>
              <span className='text-lg font-bold text-red-600'>{formatMoney(total)}</span>
            </div>
          </>
        )}
        <DialogFooter className='mt-5'>
          <button type='button' onClick={onClose} className='soft-button px-5'>Đóng</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
