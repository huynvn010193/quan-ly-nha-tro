import type { LucideIcon } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import type { RoomStatus } from '@/backend/rooms/room.types';
import { Badge } from '@/components/ui/badge';

export function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
}

export function formatCurrencyInput(value: string | number) {
  const digits = String(value).replace(/\D/g, '');
  return digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
}

export function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

export function StatusBadge({ status }: { status: RoomStatus | string }) {
  const variant =
    status === 'Đang thuê' || status === 'Đã thanh toán' || status === 'Đã xử lý' || status === 'Đang hiệu lực'
      ? 'success'
      : status === 'Còn trống' || status === 'Chờ thanh toán' || status === 'Đang xử lý'
        ? 'warning'
        : 'destructive';

  return <Badge variant={variant}>{status}</Badge>;
}

export function StatCard({
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
