'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  DoorOpen,
  Droplets,
  FileText,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  UserPlus,
  UsersRound,
  WalletCards,
  Wrench,
  Zap,
  type LucideIcon
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { CreateRoomInput, Room, RoomListResult, RoomStatus } from '@/backend/rooms/room.types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { TenantCreateForm } from './tenant-create-form';

type View = 'overview' | 'rooms' | 'tenants' | 'tenant-create' | 'invoices' | 'finance' | 'maintenance';

const roomsQueryKey = ['rooms'] as const;

const tenants = [
  { name: 'Nguyễn Minh Anh', room: 'P.101', phone: '090 812 3456', since: '12/04/2024', initials: 'MA', color: 'bg-[#d9f2e5] text-[#14734a]' },
  { name: 'Trần Quốc Huy', room: 'P.102', phone: '093 546 7890', since: '05/06/2024', initials: 'QH', color: 'bg-[#e4e9ff] text-[#5366b8]' },
  { name: 'Lê Thảo My', room: 'P.201', phone: '098 234 5678', since: '21/09/2023', initials: 'TM', color: 'bg-[#fff0d6] text-[#b56b13]' },
  { name: 'Phạm Gia Bảo', room: 'P.202', phone: '091 678 4321', since: '08/01/2025', initials: 'GB', color: 'bg-[#f8e3e5] text-[#ad4e57]' },
  { name: 'Vũ Khánh Linh', room: 'P.203', phone: '097 345 6123', since: '14/02/2024', initials: 'KL', color: 'bg-[#e2f0f8] text-[#347b9f]' }
];

const invoices = [
  { id: 'HD-0925-01', room: 'P.101', tenant: 'Nguyễn Minh Anh', amount: 4120000, date: '05/09/2025', status: 'Đã thanh toán' },
  { id: 'HD-0925-02', room: 'P.102', tenant: 'Trần Quốc Huy', amount: 3780000, date: '05/09/2025', status: 'Chờ thanh toán' },
  { id: 'HD-0925-03', room: 'P.201', tenant: 'Lê Thảo My', amount: 4450000, date: '04/09/2025', status: 'Đã thanh toán' },
  { id: 'HD-0925-04', room: 'P.202', tenant: 'Phạm Gia Bảo', amount: 4030000, date: '03/09/2025', status: 'Quá hạn' },
  { id: 'HD-0925-05', room: 'P.203', tenant: 'Vũ Khánh Linh', amount: 4260000, date: '02/09/2025', status: 'Đã thanh toán' }
];

const navItems: { id: View; label: string; icon: LucideIcon; href: string }[] = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, href: '/' },
  { id: 'rooms', label: 'Quản lý phòng', icon: DoorOpen, href: '/manager-room' },
  { id: 'tenants', label: 'Người thuê', icon: UsersRound, href: '/manager-tenant' },
  { id: 'invoices', label: 'Hóa đơn', icon: FileText, href: '/manager-invoice' },
  { id: 'finance', label: 'Thu & chi', icon: WalletCards, href: '/manager-finance' },
  { id: 'maintenance', label: 'Sự cố & sửa chữa', icon: Wrench, href: '/manager-maintenance' }
];

const viewTitles: Record<View, { title: string; subtitle: string }> = {
  overview: { title: 'Chào buổi sáng, Tam Ke!', subtitle: 'Đây là tình hình nhà trọ của bạn hôm nay.' },
  rooms: { title: 'Quản lý phòng', subtitle: 'Theo dõi trạng thái và thông tin từng phòng.' },
  tenants: { title: 'Người thuê', subtitle: 'Quản lý hồ sơ và hợp đồng người thuê.' },
  'tenant-create': { title: 'Thêm người thuê', subtitle: 'Nhập thông tin nhân khẩu và phân người thuê vào phòng.' },
  invoices: { title: 'Hóa đơn', subtitle: 'Kiểm tra và theo dõi thanh toán hàng tháng.' },
  finance: { title: 'Thu & chi', subtitle: 'Nắm rõ dòng tiền và hiệu quả vận hành.' },
  maintenance: { title: 'Sự cố & sửa chữa', subtitle: 'Tiếp nhận và xử lý yêu cầu của người thuê.' }
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
}

function formatCurrencyInput(value: string | number) {
  const digits = String(value).replace(/\D/g, '');
  return digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Không thể kết nối đến máy chủ.');
  return payload;
}

