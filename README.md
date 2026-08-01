# Intellektual Salomatlik Platformasi (ISP)

Xronik noinfeksion kasalliklar xavfini baholash, bashorat qilish va Farg'ona vodiysi
aholisi uchun shaxsiylashtirilgan profilaktik tavsiyalar beruvchi axborot tizimi.

Express serverning o'zi ham API ni (`/api/...`), ham React frontendni beradi.

---

## Talablar

- Node.js 20+
- npm

## Mahalliy ishga tushirish

```bash
npm install
cp .env.example .env      # keyin GEMINI_API_KEY ni to'ldiring
npm run dev               # http://localhost:3000
```

## Ishlab chiqarish (production)

```bash
npm install
npm run build
NODE_ENV=production npm start
```

---

## Sozlamalar (`.env`)

| O'zgaruvchi | Standart | Vazifasi |
|---|---|---|
| `VITE_API_URL` | *(bo'sh)* | Bo'sh bo'lsa API so'rovlari sahifaning o'z origini ga (`/api/...`) yuboriladi. Backend alohida domenda bo'lsagina to'ldiriladi. |
| `GEMINI_API_KEY` | — | AI tahlil uchun kalit. Bo'lmasa lokal (AI'siz) tahlil ishlaydi. |
| `PORT` | `3000` | Server porti. |
| `HOST` | `0.0.0.0` | Tinglash manzili. |
| `NODE_ENV` | `development` | `production` bo'lsa `dist/` papkasidan beriladi. |
| `FORCE_HTTPS` | `false` | `true` bo'lsa HTTP so'rovlar HTTPS ga yo'naltiriladi. |
| `CORS_ORIGINS` | *(bo'sh)* | Ruxsat etilgan cross-origin manzillar, vergul bilan. Bo'sh — barchasiga ruxsat. |

### `VITE_API_URL` haqida muhim eslatma

`VITE_API_URL` **build vaqtida** frontendga yoziladi, shuning uchun uni
o'zgartirgandan keyin **qayta build qilish shart**.

- **Bo'sh qoldiring** — tavsiya etiladi. Ilova HTTP va HTTPS da bir xil ishlaydi,
  mixed-content bloklanmaydi, CORS kerak emas.
- **HTTPS sahifada HTTP manzil berilsa** brauzer so'rovni bloklaydi. Shu sababli
  ilova bunday holatni aniqlab, avtomatik HTTPS ga o'tkazadi yoki o'z origini ga
  qaytadi va konsolga ogohlantirish yozadi.

---

## Deploy: nginx + HTTPS

Node serverni `127.0.0.1:3000` da ishlatib, nginx ni oldiga qo'yish tavsiya etiladi.

```nginx
server {
    listen 80;
    server_name sizning-domen.uz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sizning-domen.uz;

    ssl_certificate     /etc/letsencrypt/live/sizning-domen.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sizning-domen.uz/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";

        # AI tahlil 180 soniyagacha davom etishi mumkin
        proxy_read_timeout 200s;
        proxy_send_timeout 200s;
    }
}
```

`X-Forwarded-Proto` sarlavhasi muhim: server `trust proxy` rejimida ishlagani
uchun HTTPS ni shu orqali aniqlaydi.

Sertifikat ishlaganiga ishonch hosil qilgandan keyin `.env` da
`FORCE_HTTPS=true` qilish mumkin.

### systemd xizmati

```ini
[Unit]
Description=ISP platformasi
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/isp
Environment=NODE_ENV=production
EnvironmentFile=/opt/isp/.env
ExecStart=/usr/bin/node dist/server.cjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## Tekshirish (diagnostika)

```bash
curl https://sizning-domen.uz/api/health
```

Javob namunasi:

```json
{
  "ok": true,
  "env": "production",
  "protocol": "https",
  "secure": true,
  "forwardedProto": "https",
  "aiConfigured": true,
  "forceHttps": false
}
```

- `secure: false` bo'lsa — nginx `X-Forwarded-Proto` sarlavhasini yubormayapti.
- `aiConfigured: false` bo'lsa — `GEMINI_API_KEY` sozlanmagan (ilova baribir
  lokal tahlil bilan ishlaydi).
- Noma'lum `/api/...` yo'llari HTML emas, JSON 404 qaytaradi.

## Ko'p uchraydigan muammolar

| Belgi | Sabab | Yechim |
|---|---|---|
| Sahifa ochiladi, lekin barcha so'rovlar xato | `VITE_API_URL` ishlamayotgan tashqi backendga qaratilgan | `.env` da bo'sh qoldiring va qayta build qiling |
| Konsolda `Mixed Content` | HTTPS sahifadan HTTP API ga so'rov | `VITE_API_URL` ni bo'sh qoldiring yoki HTTPS manzil bering |
| Oq (bo'sh) sahifa | `dist/` yig'ilmagan | `npm run build` |
| `502 Bad Gateway` | Node jarayoni ishlamayapti | `systemctl status isp`, `journalctl -u isp -n 50` |
| JSON o'rniga HTML xatolik | Eski versiyada API 404 SPA sahifasini qaytarardi | Yangi versiyaga yangilang |
