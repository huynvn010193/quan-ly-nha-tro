'use client';

import { CalendarDays, CreditCard, Home, MapPin, Paperclip, Phone, UserRound, UsersRound } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Tenant, TenantGender } from '@/backend/tenants/tenant.types';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from './shared';

const genderLabels: Record<TenantGender, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

function formatDate(value?: string) {
  if (!value) return 'Chưa bổ sung';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa bổ sung' : new Intl.DateTimeFormat('vi-VN').format(date);
}

function DetailField({ icon, label, value, className = '' }: { icon: ReactNode; label: string; value?: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 ${className}`}>
      <p className='flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400'>
        <span className='text-emerald-600'>{icon}</span>
        {label}
      </p>
      <div className='mt-1.5 break-words text-sm font-semibold whitespace-normal text-slate-700'>{value || 'Chưa bổ sung'}</div>
    </div>
  );
}

function CitizenImage({ label, fileId }: { label: string; fileId?: string }) {
  return (
    <div>
      <p className='mb-2 text-xs font-semibold text-slate-600'>{label}</p>
      <div className='relative aspect-[1.58/1] overflow-hidden rounded-xl border border-slate-200 bg-slate-50'>
        {fileId ? (
          <Image src={`/api/files/${fileId}`} alt={label} fill unoptimized sizes='(max-width: 640px) 100vw, 340px' className='object-contain' />
        ) : (
          <div className='grid h-full place-items-center text-xs text-slate-400'>Chưa có ảnh</div>
        )}
      </div>
    </div>
  );
}

export function TenantDetailsDialog({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  const birthDate = tenant?.birthDate ? formatDate(tenant.birthDate) : tenant?.birthYear ? `01/01/${tenant.birthYear}` : 'Chưa bổ sung';

  return (
    <Dialog open={Boolean(tenant)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto p-0'>
        {tenant && (
          <>
            <div className='border-b border-slate-100 bg-linear-to-r from-emerald-50 to-white px-6 py-5 pr-18'>
              <DialogHeader>
                <DialogTitle>Thông tin người thuê</DialogTitle>
                <DialogDescription>Thông tin chi tiết ở chế độ chỉ xem.</DialogDescription>
              </DialogHeader>
              <div className='mt-4 flex flex-wrap items-center gap-3'>
                <span className='grid size-12 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700'>
                  {tenant.fullName
                    .split(/\s+/)
                    .slice(-2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <div>
                  <p className='text-base font-bold text-slate-900'>{tenant.fullName}</p>
                  <div className='mt-1 flex flex-wrap gap-2'>
                    {tenant.activeRoom && (
                      <Badge variant={tenant.activeRoom.role === 'PRIMARY_TENANT' ? 'success' : 'info'}>
                        {tenant.activeRoom.role === 'PRIMARY_TENANT' ? 'Chủ phòng' : 'Thành viên'}
                      </Badge>
                    )}
                    {!tenant.profileCompleted && <Badge variant='warning'>Thiếu thông tin</Badge>}
                  </div>
                </div>
              </div>
            </div>

            <div className='space-y-5 px-6 py-5'>
              <section>
                <h3 className='mb-3 text-sm font-bold text-slate-800'>Thông tin cá nhân</h3>
                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                  <DetailField icon={<CalendarDays size={14} />} label='Ngày sinh' value={birthDate} />
                  <DetailField icon={<UserRound size={14} />} label='Giới tính' value={tenant.gender ? genderLabels[tenant.gender] : undefined} />
                  <DetailField icon={<Phone size={14} />} label='Số điện thoại' value={tenant.phone} />
                  <DetailField icon={<CreditCard size={14} />} label='Số CCCD' value={tenant.cccd} />
                  <DetailField icon={<UsersRound size={14} />} label='Dân tộc' value={tenant.ethnicity} />
                  <DetailField
                    icon={<Home size={14} />}
                    label='Hợp đồng'
                    value={<StatusBadge status={tenant.activeRoom ? 'Đang hiệu lực' : 'Đã chuyển đi'} />}
                  />
                </div>
              </section>

              <section>
                <h3 className='mb-3 text-sm font-bold text-slate-800'>Thông tin phòng</h3>
                <div className='grid gap-3 sm:grid-cols-3'>
                  <DetailField icon={<Home size={14} />} label='Phòng' value={tenant.activeRoom?.roomNumber || 'Chưa phân phòng'} />
                  <DetailField icon={<MapPin size={14} />} label='Tầng' value={tenant.activeRoom?.floor} />
                  <DetailField icon={<CalendarDays size={14} />} label='Ngày vào ở' value={formatDate(tenant.activeRoom?.moveInDate)} />
                </div>
              </section>

              <section>
                <h3 className='mb-3 text-sm font-bold text-slate-800'>Địa chỉ cư trú</h3>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <DetailField icon={<MapPin size={14} />} label='Địa chỉ thường trú' value={tenant.permanentAddress} />
                  <DetailField icon={<MapPin size={14} />} label='Địa chỉ tạm trú' value={tenant.temporaryAddress} />
                </div>
              </section>

              <section>
                <h3 className='mb-3 text-sm font-bold text-slate-800'>Hình ảnh CCCD</h3>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <CitizenImage label='Mặt trước CCCD' fileId={tenant.cccdImages.front} />
                  <CitizenImage label='Mặt sau CCCD' fileId={tenant.cccdImages.back} />
                </div>
              </section>

              <section>
                <h3 className='mb-3 text-sm font-bold text-slate-800'>File đính kèm</h3>
                {tenant.attachments.length ? (
                  <div className='space-y-2'>
                    {tenant.attachments.map((attachment) => (
                      <div key={attachment.fileKey} className='flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3'>
                        <Paperclip size={15} className='shrink-0 text-emerald-600' />
                        <div className='min-w-0'>
                          <p className='truncate text-xs font-semibold text-slate-700'>{attachment.fileName}</p>
                          <p className='mt-0.5 text-[10px] text-slate-400'>{attachment.mimeType}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400'>Chưa có file đính kèm.</p>
                )}
              </section>
            </div>

            <DialogFooter className='sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4'>
              <button type='button' onClick={onClose} className='soft-button px-5'>
                Đóng
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
