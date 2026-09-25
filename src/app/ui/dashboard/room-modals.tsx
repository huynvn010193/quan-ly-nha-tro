'use client';

import { format } from 'date-fns';
import { CalendarDays, Check, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { vi } from 'react-day-picker/locale';
import type { CreateRoomInput, Room, RoomStatus } from '@/backend/rooms/room.types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrencyInput, parseCurrencyInput } from './shared';

function MoveInDateField({ date, onChange, disabled }: { date: Date | undefined; onChange: (date: Date | undefined) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <span className='field-label'>Ngày bắt đầu thuê</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            disabled={disabled}
            className='h-11 w-full justify-start px-3.5 text-left font-normal disabled:bg-slate-50 disabled:text-slate-400'
          >
            <CalendarDays className='size-4 text-slate-400' />
            {disabled ? 'Phòng đang trống' : date ? format(date, 'dd/MM/yyyy') : 'Chọn ngày bắt đầu thuê'}
          </Button>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-auto p-0'>
          <Calendar
            mode='single'
            selected={date}
            onSelect={(nextDate) => {
              onChange(nextDate);
              if (nextDate) setOpen(false);
            }}
            defaultMonth={date || new Date()}
            captionLayout='dropdown'
            startMonth={new Date(2020, 0, 1)}
            endMonth={new Date(new Date().getFullYear() + 5, 11, 31)}
            locale={vi}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DeleteRoomModal({ room, onClose, onDelete }: { room: Room; onClose: () => void; onDelete: (room: Room) => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    try {
      setDeleting(true);
      setError('');
      await onDelete(room);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa phòng.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent className='max-w-md' showCloseButton={!deleting}>
        <div className='flex items-start gap-4'>
          <span className='grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600'>
            <Trash2 size={21} />
          </span>
          <DialogHeader className='min-w-0 flex-1 pr-9'>
            <DialogTitle>Xóa phòng {room.name}?</DialogTitle>
            <DialogDescription className='mt-1 text-sm leading-6 text-slate-500'>
              Phòng và toàn bộ hồ sơ người đang ở trong phòng sẽ bị xóa vĩnh viễn. Thao tác này không thể khôi phục.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className='mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'>
          <div className='flex items-center justify-between gap-4'>
            <span className='text-xs text-slate-400'>Phòng</span>
            <span className='text-sm font-bold text-slate-800'>
              {room.name} · {room.floor}
            </span>
          </div>
          <div className='mt-2 flex items-center justify-between gap-4'>
            <span className='text-xs text-slate-400'>Người bị xóa</span>
            <span className='text-sm font-medium text-rose-600'>{room.people} người</span>
          </div>
          {room.members?.length ? (
            <p className='mt-2 text-right text-[10px] leading-4 text-slate-400'>{room.members.map((member) => member.fullName).join(', ')}</p>
          ) : null}
        </div>
        {error && (
          <p role='alert' className='mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600'>
            {error}
          </p>
        )}
        <DialogFooter className='mt-6'>
          <button onClick={onClose} disabled={deleting} className='soft-button px-5 disabled:opacity-60'>
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={deleting}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-[11px] font-bold text-white shadow-[0_6px_18px_rgba(225,29,72,.18)] transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {deleting ? <Spinner /> : <Trash2 size={16} />}
            {deleting ? 'Đang xóa...' : 'Xóa phòng'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditRoomModal({ room, onClose, onSave }: { room: Room; onClose: () => void; onSave: (room: Room) => Promise<void> }) {
  const hasMembers = Boolean(room.members?.length);
  const [name, setName] = useState(room.name);
  const [tenant, setTenant] = useState(room.status === 'Còn trống' ? '' : room.tenant);
  const [primaryTenantId, setPrimaryTenantId] = useState(room.primaryTenantId || '');
  const [price, setPrice] = useState(formatCurrencyInput(room.price));
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const [moveInDate, setMoveInDate] = useState<Date | undefined>(room.moveInDate ? new Date(room.moveInDate) : new Date());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) return setError('Vui lòng nhập tên phòng.');
    const nextPrice = parseCurrencyInput(price);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) return setError('Giá thuê phải lớn hơn 0.');
    if (status !== 'Còn trống' && hasMembers && !primaryTenantId) return setError('Vui lòng chọn chủ phòng.');
    if (status !== 'Còn trống' && !hasMembers && !tenant.trim()) return setError('Vui lòng nhập tên người thuê.');
    if (status !== 'Còn trống' && !moveInDate) return setError('Vui lòng chọn ngày bắt đầu thuê.');
    const selectedPrimary = room.members?.find((member) => member.tenantId === primaryTenantId);
    try {
      setSaving(true);
      await onSave({
        ...room,
        name: name.trim().toUpperCase(),
        tenant: status === 'Còn trống' ? 'Chưa có người thuê' : selectedPrimary?.fullName || tenant.trim(),
        primaryTenantId: status === 'Còn trống' || !hasMembers ? undefined : primaryTenantId,
        price: nextPrice,
        status,
        people: status === 'Còn trống' ? 0 : Math.max(room.people, 1),
        moveInDate: status === 'Còn trống' ? undefined : moveInDate?.toISOString()
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className='max-w-md' showCloseButton={!saving}>
        <DialogHeader className='pr-9'>
          <div>
            <p className='text-[10px] font-bold uppercase tracking-[.14em] text-emerald-700'>
              {room.name} · {room.floor}
            </p>
            <DialogTitle className='mt-1'>Chỉnh sửa thông tin phòng</DialogTitle>
            <DialogDescription className='mt-1'>Cập nhật thông tin thuê và trạng thái phòng.</DialogDescription>
          </div>
        </DialogHeader>
        <div className='mt-6 space-y-4'>
          <label className='block'>
            <span className='field-label'>Tên phòng</span>
            <Input
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              placeholder='Ví dụ: P.101'
              className='field-input'
            />
          </label>
          <div>
            <span className='field-label'>{hasMembers ? 'Chủ phòng' : 'Người thuê'}</span>
            {hasMembers ? (
              <Select
                value={primaryTenantId}
                disabled={status === 'Còn trống'}
                onValueChange={(value) => {
                  setPrimaryTenantId(value);
                  const selectedMember = room.members?.find((member) => member.tenantId === value);
                  if (selectedMember) {
                    setTenant(selectedMember.fullName);
                    setMoveInDate(new Date(selectedMember.moveInDate));
                  }
                  setError('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn chủ phòng' />
                </SelectTrigger>
                <SelectContent>
                  {room.members?.map((member) => (
                    <SelectItem key={member.tenantId} value={member.tenantId}>
                      {member.fullName} · {member.role === 'PRIMARY_TENANT' ? 'Chủ phòng hiện tại' : 'Thành viên'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={tenant}
                onChange={(event) => {
                  setTenant(event.target.value);
                  setError('');
                }}
                disabled={status === 'Còn trống'}
                placeholder={status === 'Còn trống' ? 'Phòng đang trống' : 'Nhập tên người thuê'}
                className='field-input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'
              />
            )}
            {hasMembers && <p className='mt-1.5 text-[10px] text-slate-400'>Khi đổi chủ phòng, chủ phòng hiện tại sẽ chuyển thành Thành viên.</p>}
          </div>
          <MoveInDateField
            date={moveInDate}
            onChange={(date) => {
              setMoveInDate(date);
              setError('');
            }}
            disabled={status === 'Còn trống'}
          />
          <label className='block'>
            <span className='field-label'>Giá thuê hàng tháng</span>
            <div className='relative'>
              <Input
                type='text'
                inputMode='numeric'
                value={price}
                onChange={(event) => {
                  setPrice(formatCurrencyInput(event.target.value));
                  setError('');
                }}
                className='field-input pr-14'
              />
              <span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400'>VNĐ</span>
            </div>
          </label>
          <label className='block'>
            <span className='field-label'>Trạng thái</span>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as RoomStatus);
                setError('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Chọn trạng thái' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='Đang thuê'>Đang thuê</SelectItem>
                <SelectItem value='Còn trống'>Còn trống</SelectItem>
                <SelectItem value='Sắp trả'>Sắp trả</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {error && (
            <p role='alert' className='rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600'>
              {error}
            </p>
          )}
        </div>
        <DialogFooter className='mt-6'>
          <button onClick={onClose} className='soft-button px-5'>
            Hủy
          </button>
          <button onClick={submit} disabled={saving} className='primary-button px-5 disabled:cursor-not-allowed disabled:opacity-60'>
            {saving ? <Spinner /> : <Check size={16} />}
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddRoomModal({ onClose, onAdd }: { onClose: () => void; onAdd: (room: CreateRoomInput) => Promise<void> }) {
  const [name, setName] = useState('');
  const [primaryTenantName, setPrimaryTenantName] = useState('');
  const [price, setPrice] = useState('3.500.000');
  const [floor, setFloor] = useState('Tầng 1');
  const [status, setStatus] = useState<RoomStatus>('Đang thuê');
  const [moveInDate, setMoveInDate] = useState<Date | undefined>(new Date());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) return setError('Vui lòng nhập tên phòng.');
    const nextPrice = parseCurrencyInput(price);
    if (!nextPrice || nextPrice <= 0) return setError('Giá thuê phải lớn hơn 0.');
    if (status !== 'Còn trống' && !primaryTenantName.trim()) return setError('Vui lòng nhập tên chủ phòng.');
    if (status !== 'Còn trống' && !moveInDate) return setError('Vui lòng chọn ngày bắt đầu thuê.');
    try {
      setSaving(true);
      setError('');
      await onAdd({
        name: name.toUpperCase(),
        floor,
        tenant: status === 'Còn trống' ? 'Chưa có người thuê' : primaryTenantName.trim(),
        price: nextPrice,
        status,
        people: status === 'Còn trống' ? 0 : 1,
        primaryTenantName: status === 'Còn trống' ? undefined : primaryTenantName.trim(),
        moveInDate: status === 'Còn trống' ? undefined : moveInDate?.toISOString()
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể thêm phòng.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className='max-h-[calc(100vh-2rem)] max-w-md overflow-y-auto' showCloseButton={!saving}>
        <DialogHeader className='pr-9'>
          <DialogTitle>Thêm phòng mới</DialogTitle>
          <DialogDescription className='mt-1'>Nhập thông tin cơ bản của phòng.</DialogDescription>
        </DialogHeader>
        <div className='mt-6 space-y-4'>
          <label className='block'>
            <span className='field-label'>Tên phòng</span>
            <Input
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              placeholder='Ví dụ: P.303'
              className='field-input'
            />
          </label>
          <label className='block'>
            <span className='field-label'>Chủ phòng</span>
            <Input
              value={primaryTenantName}
              disabled={status === 'Còn trống'}
              onChange={(event) => {
                setPrimaryTenantName(event.target.value);
                setError('');
              }}
              placeholder={status === 'Còn trống' ? 'Phòng đang trống' : 'Nhập tên chủ phòng'}
              className='field-input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'
            />
            <p className='mt-1.5 text-[10px] leading-4 text-slate-400'>
              Hệ thống sẽ tạo hồ sơ tạm. Bạn có thể bổ sung thông tin tại trang Người thuê.
            </p>
          </label>
          <MoveInDateField
            date={moveInDate}
            onChange={(date) => {
              setMoveInDate(date);
              setError('');
            }}
            disabled={status === 'Còn trống'}
          />
          <label className='block'>
            <span className='field-label'>Giá thuê hàng tháng</span>
            <Input
              type='text'
              inputMode='numeric'
              value={price}
              onChange={(event) => {
                setPrice(formatCurrencyInput(event.target.value));
                setError('');
              }}
              className='field-input'
            />
          </label>
          <label className='block'>
            <span className='field-label'>Tầng</span>
            <Select
              value={floor}
              onValueChange={(value) => {
                setFloor(value);
                setError('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Chọn tầng' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='Tầng 1'>Tầng 1</SelectItem>
                <SelectItem value='Tầng 2'>Tầng 2</SelectItem>
                <SelectItem value='Tầng 3'>Tầng 3</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className='block'>
            <span className='field-label'>Trạng thái</span>
            <Select
              value={status}
              onValueChange={(value) => {
                const nextStatus = value as RoomStatus;
                setStatus(nextStatus);
                if (nextStatus === 'Còn trống') setPrimaryTenantName('');
                setError('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Chọn trạng thái' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='Đang thuê'>Đang thuê</SelectItem>
                <SelectItem value='Còn trống'>Còn trống</SelectItem>
                <SelectItem value='Sắp trả'>Sắp trả</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {error && (
            <p role='alert' className='rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600'>
              {error}
            </p>
          )}
        </div>
        <DialogFooter className='mt-6'>
          <button onClick={onClose} className='soft-button px-5'>
            Hủy
          </button>
          <button onClick={submit} disabled={saving} className='primary-button px-5 disabled:cursor-not-allowed disabled:opacity-60'>
            {saving ? <Spinner /> : <Plus size={16} />}
            {saving ? 'Đang thêm...' : 'Thêm phòng'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
