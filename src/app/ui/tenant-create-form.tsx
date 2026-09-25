'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  CloudUpload,
  CreditCard,
  FileText,
  Home,
  MapPin,
  Paperclip,
  Phone,
  Save,
  UserRound,
  UsersRound,
  VenusAndMars,
  X
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { vi } from 'react-day-picker/locale';
import { useForm, useWatch, type DefaultValues, type FieldPath, type FieldPathValue } from 'react-hook-form';
import { useEffect, useId, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import * as yup from 'yup';

import type { Room } from '@/backend/rooms/room.types';
import type { RoomMemberRole, Tenant, TenantGender } from '@/backend/tenants/tenant.types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

const tenantSchema = yup.object({
  fullName: yup.string().trim().required('Vui lòng nhập họ và tên.'),
  birthDate: yup
    .date()
    .typeError('Vui lòng chọn ngày sinh.')
    .max(new Date(), 'Ngày sinh không được lớn hơn ngày hiện tại.')
    .required('Vui lòng chọn ngày sinh.'),
  gender: yup.string().required('Vui lòng chọn giới tính.'),
  phone: yup
    .string()
    .trim()
    .matches(/^(?:\+84|0)[0-9 ]{8,11}$/, 'Số điện thoại không hợp lệ.')
    .required('Vui lòng nhập số điện thoại.'),
  citizenId: yup
    .string()
    .matches(/^\d{12}$/, 'Số CCCD phải gồm đúng 12 chữ số.')
    .required('Vui lòng nhập số CCCD.'),
  ethnicity: yup.string().required('Vui lòng chọn dân tộc.'),
  permanentAddress: yup.string().trim().default(''),
  temporaryAddress: yup.string().trim().default(''),
  roomId: yup.string().required('Vui lòng chọn phòng.'),
  role: yup.mixed<'owner' | 'member'>().oneOf(['owner', 'member']).required('Vui lòng chọn vai trò trong phòng.'),
  citizenIdFront: yup.array().of(yup.mixed<File>().required()).default([]),
  citizenIdBack: yup.array().of(yup.mixed<File>().required()).default([]),
  attachments: yup.array().of(yup.mixed<File>().required()).default([])
});

type TenantFormValues = yup.InferType<typeof tenantSchema>;

function getInitialValues(tenant?: Tenant): DefaultValues<TenantFormValues> {
  const genderMap: Partial<Record<TenantGender, string>> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
  return {
    fullName: tenant?.fullName || '',
    birthDate: tenant?.birthYear ? new Date(tenant.birthYear, 0, 1) : undefined,
    gender: tenant?.gender ? genderMap[tenant.gender] : '',
    phone: tenant?.phone || '',
    citizenId: tenant?.cccd || '',
    ethnicity: tenant?.ethnicity || '',
    permanentAddress: tenant?.permanentAddress || '',
    temporaryAddress: tenant?.temporaryAddress || '',
    roomId: tenant?.activeRoom?.roomId || '',
    role: tenant?.activeRoom?.role === 'PRIMARY_TENANT' ? 'owner' : 'member',
    citizenIdFront: [],
    citizenIdBack: [],
    attachments: []
  };
}

function FormSection({
  icon: Icon,
  number,
  title,
  children,
  note
}: {
  icon: typeof UserRound;
  number: number;
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(45,67,56,.035)]'>
      <div className='flex min-h-12 items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 to-slate-50 px-4 py-3'>
        <div className='flex items-center gap-2 text-sm font-bold text-slate-800'>
          <Icon className='size-4.5 text-emerald-700' />
          <span>
            {number}. {title}
          </span>
        </div>
        {note && <span className='text-[10px] font-semibold text-rose-500'>{note}</span>}
      </div>
      <div className='space-y-4 p-4'>{children}</div>
    </section>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className='field-label'>
      {children} {required && <span className='text-rose-500'>*</span>}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className='mt-1.5 text-[10px] font-semibold text-rose-500'>{message}</p> : null;
}

function UploadBox({
  label,
  required,
  files,
  existingFileUrl,
  accept,
  multiple,
  onFiles
}: {
  label: string;
  required?: boolean;
  files: File[];
  existingFileUrl?: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputId = useId();
  const selectedPreviewUrl = useMemo(() => {
    const selectedFile = files[0];
    return selectedFile?.type.startsWith('image/') ? URL.createObjectURL(selectedFile) : undefined;
  }, [files]);
  const previewUrl = selectedPreviewUrl || (files.length === 0 ? existingFileUrl : undefined);

  useEffect(
    () => () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    },
    [selectedPreviewUrl]
  );

  const receiveFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    onFiles(Array.from(incoming));
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    receiveFiles(event.dataTransfer.files);
  };

  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <label
        htmlFor={inputId}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className='group flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40'
      >
        <input
          id={inputId}
          type='file'
          accept={accept}
          multiple={multiple}
          className='sr-only'
          onChange={(event) => receiveFiles(event.target.files)}
        />
        {previewUrl ? (
          <>
            <div className='relative h-28 w-full overflow-hidden rounded-lg border border-slate-200 bg-white'>
              <Image
                src={previewUrl}
                alt={selectedPreviewUrl ? `${label} vừa chọn` : `${label} đã tải lên`}
                fill
                unoptimized
                sizes='(max-width: 640px) 100vw, 320px'
                className='object-contain'
              />
              <span className='absolute bottom-1.5 left-1.5 rounded-md bg-slate-900/70 px-2 py-1 text-[9px] font-semibold text-white'>
                {selectedPreviewUrl ? 'Ảnh vừa chọn' : 'Ảnh đã tải lên'}
              </span>
            </div>
            <p className='mt-2 text-[10px] font-medium text-slate-500'>{selectedPreviewUrl ? files[0].name : 'Nhấn để thay ảnh'}</p>
            {selectedPreviewUrl && (
              <button
                type='button'
                onClick={(event) => {
                  event.preventDefault();
                  onFiles([]);
                }}
                className='mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600'
              >
                <X className='size-3.5' /> Hủy thay ảnh
              </button>
            )}
          </>
        ) : files.length ? (
          <>
            <span className='grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700'>
              <CloudUpload className='size-5' />
            </span>
            <div className='mt-3 max-w-full space-y-1'>
              {files.map((file) => (
                <p key={`${file.name}-${file.size}`} className='truncate text-xs font-semibold text-slate-700'>
                  {file.name}
                </p>
              ))}
            </div>
            <button
              type='button'
              onClick={(event) => {
                event.preventDefault();
                onFiles([]);
              }}
              className='mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600'
            >
              <X className='size-3.5' /> Hủy thay ảnh
            </button>
          </>
        ) : (
          <>
            <span className='grid size-10 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm'>
              <CloudUpload className='size-5' />
            </span>
            <p className='mt-3 text-xs font-semibold text-slate-600'>Kéo thả file hoặc chọn từ máy</p>
            <p className='mt-1 text-[10px] text-slate-400'>{multiple ? 'Có thể chọn nhiều file' : 'JPG, PNG, WEBP · Tối đa 5MB'}</p>
          </>
        )}
      </label>
    </div>
  );
}

