# Nhà Trọ Tam Ke

Dashboard quản lý nhà trọ bằng Next.js 16, TypeScript và Tailwind CSS 4.

## Chức năng

- Tổng quan số phòng, tỷ lệ lấp đầy và doanh thu
- Quản lý phòng, lọc theo trạng thái và thêm phòng mới
- Danh sách người thuê và thông tin hợp đồng
- Theo dõi hóa đơn, trạng thái thanh toán
- Tổng hợp thu chi và giao dịch gần đây
- Theo dõi yêu cầu sửa chữa
- Tìm kiếm nhanh và giao diện responsive cho điện thoại

## Chạy dự án

```bash
bun install
bun run db:seed
bun dev
```

Mở [http://localhost:3002](http://localhost:3002) trên trình duyệt.

## Kiểm tra production

```bash
bun run lint
bun run build
```

## MongoDB và backend

Sao chép `.env.example` thành `.env.local`, sau đó điền MongoDB URI và tên database:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
MONGODB_DB=quan_ly_nha_tro
```

Toàn bộ nghiệp vụ backend nằm trong `src/backend`. Các Next.js Route Handler tại `src/app/api` chỉ đảm nhiệm lớp HTTP, vì vậy frontend và backend có thể được deploy chung trong một source.

API quản lý phòng:

- `GET /api/rooms`: phân trang, tìm kiếm và lọc trạng thái
- `POST /api/rooms`: thêm phòng
- `PATCH /api/rooms/:id`: cập nhật phòng
- `DELETE /api/rooms/:id`: xóa phòng

Chạy `bun run db:seed` để tạo indexes và thêm dữ liệu phòng mẫu. Script sẽ không chèn lại nếu collection đã có dữ liệu.
