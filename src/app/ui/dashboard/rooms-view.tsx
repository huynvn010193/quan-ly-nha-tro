'use client';

import { ChevronLeft, ChevronRight, DoorOpen, Pencil, Trash2, UsersRound } from 'lucide-react';
import { useState } from 'react';
import type { Room, RoomStatus } from '@/backend/rooms/room.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteRoomModal, EditRoomModal } from './room-modals';
import { formatMoney, StatusBadge } from './shared';

export function RoomsView({
  rooms,
  query,
  onUpdate,
  onDelete
}: {
  rooms: Room[];
  query: string;
  onUpdate: (room: Room) => Promise<void>;
  onDelete: (room: Room) => Promise<void>;
}) {
  const [status, setStatus] = useState<'Tất cả phòng' | RoomStatus>('Tất cả phòng');
  const [page, setPage] = useState(1);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const pageSize = 5;
  const filtered = rooms.filter(
    (room) =>
      (status === 'Tất cả phòng' || room.status === status) &&
      `${room.name} ${room.tenant} ${room.status}`.toLowerCase().includes(query.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRooms = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <div className='mb-5 flex flex-wrap gap-3'>
        {(['Tất cả phòng', 'Đang thuê', 'Còn trống', 'Sắp trả'] as const).map((label, index) => (
          <button
            key={label}
            onClick={() => {
              setStatus(label);
              setPage(1);
            }}
            className={status === label ? 'filter-chip-active' : 'filter-chip'}
          >
            {label}
            {index > 0 && <span>{rooms.filter((room) => room.status === label).length}</span>}
          </button>
        ))}
      </div>
      <div className='card overflow-hidden'>
        <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6'>
          <div>
            <h2 className='section-title'>Danh sách phòng</h2>
            <p className='section-subtitle'>
              Hiển thị {filtered.length} trong tổng số {rooms.length} phòng
            </p>
          </div>
          <span className='rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500'>{filtered.length} phòng</span>
        </div>
        <Table className='min-w-205 text-left'>
          <TableHeader>
            <TableRow className='border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-[.08em] text-slate-400 hover:bg-slate-50/70'>
              <TableHead className='px-6 py-3.5 font-semibold'>Phòng</TableHead>
              <TableHead className='px-5 py-3.5 font-semibold'>Người thuê</TableHead>
              <TableHead className='px-5 py-3.5 text-center font-semibold'>Số người</TableHead>
              <TableHead className='px-5 py-3.5 font-semibold'>Giá thuê</TableHead>
              <TableHead className='px-5 py-3.5 font-semibold'>Trạng thái</TableHead>
              <TableHead className='w-24 px-5 py-3.5'>
                <span className='sr-only'>Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRooms.map((room) => (
              <TableRow key={room.id} className='group border-b border-slate-100 text-[13px] last:border-0 hover:bg-[#f8fbf9]'>
                <TableCell className='px-6 py-4'>
                  <div className='flex items-center gap-3'>
                    <span className='grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf5ef] text-[#267359]'>
                      <DoorOpen size={18} />
                    </span>
                    <div>
                      <p className='font-bold text-slate-800'>{room.name}</p>
                      <p className='mt-0.5 text-[11px] text-slate-400'>{room.floor}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className='px-5 py-4'>
                  <p className={room.people === 0 ? 'text-slate-400' : 'font-medium text-slate-600'}>{room.tenant}</p>
                  <p className='mt-0.5 text-[10px] text-slate-400'>{room.people === 0 ? 'Sẵn sàng cho thuê' : 'Hợp đồng đang hiệu lực'}</p>
                </TableCell>
                <TableCell className='px-5 py-4 text-center'>
                  <span className='inline-flex items-center gap-1.5 font-semibold text-slate-600'>
                    <UsersRound size={14} />
                    {room.people}
                  </span>
                </TableCell>
                <TableCell className='px-5 py-4'>
                  <p className='font-bold text-emerald-700'>{formatMoney(room.price)}</p>
                  <p className='mt-0.5 text-[10px] text-slate-400'>mỗi tháng</p>
                </TableCell>
                <TableCell className='px-5 py-4'>
                  <StatusBadge status={room.status} />
                </TableCell>
                <TableCell className='px-5 py-4'>
                  <div className='flex items-center gap-1'>
                    <button
                      onClick={() => setEditingRoom(room)}
                      aria-label={`Chỉnh sửa ${room.name}`}
                      title={`Chỉnh sửa ${room.name}`}
                      className='grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-emerald-700 hover:shadow-sm'
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeletingRoom(room)}
                      aria-label={`Xóa ${room.name}`}
                      title={`Xóa ${room.name}`}
                      className='grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600'
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className='border-t border-slate-100 py-16 text-center text-sm text-slate-400'>Không tìm thấy phòng phù hợp.</div>
        )}
        {filtered.length > 0 && (
          <div className='flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6'>
            <p className='text-[11px] text-slate-400'>
              Hiển thị{' '}
              <b className='text-slate-600'>
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)}
              </b>{' '}
              trong {filtered.length} phòng
            </p>
            <div className='flex items-center gap-1.5'>
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className='grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35'
                aria-label='Trang trước'
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`grid size-8 place-items-center rounded-lg text-[11px] font-bold transition ${currentPage === pageNumber ? 'bg-[#187a56] text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage === totalPages}
                className='grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35'
                aria-label='Trang sau'
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
      {editingRoom && <EditRoomModal room={editingRoom} onClose={() => setEditingRoom(null)} onSave={onUpdate} />}
      {deletingRoom && (
        <DeleteRoomModal
          room={deletingRoom}
          onClose={() => setDeletingRoom(null)}
          onDelete={async (room) => {
            await onDelete(room);
            setPage((current) => Math.min(current, Math.max(1, Math.ceil((filtered.length - 1) / pageSize))));
          }}
        />
      )}
    </>
  );
}
