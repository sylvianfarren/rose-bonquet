# Chúc mừng 20/10 – BambuUP

Trang web tĩnh: bó hoa hồng 3D, scroll để bó hoa trồi lên, xoay sang góc nhìn từ trên xuống, tiến gần rồi nở hoa lộ ảnh 23 thành viên.
Không cần build, không cần cài đặt.

## Cấu trúc

```
index.html              trang chính
css/style.css           giao diện, màu theo bộ nhận diện BambuUP
js/main.js              dựng bó hoa 3D và hành trình scroll
vendor/                 three.js r128, AOS 2.3.4 (chạy offline, không dùng CDN)
assets/fonts/           Manrope (rút gọn Latin + tiếng Việt, giấy phép OFL)
assets/photos/          23 ảnh crop tròn, photo-01 … photo-23
vercel.json             cache cho asset
```

## Deploy lên Vercel

**Cách 1: kéo thả**
1. Đăng nhập vercel.com, chọn **Add New → Project**.
2. Kéo thả cả thư mục `bambuup-2010` vào.
3. Framework Preset để **Other**, không điền Build Command hay Output Directory.
4. Bấm **Deploy**.

**Cách 2: GitHub**
1. Đẩy thư mục này lên một repo GitHub.
2. Trên Vercel chọn **Add New → Project → Import** repo đó, giữ preset **Other**, bấm **Deploy**.

**Cách 3: Vercel CLI**
```
npm i -g vercel
cd bambuup-2010
vercel --prod
```

## Xem thử trên máy
Ảnh được dựng bằng WebGL nên cần chạy qua server cục bộ, không mở trực tiếp file:
```
cd bambuup-2010
python3 -m http.server 8000
```
Rồi mở http://localhost:8000

## Thay ảnh
Thay file trong `assets/photos/` bằng ảnh vuông 1:1 (khuyến nghị 288×288, WebP), giữ nguyên tên `photo-XX.webp`.
Ảnh được cache 7 ngày; sau khi thay, người xem cũ có thể cần tải lại trang.
