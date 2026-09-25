'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, CornerDownRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { Tenant } from '@/backend/tenants/tenant.types';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { StatusBadge } from './shared';

export function TenantsView({ tenants, query }: { tenants: Tenant[]; query: string }) {
  const queryClient = useQueryClient();
  const [expandedRoomIds, setExpandedRoomIds] = useState<Set<string>>(() => new Set());
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenant: Tenant) => {
      const response = await fetch(`/api/tenants/${tenant.id}`, { method: 'DELETE' });
      if (response.ok) return;
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || 'Không thể xóa người thuê.');
    },
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['tenants'] }), queryClient.invalidateQueries({ queryKey: ['rooms'] })]);
      setDeletingTenant(null);
    }
  });
  const search = query.trim().toLowerCase();
  const tenantGroups = new Map<string, Tenant[]>();

  for (const tenant of tenants) {
    const groupId = tenant.activeRoom?.roomId || `unassigned-${tenant.id}`;
    tenantGroups.set(groupId, [...(tenantGroups.get(groupId) || []), tenant]);
  }

  const roomGroups = Array.from(tenantGroups.entries())
    .map(([roomId, groupTenants]) => {
      const sortedTenants = [...groupTenants].sort((left, right) => {
        const leftOrder = left.activeRoom?.role === 'PRIMARY_TENANT' ? 0 : 1;
        const rightOrder = right.activeRoom?.role === 'PRIMARY_TENANT' ? 0 : 1;
        return leftOrder - rightOrder || left.fullName.localeCompare(right.fullName, 'vi');
      });
      return { roomId, tenants: sortedTenants };
    })
    .filter(
      ({ tenants: groupTenants }) =>
        !search ||
        groupTenants.some((tenant) =>
          `${tenant.fullName} ${tenant.activeRoom?.roomNumber || ''} ${tenant.phone || ''} ${tenant.cccd || ''}`.toLowerCase().includes(search)
        )
    );

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

  return (
    <div className='card overflow-hidden'>
      <Table className='min-w-210 text-left'>
        <TableHeader>
          <TableRow className='border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 hover:bg-slate-50/60'>
            <TableHead className='px-6 py-4'>Người thuê</TableHead>
            <TableHead className='px-5 py-4'>Phòng</TableHead>
            <TableHead className='px-5 py-4'>Vai trò</TableHead>
            <TableHead className='px-5 py-4'>Số điện thoại</TableHead>
            <TableHead className='px-5 py-4'>Ngày vào ở</TableHead>
            <TableHead className='px-5 py-4'>Hợp đồng</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roomGroups.flatMap((roomGroup) => {
            const primaryTenant = roomGroup.tenants.find((tenant) => tenant.activeRoom?.role === 'PRIMARY_TENANT') || roomGroup.tenants[0];
            const canCollapse = roomGroup.tenants.length > 1;
            const isExpanded = Boolean(search) || expandedRoomIds.has(roomGroup.roomId);
            const visibleTenants = canCollapse && !isExpanded ? [primaryTenant] : roomGroup.tenants;

            return visibleTenants.map((tenant) => {
              const isMember = tenant.activeRoom?.role === 'MEMBER';

              return (
                <TableRow
                  key={tenant.id}
                  className={cn(
                    'border-b border-slate-50 text-sm last:border-0',
                    isMember ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50/70'
                  )}
                >
                  <TableCell className={cn('py-4', isMember ? 'border-l-2 border-blue-200 pl-9 pr-6' : 'px-6')}>
                    <div className='flex items-center gap-3'>
                      {isMember && <CornerDownRight size={15} className='shrink-0 text-blue-400' aria-hidden='true' />}
                      <span
                        className={cn(
                          'grid size-9 place-items-center rounded-full text-xs font-bold',
                          isMember ? 'bg-blue-100 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        )}
                      >
                        {initials(tenant.fullName)}
                      </span>
                      <div>
                        <span className='font-semibold text-slate-800'>{tenant.fullName}</span>
                        {!tenant.profileCompleted && (
                          <span className='ml-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700'>
                            Thiếu thông tin
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className='px-5 py-4'>
                    <p className='font-semibold text-slate-600'>{tenant.activeRoom?.roomNumber || 'Chưa phân phòng'}</p>
                    {canCollapse && tenant.id === primaryTenant.id && (
                      <button
                        type='button'
                        onClick={() =>
                          setExpandedRoomIds((current) => {
                            const next = new Set(current);
                            if (next.has(roomGroup.roomId)) next.delete(roomGroup.roomId);
                            else next.add(roomGroup.roomId);
                            return next;
                          })
                        }
                        className='mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800'
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? 'Thu gọn' : `${roomGroup.tenants.length - 1} thành viên`}
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className='px-5 py-4'>
                    {tenant.activeRoom ? (
                      <Badge variant={tenant.activeRoom.role === 'PRIMARY_TENANT' ? 'success' : 'info'}>
                        {tenant.activeRoom.role === 'PRIMARY_TENANT' ? 'Chủ phòng' : 'Thành viên'}
                      </Badge>
                    ) : (
                      <span className='text-slate-400'>—</span>
                    )}
                  </TableCell>
                  <TableCell className='px-5 py-4 text-slate-500'>{tenant.phone || 'Chưa bổ sung'}</TableCell>
                  <TableCell className='px-5 py-4 text-slate-500'>
                    {tenant.activeRoom ? new Intl.DateTimeFormat('vi-VN').format(new Date(tenant.activeRoom.moveInDate)) : '—'}
                  </TableCell>
                  <TableCell className='px-5 py-4'>
                    <StatusBadge status={tenant.activeRoom ? 'Đang hiệu lực' : 'Đã chuyển đi'} />
                  </TableCell>
                  <TableCell className='px-5'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type='button'
                          aria-label={`Thao tác với ${tenant.fullName}`}
                          className='grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-emerald-700 hover:shadow-sm'
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem asChild>
                          <Link href={`/manager-tenant/${tenant.id}/edit`}>
                            <Pencil />
                            Chỉnh sửa
                          </Link>
                        </DropdownMenuItem>
                        {tenant.activeRoom?.role === 'MEMBER' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => {
                                deleteTenantMutation.reset();
                                setDeletingTenant(tenant);
                              }}
                              className='text-rose-600 focus:bg-rose-50 focus:text-rose-700'
                            >
                              <Trash2 />
                              Xóa người thuê
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            });
          })}
        </TableBody>
      </Table>
      {roomGroups.length === 0 && (
        <div className='border-t border-slate-100 py-14 text-center text-sm text-slate-400'>Chưa có người thuê phù hợp.</div>
      )}
      <Dialog
        open={Boolean(deletingTenant)}
        onOpenChange={(open) => {
          if (!open && !deleteTenantMutation.isPending) setDeletingTenant(null);
        }}
      >
        <DialogContent className='max-w-md' showCloseButton={!deleteTenantMutation.isPending}>
          <div className='flex items-start gap-4'>
            <span className='grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600'>
              <Trash2 size={21} />
            </span>
            <DialogHeader className='min-w-0 flex-1 pr-9'>
              <DialogTitle>Xóa người thuê?</DialogTitle>
              <DialogDescription className='mt-1 text-sm leading-6 text-slate-500'>
                Hồ sơ của <b className='text-slate-700'>{deletingTenant?.fullName}</b> sẽ bị xóa khỏi phòng{' '}
                <b className='text-slate-700'>{deletingTenant?.activeRoom?.roomNumber}</b>. Thao tác này không thể khôi phục.
              </DialogDescription>
            </DialogHeader>
          </div>
          {deleteTenantMutation.error && (
            <p role='alert' className='mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600'>
              {deleteTenantMutation.error instanceof Error ? deleteTenantMutation.error.message : 'Không thể xóa người thuê.'}
            </p>
          )}
          <DialogFooter className='mt-6'>
            <button
              type='button'
              onClick={() => setDeletingTenant(null)}
              disabled={deleteTenantMutation.isPending}
              className='soft-button px-5 disabled:opacity-60'
            >
              Hủy
            </button>
            <button
              type='button'
              onClick={() => deletingTenant && deleteTenantMutation.mutate(deletingTenant)}
              disabled={!deletingTenant || deleteTenantMutation.isPending}
              className='inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-[11px] font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {deleteTenantMutation.isPending ? <Spinner /> : <Trash2 size={16} />}
              {deleteTenantMutation.isPending ? 'Đang xóa...' : 'Xóa người thuê'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
