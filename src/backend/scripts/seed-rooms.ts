import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB;

if (!uri || !databaseName) throw new Error('Thiếu MONGODB_URI hoặc MONGODB_DB trong .env.local.');

const rooms = [
  { name: 'P.101', floor: 'Tầng 1', tenant: 'Nguyễn Minh Anh', price: 3500000, status: 'Đang thuê', people: 2 },
  { name: 'P.102', floor: 'Tầng 1', tenant: 'Trần Quốc Huy', price: 3200000, status: 'Đang thuê', people: 1 },
  { name: 'P.103', floor: 'Tầng 1', tenant: 'Chưa có người thuê', price: 3000000, status: 'Còn trống', people: 0 },
  { name: 'P.201', floor: 'Tầng 2', tenant: 'Lê Thảo My', price: 3800000, status: 'Đang thuê', people: 2 },
  { name: 'P.202', floor: 'Tầng 2', tenant: 'Phạm Gia Bảo', price: 3500000, status: 'Sắp trả', people: 1 },
  { name: 'P.203', floor: 'Tầng 2', tenant: 'Vũ Khánh Linh', price: 3600000, status: 'Đang thuê', people: 2 },
  { name: 'P.301', floor: 'Tầng 3', tenant: 'Chưa có người thuê', price: 3900000, status: 'Còn trống', people: 0 },
  { name: 'P.302', floor: 'Tầng 3', tenant: 'Đỗ Đức Nam', price: 4000000, status: 'Đang thuê', people: 2 }
];

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const collection = client.db(databaseName).collection('rooms');
  await Promise.all([
    collection.createIndex({ name: 1 }, { unique: true, name: 'unique_room_name' }),
    collection.createIndex({ status: 1 }, { name: 'room_status' }),
    collection.createIndex({ tenant: 1 }, { name: 'room_tenant' })
  ]);

  const existing = await collection.countDocuments();
  if (existing > 0) {
    console.log(`Collection rooms đã có ${existing} bản ghi, bỏ qua dữ liệu mẫu.`);
  } else {
    const now = new Date();
    const result = await collection.insertMany(rooms.map((room) => ({ ...room, createdAt: now, updatedAt: now })));
    console.log(`Đã tạo collection rooms và thêm ${result.insertedCount} phòng mẫu.`);
  }
} finally {
  await client.close();
}
