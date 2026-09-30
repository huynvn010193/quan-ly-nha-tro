'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  Droplets,
  Eye,
  FilePenLine,
  FilePlus2,
  FileText,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Trash2,
  Zap
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CreateInvoiceInput, Invoice, InvoiceListResult } from '@/backend/invoices/invoice.types';
import type { Room } from '@/backend/rooms/room.types';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrencyInput, formatMoney, parseCurrencyInput, StatCard } from './shared';

type ExtraCostForm = { id: string; name: string; amount: number };

const now = new Date();
const nextBillingMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(nextBillingMonth.getFullYear(), nextBillingMonth.getMonth() + index, 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return { value: `${date.getFullYear()}-${month}`, label: `${month}/${date.getFullYear()}` };
});
const DEFAULT_PERIOD = MONTH_OPTIONS[0].value;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Không thể xử lý hóa đơn.');
  return payload;
}

function periodLabel(period: string) {
  const [year, month] = period.split('-');
  return `${month}/${year}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function dueDateFromPeriod(period: string) {
  return `${period}-05`;
}

function statusBadge(invoice: Invoice) {
  const labels = { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', OVERDUE: 'Quá hạn' } as const;
  const variants = { PENDING: 'warning', PAID: 'success', OVERDUE: 'destructive' } as const;
  return <Badge variant={variants[invoice.status]}>{labels[invoice.status]}</Badge>;
}

function UtilitySection({
  type,
  oldValue,
  newValue,
  unitPrice,
  onOldValueChange,
  onNewValueChange,
  onUnitPriceChange
}: {
  type: 'electricity' | 'water';
  oldValue: string;
  newValue: string;
  unitPrice: number;
  onOldValueChange: (value: string) => void;
  onNewValueChange: (value: string) => void;
  onUnitPriceChange: (value: number) => void;
}) {
  const isElectricity = type === 'electricity';
  const usage = Math.max(0, Number(newValue || 0) - Number(oldValue || 0));
  const amount = usage * unitPrice;

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-4'>
      <div className='mb-4 flex items-center gap-2'>
        <span className={`grid size-9 place-items-center rounded-xl ${isElectricity ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
          {isElectricity ? <Zap size={17} /> : <Droplets size={17} />}
        </span>
        <div>
          <h3 className='text-sm font-bold text-slate-800'>{isElectricity ? 'Điện' : 'Nước'}</h3>
          <p className='text-[10px] text-slate-400'>Nhập chỉ số và đơn giá để tự động tính tiền.</p>
        </div>
      </div>
      <div className='grid gap-3 sm:grid-cols-3'>
        <div>
          <label className='field-label'>Chỉ số cũ *</label>
          <Input type='number' min={0} value={oldValue} onChange={(event) => onOldValueChange(event.target.value)} placeholder='0' />
        </div>
        <div>
          <label className='field-label'>Chỉ số mới *</label>
          <Input type='number' min={0} value={newValue} onChange={(event) => onNewValueChange(event.target.value)} placeholder='0' />
        </div>
        <div>
          <label className='field-label'>Đơn giá *</label>
          <div className='relative'>
            <Input
              inputMode='numeric'
              value={formatCurrencyInput(unitPrice)}
              onChange={(event) => onUnitPriceChange(parseCurrencyInput(event.target.value))}
              className='pr-18'
            />
            <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400'>
              đ/{isElectricity ? 'kWh' : 'm³'}
            </span>
          </div>
        </div>
      </div>
      <div className='mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs'>
        <div>
          <p className='text-slate-400'>Sử dụng</p>
          <p className='mt-1 font-bold text-slate-700'>
            {usage.toLocaleString('vi-VN')} {isElectricity ? 'kWh' : 'm³'}
          </p>
        </div>
        <div className='text-right'>
          <p className='text-slate-400'>Thành tiền</p>
          <p className='mt-1 font-bold text-emerald-700'>{formatMoney(amount)}</p>
        </div>
      </div>
    </section>
  );
}

