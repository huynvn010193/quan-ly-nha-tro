import { MongoServerError } from 'mongodb';
import { addTenant, editTenant, getTenant, getTenantList, getTenantRoomHistory, removeMemberTenant } from './tenant.service';
import { TenantValidationError, validateTenantFiles } from './tenant.validation';

function errorResponse(error: unknown) {
  if (error instanceof TenantValidationError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof SyntaxError) return Response.json({ error: 'Dữ liệu người thuê không hợp lệ.' }, { status: 400 });
  if (error instanceof MongoServerError && error.code === 11000) {
    const indexName = String(error.message);
    if (indexName.includes('unique_tenant_phone')) return Response.json({ error: 'Số điện thoại đã tồn tại.' }, { status: 409 });
    if (indexName.includes('unique_tenant_cccd')) return Response.json({ error: 'Số CCCD đã tồn tại.' }, { status: 409 });
    if (indexName.includes('one_active_primary_tenant_per_room')) {
      return Response.json({ error: 'Phòng này đã có chủ phòng.' }, { status: 409 });
    }
    if (indexName.includes('one_active_room_per_tenant')) {
      return Response.json({ error: 'Người thuê đang thuộc một phòng khác.' }, { status: 409 });
    }
    return Response.json({ error: 'Dữ liệu người thuê đã tồn tại.' }, { status: 409 });
  }
  if (error instanceof Error) {
    const businessErrors: Record<string, { message: string; status: number }> = {
      ROOM_NOT_FOUND: { message: 'Không tìm thấy phòng.', status: 404 },
      ROOM_MAINTENANCE: { message: 'Không thể xếp người thuê vào phòng đang sửa chữa.', status: 409 },
      ROOM_FULL: { message: 'Phòng đã đủ số người tối đa.', status: 409 },
      PRIMARY_TENANT_EXISTS: { message: 'Phòng này đã có chủ phòng.', status: 409 },
      PRIMARY_TENANT_CANNOT_DELETE: { message: 'Không thể xóa Chủ phòng. Vui lòng chuyển quyền chủ phòng trước.', status: 409 },
      ONLY_ACTIVE_MEMBER_CAN_DELETE: { message: 'Chỉ có thể xóa Thành viên đang thuộc phòng.', status: 409 }
    };
    const businessError = businessErrors[error.message];
    if (businessError) return Response.json({ error: businessError.message }, { status: businessError.status });
  }

  console.error('Tenant API error:', error instanceof Error ? error.message : 'Unknown error');
  return Response.json({ error: 'Không thể xử lý thông tin người thuê. Vui lòng thử lại.' }, { status: 500 });
}

export async function getTenantsHandler(request: Request) {
  try {
    return Response.json(await getTenantList(new URL(request.url).searchParams));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function createTenantHandler(request: Request) {
  try {
    const formData = await request.formData();
    const rawPayload = formData.get('payload');
    if (typeof rawPayload !== 'string') throw new TenantValidationError('Dữ liệu người thuê là bắt buộc.');
    const tenant = await addTenant(JSON.parse(rawPayload), validateTenantFiles(formData));
    return Response.json({ data: tenant }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function getTenantHandler(id: string) {
  try {
    const tenant = await getTenant(id);
    if (!tenant) return Response.json({ error: 'Không tìm thấy người thuê.' }, { status: 404 });
    return Response.json({ data: tenant });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function updateTenantHandler(request: Request, id: string) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let tenant;
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const rawPayload = formData.get('payload');
      if (typeof rawPayload !== 'string') throw new TenantValidationError('Dữ liệu người thuê là bắt buộc.');
      tenant = await editTenant(id, JSON.parse(rawPayload), validateTenantFiles(formData));
    } else {
      tenant = await editTenant(id, await request.json());
    }
    if (!tenant) return Response.json({ error: 'Không tìm thấy người thuê.' }, { status: 404 });
    return Response.json({ data: tenant });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function getTenantHistoryHandler(id: string) {
  try {
    return Response.json({ data: await getTenantRoomHistory(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function deleteTenantHandler(id: string) {
  try {
    const deleted = await removeMemberTenant(id);
    if (!deleted) return Response.json({ error: 'Không tìm thấy người thuê.' }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
