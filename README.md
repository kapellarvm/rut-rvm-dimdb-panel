# RUT-RVM-DIMDB Panel

Router, RVM ve DIM-DB yönetim paneli. X (Twitter) tarzı soft koyu tema ile modern, kullanıcı dostu arayüz.

## Özellikler

- **Dashboard**: Sistem durumu ve istatistikler
- **Router Yönetimi**: Tüm router'ları listele, filtrele, şifreleri görüntüle/kopyala
- **RVM Yönetimi**: RVM birimlerini ve bağlı router'ları görüntüle
- **DIM-DB Yönetimi**: DIM-DB ID'lerini yönet ve router'lara ata
- **Excel Import**: Akıllı parser ile toplu veri içe aktarma (fuzzy column matching)
- **Kullanıcı Yönetimi**: Admin ve izleyici rolleri
- **Şifre Maskeleme**: Şifreleri gizle/göster/kopyala

## Teknolojiler

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI**: shadcn/ui, Framer Motion, Lucide Icons
- **Backend**: Next.js API Routes, Prisma ORM
- **Auth**: NextAuth.js v5 (Beta)
- **Database**: Neon PostgreSQL
- **Testing**: Vitest, Playwright

---

## Hızlı Kurulum (Local)

### Adım 1: Repoyu Klonla

```bash
git clone https://github.com/kapellarvm/rut-rvm-dimdb-panel.git
cd rut-rvm-dimdb-panel
```

### Adım 2: Bağımlılıkları Yükle

```bash
npm install
```

### Adım 3: `.env` Dosyası Oluştur

Proje kök dizininde `.env` dosyası oluştur:

```env
# Neon Database URL (kendi bilgilerinle değiştir)
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require"

# NextAuth ayarları
NEXTAUTH_SECRET="herhangi-gizli-bir-key-32-karakter"
NEXTAUTH_URL="http://localhost:3000"
```

**NEXTAUTH_SECRET oluşturmak için:**
```bash
openssl rand -base64 32
```

### Adım 4: Veritabanı Tablolarını Oluştur

```bash
# Prisma client oluştur
npx prisma generate

# Tabloları Neon'a gönder
npx prisma db push
```

### Adım 5: Demo Kullanıcıları Ekle (Opsiyonel)

```bash
npm run db:seed
```

Bu komut şu kullanıcıları oluşturur:
| Email | Şifre | Rol |
|-------|-------|-----|
| admin@rutpanel.com | admin123 | SUPER_ADMIN |
| viewer@rutpanel.com | viewer123 | VIEWER |

### Adım 6: Uygulamayı Başlat

```bash
npm run dev
```

Tarayıcıda aç: **http://localhost:3000**

---

## Manuel SQL Kurulumu (Prisma Çalışmazsa)

Eğer Prisma binary indirme sorunu yaşarsan, Neon SQL Editor'da bu SQL'i çalıştır:

```sql
-- Enum types
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'VIEWER');
CREATE TYPE "DimDbStatus" AS ENUM ('AVAILABLE', 'ASSIGNED');

-- Users tablosu
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- RVM Units tablosu
CREATE TABLE "rvm_units" (
    "id" TEXT NOT NULL,
    "rvm_id" TEXT NOT NULL,
    "name" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rvm_units_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rvm_units_rvm_id_key" ON "rvm_units"("rvm_id");

-- DIM-DB tablosu
CREATE TABLE "dimdb_list" (
    "id" TEXT NOT NULL,
    "dimdb_code" TEXT NOT NULL,
    "description" TEXT,
    "status" "DimDbStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dimdb_list_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dimdb_list_dimdb_code_key" ON "dimdb_list"("dimdb_code");

-- Routers tablosu
CREATE TABLE "routers" (
    "id" TEXT NOT NULL,
    "box_no_prefix" TEXT,
    "box_no" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "mac_address" TEXT NOT NULL,
    "firmware" TEXT,
    "ssid" TEXT,
    "wifi_password" TEXT,
    "device_password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rvm_unit_id" TEXT,
    "dimdb_id" TEXT,
    CONSTRAINT "routers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "routers_serial_number_key" ON "routers"("serial_number");
CREATE UNIQUE INDEX "routers_imei_key" ON "routers"("imei");

-- Activity Logs tablosu
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "routers" ADD CONSTRAINT "routers_rvm_unit_id_fkey"
    FOREIGN KEY ("rvm_unit_id") REFERENCES "rvm_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "routers" ADD CONSTRAINT "routers_dimdb_id_fkey"
    FOREIGN KEY ("dimdb_id") REFERENCES "dimdb_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

**Demo Admin Kullanıcısı Ekle:**
```sql
-- Şifre: admin123 (bcrypt hash)
INSERT INTO "users" ("id", "email", "password_hash", "name", "role", "created_at", "updated_at")
VALUES (
    'admin-user-id',
    'admin@rutpanel.com',
    '$2b$10$rQZ5M5X5X5X5X5X5X5X5XO5X5X5X5X5X5X5X5X5X5X5X5X5X5X5',
    'Admin',
    'SUPER_ADMIN',
    NOW(),
    NOW()
);
```

> **Not:** Yukarıdaki hash çalışmayabilir. `npm run db:seed` komutu doğru hash oluşturur.

---

## Vercel'e Deploy

### 1. Vercel'de Proje Oluştur

```bash
npx vercel
```

veya [vercel.com](https://vercel.com) üzerinden GitHub reposunu bağla.

### 2. Environment Variables Ekle

Vercel Dashboard → Settings → Environment Variables:

| Değişken | Değer |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` çıktısı |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |

