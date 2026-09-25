import {
  createTenantWithMembership,
  deleteTenantFiles,
  getRoomMemberHistory,
  getTenantById,
  listTenants,
  updateTenantWithMembership,
  uploadTenantFiles
} from './tenant.repository';
import type { TenantUploadFiles } from './tenant.types';
import { validateCreateTenant, validateUpdateTenant } from './tenant.validation';

export async function getTenantList(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
  const search = searchParams.get('search')?.trim() || undefined;
  return listTenants({ page, limit, search });
}

export async function getTenant(id: string) {
  return getTenantById(id);
}

export async function addTenant(payload: unknown, files: TenantUploadFiles) {
  const input = validateCreateTenant(payload);
  const uploaded = await uploadTenantFiles(files);
  try {
    return await createTenantWithMembership(input, uploaded.cccdImages, uploaded.attachments);
  } catch (error) {
    await deleteTenantFiles(uploaded.uploadedKeys);
    throw error;
  }
}

export async function editTenant(id: string, payload: unknown, files?: TenantUploadFiles) {
  const input = validateUpdateTenant(payload);
  const hasFiles = Boolean(files?.citizenIdFront || files?.citizenIdBack || files?.attachments.length);
  if (!files || !hasFiles) return updateTenantWithMembership(id, input);

  const uploaded = await uploadTenantFiles(files);
  try {
    return await updateTenantWithMembership(id, input, uploaded);
  } catch (error) {
    await deleteTenantFiles(uploaded.uploadedKeys);
    throw error;
  }
}

export async function getTenantRoomHistory(id: string) {
  return getRoomMemberHistory(id);
}
