'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarDays, CheckCircle2, Clock3, FilePenLine, FileText, MoreHorizontal, Plus, Trash2, WalletCards } from 'lucide-react';
import { vi } from 'react-day-picker/locale';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as yup from 'yup';
import {
  CONTRACT_STATUSES,
  type Contract,
  type ContractListResult,
  type ContractStatus,
  type CreateContractInput
} from '@/backend/contracts/contract.types';
import { ROOM_STATUS_LABELS, type Room } from '@/backend/rooms/room.types';
import type { Tenant } from '@/backend/tenants/tenant.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyInput, formatMoney, parseCurrencyInput, StatCard } from './shared';

const statusLabels: Record<ContractStatus, string> = {
  PENDING: 'Chờ hiệu lực',
  ACTIVE: 'Đang hiệu lực',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy'
};

const contractSchema = yup.object({
  roomId: yup.string().required('Vui lòng chọn phòng.'),
  ownerTenantId: yup.string().required('Vui lòng chọn chủ phòng.'),
  startDate: yup.string().required('Vui lòng chọn ngày bắt đầu.'),
  endDate: yup
    .string()
    .default('')
    .test('end-after-start', 'Ngày kết thúc không được trước ngày bắt đầu.', function (value) {
      return !value || !this.parent.startDate || new Date(value) >= new Date(this.parent.startDate);
    }),
  rentAmount: yup.number().min(0, 'Tiền thuê không được âm.').required('Vui lòng nhập tiền thuê.'),
  depositAmount: yup.number().min(0, 'Tiền cọc không được âm.').required('Vui lòng nhập tiền cọc.'),
  billingDay: yup
    .number()
    .integer('Ngày đóng tiền phải là số nguyên.')
    .min(1, 'Ngày đóng tiền từ 1 đến 31.')
    .max(31, 'Ngày đóng tiền từ 1 đến 31.')
    .required('Vui lòng nhập ngày đóng tiền.'),
  status: yup
    .mixed<ContractStatus>()
    .oneOf([...CONTRACT_STATUSES])
    .required('Vui lòng chọn trạng thái.'),
  note: yup.string().trim().default('')
});

type ContractFormValues = yup.InferType<typeof contractSchema>;