function StatusBadge({ status }: { status: RoomStatus | string }) {
  const styles =
    status === 'Đang thuê' || status === 'Đã thanh toán' || status === 'Đã xử lý' || status === 'Đang hiệu lực'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : status === 'Còn trống' || status === 'Chờ thanh toán' || status === 'Đang xử lý'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-rose-50 text-rose-700 border-rose-100';
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles}`}>{status}</span>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  tone: 'green' | 'blue' | 'orange' | 'purple';
}) {
  const tones = {
    green: 'bg-[#dff4e8] text-[#167451]',
    blue: 'bg-[#e6edff] text-[#506cc8]',
    orange: 'bg-[#fff0d9] text-[#c47718]',
    purple: 'bg-[#f0e9ff] text-[#7858bd]'
  };
  return (
    <article className='card flex items-start justify-between gap-3 p-5'>
      <div>
        <p className='text-[13px] font-medium text-slate-500'>{label}</p>
        <p className='mt-2 text-[27px] font-bold tracking-[-0.04em] text-slate-900'>{value}</p>
        <p className='mt-1 flex items-center gap-1 text-[11px] text-slate-400'>
          <TrendingUp size={12} className='text-emerald-600' />
          {note}
        </p>
      </div>
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
        <Icon size={20} strokeWidth={2} />
      </span>
    </article>
  );
}

function RevenueChart() {
  const data = [24, 34, 29, 42, 51, 45, 58, 54, 69, 62, 76, 72];
  const points = data.map((value, index) => `${index * (100 / 11)},${80 - value}`).join(' ');
  return (
    <div className='mt-5 h-[188px] w-full'>
      <svg
        viewBox='-4 0 108 88'
        preserveAspectRatio='none'
        className='h-full w-full overflow-visible'
        role='img'
        aria-label='Biểu đồ doanh thu 12 tháng'
      >
        {[12, 32, 52, 72].map((y) => (
          <line key={y} x1='0' x2='100' y1={y} y2={y} stroke='#e8ece9' strokeDasharray='2 3' strokeWidth='0.45' />
        ))}
        <defs>
          <linearGradient id='revenue-fill' x1='0' x2='0' y1='0' y2='1'>
            <stop offset='0%' stopColor='#209566' stopOpacity='.2' />
            <stop offset='100%' stopColor='#209566' stopOpacity='0' />
          </linearGradient>
        </defs>
        <polygon points={`0,80 ${points} 100,80`} fill='url(#revenue-fill)' />
        <polyline
          points={points}
          fill='none'
          stroke='#16845a'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
          vectorEffect='non-scaling-stroke'
        />
        {data.map(
          (value, index) =>
            index % 2 === 1 && <circle key={index} cx={index * (100 / 11)} cy={80 - value} r='1.2' fill='white' stroke='#16845a' strokeWidth='.7' />
        )}
      </svg>
      <div className='-mt-1 flex justify-between px-1 text-[10px] font-medium text-slate-400'>
        {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'].map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

function Overview({ rooms }: { rooms: Room[] }) {
  return (
    <>
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard icon={Building2} label='Tổng số phòng' value={`${rooms.length}`} note='2 phòng mới tháng này' tone='green' />
        <StatCard
          icon={UsersRound}
          label='Phòng đang thuê'
          value={`${rooms.filter((room) => room.status !== 'Còn trống').length}`}
          note='Tỷ lệ lấp đầy 75%'
          tone='blue'
        />
        <StatCard
          icon={DoorOpen}
          label='Phòng còn trống'
          value={`${rooms.filter((room) => room.status === 'Còn trống').length}`}
          note='Sẵn sàng cho thuê'
          tone='orange'
        />
        <StatCard icon={CircleDollarSign} label='Doanh thu tháng' value='32,8tr' note='+8,4% so với tháng trước' tone='purple' />
      </section>
      <section className='mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.85fr]'>
        <article className='card p-5 sm:p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='section-title'>Doanh thu</h2>
              <p className='section-subtitle'>Tổng quan dòng tiền năm 2025</p>
            </div>
            <button className='soft-button'>
              Năm 2025 <ChevronDown size={14} />
            </button>
          </div>
          <div className='mt-5 flex items-end gap-6'>
            <div>
              <p className='text-[12px] text-slate-400'>Tổng doanh thu</p>
              <p className='mt-1 text-2xl font-bold tracking-tight text-slate-900'>386,4 triệu</p>
            </div>
            <p className='mb-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700'>+12.5%</p>
          </div>
          <RevenueChart />
        </article>
        <article className='card p-5 sm:p-6'>
          <div>
            <h2 className='section-title'>Tỷ lệ lấp đầy</h2>
            <p className='section-subtitle'>Cập nhật tháng 09/2025</p>
          </div>
          <div className='flex h-[185px] items-center justify-center'>
            <div className='relative grid size-36 place-items-center rounded-full bg-[conic-gradient(#17875c_0_75%,#e9eee9_75%_100%)]'>
              <div className='grid size-[106px] place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_#f1f3f1]'>
                <div>
                  <p className='text-3xl font-bold tracking-tight text-slate-900'>75%</p>
                  <p className='text-[11px] text-slate-400'>đã lấp đầy</p>
                </div>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center'>
            <div>
              <p className='text-lg font-bold text-slate-800'>6</p>
              <p className='text-[10px] text-slate-400'>Đang thuê</p>
            </div>
            <div>
              <p className='text-lg font-bold text-amber-600'>2</p>
              <p className='text-[10px] text-slate-400'>Còn trống</p>
            </div>
            <div>
              <p className='text-lg font-bold text-rose-500'>1</p>
              <p className='text-[10px] text-slate-400'>Sắp trả</p>
            </div>
          </div>
        </article>
      </section>
      <section className='mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.85fr]'>
        <article className='card overflow-hidden'>
          <div className='flex items-center justify-between px-5 py-5 sm:px-6'>
            <div>
              <h2 className='section-title'>Tình trạng phòng</h2>
              <p className='section-subtitle'>Thông tin cập nhật gần nhất</p>
            </div>
            <button className='text-[12px] font-semibold text-emerald-700 hover:text-emerald-800'>Xem tất cả</button>
          </div>
          <RoomTable rooms={rooms.slice(0, 5)} />
        </article>
        <Activity />
      </section>
    </>
  );
}

function RoomTable({ rooms }: { rooms: Room[] }) {
  return (
    <div className='overflow-x-auto'>
      <table className='min-w-[650px] w-full text-left'>
        <thead>
          <tr className='border-y border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-[.08em] text-slate-400'>
            <th className='px-6 py-3 font-semibold'>Phòng</th>
            <th className='px-4 py-3 font-semibold'>Người thuê</th>
            <th className='px-4 py-3 font-semibold'>Giá thuê</th>
            <th className='px-4 py-3 font-semibold'>Trạng thái</th>
            <th className='px-5 py-3' />
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className='border-b border-slate-50 text-[12px] last:border-0 hover:bg-slate-50/60'>
              <td className='px-6 py-3.5'>
                <p className='font-bold text-slate-800'>{room.name}</p>
                <p className='mt-0.5 text-[10px] text-slate-400'>{room.floor}</p>
              </td>
              <td className='px-4 py-3.5 text-slate-600'>{room.tenant}</td>
              <td className='px-4 py-3.5 font-semibold text-slate-700'>{formatMoney(room.price)}</td>
              <td className='px-4 py-3.5'>
                <StatusBadge status={room.status} />
              </td>
              <td className='px-5 py-3.5'>
                <button aria-label={`Tùy chọn ${room.name}`} className='text-slate-400 hover:text-slate-700'>
                  <MoreHorizontal size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Activity() {
  const items = [
    {
      icon: CreditCard,
      text: (
        <>
          <b>P.101</b> đã thanh toán hóa đơn
        </>
      ),
      meta: '2 giờ trước · 4.120.000đ',
      color: 'bg-emerald-50 text-emerald-700'
    },
    {
      icon: UserRound,
      text: (
        <>
          <b>Trần Quốc Huy</b> gia hạn hợp đồng
        </>
      ),
      meta: 'Hôm qua · P.102',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      icon: Wrench,
      text: (
        <>
          Yêu cầu sửa vòi nước <b>P.203</b>
        </>
      ),
      meta: '2 ngày trước · Đang xử lý',
      color: 'bg-amber-50 text-amber-700'
    },
    {
      icon: DoorOpen,
      text: (
        <>
          <b>P.301</b> được chuyển sang còn trống
        </>
      ),
      meta: '4 ngày trước',
      color: 'bg-purple-50 text-purple-600'
    }
  ];
  return (
    <article className='card p-5 sm:p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='section-title'>Hoạt động gần đây</h2>
          <p className='section-subtitle'>7 ngày qua</p>
        </div>
        <button className='text-[12px] font-semibold text-emerald-700'>Xem tất cả</button>
      </div>
      <div className='mt-5 space-y-5'>
        {items.map((item, index) => (
          <div key={index} className='flex gap-3'>
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.color}`}>
              <item.icon size={16} />
            </span>
            <div className='min-w-0'>
              <p className='text-[12px] leading-5 text-slate-600'>{item.text}</p>
              <p className='mt-0.5 text-[10px] text-slate-400'>{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function RoomsView({
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
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[820px] text-left'>
            <thead>
              <tr className='border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-[.08em] text-slate-400'>
                <th className='px-6 py-3.5 font-semibold'>Phòng</th>
                <th className='px-5 py-3.5 font-semibold'>Người thuê</th>
                <th className='px-5 py-3.5 text-center font-semibold'>Số người</th>
                <th className='px-5 py-3.5 font-semibold'>Giá thuê</th>
                <th className='px-5 py-3.5 font-semibold'>Trạng thái</th>
                <th className='w-24 px-5 py-3.5'>
                  <span className='sr-only'>Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedRooms.map((room) => (
                <tr key={room.id} className='group border-b border-slate-100 text-[13px] last:border-0 hover:bg-[#f8fbf9]'>
                  <td className='px-6 py-4'>
                    <div className='flex items-center gap-3'>
                      <span className='grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf5ef] text-[#267359]'>
                        <DoorOpen size={18} />
                      </span>
                      <div>
                        <p className='font-bold text-slate-800'>{room.name}</p>
                        <p className='mt-0.5 text-[11px] text-slate-400'>{room.floor}</p>
                      </div>
                    </div>
                  </td>
                  <td className='px-5 py-4'>
                    <p className={room.people === 0 ? 'text-slate-400' : 'font-medium text-slate-600'}>{room.tenant}</p>
                    <p className='mt-0.5 text-[10px] text-slate-400'>{room.people === 0 ? 'Sẵn sàng cho thuê' : 'Hợp đồng đang hiệu lực'}</p>
                  </td>
                  <td className='px-5 py-4 text-center'>
                    <span className='inline-flex items-center gap-1.5 font-semibold text-slate-600'>
                      <UsersRound size={14} />
                      {room.people}
                    </span>
                  </td>
                  <td className='px-5 py-4'>
                    <p className='font-bold text-emerald-700'>{formatMoney(room.price)}</p>
                    <p className='mt-0.5 text-[10px] text-slate-400'>mỗi tháng</p>
                  </td>
                  <td className='px-5 py-4'>
                    <StatusBadge status={room.status} />
                  </td>
                  <td className='px-5 py-4'>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function TenantsView({ query }: { query: string }) {
  const filtered = tenants.filter((tenant) => `${tenant.name} ${tenant.room} ${tenant.phone}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className='card overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='min-w-[720px] w-full text-left'>
          <thead>
            <tr className='border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400'>
              <th className='px-6 py-4'>Người thuê</th>
              <th className='px-5 py-4'>Phòng</th>
              <th className='px-5 py-4'>Số điện thoại</th>
              <th className='px-5 py-4'>Ngày vào ở</th>
              <th className='px-5 py-4'>Hợp đồng</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((tenant) => (
              <tr key={tenant.name} className='border-b border-slate-50 text-sm last:border-0 hover:bg-slate-50/70'>
                <td className='px-6 py-4'>
                  <div className='flex items-center gap-3'>
                    <span className={`grid size-9 place-items-center rounded-full text-xs font-bold ${tenant.color}`}>{tenant.initials}</span>
                    <span className='font-semibold text-slate-800'>{tenant.name}</span>
                  </div>
                </td>
                <td className='px-5 py-4 font-semibold text-slate-600'>{tenant.room}</td>
                <td className='px-5 py-4 text-slate-500'>{tenant.phone}</td>
                <td className='px-5 py-4 text-slate-500'>{tenant.since}</td>
                <td className='px-5 py-4'>
                  <StatusBadge status='Đang hiệu lực' />
                </td>
                <td className='px-5'>
                  <button aria-label='Tùy chọn'>
                    <MoreHorizontal size={18} className='text-slate-400' />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoicesView({ query }: { query: string }) {
  const filtered = invoices.filter((invoice) => `${invoice.id} ${invoice.room} ${invoice.tenant}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-3'>
        <StatCard icon={FileText} label='Tổng hóa đơn' value='8' note='Tháng 09/2025' tone='blue' />
        <StatCard icon={Check} label='Đã thanh toán' value='24,8tr' note='6 hóa đơn' tone='green' />
        <StatCard icon={CalendarDays} label='Chờ thu' value='8,1tr' note='2 hóa đơn' tone='orange' />
      </div>
      <div className='card overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='min-w-[760px] w-full text-left'>
            <thead>
              <tr className='border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400'>
                <th className='px-6 py-4'>Mã hóa đơn</th>
                <th className='px-5 py-4'>Phòng & người thuê</th>
                <th className='px-5 py-4'>Ngày tạo</th>
                <th className='px-5 py-4'>Số tiền</th>
                <th className='px-5 py-4'>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id} className='border-b border-slate-50 text-sm last:border-0 hover:bg-slate-50/70'>
                  <td className='px-6 py-4 font-semibold text-slate-700'>{invoice.id}</td>
                  <td className='px-5 py-4'>
                    <p className='font-semibold text-slate-800'>{invoice.room}</p>
                    <p className='mt-0.5 text-xs text-slate-400'>{invoice.tenant}</p>
                  </td>
                  <td className='px-5 py-4 text-slate-500'>{invoice.date}</td>
                  <td className='px-5 py-4 font-bold text-slate-700'>{formatMoney(invoice.amount)}</td>
                  <td className='px-5 py-4'>
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className='px-5'>
                    <button aria-label='Tùy chọn'>
                      <MoreHorizontal size={18} className='text-slate-400' />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FinanceView() {
  const transactions = [
    { text: 'Thu tiền phòng tháng 09', room: 'P.101', amount: '+4.120.000đ', type: 'Thu', date: '05/09/2025' },
    { text: 'Sửa máy bơm nước', room: 'Khu nhà A', amount: '-1.250.000đ', type: 'Chi', date: '04/09/2025' },
    { text: 'Thu tiền phòng tháng 09', room: 'P.201', amount: '+4.450.000đ', type: 'Thu', date: '04/09/2025' },
    { text: 'Internet FPT tháng 09', room: 'Toàn khu', amount: '-850.000đ', type: 'Chi', date: '01/09/2025' }
  ];
  return (
    <div className='space-y-5'>
      <div className='grid gap-4 sm:grid-cols-3'>
        <StatCard icon={TrendingUp} label='Tổng thu tháng' value='32,8tr' note='+8,4% tháng trước' tone='green' />
        <StatCard icon={TrendingDown} label='Tổng chi tháng' value='4,6tr' note='-2,1% tháng trước' tone='orange' />
        <StatCard icon={WalletCards} label='Lợi nhuận' value='28,2tr' note='Biên lợi nhuận 86%' tone='purple' />
      </div>
      <div className='card p-6'>
        <div className='mb-5'>
          <h2 className='section-title'>Giao dịch gần đây</h2>
          <p className='section-subtitle'>Các khoản thu chi mới nhất</p>
        </div>
        <div className='space-y-1'>
          {transactions.map((item) => (
            <div key={item.text + item.room} className='flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-slate-50'>
              <div className='flex items-center gap-3'>
                <span
                  className={`grid size-10 place-items-center rounded-xl ${item.type === 'Thu' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}
                >
                  {item.type === 'Thu' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </span>
                <div>
                  <p className='text-sm font-semibold text-slate-700'>{item.text}</p>
                  <p className='mt-0.5 text-xs text-slate-400'>
                    {item.room} · {item.date}
                  </p>
                </div>
              </div>
              <p className={`text-sm font-bold ${item.type === 'Thu' ? 'text-emerald-700' : 'text-rose-600'}`}>{item.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MaintenanceView() {
  const requests = [
    { title: 'Vòi nước bị rò rỉ', room: 'P.203', date: 'Hôm nay, 08:30', status: 'Đang xử lý', icon: Droplets },
    { title: 'Điều hòa không mát', room: 'P.102', date: 'Hôm qua, 16:45', status: 'Chờ xử lý', icon: Wrench },
    { title: 'Đèn hành lang bị hỏng', room: 'Tầng 2', date: '02/09/2025', status: 'Đã xử lý', icon: Zap }
  ];
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      {requests.map((request) => (
        <article key={request.title} className='card flex items-start gap-4 p-5'>
          <span className='grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700'>
            <request.icon size={21} />
          </span>
          <div className='min-w-0 flex-1'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h3 className='font-bold text-slate-800'>{request.title}</h3>
                <p className='mt-1 text-xs text-slate-400'>
                  {request.room} · {request.date}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>
            <div className='mt-4 flex gap-2'>
              <button className='soft-button'>Xem chi tiết</button>
              <button className='soft-button'>Cập nhật</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function DeleteRoomModal({ room, onClose, onDelete }: { room: Room; onClose: () => void; onDelete: (room: Room) => Promise<void> }) {
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
              Phòng sẽ bị xóa khỏi hệ thống và không thể khôi phục. Thao tác này không ảnh hưởng đến các phòng khác.
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
            <span className='text-xs text-slate-400'>Người thuê</span>
            <span className='text-sm font-medium text-slate-600'>{room.tenant}</span>
          </div>
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

function EditRoomModal({ room, onClose, onSave }: { room: Room; onClose: () => void; onSave: (room: Room) => Promise<void> }) {
  const [name, setName] = useState(room.name);
  const [tenant, setTenant] = useState(room.status === 'Còn trống' ? '' : room.tenant);
  const [price, setPrice] = useState(formatCurrencyInput(room.price));
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên phòng.');
      return;
    }
    const nextPrice = parseCurrencyInput(price);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      setError('Giá thuê phải lớn hơn 0.');
      return;
    }
    if (status !== 'Còn trống' && !tenant.trim()) {
      setError('Vui lòng nhập tên người thuê.');
      return;
    }
    try {
      setSaving(true);
      await onSave({
        ...room,
        name: name.trim().toUpperCase(),
        tenant: status === 'Còn trống' ? 'Chưa có người thuê' : tenant.trim(),
        price: nextPrice,
        status,
        people: status === 'Còn trống' ? 0 : Math.max(room.people, 1)
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
          <label className='block'>
            <span className='field-label'>Người thuê</span>
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
          </label>
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
                const nextStatus = value as RoomStatus;
                setStatus(nextStatus);
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

function AddRoomModal({ onClose, onAdd }: { onClose: () => void; onAdd: (room: CreateRoomInput) => Promise<void> }) {
  const [name, setName] = useState('');
  const [tenant, setTenant] = useState('');
  const [price, setPrice] = useState('3.500.000');
  const [floor, setFloor] = useState('Tầng 1');
  const [status, setStatus] = useState<RoomStatus>('Đang thuê');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên phòng.');
      return;
    }
    const nextPrice = parseCurrencyInput(price);
    if (!nextPrice || nextPrice <= 0) {
      setError('Giá thuê phải lớn hơn 0.');
      return;
    }
    if (status !== 'Còn trống' && !tenant.trim()) {
      setError('Vui lòng nhập tên người thuê.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await onAdd({
        name: name.toUpperCase(),
        floor,
        tenant: status === 'Còn trống' ? 'Chưa có người thuê' : tenant.trim(),
        price: nextPrice,
        status,
        people: status === 'Còn trống' ? 0 : 1
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
      <DialogContent className='max-w-md' showCloseButton={!saving}>
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
            <span className='field-label'>Tên người thuê</span>
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
          </label>
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
            {saving ? <Spinner /> : <Plus size={16} />}
            {saving ? 'Đang thêm...' : 'Thêm phòng'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BoardingHouseDashboard({ initialView = 'overview' }: { initialView?: View }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>(initialView);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState('');
  const current = useMemo(() => viewTitles[view], [view]);
  const needsRooms = view === 'overview' || view === 'rooms' || view === 'tenant-create';

  const roomsQuery = useQuery({
    queryKey: roomsQueryKey,
    queryFn: () => apiRequest<RoomListResult>('/api/rooms?limit=100', { cache: 'no-store' }),
    enabled: needsRooms
  });

  const refreshRooms = () => queryClient.invalidateQueries({ queryKey: roomsQueryKey });

  const createRoomMutation = useMutation({
    mutationFn: (input: CreateRoomInput) =>
      apiRequest<{ data: Room }>('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      }),
    onSuccess: refreshRooms
  });

  const updateRoomMutation = useMutation({
    mutationFn: (room: Room) =>
      apiRequest<{ data: Room }>(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: room.name, tenant: room.tenant, price: room.price, status: room.status, people: room.people })
      }),
    onSuccess: refreshRooms
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (room: Room) => apiRequest<void>(`/api/rooms/${room.id}`, { method: 'DELETE' }),
    onSuccess: refreshRooms
  });

  const rooms = roomsQuery.data?.data ?? [];
  const roomsError = roomsQuery.error instanceof Error ? roomsQuery.error.message : roomsQuery.error ? 'Không thể tải danh sách phòng.' : '';

  const addRoom = async (input: CreateRoomInput) => {
    await createRoomMutation.mutateAsync(input);
    setView('rooms');
    router.push('/manager-room');
  };

  const updateRoom = async (room: Room) => {
    await updateRoomMutation.mutateAsync(room);
  };

  const deleteRoom = async (room: Room) => {
    await deleteRoomMutation.mutateAsync(room);
  };

  if (roomsQuery.isLoading) {
    return (
      <div className='grid min-h-screen place-items-center bg-[#f5f7f5] px-4'>
        <div role='status' className='flex flex-col items-center gap-3 text-center'>
          <span className='grid size-14 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm'>
            <Spinner className='size-6' />
          </span>
          <div>
            <p className='text-sm font-bold text-slate-700'>Đang tải dữ liệu</p>
            <p className='mt-1 text-xs text-slate-400'>Vui lòng chờ trong giây lát...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#f5f7f5] text-slate-800'>
      {sidebarOpen && (
        <button className='fixed inset-0 z-30 bg-slate-950/30 lg:hidden' aria-label='Đóng menu' onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-[#e6eae6] bg-white px-4 py-5 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className='flex items-center gap-3 px-2'>
          <span className='grid size-10 place-items-center rounded-xl bg-[#167d57] text-white shadow-[0_6px_16px_rgba(22,125,87,.25)]'>
            <Home size={20} fill='currentColor' strokeWidth={1.5} />
          </span>
          <div>
            <p className='text-[17px] font-extrabold tracking-[-0.03em] text-slate-900'>
              Nhà Trọ <span className='text-[#16805a]'>Tam Ke</span>
            </p>
            <p className='text-[9px] font-semibold uppercase tracking-[.19em] text-slate-400'>Quản lý thật dễ dàng</p>
          </div>
        </div>
        <nav className='mt-9 space-y-1.5'>
          <p className='mb-3 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-slate-400'>Quản lý</p>
          {navItems.map((item) => {
            const isActive = view === item.id || (view === 'tenant-create' && item.id === 'tenants');
            const className = `nav-item ${isActive ? 'nav-item-active' : ''}`;
            const content = (
              <>
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.id === 'maintenance' && (
                  <span className='ml-auto grid size-5 place-items-center rounded-full bg-rose-50 text-[9px] font-bold text-rose-600'>2</span>
                )}
              </>
            );

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  setSidebarOpen(false);
                  setQuery('');
                }}
                className={className}
              >
                {content}
              </Link>
            );
          })}
        </nav>
        <div className='mt-7'>
          <p className='mb-3 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-slate-400'>Hệ thống</p>
          <button className='nav-item'>
            <Settings size={18} />
            <span>Cài đặt</span>
          </button>
          <button className='nav-item'>
            <MessageCircle size={18} />
            <span>Hỗ trợ</span>
          </button>
        </div>
        <div className='mt-auto rounded-2xl border border-[#e5eee8] bg-[#f3f8f5] p-3.5'>
          <div className='flex items-center gap-3'>
            <span className='grid size-9 place-items-center rounded-full bg-[#d9ede2] text-xs font-bold text-[#146847]'>Tam Ke</span>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-xs font-bold text-slate-800'>Tam ke</p>
              <p className='mt-0.5 truncate text-[9px] text-slate-400'>Chủ nhà trọ</p>
            </div>
            <button aria-label='Đăng xuất' className='text-slate-400 hover:text-rose-600'>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div className='lg:pl-[250px]'>
        <header className='sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-[#e7ebe7] bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9'>
          <div className='flex items-center gap-3 lg:hidden'>
            <button
              onClick={() => setSidebarOpen(true)}
              className='grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600'
              aria-label='Mở menu'
            >
              <Menu size={18} />
            </button>
            <span className='font-extrabold text-slate-800'>
              Nhà Trọ <b className='text-emerald-700'>365</b>
            </span>
          </div>
          <div className='relative hidden w-full max-w-[340px] md:block'>
            <Search size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Tìm phòng, người thuê, hóa đơn...'
              className='h-10 w-full rounded-xl border border-slate-200 bg-[#f8faf8] pl-10 pr-4 text-xs outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
            />
          </div>
          <div className='flex items-center gap-2.5'>
            <button
              className='relative grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50'
              aria-label='Thông báo'
            >
              <Bell size={17} />
              <span className='absolute right-2 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white' />
            </button>
            <button className='hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:flex'>
              <CalendarDays size={15} />
              Tháng 09/2025
              <ChevronDown size={13} />
            </button>
          </div>
        </header>
        <main className='mx-auto max-w-365 p-4 sm:p-7 lg:p-9'>
          <div className='mb-7 flex flex-wrap items-end justify-between gap-4'>
            <div>
              {view === 'tenant-create' ? (
                <nav aria-label='Breadcrumb' className='mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400'>
                  <Link href='/manager-tenant' className='transition hover:text-emerald-700'>
                    Người thuê
                  </Link>
                  <ChevronRight className='size-3' />
                  <span className='text-emerald-700'>Thêm người thuê</span>
                </nav>
              ) : (
                <p className='mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-700'>Khu nhà A · Nguyễn Văn Quá</p>
              )}
              <h1 className='text-[25px] font-extrabold tracking-[-.035em] text-slate-900 sm:text-[29px]'>{current.title}</h1>
              <p className='mt-1 text-[12px] text-slate-400'>{current.subtitle}</p>
            </div>
            {(view === 'overview' || view === 'rooms') && (
              <button className='primary-button' onClick={() => setShowModal(true)}>
                <Plus size={17} strokeWidth={2.5} />
                Thêm phòng mới
              </button>
            )}
            {view === 'tenants' && (
              <Link href='/manager-tenant/add' className='primary-button'>
                <UserPlus size={17} strokeWidth={2.5} />
                Thêm người thuê
              </Link>
            )}
            {view === 'tenant-create' && (
              <Link href='/manager-tenant' className='soft-button h-10 px-4'>
                <ArrowLeft size={16} />
                Quay lại danh sách
              </Link>
            )}
          </div>
          {view !== 'tenant-create' && (
            <div className='relative mb-5 md:hidden'>
              <Search size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Tìm kiếm...'
                className='h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs outline-none'
              />
            </div>
          )}
          {roomsError && needsRooms && (
            <div className='mb-5 flex items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700'>
              <span>{roomsError}</span>
              <button onClick={() => void roomsQuery.refetch()} className='font-bold hover:underline'>
                Thử lại
              </button>
            </div>
          )}
          {roomsQuery.isFetching && !roomsQuery.isLoading && needsRooms && (
            <div className='mb-5 h-1 overflow-hidden rounded-full bg-emerald-100'>
              <div className='h-full w-1/2 animate-pulse rounded-full bg-emerald-600' />
            </div>
          )}
          {view === 'overview' && <Overview rooms={rooms} />}
          {view === 'rooms' && <RoomsView rooms={rooms} query={query} onUpdate={updateRoom} onDelete={deleteRoom} />}
          {view === 'tenants' && <TenantsView query={query} />}
          {view === 'tenant-create' && <TenantCreateForm rooms={rooms} />}
          {view === 'invoices' && <InvoicesView query={query} />}
          {view === 'finance' && <FinanceView />}
          {view === 'maintenance' && <MaintenanceView />}
          <footer className='mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-5 text-[10px] text-slate-400'>
            <p>© 2025 Nhà Trọ Tam Ke. Phiên bản 1.0</p>
            <p className='flex items-center gap-1.5'>
              <Gauge size={12} />
              Hệ thống hoạt động ổn định
            </p>
          </footer>
        </main>
      </div>
      {showModal && <AddRoomModal onClose={() => setShowModal(false)} onAdd={addRoom} />}
    </div>
  );
}