### 3. Deploy Et

```bash
npx vercel --prod
```

---

## Kullanım

### Roller

| Rol | Yetkiler |
|-----|----------|
| **SUPER_ADMIN** | Tüm CRUD işlemleri, kullanıcı yönetimi, Excel import |
| **VIEWER** | Sadece görüntüleme, şifreleri kopyalama |

### Excel Import

Panel, çeşitli kolon adlandırmalarını otomatik algılar:

| Algılanan Kolonlar |
|--------------------|
| S/N, Serial, Seri No, Serial Number |
| IMEI, IMEI No |
| MAC, MAC Address, Mac Adresi |
| WiFi Password, Wifi Şifresi, SSID Password |
| Device Password, Panel Şifresi, Cihaz Şifresi |
| RVM ID, RVM No |
| DIM-DB ID, DIMDB |

### Router Panel Erişimi

Tüm router'ların yönetim paneli: **192.168.53.10**

---

## Geliştirme

### Komutlar

```bash
# Geliştirme sunucusu
npm run dev

# Build
npm run build

# Prodüksiyon sunucusu
npm start

# Lint
npm run lint

# Unit testler
npm run test

# E2E testler
npm run test:e2e

# Test coverage
npm run test:coverage

# Prisma Studio (DB görüntüleyici)
npx prisma studio
```

### Proje Yapısı

```
├── prisma/
│   ├── schema.prisma      # Veritabanı şeması
│   └── seed.ts            # Demo veri script
├── src/
│   ├── app/
│   │   ├── (auth)/        # Login sayfası
│   │   ├── (dashboard)/   # Dashboard sayfaları
│   │   │   └── dashboard/
│   │   │       ├── page.tsx        # Ana dashboard
│   │   │       ├── routers/        # Router yönetimi
│   │   │       ├── rvm/            # RVM yönetimi
│   │   │       ├── dimdb/          # DIM-DB yönetimi
│   │   │       ├── import/         # Excel import
│   │   │       └── users/          # Kullanıcı yönetimi
│   │   └── api/           # API endpoints
│   ├── components/
│   │   ├── ui/            # shadcn/ui bileşenleri
│   │   ├── shared/        # PasswordField, CopyButton, vs.
│   │   └── layout/        # Sidebar, Header
│   ├── lib/
│   │   ├── excel-parser/  # Akıllı Excel parser
│   │   │   ├── header-detector.ts   # Kolon algılama
│   │   │   ├── data-validator.ts    # Veri doğrulama
│   │   │   └── merge-strategy.ts    # Güncelleme stratejisi
│   │   ├── auth.ts        # NextAuth config
│   │   └── prisma.ts      # Prisma client
│   └── hooks/             # Custom hooks
├── tests/
│   ├── unit/              # Vitest unit testler
│   └── e2e/               # Playwright E2E testler
└── .env                   # Ortam değişkenleri (gitignore'da)
```

---

## Sorun Giderme

### Prisma Binary Hatası

```
Error: Failed to fetch the engine file - 403 Forbidden
```

**Çözüm:** Manuel SQL kurulumunu kullan (yukarıda).

### NextAuth Hatası

```
[next-auth][error][NO_SECRET]
```

**Çözüm:** `.env` dosyasında `NEXTAUTH_SECRET` tanımla.

### Database Bağlantı Hatası

```
Can't reach database server
```

**Çözüm:**
1. `DATABASE_URL` doğru mu kontrol et
2. Neon'da IP whitelist ayarını kontrol et (0.0.0.0/0 olmalı)

---

## Lisans

MIT