function formatDate(value?: string | null) {
  if (!value) return 'Không thời hạn';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function statusBadge(status: ContractStatus) {
  const variant = status === 'ACTIVE' ? 'success' : status === 'PENDING' ? 'warning' : status === 'CANCELLED' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{statusLabels[status]}</Badge>;
}

function initialValues(contract: Contract | undefined, initialRoomId: string | undefined, rooms: Room[], tenants: Tenant[]): ContractFormValues {
  const roomId = contract?.roomId || initialRoomId || '';
  const room = rooms.find((item) => item.id === roomId);
  const owner = tenants.find((tenant) => tenant.activeRoom?.roomId === roomId && tenant.activeRoom.role === 'PRIMARY_TENANT');
  return {
    roomId,
    ownerTenantId: contract?.ownerTenantId || owner?.id || '',
    startDate: contract?.startDate.slice(0, 10) || new Date().toISOString().slice(0, 10),
    endDate: contract?.endDate?.slice(0, 10) || '',
    rentAmount: contract?.rentAmount || room?.price || 0,
    depositAmount: contract?.depositAmount || 0,
    billingDay: contract?.billingDay || 5,
    status: contract?.status || 'PENDING',
    note: contract?.note || ''
  };
}

function FormError({ message }: { message?: string }) {
  return message ? <p className='mt-1.5 text-[10px] font-semibold text-rose-500'>{message}</p> : null;
}

function parseFormDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function ContractDatePicker({
  value,
  placeholder,
  allowClear,
  onChange
}: {
  value?: string;
  placeholder: string;
  allowClear?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseFormDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type='button' variant='outline' className='h-11 w-full justify-between px-3.5 text-left font-normal'>
          <span className={selected ? 'text-slate-700' : 'text-slate-400'}>{selected ? format(selected, 'dd/MM/yyyy') : placeholder}</span>
          <CalendarDays className='size-4 text-slate-400' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-auto p-0'>
        <Calendar
          mode='single'
          selected={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, 'yyyy-MM-dd'));
            setOpen(false);
          }}
          defaultMonth={selected || new Date()}
          captionLayout='dropdown'
          startMonth={new Date(2020, 0, 1)}
          endMonth={new Date(new Date().getFullYear() + 10, 11, 31)}
          locale={vi}
        />
        {allowClear && selected && (
          <div className='border-t border-slate-100 p-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700'
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Xóa ngày đã chọn
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ContractFormDialog({
  contract,
  rooms,
  tenants,
  pending,
  error,
  initialRoomId,
  onClose,
  onSave
}: {
  contract?: Contract;
  rooms: Room[];
  tenants: Tenant[];
  pending: boolean;
  error?: string;
  initialRoomId?: string;
  onClose: () => void;
  onSave: (values: ContractFormValues) => Promise<void>;
}) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<ContractFormValues>({
    resolver: yupResolver(contractSchema),
    defaultValues: initialValues(contract, initialRoomId, rooms, tenants),
    mode: 'onBlur'
  });
  const roomId = useWatch({ control, name: 'roomId' });
  const ownerOptions = tenants.filter(
    (tenant) => tenant.id === contract?.ownerTenantId || (tenant.activeRoom?.roomId === roomId && tenant.activeRoom.role === 'PRIMARY_TENANT')
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto' showCloseButton={!pending}>
        <DialogHeader className='pr-10'>
          <DialogTitle>{contract ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới'}</DialogTitle>
          <DialogDescription>Liên kết hợp đồng với phòng và người đại diện hiện tại.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className='mt-5 space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <label className='field-label'>Phòng *</label>
              <Controller
                control={control}
                name='roomId'
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const room = rooms.find((item) => item.id === value);
                      const owner = tenants.find((tenant) => tenant.activeRoom?.roomId === value && tenant.activeRoom.role === 'PRIMARY_TENANT');
                      setValue('ownerTenantId', owner?.id || '', { shouldValidate: true });
                      if (!contract && room) setValue('rentAmount', room.price, { shouldValidate: true });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Chọn phòng' />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id} disabled={room.status === 'MAINTENANCE'}>
                          {room.name} · {room.floor} · {ROOM_STATUS_LABELS[room.status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormError message={errors.roomId?.message} />
            </div>
            <div>
              <label className='field-label'>Chủ phòng *</label>
              <Controller
                control={control}
                name='ownerTenantId'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!roomId || ownerOptions.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={roomId ? 'Chọn chủ phòng' : 'Chọn phòng trước'} />
                    </SelectTrigger>
                    <SelectContent>
                      {ownerOptions.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormError message={errors.ownerTenantId?.message} />
              {roomId && ownerOptions.length === 0 && <p className='mt-1.5 text-[10px] text-amber-600'>Phòng chưa có Chủ phòng.</p>}
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <label className='field-label'>Ngày bắt đầu thuê *</label>
              <Controller
                control={control}
                name='startDate'
                render={({ field }) => <ContractDatePicker value={field.value} placeholder='dd/mm/yyyy' onChange={field.onChange} />}
              />
              <FormError message={errors.startDate?.message} />
            </div>
            <div>
              <label className='field-label'>Ngày kết thúc</label>
              <Controller
                control={control}
                name='endDate'
                render={({ field }) => (
                  <ContractDatePicker value={field.value} placeholder='dd/mm/yyyy' allowClear onChange={field.onChange} />
                )}
              />
              <FormError message={errors.endDate?.message} />
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <label className='field-label'>Tiền phòng / tháng *</label>
              <Controller
                control={control}
                name='rentAmount'
                render={({ field }) => (
                  <div className='relative'>
                    <Input
                      value={formatCurrencyInput(field.value)}
                      onChange={(event) => field.onChange(parseCurrencyInput(event.target.value))}
                      className='pr-14'
                    />
                    <span className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400'>
                      VNĐ
                    </span>
                  </div>
                )}
              />
              <FormError message={errors.rentAmount?.message} />
            </div>
            <div>
              <label className='field-label'>Tiền cọc *</label>
              <Controller
                control={control}
                name='depositAmount'
                render={({ field }) => (
                  <div className='relative'>
                    <Input
                      value={formatCurrencyInput(field.value)}
                      onChange={(event) => field.onChange(parseCurrencyInput(event.target.value))}
                      className='pr-14'
                    />
                    <span className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400'>
                      VNĐ
                    </span>
                  </div>
                )}
              />
              <FormError message={errors.depositAmount?.message} />
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <label className='field-label'>Ngày đóng tiền hàng tháng *</label>
              <Input type='number' min={1} max={31} {...register('billingDay', { valueAsNumber: true })} />
              <FormError message={errors.billingDay?.message} />
            </div>
            <div>
              <label className='field-label'>Trạng thái *</label>
              <Controller
                control={control}
                name='status'
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormError message={errors.status?.message} />
            </div>
          </div>

          <div>
            <label className='field-label'>Ghi chú</label>
            <Textarea placeholder='Nhập ghi chú hợp đồng (không bắt buộc)' {...register('note')} />
            <FormError message={errors.note?.message} />
          </div>

          {error && (
            <p role='alert' className='rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600'>
              {error}
            </p>
          )}
          <DialogFooter className='pt-2'>
            <button type='button' onClick={onClose} disabled={pending} className='soft-button px-5 disabled:opacity-60'>
              Hủy
            </button>
            <button type='submit' disabled={pending} className='primary-button disabled:opacity-60'>
              {pending ? <Spinner /> : <CheckCircle2 size={16} />}
              {pending ? 'Đang lưu...' : contract ? 'Lưu thay đổi' : 'Thêm hợp đồng'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Không thể xử lý hợp đồng.');
  return payload;
}

export function ContractsView({
  rooms,
  tenants,
  query,
  initialRoomId
}: {
  rooms: Room[];
  tenants: Tenant[];
  query: string;
  initialRoomId?: string;
}) {
  const queryClient = useQueryClient();
  const initialRoomHandled = useRef(false);
  const [requestedRoomId, setRequestedRoomId] = useState(initialRoomId);
  const [status, setStatus] = useState<'ALL' | ContractStatus>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);
  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: () => request<ContractListResult>('/api/contracts?limit=100', { cache: 'no-store' })
  });
  const saveMutation = useMutation({
    mutationFn: async (values: ContractFormValues) => {
      const payload: CreateContractInput = { ...values, endDate: values.endDate || null, note: values.note || undefined };
      return request<{ data: Contract }>(editingContract ? `/api/contracts/${editingContract.id}` : '/api/contracts', {
        method: editingContract ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['rooms'] }),
        queryClient.invalidateQueries({ queryKey: ['tenants'] })
      ]);
      setFormOpen(false);
      setEditingContract(undefined);
      setRequestedRoomId(undefined);
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (contract: Contract) => request<void>(`/api/contracts/${contract.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['rooms'] })
      ]);
      setDeletingContract(null);
    }
  });
  const contracts = useMemo(() => contractsQuery.data?.data || [], [contractsQuery.data?.data]);
  useEffect(() => {
    if (!requestedRoomId || !contractsQuery.isSuccess || initialRoomHandled.current) return;
    const currentContract = contracts.find(
      (contract) => contract.roomId === requestedRoomId && (contract.status === 'PENDING' || contract.status === 'ACTIVE')
    );
    setEditingContract(currentContract);
    setFormOpen(true);
    initialRoomHandled.current = true;
  }, [contracts, contractsQuery.isSuccess, requestedRoomId]);
  const search = query.trim().toLowerCase();
  const filtered = contracts.filter(
    (contract) =>
      (status === 'ALL' || contract.status === status) &&
      (!search || `${contract.roomName} ${contract.ownerTenantName} ${contract.ownerPhone || ''}`.toLowerCase().includes(search))
  );

  if (contractsQuery.isLoading) {
    return (
      <div className='card grid min-h-64 place-items-center'>
        <Spinner className='size-6 text-emerald-700' />
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard icon={FileText} label='Tổng hợp đồng' value={`${contracts.length}`} note='Tất cả hợp đồng' tone='blue' />
        <StatCard
          icon={CheckCircle2}
          label='Đang hiệu lực'
          value={`${contracts.filter((item) => item.status === 'ACTIVE').length}`}
          note='Hợp đồng hiện tại'
          tone='green'
        />
        <StatCard
          icon={Clock3}
          label='Chờ hiệu lực'
          value={`${contracts.filter((item) => item.status === 'PENDING').length}`}
          note='Sắp bắt đầu'
          tone='orange'
        />
        <StatCard
          icon={WalletCards}
          label='Tổng tiền cọc'
          value={formatMoney(contracts.filter((item) => item.status === 'ACTIVE').reduce((sum, item) => sum + item.depositAmount, 0))}
          note='Hợp đồng hiệu lực'
          tone='purple'
        />
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap gap-2'>
          {(['ALL', ...CONTRACT_STATUSES] as const).map((item) => (
            <button key={item} type='button' onClick={() => setStatus(item)} className={status === item ? 'filter-chip-active' : 'filter-chip'}>
              {item === 'ALL' ? 'Tất cả' : statusLabels[item]}
              <span>{item === 'ALL' ? contracts.length : contracts.filter((contract) => contract.status === item).length}</span>
            </button>
          ))}
        </div>
        <button
          type='button'
          onClick={() => {
            saveMutation.reset();
            setEditingContract(undefined);
            setRequestedRoomId(undefined);
            setFormOpen(true);
          }}
          className='primary-button'
        >
          <Plus size={16} /> Thêm hợp đồng
        </button>
      </div>

      {contractsQuery.error && (
        <div className='rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-600'>
          {contractsQuery.error instanceof Error ? contractsQuery.error.message : 'Không thể tải hợp đồng.'}
        </div>
      )}

      <div className='card overflow-hidden'>
        <Table className='min-w-245 text-left'>
          <TableHeader>
            <TableRow className='border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-[.08em] text-slate-400 hover:bg-slate-50/70'>
              <TableHead className='px-6 py-3.5'>Phòng & chủ phòng</TableHead>
              <TableHead className='px-5 py-3.5'>Thời hạn</TableHead>
              <TableHead className='px-5 py-3.5'>Tiền thuê</TableHead>
              <TableHead className='px-5 py-3.5'>Tiền cọc</TableHead>
              <TableHead className='px-5 py-3.5 text-center'>Ngày đóng tiền</TableHead>
              <TableHead className='px-5 py-3.5'>Trạng thái</TableHead>
              <TableHead className='w-16 px-5 py-3.5'>
                <span className='sr-only'>Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contract) => (
              <TableRow key={contract.id} className='border-b border-slate-50 text-sm last:border-0 hover:bg-slate-50/70'>
                <TableCell className='px-6 py-4'>
                  <p className='font-bold text-slate-800'>{contract.roomName}</p>
                  <p className='mt-0.5 text-[11px] text-slate-400'>
                    {contract.ownerTenantName} · {contract.floor}
                  </p>
                </TableCell>
                <TableCell className='px-5 py-4 text-slate-500'>
                  <p className='font-medium text-slate-600'>{formatDate(contract.startDate)}</p>
                  <p className='mt-0.5 text-[10px] text-slate-400'>đến {formatDate(contract.endDate)}</p>
                </TableCell>
                <TableCell className='px-5 py-4 font-bold text-emerald-700'>{formatMoney(contract.rentAmount)}</TableCell>
                <TableCell className='px-5 py-4 font-semibold text-slate-600'>{formatMoney(contract.depositAmount)}</TableCell>
                <TableCell className='px-5 py-4 text-center font-semibold text-slate-600'>Ngày {contract.billingDay}</TableCell>
                <TableCell className='px-5 py-4'>{statusBadge(contract.status)}</TableCell>
                <TableCell className='px-5 py-4'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type='button'
                        aria-label={`Thao tác hợp đồng ${contract.roomName}`}
                        className='grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-emerald-700 hover:shadow-sm'
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onSelect={() => {
                          saveMutation.reset();
                          setEditingContract(contract);
                          setFormOpen(true);
                        }}
                      >
                        <FilePenLine /> Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => {
                          deleteMutation.reset();
                          setDeletingContract(contract);
                        }}
                        className='text-rose-600 focus:bg-rose-50 focus:text-rose-700'
                      >
                        <Trash2 /> Xóa hợp đồng
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && <div className='border-t border-slate-100 py-14 text-center text-sm text-slate-400'>Chưa có hợp đồng phù hợp.</div>}
      </div>

      {formOpen && (
        <ContractFormDialog
          key={editingContract?.id || 'new-contract'}
          contract={editingContract}
          initialRoomId={editingContract ? undefined : requestedRoomId}
          rooms={rooms}
          tenants={tenants}
          pending={saveMutation.isPending}
          error={saveMutation.error instanceof Error ? saveMutation.error.message : undefined}
          onClose={() => {
            if (!saveMutation.isPending) {
              setFormOpen(false);
              setEditingContract(undefined);
              setRequestedRoomId(undefined);
            }
          }}
          onSave={async (values) => {
            await saveMutation.mutateAsync(values);
          }}
        />
      )}

      <Dialog open={Boolean(deletingContract)} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeletingContract(null)}>
        <DialogContent className='max-w-md' showCloseButton={!deleteMutation.isPending}>
          <DialogHeader className='pr-10'>
            <DialogTitle>Xóa hợp đồng?</DialogTitle>
            <DialogDescription>
              Hợp đồng của <b className='text-slate-700'>{deletingContract?.roomName}</b> sẽ bị xóa vĩnh viễn. Thao tác này không thể khôi phục.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.error && (
            <p className='mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs text-rose-600'>
              {deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Không thể xóa hợp đồng.'}
            </p>
          )}
          <DialogFooter className='mt-6'>
            <button type='button' onClick={() => setDeletingContract(null)} disabled={deleteMutation.isPending} className='soft-button px-5'>
              Hủy
            </button>
            <button
              type='button'
              onClick={() => deletingContract && deleteMutation.mutate(deletingContract)}
              disabled={deleteMutation.isPending}
              className='inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-[11px] font-bold text-white disabled:opacity-60'
            >
              {deleteMutation.isPending ? <Spinner /> : <Trash2 size={16} />} {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa hợp đồng'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
