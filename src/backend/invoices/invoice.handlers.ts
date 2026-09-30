import { addInvoice, editInvoice, getInvoice, getInvoiceList, removeInvoice } from './invoice.service';
import { InvoiceValidationError } from './invoice.validation';

function errorResponse(error: unknown) {
  if (error instanceof InvoiceValidationError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof SyntaxError) return Response.json({ error: 'Dữ liệu hóa đơn không hợp lệ.' }, { status: 400 });
  if (error instanceof Error) {
    const businessErrors: Record<string, { message: string; status: number }> = {
      ROOM_NOT_FOUND: { message: 'Không tìm thấy phòng.', status: 404 },
      PRIMARY_TENANT_NOT_FOUND: { message: 'Phòng chưa có chủ phòng nên không thể tạo hóa đơn.', status: 409 },
      TENANT_NOT_FOUND: { message: 'Không tìm thấy người thuê.', status: 404 },
      INVOICE_PERIOD_EXISTS: { message: 'Phòng này đã có hóa đơn trong tháng đã chọn.', status: 409 }
    };
    const businessError = businessErrors[error.message];
    if (businessError) return Response.json({ error: businessError.message }, { status: businessError.status });
  }
  console.error('Invoice API error:', error instanceof Error ? error.message : 'Unknown error');
  return Response.json({ error: 'Không thể xử lý hóa đơn. Vui lòng thử lại.' }, { status: 500 });
}

export async function getInvoicesHandler(request: Request) {
  try {
    return Response.json(await getInvoiceList(new URL(request.url).searchParams));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function createInvoiceHandler(request: Request) {
  try {
    return Response.json({ data: await addInvoice(await request.json()) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function getInvoiceHandler(id: string) {
  try {
    const invoice = await getInvoice(id);
    return invoice ? Response.json({ data: invoice }) : Response.json({ error: 'Không tìm thấy hóa đơn.' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function updateInvoiceHandler(request: Request, id: string) {
  try {
    const invoice = await editInvoice(id, await request.json());
    return invoice ? Response.json({ data: invoice }) : Response.json({ error: 'Không tìm thấy hóa đơn.' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function deleteInvoiceHandler(id: string) {
  try {
    return (await removeInvoice(id)) ? new Response(null, { status: 204 }) : Response.json({ error: 'Không tìm thấy hóa đơn.' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
