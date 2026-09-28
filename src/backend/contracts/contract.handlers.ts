import { addContract, editContract, getContract, getContractList, removeContract } from './contract.service';
import { ContractValidationError } from './contract.validation';

function errorResponse(error: unknown) {
  if (error instanceof ContractValidationError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof SyntaxError) return Response.json({ error: 'Dữ liệu hợp đồng không hợp lệ.' }, { status: 400 });
  if (error instanceof Error) {
    const businessErrors: Record<string, { message: string; status: number }> = {
      ROOM_NOT_FOUND: { message: 'Không tìm thấy phòng.', status: 404 },
      TENANT_NOT_FOUND: { message: 'Không tìm thấy người thuê.', status: 404 },
      OWNER_NOT_PRIMARY_TENANT: { message: 'Người được chọn không phải Chủ phòng hiện tại của phòng này.', status: 409 },
      CURRENT_CONTRACT_EXISTS: { message: 'Phòng này đã có hợp đồng đang chờ hoặc đang hiệu lực.', status: 409 },
      ROOM_MAINTENANCE: { message: 'Phòng đang bảo trì nên không thể tạo hoặc kích hoạt hợp đồng.', status: 409 },
      INVALID_DATE_RANGE: { message: 'Ngày kết thúc không được trước ngày bắt đầu.', status: 400 }
    };
    const businessError = businessErrors[error.message];
    if (businessError) return Response.json({ error: businessError.message }, { status: businessError.status });
  }
  console.error('Contract API error:', error instanceof Error ? error.message : 'Unknown error');
  return Response.json({ error: 'Không thể xử lý hợp đồng. Vui lòng thử lại.' }, { status: 500 });
}

export async function getContractsHandler(request: Request) {
  try {
    return Response.json(await getContractList(new URL(request.url).searchParams));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function createContractHandler(request: Request) {
  try {
    return Response.json({ data: await addContract(await request.json()) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function getContractHandler(id: string) {
  try {
    const contract = await getContract(id);
    return contract ? Response.json({ data: contract }) : Response.json({ error: 'Không tìm thấy hợp đồng.' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function updateContractHandler(request: Request, id: string) {
  try {
    const contract = await editContract(id, await request.json());
    return contract ? Response.json({ data: contract }) : Response.json({ error: 'Không tìm thấy hợp đồng.' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function deleteContractHandler(id: string) {
  try {
    return (await removeContract(id)) ? new Response(null, { status: 204 }) : Response.json({ error: 'Không tìm thấy hợp đồng.' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
