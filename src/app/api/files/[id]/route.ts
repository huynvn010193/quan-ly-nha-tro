import { Readable } from 'node:stream';
import { getTenantFile } from '@/backend/tenants/tenant.repository';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: RouteContext<'/api/files/[id]'>) {
  const { id } = await context.params;
  const file = await getTenantFile(id);
  if (!file) return Response.json({ error: 'Không tìm thấy file.' }, { status: 404 });

  return new Response(Readable.toWeb(file.stream) as ReadableStream, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(file.length),
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'Cache-Control': 'private, max-age=3600'
    }
  });
}
