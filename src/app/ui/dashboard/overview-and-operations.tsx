import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  DoorOpen,
  Droplets,
  FileText,
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  Wrench,
  Zap
} from 'lucide-react';
import type { Room } from '@/backend/rooms/room.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney, StatCard, StatusBadge } from './shared';

const invoices = [
  { id: 'HD-0925-01', room: 'P.101', tenant: 'Nguyễn Minh Anh', amount: 4120000, date: '05/09/2025', status: 'Đã thanh toán' },
  { id: 'HD-0925-02', room: 'P.102', tenant: 'Trần Quốc Huy', amount: 3780000, date: '05/09/2025', status: 'Chờ thanh toán' },
  { id: 'HD-0925-03', room: 'P.201', tenant: 'Lê Thảo My', amount: 4450000, date: '04/09/2025', status: 'Đã thanh toán' },
  { id: 'HD-0925-04', room: 'P.202', tenant: 'Phạm Gia Bảo', amount: 4030000, date: '03/09/2025', status: 'Quá hạn' },
  { id: 'HD-0925-05', room: 'P.203', tenant: 'Vũ Khánh Linh', amount: 4260000, date: '02/09/2025', status: 'Đã thanh toán' }
];

function RevenueChart() {
  const data = [24, 34, 29, 42, 51, 45, 58, 54, 69, 62, 76, 72];
  const points = data.map((value, index) => `${index * (100 / 11)},${80 - value}`).join(' ');

  return (
    <div className='mt-5 h-47 w-full'>
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

function RoomTable({ rooms }: { rooms: Room[] }) {
  return (
    <Table className='min-w-162.5 text-left'>
      <TableHeader>
        <TableRow className='border-y border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-[.08em] text-slate-400 hover:bg-slate-50/70'>
          <TableHead className='px-6 py-3 font-semibold'>Phòng</TableHead>
          <TableHead className='px-4 py-3 font-semibold'>Người thuê</TableHead>
          <TableHead className='px-4 py-3 font-semibold'>Giá thuê</TableHead>
          <TableHead className='px-4 py-3 font-semibold'>Trạng thái</TableHead>
          <TableHead className='px-5 py-3' />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rooms.map((room) => (
          <TableRow key={room.id} className='border-b border-slate-50 text-[12px] last:border-0 hover:bg-slate-50/60'>
            <TableCell className='px-6 py-3.5'>
              <p className='font-bold text-slate-800'>{room.name}</p>
              <p className='mt-0.5 text-[10px] text-slate-400'>{room.floor}</p>
            </TableCell>
            <TableCell className='px-4 py-3.5 text-slate-600'>{room.tenant}</TableCell>
            <TableCell className='px-4 py-3.5 font-semibold text-slate-700'>{formatMoney(room.price)}</TableCell>
            <TableCell className='px-4 py-3.5'>
              <StatusBadge status={room.status} />
            </TableCell>
            <TableCell className='px-5 py-3.5'>
              <button aria-label={`Tùy chọn ${room.name}`} className='text-slate-400 hover:text-slate-700'>
                <MoreHorizontal size={18} />
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

export function Overview({ rooms }: { rooms: Room[] }) {
  return (
    <>
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard icon={DoorOpen} label='Tổng số phòng' value={`${rooms.length}`} note='2 phòng mới tháng này' tone='green' />
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
          <div className='flex h-46.25 items-center justify-center'>
            <div className='relative grid size-36 place-items-center rounded-full bg-[conic-gradient(#17875c_0_75%,#e9eee9_75%_100%)]'>
              <div className='grid size-26.5 place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_#f1f3f1]'>
                <div>
                  <p className='text-3xl font-bold tracking-tight text-slate-900'>75%</p>
                  <p className='text-[11px] text-slate-400'>đã lấp đầy</p>
                </div>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center'>
            {[
              ['6', 'Đang thuê', 'text-slate-800'],
              ['2', 'Còn trống', 'text-amber-600'],
              ['1', 'Sắp trả', 'text-rose-500']
            ].map(([value, label, color]) => (
              <div key={label}>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className='text-[10px] text-slate-400'>{label}</p>
              </div>
            ))}
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

export function InvoicesView({ query }: { query: string }) {
  const filtered = invoices.filter((invoice) => `${invoice.id} ${invoice.room} ${invoice.tenant}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-3'>
        <StatCard icon={FileText} label='Tổng hóa đơn' value='8' note='Tháng 09/2025' tone='blue' />
        <StatCard icon={Check} label='Đã thanh toán' value='24,8tr' note='6 hóa đơn' tone='green' />
        <StatCard icon={CalendarDays} label='Chờ thu' value='8,1tr' note='2 hóa đơn' tone='orange' />
      </div>
      <div className='card overflow-hidden'>
        <Table className='min-w-190 text-left'>
          <TableHeader>
            <TableRow className='border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 hover:bg-slate-50/60'>
              <TableHead className='px-6 py-4'>Mã hóa đơn</TableHead>
              <TableHead className='px-5 py-4'>Phòng & người thuê</TableHead>
              <TableHead className='px-5 py-4'>Ngày tạo</TableHead>
              <TableHead className='px-5 py-4'>Số tiền</TableHead>
              <TableHead className='px-5 py-4'>Trạng thái</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((invoice) => (
              <TableRow key={invoice.id} className='border-b border-slate-50 text-sm last:border-0 hover:bg-slate-50/70'>
                <TableCell className='px-6 py-4 font-semibold text-slate-700'>{invoice.id}</TableCell>
                <TableCell className='px-5 py-4'>
                  <p className='font-semibold text-slate-800'>{invoice.room}</p>
                  <p className='mt-0.5 text-xs text-slate-400'>{invoice.tenant}</p>
                </TableCell>
                <TableCell className='px-5 py-4 text-slate-500'>{invoice.date}</TableCell>
                <TableCell className='px-5 py-4 font-bold text-slate-700'>{formatMoney(invoice.amount)}</TableCell>
                <TableCell className='px-5 py-4'>
                  <StatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className='px-5'>
                  <button aria-label='Tùy chọn'>
                    <MoreHorizontal size={18} className='text-slate-400' />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function FinanceView() {
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

export function MaintenanceView() {
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