function InvoiceFormDialog({
  rooms,
  invoices,
  invoice,
  pending,
  error,
  onClose,
  onSave
}: {
  rooms: Room[];
  invoices: Invoice[];
  invoice?: Invoice;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSave: (input: CreateInvoiceInput) => Promise<void>;
}) {
  const initialPeriod = invoice?.period || DEFAULT_PERIOD;
  const billableRooms = useMemo(() => rooms.filter((room) => room.people > 0 && room.status !== 'MAINTENANCE'), [rooms]);
  const roomsForPeriod = (period: string) =>
    billableRooms.filter(
      (room) => !invoices.some((current) => current.id !== invoice?.id && current.roomId === room.id && current.period === period)
    );
  const initialRooms = roomsForPeriod(initialPeriod);
  const [period, setPeriod] = useState(initialPeriod);
  const [roomId, setRoomId] = useState(invoice?.roomId || initialRooms[0]?.id || '');
  const [dueDate, setDueDate] = useState(invoice?.dueDate.slice(0, 10) || dueDateFromPeriod(initialPeriod));
  const [electricityOld, setElectricityOld] = useState(invoice ? String(invoice.electricity.oldValue) : '');
  const [electricityNew, setElectricityNew] = useState(invoice ? String(invoice.electricity.newValue) : '');
  const [electricityPrice, setElectricityPrice] = useState(invoice?.electricity.unitPrice || 3500);
  const [waterOld, setWaterOld] = useState(invoice ? String(invoice.water.oldValue) : '');
  const [waterNew, setWaterNew] = useState(invoice ? String(invoice.water.newValue) : '');
  const [waterPrice, setWaterPrice] = useState(invoice?.water.unitPrice || 15000);
  const [extraCosts, setExtraCosts] = useState<ExtraCostForm[]>(
    invoice
      ? invoice.extraCosts.map((item, index) => ({ ...item, id: `saved-${index}` }))
      : [
          { id: 'internet', name: 'Internet', amount: 100000 },
          { id: 'trash', name: 'Rác', amount: 30000 }
        ]
  );
  const [formError, setFormError] = useState('');
  const availableRooms = roomsForPeriod(period);
  const selectedRoom = billableRooms.find((room) => room.id === roomId);
  const electricityUsage = Math.max(0, Number(electricityNew || 0) - Number(electricityOld || 0));
  const waterUsage = Math.max(0, Number(waterNew || 0) - Number(waterOld || 0));
  const electricityAmount = electricityUsage * electricityPrice;
  const waterAmount = waterUsage * waterPrice;
  const extrasAmount = extraCosts.reduce((sum, item) => sum + item.amount, 0);
  const total = (selectedRoom?.price || invoice?.rentAmount || 0) + electricityAmount + waterAmount + extrasAmount;

  const changePeriod = (value: string) => {
    const nextRooms = roomsForPeriod(value);
    setPeriod(value);
    setDueDate(dueDateFromPeriod(value));
    if (!nextRooms.some((room) => room.id === roomId)) setRoomId(nextRooms[0]?.id || '');
  };

  const submit = async () => {
    setFormError('');
    if (!roomId) return setFormError('Tháng này không còn phòng nào chưa lập hóa đơn.');
    if (!electricityOld || !electricityNew || !waterOld || !waterNew) return setFormError('Vui lòng nhập đầy đủ chỉ số điện và nước.');
    if (Number(electricityNew) < Number(electricityOld)) return setFormError('Chỉ số điện mới không được nhỏ hơn chỉ số cũ.');
    if (Number(waterNew) < Number(waterOld)) return setFormError('Chỉ số nước mới không được nhỏ hơn chỉ số cũ.');
    if (electricityPrice <= 0 || waterPrice <= 0) return setFormError('Đơn giá điện và nước phải lớn hơn 0.');
    if (extraCosts.some((item) => !item.name.trim())) return setFormError('Vui lòng nhập tên cho các chi phí khác.');
    await onSave({
      roomId,
      period,
      dueDate,
      electricity: { oldValue: Number(electricityOld), newValue: Number(electricityNew), unitPrice: electricityPrice },
      water: { oldValue: Number(waterOld), newValue: Number(waterNew), unitPrice: waterPrice },
      extraCosts: extraCosts.map(({ name, amount }) => ({ name: name.trim(), amount }))
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className='max-h-[94vh] max-w-5xl overflow-y-auto p-0' showCloseButton={!pending}>
        <DialogHeader className='border-b border-slate-100 px-6 py-5 pr-16'>
          <DialogTitle className='flex items-center gap-2'>
            <ReceiptText className='size-5 text-emerald-700' /> {invoice ? 'Chỉnh sửa hóa đơn' : 'Tạo hóa đơn'}
          </DialogTitle>
          <DialogDescription>Chọn kỳ và phòng, sau đó nhập chỉ số điện nước để tự động tính tổng tiền.</DialogDescription>
        </DialogHeader>

        <div className='grid gap-5 px-6 py-5 lg:grid-cols-[1.35fr_0.85fr]'>
          <div className='space-y-4'>
            <section className='rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4'>
              <div className='grid gap-3 sm:grid-cols-2'>
                <div>
                  <label className='field-label'>Tháng hóa đơn *</label>
                  <Select value={period} onValueChange={changePeriod}>
                    <SelectTrigger className='bg-white'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>Tháng {month.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className='field-label'>Phòng *</label>
                  <Select value={roomId} onValueChange={setRoomId} disabled={!availableRooms.length}>
                    <SelectTrigger className='bg-white'>
                      <SelectValue placeholder='Không còn phòng phù hợp' />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>{room.name} · {room.tenant}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!availableRooms.length && <p className='mt-3 text-xs font-medium text-amber-700'>Tất cả phòng đã có hóa đơn trong tháng này.</p>}
              {selectedRoom && (
                <dl className='mt-4 grid gap-3 text-xs sm:grid-cols-2'>
                  <div><dt className='text-slate-400'>Người thuê</dt><dd className='mt-1 font-bold text-slate-700'>{selectedRoom.tenant}</dd></div>
                  <div><dt className='text-slate-400'>Tiền phòng</dt><dd className='mt-1 font-bold text-emerald-700'>{formatMoney(selectedRoom.price)}</dd></div>
                  <div><dt className='text-slate-400'>Kỳ thanh toán</dt><dd className='mt-1 font-bold text-slate-700'>{periodLabel(period)}</dd></div>
                  <div>
                    <label className='field-label'>Hạn thanh toán</label>
                    <Input type='date' value={dueDate} onChange={(event) => setDueDate(event.target.value)} className='mt-1 bg-white' />
                  </div>
                </dl>
              )}
            </section>

            <UtilitySection
              type='electricity'
              oldValue={electricityOld}
              newValue={electricityNew}
              unitPrice={electricityPrice}
              onOldValueChange={setElectricityOld}
              onNewValueChange={setElectricityNew}
              onUnitPriceChange={setElectricityPrice}
            />
            <UtilitySection
              type='water'
              oldValue={waterOld}
              newValue={waterNew}
              unitPrice={waterPrice}
              onOldValueChange={setWaterOld}
              onNewValueChange={setWaterNew}
              onUnitPriceChange={setWaterPrice}
            />

            <section className='rounded-2xl border border-slate-200 bg-white p-4'>
              <h3 className='text-sm font-bold text-slate-800'>Chi phí khác</h3>
              <div className='mt-4 space-y-3'>
                {extraCosts.map((item) => (
                  <div key={item.id} className='grid grid-cols-[1fr_1fr_auto] gap-2'>
                    <Input
                      value={item.name}
                      aria-label='Tên chi phí'
                      onChange={(event) => setExtraCosts((items) => items.map((current) => current.id === item.id ? { ...current, name: event.target.value } : current))}
                      placeholder='Tên chi phí'
                    />
                    <div className='relative'>
                      <Input
                        inputMode='numeric'
                        aria-label={`Số tiền ${item.name || 'chi phí'}`}
                        value={formatCurrencyInput(item.amount)}
                        onChange={(event) => setExtraCosts((items) => items.map((current) => current.id === item.id ? { ...current, amount: parseCurrencyInput(event.target.value) } : current))}
                        className='pr-10'
                      />
                      <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400'>VNĐ</span>
                    </div>
                    <button type='button' onClick={() => setExtraCosts((items) => items.filter((current) => current.id !== item.id))} aria-label={`Xóa ${item.name || 'chi phí'}`} className='grid size-10 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600'>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button type='button' onClick={() => setExtraCosts((items) => [...items, { id: crypto.randomUUID(), name: '', amount: 0 }])} className='mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800'>
                <Plus size={14} /> Thêm chi phí
              </button>
            </section>
          </div>

          <aside className='h-fit rounded-2xl border border-slate-200 bg-slate-50/70 p-5 lg:sticky lg:top-0'>
            <p className='text-[10px] font-bold uppercase tracking-[.14em] text-emerald-700'>Nhà trọ Tam Kê</p>
            <h3 className='mt-1 text-lg font-bold text-slate-900'>Hóa đơn kỳ {periodLabel(period)}</h3>
            <p className='mt-1 text-xs text-slate-500'>{selectedRoom ? `${selectedRoom.name} · ${selectedRoom.tenant}` : 'Chưa chọn phòng'}</p>
            <div className='my-5 border-t border-dashed border-slate-300' />
            <div className='space-y-3 text-xs'>
              {[
                ['Tiền phòng', selectedRoom?.price || invoice?.rentAmount || 0],
                ['Tiền điện', electricityAmount],
                ['Tiền nước', waterAmount],
                ...extraCosts.map((item) => [item.name || 'Chi phí khác', item.amount] as [string, number])
              ].map(([label, amount], index) => (
                <div key={`${label}-${index}`} className='flex items-center justify-between gap-3'>
                  <span className='text-slate-500'>{label}</span>
                  <span className='font-semibold text-slate-700'>{formatMoney(Number(amount))}</span>
                </div>
              ))}
            </div>
            <div className='my-5 border-t-2 border-slate-300' />
            <div className='flex items-end justify-between gap-3'>
              <span className='text-sm font-extrabold text-slate-800'>Tổng thanh toán</span>
              <span className='text-xl font-extrabold tracking-tight text-emerald-700'>{formatMoney(total)}</span>
            </div>
          </aside>
        </div>

        {(formError || error) && <p role='alert' className='mx-6 mb-4 rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600'>{formError || error}</p>}
        <DialogFooter className='border-t border-slate-100 px-6 py-4'>
          <button type='button' onClick={onClose} disabled={pending} className='soft-button px-5 disabled:opacity-50'>Hủy</button>
          <button type='button' onClick={() => void submit()} disabled={pending || !selectedRoom} className='primary-button disabled:opacity-50'>
            {pending ? <Spinner /> : invoice ? <FilePenLine size={16} /> : <FilePlus2 size={16} />}
            {pending ? 'Đang lưu...' : invoice ? 'Lưu thay đổi' : 'Phát hành hóa đơn'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDetailsDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const rows = [
    ['Tiền phòng', invoice.rentAmount],
    [`Điện (${invoice.electricity.oldValue} → ${invoice.electricity.newValue}, ${invoice.electricity.usage} kWh)`, invoice.electricity.amount],
    [`Nước (${invoice.water.oldValue} → ${invoice.water.newValue}, ${invoice.water.usage} m³)`, invoice.water.amount],
    ...invoice.extraCosts.map((item) => [item.name, item.amount] as [string, number])
  ];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader className='pr-10'>
          <DialogTitle>Chi tiết hóa đơn {invoice.code}</DialogTitle>
          <DialogDescription>{invoice.roomName} · {invoice.tenantName} · Kỳ {periodLabel(invoice.period)}</DialogDescription>
        </DialogHeader>
        <div className='mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-3'>
          <div><p className='text-slate-400'>Ngày tạo</p><p className='mt-1 font-bold text-slate-700'>{formatDate(invoice.createdAt)}</p></div>
          <div><p className='text-slate-400'>Hạn thanh toán</p><p className='mt-1 font-bold text-slate-700'>{formatDate(invoice.dueDate)}</p></div>
          <div><p className='text-slate-400'>Trạng thái</p><div className='mt-1'>{statusBadge(invoice)}</div></div>
        </div>
        <div className='mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200'>
          {rows.map(([label, amount], index) => (
            <div key={`${label}-${index}`} className='flex items-center justify-between gap-4 px-4 py-3 text-sm'>
              <span className='text-slate-500'>{label}</span>
              <span className='font-semibold text-slate-700'>{formatMoney(Number(amount))}</span>
            </div>
          ))}
          <div className='flex items-center justify-between gap-4 bg-emerald-50/60 px-4 py-4'>
            <span className='font-bold text-slate-800'>Tổng thanh toán</span>
            <span className='text-xl font-extrabold text-emerald-700'>{formatMoney(invoice.totalAmount)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InvoicesView({ rooms, query }: { rooms: Room[]; query: string }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: () => request<InvoiceListResult>('/api/invoices?limit=100', { cache: 'no-store' })
  });
  const saveMutation = useMutation({
    mutationFn: (input: CreateInvoiceInput) => request<{ data: Invoice }>(editingInvoice ? `/api/invoices/${editingInvoice.id}` : '/api/invoices', {
      method: editingInvoice ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }),
    onSuccess: async ({ data }) => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSuccessMessage(`${editingInvoice ? 'Đã cập nhật' : 'Đã phát hành'} hóa đơn ${data.code} cho ${data.roomName}.`);
      setFormOpen(false);
      setEditingInvoice(undefined);
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (invoice: Invoice) => request<void>(`/api/invoices/${invoice.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSuccessMessage(`Đã xóa hóa đơn ${deletingInvoice?.code || ''}.`);
      setDeletingInvoice(null);
    }
  });
  const invoices = useMemo(() => invoicesQuery.data?.data || [], [invoicesQuery.data?.data]);
  const search = query.trim().toLowerCase();
  const filtered = invoices.filter((invoice) => `${invoice.code} ${invoice.roomName} ${invoice.tenantName} ${periodLabel(invoice.period)}`.toLowerCase().includes(search));
  const pendingAmount = invoices.filter((invoice) => invoice.status === 'PENDING').reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  if (invoicesQuery.isLoading) return <div className='card grid min-h-64 place-items-center'><Spinner className='size-6 text-emerald-700' /></div>;

  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <button type='button' onClick={() => { saveMutation.reset(); setSuccessMessage(''); setEditingInvoice(undefined); setFormOpen(true); }} className='primary-button'>
          <FilePlus2 size={16} /> Tạo hóa đơn
        </button>
      </div>
      {successMessage && <div className='rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700'>{successMessage}</div>}
      {invoicesQuery.error && (
        <div className='flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-600'>
          <span>{invoicesQuery.error instanceof Error ? invoicesQuery.error.message : 'Không thể tải hóa đơn.'}</span>
          <button type='button' onClick={() => void invoicesQuery.refetch()} className='font-bold'>Thử lại</button>
        </div>
      )}
      <div className='grid gap-4 sm:grid-cols-3'>
        <StatCard icon={FileText} label='Tổng hóa đơn' value={`${invoices.length}`} note='Tất cả kỳ thanh toán' tone='blue' />
        <StatCard icon={Check} label='Đã thanh toán' value={`${invoices.filter((invoice) => invoice.status === 'PAID').length}`} note='Hóa đơn hoàn tất' tone='green' />
        <StatCard icon={CalendarDays} label='Chờ thu' value={formatMoney(pendingAmount)} note='Chưa thanh toán' tone='orange' />
      </div>
      <div className='card overflow-hidden'>
        <Table className='min-w-205 text-left'>
          <TableHeader>
            <TableRow className='border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 hover:bg-slate-50/60'>
              <TableHead className='px-6 py-4'>Mã hóa đơn</TableHead><TableHead className='px-5 py-4'>Phòng & người thuê</TableHead>
              <TableHead className='px-5 py-4'>Kỳ hóa đơn</TableHead><TableHead className='px-5 py-4'>Hạn thanh toán</TableHead>
              <TableHead className='px-5 py-4'>Số tiền</TableHead><TableHead className='px-5 py-4'>Trạng thái</TableHead><TableHead className='w-16' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((invoice) => (
              <TableRow key={invoice.id} className='border-b border-slate-50 text-sm last:border-0 hover:bg-slate-50/70'>
                <TableCell className='px-6 py-4 font-semibold text-slate-700'>{invoice.code}</TableCell>
                <TableCell className='px-5 py-4'><p className='font-semibold text-slate-800'>{invoice.roomName}</p><p className='mt-0.5 text-xs text-slate-400'>{invoice.tenantName}</p></TableCell>
                <TableCell className='px-5 py-4 font-medium text-slate-600'>{periodLabel(invoice.period)}</TableCell>
                <TableCell className='px-5 py-4 text-slate-500'>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell className='px-5 py-4 font-bold text-slate-700'>{formatMoney(invoice.totalAmount)}</TableCell>
                <TableCell className='px-5 py-4'>{statusBadge(invoice)}</TableCell>
                <TableCell className='px-5'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button aria-label={`Thao tác hóa đơn ${invoice.code}`} className='grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-emerald-700'><MoreHorizontal size={18} /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem onSelect={() => setViewingInvoice(invoice)}><Eye /> Xem hóa đơn</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { saveMutation.reset(); setEditingInvoice(invoice); setFormOpen(true); }}><FilePenLine /> Chỉnh sửa</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setDeletingInvoice(invoice)} className='text-rose-600 focus:bg-rose-50 focus:text-rose-700'><Trash2 /> Xóa hóa đơn</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && <div className='py-14 text-center text-sm text-slate-400'>Chưa có hóa đơn nào.</div>}
      </div>

      {formOpen && (
        <InvoiceFormDialog
          key={editingInvoice?.id || 'new-invoice'} rooms={rooms} invoices={invoices} invoice={editingInvoice}
          pending={saveMutation.isPending} error={saveMutation.error instanceof Error ? saveMutation.error.message : undefined}
          onClose={() => { if (!saveMutation.isPending) { setFormOpen(false); setEditingInvoice(undefined); } }}
          onSave={async (input) => { await saveMutation.mutateAsync(input); }}
        />
      )}
      {viewingInvoice && <InvoiceDetailsDialog invoice={viewingInvoice} onClose={() => setViewingInvoice(null)} />}
      <Dialog open={Boolean(deletingInvoice)} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeletingInvoice(null)}>
        <DialogContent className='max-w-md' showCloseButton={!deleteMutation.isPending}>
          <DialogHeader className='pr-10'><DialogTitle>Xóa hóa đơn?</DialogTitle><DialogDescription>Hóa đơn <b className='text-slate-700'>{deletingInvoice?.code}</b> sẽ bị xóa vĩnh viễn và phòng có thể được lập lại hóa đơn cho tháng này.</DialogDescription></DialogHeader>
          {deleteMutation.error && <p className='mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-600'>{deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Không thể xóa hóa đơn.'}</p>}
          <DialogFooter className='mt-6'>
            <button type='button' onClick={() => setDeletingInvoice(null)} disabled={deleteMutation.isPending} className='soft-button px-5'>Hủy</button>
            <button type='button' onClick={() => deletingInvoice && deleteMutation.mutate(deletingInvoice)} disabled={deleteMutation.isPending} className='inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-[11px] font-bold text-white disabled:opacity-50'>
              {deleteMutation.isPending ? <Spinner /> : <Trash2 size={16} />} {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa hóa đơn'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
