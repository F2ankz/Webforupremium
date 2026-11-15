# Facebook AI Sales Assistant

ระบบตอบ Inbox ของ Facebook Page ด้วย AI พร้อมตอบข้อมูลสินค้า เก็บตะกร้า ชื่อ เบอร์โทร ที่อยู่ และสร้างออเดอร์หลังลูกค้ายืนยัน

## สิ่งที่ระบบทำได้

- รับข้อความจาก Facebook Messenger Webhook
- ตอบภาษาไทยจากข้อมูลสินค้าใน `data/products.json`
- เก็บสินค้าและจำนวนลงตะกร้า
- เก็บชื่อ เบอร์โทร และที่อยู่จัดส่ง
- สร้างเลขออเดอร์หลังลูกค้าพิมพ์ยืนยัน
- ส่งต่อแอดมินเมื่อ AI ตอบไม่ได้ ลูกค้าขอคน หรือเป็นเรื่องละเอียดอ่อน
- ดูออเดอร์และแชตที่รอแอดมินที่ `/admin`

## ตั้งค่า

1. คัดลอก `.env.example` เป็น `.env`
2. ใส่ Page Access Token, Verify Token และ App Secret จาก Meta Developer App
3. ใส่ OpenAI API key
4. เปลี่ยนชื่อร้านและรหัสผ่านหน้าแอดมิน
5. แก้สินค้าใน `data/products.json`
6. เริ่มระบบด้วย `npm start`

ระบบจะเปิดที่ `http://localhost:3000` และมี health check ที่ `/health`

## เชื่อมกับ Facebook Page

นำระบบขึ้นโฮสต์ที่มี HTTPS แล้วตั้ง Callback URL ใน Messenger Webhooks เป็น:

`https://โดเมนของคุณ/webhook`

ใช้ค่า Verify Token เดียวกับ `META_VERIFY_TOKEN` และ subscribe อย่างน้อยกับ event `messages` ของเพจ

## ความปลอดภัย

- อย่า commit ไฟล์ `.env`
- ตั้ง `ADMIN_PASSWORD` ให้คาดเดายาก
- ระบบตรวจลายเซ็น `X-Hub-Signature-256` ของ Meta ทุก webhook
- อย่าให้บอตขอเลขบัตร รหัสผ่าน หรือ OTP
- ก่อนเปิดใช้จริงควรเพิ่มฐานข้อมูล การสำรองข้อมูล และระบบแจ้งเตือนแอดมิน
