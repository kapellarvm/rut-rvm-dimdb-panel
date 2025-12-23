# RUT-RVM Panel

Router, RVM ve DIM-DB yönetim paneli. X (Twitter) tarzı soft koyu tema ile modern, kullanıcı dostu arayüz.

## Özellikler

- **Dashboard**: Sistem durumu ve istatistikler
- **Router Yönetimi**: Tüm router'ları listele, filtrele, şifreleri görüntüle/kopyala
- **RVM Yönetimi**: RVM birimlerini ve bağlı router'ları görüntüle
- **DIM-DB Yönetimi**: DIM-DB ID'lerini yönet ve router'lara ata
- **Excel Import**: Akıllı parser ile toplu veri içe aktarma
- **Kullanıcı Yönetimi**: Admin ve izleyici rolleri

## Teknolojiler

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **UI**: shadcn/ui, Framer Motion, Lucide Icons
- **Backend**: Next.js API Routes, Prisma ORM
- **Auth**: NextAuth.js v5
- **Database**: Neon PostgreSQL
- **Testing**: Vitest, Playwright

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Ortam Değişkenlerini Ayarla

`.env.example` dosyasını `.env` olarak kopyala ve değerleri güncelle:

```env
DATABASE_URL="postgresql://username:password@host.neon.tech/database?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### 3. Veritabanını Hazırla

```bash
# Prisma client'ı oluştur
npm run db:generate

# Veritabanı şemasını uygula
npm run db:push

# Demo verileri ekle (opsiyonel)
npm run db:seed
```

### 4. Geliştirme Sunucusunu Başlat

```bash
npm run dev
```

http://localhost:3000 adresinde uygulama çalışır.

## Demo Hesapları

Seed script çalıştırıldıktan sonra:

- **Admin**: admin@rutpanel.com / admin123
- **Viewer**: viewer@rutpanel.com / viewer123

## Test

```bash
# Unit testler
npm run test

# E2E testler
npm run test:e2e

# Test coverage
npm run test:coverage
```

## Vercel'e Deploy

1. Vercel'de yeni proje oluştur
2. Environment variables ekle:
   - `DATABASE_URL`: Neon connection string
   - `NEXTAUTH_SECRET`: Güvenli bir secret key
   - `NEXTAUTH_URL`: Vercel URL'i (örn: https://myapp.vercel.app)
3. Deploy!

## Proje Yapısı

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth sayfaları
│   ├── (dashboard)/       # Dashboard sayfaları
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui bileşenleri
│   ├── shared/            # Paylaşılan bileşenler
│   └── layout/            # Layout bileşenleri
├── lib/
│   ├── excel-parser/      # Akıllı Excel parser
│   ├── auth.ts            # NextAuth config
│   ├── prisma.ts          # Prisma client
│   └── utils.ts           # Yardımcı fonksiyonlar
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types
```

## Lisans

MIT
