'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  UserPlus,
  UsersRound,
  WalletCards,
  Wrench,
  FileText,
  type LucideIcon
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { CreateRoomInput, Room, RoomListResult } from '@/backend/rooms/room.types';
import type { Tenant, TenantListResult } from '@/backend/tenants/tenant.types';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { AddRoomModal } from './dashboard/room-modals';
import { Overview, InvoicesView, FinanceView, MaintenanceView } from './dashboard/overview-and-operations';
import { RoomsView } from './dashboard/rooms-view';
import { TenantsView } from './dashboard/tenants-view';
import { TenantCreateForm } from './tenant-create-form';

type View = 'overview' | 'rooms' | 'tenants' | 'tenant-create' | 'invoices' | 'finance' | 'maintenance';

const roomsQueryKey = ['rooms'] as const;
const tenantsQueryKey = ['tenants'] as const;

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

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Không thể kết nối đến máy chủ.');
  return payload;
}

export function BoardingHouseDashboard({ initialView = 'overview', editingTenantId }: { initialView?: View; editingTenantId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>(initialView);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState('');
  const current = useMemo(
    () =>
      view === 'tenant-create' && editingTenantId
        ? { title: 'Bổ sung thông tin người thuê', subtitle: 'Hoàn thiện hồ sơ người thuê và thông tin cư trú.' }
        : viewTitles[view],
    [editingTenantId, view]
  );
  const needsRooms = view === 'overview' || view === 'rooms' || view === 'tenant-create';

  const roomsQuery = useQuery({
    queryKey: roomsQueryKey,
    queryFn: () => apiRequest<RoomListResult>('/api/rooms?limit=100', { cache: 'no-store' }),
    enabled: needsRooms
  });
  const tenantsQuery = useQuery({
    queryKey: tenantsQueryKey,
    queryFn: () => apiRequest<TenantListResult>('/api/tenants?limit=100', { cache: 'no-store' }),
    enabled: view === 'tenants'
  });
  const tenantDetailQuery = useQuery({
    queryKey: ['tenant', editingTenantId],
    queryFn: () => apiRequest<{ data: Tenant }>(`/api/tenants/${editingTenantId}`, { cache: 'no-store' }),
    enabled: Boolean(editingTenantId)
  });

  const refreshRooms = () => queryClient.invalidateQueries({ queryKey: roomsQueryKey });
  const refreshRoomsAndTenants = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: roomsQueryKey }), queryClient.invalidateQueries({ queryKey: tenantsQueryKey })]);
  const createRoomMutation = useMutation({
    mutationFn: (input: CreateRoomInput) =>
      apiRequest<{ data: Room }>('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
    onSuccess: refreshRoomsAndTenants
  });
  const updateRoomMutation = useMutation({
    mutationFn: (room: Room) =>
      apiRequest<{ data: Room }>(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: room.name,
          tenant: room.tenant,
          price: room.price,
          status: room.status,
          people: room.people,
          moveInDate: room.moveInDate
        })
      }),
    onSuccess: refreshRooms
  });
  const deleteRoomMutation = useMutation({
    mutationFn: (room: Room) => apiRequest<void>(`/api/rooms/${room.id}`, { method: 'DELETE' }),
    onSuccess: refreshRooms
  });

  const rooms = roomsQuery.data?.data ?? [];
  const tenantRecords = tenantsQuery.data?.data ?? [];
  const roomsError = roomsQuery.error instanceof Error ? roomsQuery.error.message : roomsQuery.error ? 'Không thể tải danh sách phòng.' : '';
  const tenantsError =
    tenantsQuery.error instanceof Error ? tenantsQuery.error.message : tenantsQuery.error ? 'Không thể tải danh sách người thuê.' : '';
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

  if (roomsQuery.isLoading || (view === 'tenants' && tenantsQuery.isLoading) || tenantDetailQuery.isLoading) {
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
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  setSidebarOpen(false);
                  setQuery('');
                }}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.id === 'maintenance' && (
                  <span className='ml-auto grid size-5 place-items-center rounded-full bg-rose-50 text-[9px] font-bold text-rose-600'>2</span>
                )}
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
              onChange={(event) => setQuery(event.target.value)}
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
                  <span className='text-emerald-700'>{editingTenantId ? 'Bổ sung thông tin' : 'Thêm người thuê'}</span>
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
                onChange={(event) => setQuery(event.target.value)}
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
          {tenantsError && view === 'tenants' && (
            <div className='mb-5 flex items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700'>
              <span>{tenantsError}</span>
              <button onClick={() => void tenantsQuery.refetch()} className='font-bold hover:underline'>
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
          {view === 'tenants' && <TenantsView tenants={tenantRecords} query={query} />}
          {view === 'tenant-create' && <TenantCreateForm rooms={rooms} tenant={tenantDetailQuery.data?.data} />}
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
