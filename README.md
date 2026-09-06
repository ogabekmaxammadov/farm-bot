# Ferma boti — Telegram

Chorvachilik fermasini telefondan boshqarish uchun Telegram bot.
Sayt bilan **bir xil Supabase bazasidan** foydalanadi — botda kiritilgan
ma'lumot saytda ham, saytdagisi botda ham darhol ko'rinadi.

**Texnologiyalar:** TypeScript · grammY · Supabase

---

## 1. Ishga tushirish

### 1-qadam. Bot yarating

1. Telegramda [@BotFather](https://t.me/BotFather) ga yozing.
2. `/newbot` → botga nom va username bering.
3. U bergan **tokenni** nusxalang (masalan `7123456789:AAF...`).

### 2-qadam. O'z Telegram ID'ingizni bilib oling

[@userinfobot](https://t.me/userinfobot) ga `/start` yuboring — u sizga
raqamli ID beradi (masalan `123456789`).

> Bilmasangiz ham bo'ladi: `OWNER_TELEGRAM_IDS` ni bo'sh qoldirib botni
> ishga tushiring, so'ng botga yozing — u sizning ID'ingizni aytadi.

### 3-qadam. Sozlamalarni kiriting

```bash
cp .env.example .env
```

`.env` faylini to'ldiring:

```
BOT_TOKEN=7123456789:AAF...
OWNER_TELEGRAM_IDS=123456789
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

`SUPABASE_URL` va `SUPABASE_ANON_KEY` — sayt bilan **bir xil** qiymatlar
(Supabase → Project Settings → API).

### 4-qadam. Bazani tayyorlang

Agar hali qilmagan bo'lsangiz, Supabase SQL Editor'da ishga tushiring:

1. `farm site/supabase/migrations/0001_init.sql`
2. `farm site/supabase/migrations/0003_ochiq_kirish.sql`

### 5-qadam. Ishga tushiring

```bash
npm install
npm run dev
```

Telegramda botingizga `/start` yozing.

---

## 2. Botdan foydalanish

### Eng tez yo'l — birka raqamini yozing

Botga shunchaki `1234` deb yozsangiz, o'sha molning to'liq kartasi chiqadi:

```
💚 1234 — Marjona
Sut beradigan bug'oz sigir

📅 Tug'ilgan: 15.03.2021 (4 yosh 6 oy)
🧬 Zoti: Golshtin
🏠 Molxona: 2-molxona
⚖️ Vazni: 540 kg

🐣 Tug'gan: 2 marta (2 ta buzoq)
💉 Urug' quyilgan: 3 marta (natija 67%)
🤰 Bug'ozlik: 100-kun
📆 Tug'adi: 06.03.2027 (183 kun qoldi)
⏱ Servis davri: 100 kun
🔁 Tug'ish oralig'i: 395 kun
```

Karta ostida amal tugmalari chiqadi:

| Tugma | Vazifasi |
|-------|----------|
| 🔬 Bug'ozligini tekshirish | Tekshirilmagan urug'lantirish bo'lsa chiqadi |
| 💉 Urug' quyildi | Yangi urug'lantirish qayd etish |
| 🐣 Tug'di | Tug'ishni qayd etish (+ buzoqni ro'yxatga qo'shish) |
| 🔄 Turini o'zgartirish | Boshqa turga o'tkazish |
| ✏️ Tahrirlash | Ma'lumotlarni o'zgartirish |
| 📜 Tarix | Barcha o'zgarishlar va yozuvlar |

### Menyu tugmalari

| Tugma | Vazifasi |
|-------|----------|
| 🔍 Mol qidirish | Birka yoki laqab bo'yicha (qismiy ham) |
| ➕ Yangi mol | 5 qadamda yangi mol qo'shish |
| 📋 Ro'yxat | Turlar bo'yicha ko'rish, sahifalab |
| 📊 Statistika | Ferma umumiy holati |
| 🐣 Tug'ish rejasi | Yaqin 60 kunda tug'adiganlar |
| ❓ Yordam | Qo'llanma |

### Buyruqlar

```
/start        — boshlash
/qidirish     — mol qidirish  (/qidirish 1234 — to'g'ridan-to'g'ri)
/yangi        — yangi mol qo'shish
/tahrirlash   — molni tahrirlash
/royxat       — mollar ro'yxati
/statistika   — ferma holati
/tugish       — tug'ish rejasi
/bekor        — joriy amalni bekor qilish
/yordam       — yordam
```

### Sana kiritish

Bot sanani turli ko'rinishda tushunadi:

```
bugun          kecha          ertaga
15.03.2024     15/03/2024     15-03-2024
15.03.24       15.03          2024-03-15
10 kun oldin
```

Kerak bo'lmagan maydonni o'tkazib yuborish uchun `-` yuboring.

---

## 3. Turlar avtomatik o'zgaradi

Bot voqeadan keyin turni o'zgartirishni **so'raydi** — siz «Ha» yoki «Yo'q» deysiz:

```
Urug' quyildi          → Urug' quyilgan, tekshirilmagan (tana / sigir)
Tekshiruv: bug'oz      → Bug'oz tana / Sut beradigan bug'oz sigir
Tekshiruv: bug'oz emas → 1-urinish: Bug'oz bo'lmagan tana
                         2+ urinish: Qisir tana
                         Sigirlar uchun: Sut beradigan qisir sigir
Tug'di                 → Sut beradigan qisir sigir
```

«🔄 Turini o'zgartirish» tugmasida ⭐ belgisi mantiqiy o'tishlarni ko'rsatadi,
lekin istalgan turga o'tkaza olasiz. Har bir o'zgarish tarixga yoziladi.

---

## 4. Xavfsizlik

Botga faqat `.env` dagi `OWNER_TELEGRAM_IDS` ro'yxatidagi Telegram
hisoblari kira oladi. Boshqa hamma «Bu bot shaxsiy» degan javob oladi
va urinish terminalda log qilinadi.

Botni boshqa telefondan ham ishlatmoqchi bo'lsangiz, o'sha hisobning
ID'sini vergul bilan qo'shing:

```
OWNER_TELEGRAM_IDS=123456789,987654321
```

---

## 5. Doimiy ishlab turishi uchun

`npm run dev` terminal yopilganda to'xtaydi. Bot doim ishlashi uchun:

### Variant A — kompyuterda fon rejimida (pm2)

```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name ferma-bot
pm2 save
pm2 startup        # kompyuter yoqilganda avtomatik ishga tushadi
```

Foydali buyruqlar: `pm2 logs ferma-bot` · `pm2 restart ferma-bot` · `pm2 stop ferma-bot`

### Variant B — serverda (VPS)

Loyihani serverga ko'chiring, `.env` ni sozlang va yuqoridagi pm2
buyruqlarini bajaring. Bot **long polling** ishlatadi — ochiq port yoki
domen kerak emas.

---

## 6. Buyruqlar (ishlab chiqish)

```bash
npm run dev        # avtomatik qayta yuklanadigan rejim
npm run build      # TypeScript -> dist/
npm start          # dist/ dan ishga tushirish
npm run typecheck  # TypeScript tekshiruvi
npm test           # mantiq testlari (sana, yosh, tur o'tishlari)
npx tsx tests/render.ts   # xabar va tugmalar renderi
```

---

## 7. Loyiha tuzilishi

```
farm bot/
├── src/
│   ├── index.ts        # Bot, buyruqlar, tugmalar — hammasi shu yerda ulanadi
│   ├── config.ts       # .env o'qish va tekshirish
│   ├── db.ts           # Supabase ulanishi
│   ├── queries.ts      # Bazaga barcha murojaatlar
│   ├── session.ts      # Suhbat holati (ko'p bosqichli formalar uchun)
│   ├── keyboards.ts    # Menyular va inline tugmalar
│   ├── format.ts       # Xabar matnlari (mol kartasi, statistika, tarix)
│   ├── handlers.ts     # Ko'rish: qidiruv, ro'yxat, statistika, tarix
│   ├── forms.ts        # Ko'p bosqichli formalar (qo'shish, tahrirlash, ...)
│   └── domain/         # Turlar, sana/yosh hisoblari — sayt bilan bir xil mantiq
└── tests/              # Mantiq va render testlari
```

> ⚠️ `src/domain/` fayllari sayt bilan bir xil mantiqni takrorlaydi
> (`farm site/src/lib/constants.ts`, `utils.ts`). Turlar ro'yxatini
> o'zgartirsangiz, ikkala joyda ham yangilang.