export function TenantCreateForm({ rooms, tenant }: { rooms: Room[]; tenant?: Tenant }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [birthDateOpen, setBirthDateOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<TenantFormValues>({
    resolver: yupResolver(tenantSchema),
    defaultValues: getInitialValues(tenant),
    mode: 'onBlur'
  });
  const values = useWatch({ control }) as TenantFormValues;

  function updateField<K extends FieldPath<TenantFormValues>>(field: K, value: FieldPathValue<TenantFormValues, K>) {
    setValue(field, value, { shouldDirty: true, shouldValidate: true });
    setMessage(null);
  }

  const saveTenantMutation = useMutation({
    mutationFn: async (formValues: TenantFormValues) => {
      const genderMap: Record<string, TenantGender> = { Nam: 'MALE', Nữ: 'FEMALE', Khác: 'OTHER' };
      const roleMap: Record<TenantFormValues['role'], RoomMemberRole> = { owner: 'PRIMARY_TENANT', member: 'MEMBER' };
      const nextRole = roleMap[formValues.role];
      const assignmentChanged = !tenant || tenant.activeRoom?.roomId !== formValues.roomId || tenant.activeRoom?.role !== nextRole;
      const requestPayload: Record<string, unknown> = {
        fullName: formValues.fullName,
        phone: formValues.phone,
        birthYear: formValues.birthDate.getFullYear(),
        cccd: formValues.citizenId,
        gender: genderMap[formValues.gender],
        ethnicity: formValues.ethnicity,
        permanentAddress: formValues.permanentAddress,
        temporaryAddress: formValues.temporaryAddress
      };
      if (assignmentChanged) {
        requestPayload.roomId = formValues.roomId;
        requestPayload.role = nextRole;
        requestPayload.moveInDate = new Date().toISOString();
      }
      const formData = new FormData();
      formData.set('payload', JSON.stringify(requestPayload));
      if (formValues.citizenIdFront[0]) formData.set('citizenIdFront', formValues.citizenIdFront[0]);
      if (formValues.citizenIdBack[0]) formData.set('citizenIdBack', formValues.citizenIdBack[0]);
      formValues.attachments.forEach((file) => formData.append('attachments', file));

      const response = await fetch(tenant ? `/api/tenants/${tenant.id}` : '/api/tenants', { method: tenant ? 'PATCH' : 'POST', body: formData });
      const payload = (await response.json()) as { data?: Tenant; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'Không thể lưu người thuê.');
      return payload.data;
    },
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['tenants'] }), queryClient.invalidateQueries({ queryKey: ['rooms'] })]);
      router.push('/manager-tenant');
    }
  });

  const submit = async (formValues: TenantFormValues) => {
    setMessage(null);
    try {
      await saveTenantMutation.mutateAsync(formValues);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Không thể lưu người thuê.' });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(submit, () => setMessage({ type: 'error', text: 'Vui lòng kiểm tra lại các trường thông tin chưa hợp lệ.' }))}
      className='space-y-5'
      noValidate
    >
      <div className='grid items-start gap-5 xl:grid-cols-2'>
        <div className='space-y-5'>
          <FormSection icon={UserRound} number={1} title='Thông tin cá nhân' note='* Là trường bắt buộc'>
            <label className='block'>
              <FieldLabel required>Họ và tên</FieldLabel>
              <div className='relative'>
                <UserRound className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                <Input
                  value={values.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  placeholder='Nhập họ và tên'
                  className='pl-10'
                />
              </div>
              <FieldError message={errors.fullName?.message} />
            </label>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div>
                <FieldLabel required>Năm sinh</FieldLabel>
                <Popover open={birthDateOpen} onOpenChange={setBirthDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      data-empty={!values.birthDate}
                      className='h-11 w-full justify-start px-3.5 text-left font-normal data-[empty=true]:text-slate-300'
                    >
                      <CalendarDays className='size-4 text-slate-400' />
                      {values.birthDate ? format(values.birthDate, 'dd/MM/yyyy') : <span>Chọn ngày sinh</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align='start' className='w-auto p-0'>
                    <Calendar
                      mode='single'
                      selected={values.birthDate}
                      onSelect={(date) => {
                        if (date) {
                          updateField('birthDate', date);
                          setBirthDateOpen(false);
                        }
                      }}
                      defaultMonth={values.birthDate ?? new Date(1995, 0, 1)}
                      startMonth={new Date(1900, 0, 1)}
                      endMonth={new Date()}
                      disabled={{ after: new Date() }}
                      captionLayout='dropdown'
                      locale={vi}
                    />
                  </PopoverContent>
                </Popover>
                <FieldError message={errors.birthDate?.message} />
              </div>
              <div>
                <FieldLabel required>Giới tính</FieldLabel>
                <Select value={values.gender} onValueChange={(value) => updateField('gender', value)}>
                  <SelectTrigger>
                    <span className='flex min-w-0 items-center gap-2'>
                      <VenusAndMars className='size-4 shrink-0 text-slate-400' />
                      <SelectValue placeholder='Chọn giới tính' />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Nam'>Nam</SelectItem>
                    <SelectItem value='Nữ'>Nữ</SelectItem>
                    <SelectItem value='Khác'>Khác</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.gender?.message} />
              </div>
            </div>

            <label className='block'>
              <FieldLabel required>Số điện thoại</FieldLabel>
              <div className='relative'>
                <Phone className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                <Input
                  value={values.phone}
                  onChange={(event) => updateField('phone', event.target.value.replace(/[^\d+ ]/g, ''))}
                  placeholder='Ví dụ: 0987654321'
                  inputMode='tel'
                  className='pl-10'
                />
              </div>
              <FieldError message={errors.phone?.message} />
            </label>

            <label className='block'>
              <FieldLabel required>Số CCCD</FieldLabel>
              <div className='relative'>
                <CreditCard className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                <Input
                  value={values.citizenId}
                  onChange={(event) => updateField('citizenId', event.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder='Nhập số CCCD (12 số)'
                  inputMode='numeric'
                  className='px-10'
                />
                <span className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400'>
                  {values.citizenId.length}/12
                </span>
              </div>
              <FieldError message={errors.citizenId?.message} />
            </label>

            <div>
              <FieldLabel required>Dân tộc</FieldLabel>
              <Select value={values.ethnicity} onValueChange={(value) => updateField('ethnicity', value)}>
                <SelectTrigger>
                  <span className='flex min-w-0 items-center gap-2'>
                    <UsersRound className='size-4 shrink-0 text-slate-400' />
                    <SelectValue placeholder='Chọn dân tộc' />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {['Kinh', 'Tày', 'Thái', 'Mường', 'Khmer', 'Hoa', 'Nùng', 'Khác'].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.ethnicity?.message} />
            </div>
          </FormSection>

          <FormSection icon={Home} number={4} title='Phân vào phòng'>
            <div>
              <FieldLabel required>Phòng</FieldLabel>
              <Select value={values.roomId} onValueChange={(value) => updateField('roomId', value)}>
                <SelectTrigger>
                  <span className='flex min-w-0 items-center gap-2'>
                    <Home className='size-4 shrink-0 text-slate-400' />
                    <SelectValue placeholder='Chọn phòng' />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} · {room.floor} · {room.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.roomId?.message} />
              <p className='mt-1.5 text-[10px] text-slate-400'>Mỗi người thuê chỉ được thuộc một phòng.</p>
            </div>

            <div>
              <FieldLabel required>Vai trò trong phòng</FieldLabel>
              <RadioGroup
                value={values.role}
                onValueChange={(value) => updateField('role', value as TenantFormValues['role'])}
                className='grid sm:grid-cols-2'
              >
                <label className='flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 transition has-data-[state=checked]:border-emerald-400 has-data-[state=checked]:bg-emerald-50/60'>
                  <RadioGroupItem value='owner' className='mt-0.5' />
                  <span>
                    <span className='block text-xs font-bold text-slate-700'>Chủ phòng</span>
                    <span className='mt-1 block text-[10px] text-slate-400'>Người đại diện chính, chịu trách nhiệm phòng</span>
                  </span>
                </label>
                <label className='flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 transition has-data-[state=checked]:border-emerald-400 has-data-[state=checked]:bg-emerald-50/60'>
                  <RadioGroupItem value='member' className='mt-0.5' />
                  <span>
                    <span className='block text-xs font-bold text-slate-700'>Thành viên</span>
                    <span className='mt-1 block text-[10px] text-slate-400'>Thành viên trong phòng</span>
                  </span>
                </label>
              </RadioGroup>
              <FieldError message={errors.role?.message} />
            </div>
          </FormSection>
        </div>

        <div className='space-y-5'>
          <FormSection icon={Camera} number={2} title='Hình ảnh CCCD'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div>
                <UploadBox
                  label='Mặt trước CCCD'
                  files={values.citizenIdFront}
                  existingFileUrl={tenant?.cccdImages.front ? `/api/files/${tenant.cccdImages.front}` : undefined}
                  accept='image/jpeg,image/png,image/webp'
                  onFiles={(files) => updateField('citizenIdFront', files.slice(0, 1))}
                />
                <FieldError message={errors.citizenIdFront?.message} />
              </div>
              <div>
                <UploadBox
                  label='Mặt sau CCCD'
                  files={values.citizenIdBack}
                  existingFileUrl={tenant?.cccdImages.back ? `/api/files/${tenant.cccdImages.back}` : undefined}
                  accept='image/jpeg,image/png,image/webp'
                  onFiles={(files) => updateField('citizenIdBack', files.slice(0, 1))}
                />
                <FieldError message={errors.citizenIdBack?.message} />
              </div>
            </div>
          </FormSection>

          <FormSection icon={MapPin} number={3} title='Địa chỉ cư trú'>
            <label className='block'>
              <FieldLabel>Địa chỉ thường trú</FieldLabel>
              <div className='relative'>
                <Home className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                <Input
                  value={values.permanentAddress}
                  onChange={(event) => updateField('permanentAddress', event.target.value)}
                  placeholder='Nhập địa chỉ thường trú (tỉnh, huyện, xã, số nhà...)'
                  className='pl-10'
                />
              </div>
              <FieldError message={errors.permanentAddress?.message} />
            </label>
            <label className='block'>
              <FieldLabel>Địa chỉ tạm trú</FieldLabel>
              <div className='relative'>
                <FileText className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                <Input
                  value={values.temporaryAddress}
                  onChange={(event) => updateField('temporaryAddress', event.target.value)}
                  placeholder='Nhập địa chỉ tạm trú hiện tại (tỉnh, huyện, xã, số nhà...)'
                  className='pl-10'
                />
              </div>
              <FieldError message={errors.temporaryAddress?.message} />
            </label>
          </FormSection>

          <FormSection icon={Paperclip} number={5} title='File đính kèm (tùy chọn)'>
            <UploadBox
              label='Giấy tờ và tài liệu liên quan'
              files={values.attachments}
              accept='.pdf,.jpg,.jpeg,.png,.doc,.docx'
              multiple
              onFiles={(files) => updateField('attachments', files.slice(0, 5))}
            />
            <p className='flex items-center justify-center gap-1 text-[10px] text-slate-400'>
              <Paperclip className='size-3' /> PDF, JPG, PNG, DOC, DOCX · Tối đa 10MB mỗi file
            </p>
          </FormSection>
        </div>
      </div>

      {message && (
        <div
          role='alert'
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-600'}`}
        >
          {message.type === 'success' ? <CheckCircle2 className='size-4 shrink-0' /> : <FileText className='size-4 shrink-0' />}
          {message.text}
        </div>
      )}

      <div className='sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-7 sm:px-7 lg:-mx-9 lg:px-9'>
        <Link
          href='/manager-tenant'
          className='inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
        >
          <ArrowLeft className='size-4' /> Hủy
        </Link>
        <Button type='submit' className='px-5' disabled={saveTenantMutation.isPending}>
          {saveTenantMutation.isPending ? <Spinner /> : <Save className='size-4' />}
          {saveTenantMutation.isPending ? 'Đang lưu...' : tenant ? 'Lưu thông tin' : 'Lưu người thuê'}
        </Button>
      </div>
    </form>
  );
}
