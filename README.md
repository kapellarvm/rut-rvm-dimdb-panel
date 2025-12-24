# RUT-RVM-DIMDB Panel

Router, RVM ve DIM-DB yonetim paneli. Modern, kullanici dostu arayuz ile cihaz takibi ve atama islemleri.

## Ozellikler

### Dashboard
- Sistem durumu ve istatistikler
- Son aktiviteler
- Hizli erisim kartlari

### Router Yonetimi
- Tum router'lari listele, filtrele, ara
- Sifreleri goruntulle/kopyala (WiFi, Panel)
- RVM ve DIM-DB atama
- **Hizli Atama**: Router detayindan direkt RVM/DIM-DB atama (otomatik olusturma destegi)

### RVM Yonetimi
- RVM birimlerini ve bagli router'lari goruntule
- **Akilli Filtreler**: RVM ID formatina gore filtreleme
  - Makine Sinifi
  - Uretim Yili
  - Uretim Ayi

### RVM ID Formati
```
KPL 04 0 25 11 002
 |   |  |  |  |  |
 |   |  |  |  |  +-- Uretim sirasi (002)
 |   |  |  |  +----- Ay (11 = Kasim)
 |   |  |  +-------- Yil (25 = 2025)
 |   |  +----------- Ayrac
 |   +-------------- Makine sinifi (04)
 +------------------ Sirket kodu (KPL)
```

### DIM-DB Yonetimi
- DIM-DB ID'lerini yonet
- Tekil ve toplu ekleme
- Router'lara atama durumu takibi

### Excel Import
- Akilli parser ile toplu veri ice aktarma
- Otomatik kolon eslestirme
- Esnek baslik algilama (baslik satiri atlama)
- Turkce ve Ingilizce kolon isimleri destegi

### Kullanici Yonetimi
- Admin (SUPER_ADMIN) ve izleyici (VIEWER) rolleri
- Aktivite loglari

## Teknolojiler

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **UI**: shadcn/ui (Radix UI), Lucide Icons
- **Backend**: Next.js API Routes, Prisma ORM
- **Auth**: NextAuth.js v5
- **Database**: PostgreSQL (Neon)
- **Testing**: Vitest

## Kurulum

### 1. Bagimliliklari Yukle

```bash
npm install
```

### 2. Ortam Degiskenlerini Ayarla

`.env` dosyasi olustur:

```env
DATABASE_URL="postgresql://username:password@host.neon.tech/database?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
```

### 3. Veritabanini Hazirla

```bash
# Prisma client olustur
npm run db:generate

# Veritabani semasini uygula
npm run db:push

# Demo verileri ekle (opsiyonel)
npm run db:seed
```

### 4. Gelistirme Sunucusunu Baslat

```bash
npm run dev
```

http://localhost:3000 adresinde uygulama calisir.

## Demo Hesaplari

Seed script calistirildiktan sonra:

| Rol | Email | Sifre |
|-----|-------|-------|
| Admin | admin@rutpanel.com | admin123 |
| Viewer | viewer@rutpanel.com | viewer123 |

## Scriptler

```bash
npm run dev          # Gelistirme sunucusu
npm run build        # Production build
npm run start        # Production sunucusu
npm run lint         # ESLint kontrol
npm run test         # Unit testler
npm run db:generate  # Prisma client olustur
npm run db:push      # Schema'yi veritabanina uygula
npm run db:seed      # Demo verileri ekle
npm run db:studio    # Prisma Studio (DB GUI)
```

## Production Deploy

### Vercel

1. Vercel'de yeni proje olustur
2. Environment variables ekle:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Guvenli secret key (min 32 karakter)
   - `NEXTAUTH_URL`: Production URL
3. Deploy

### Docker (Opsiyonel)

```bash
docker build -t rut-rvm-panel .
docker run -p 3000:3000 --env-file .env rut-rvm-panel
```

## Proje Yapisi

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login sayfasi
│   ├── (dashboard)/       # Dashboard sayfalari
│   │   └── dashboard/
│   │       ├── routers/   # Router yonetimi
│   │       ├── rvm/       # RVM yonetimi
│   │       ├── dimdb/     # DIM-DB yonetimi
│   │       ├── users/     # Kullanici yonetimi
│   │       └── import/    # Excel import
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui bileşenleri
│   ├── shared/            # Paylasilan bilesenler
│   └── layout/            # Layout bileşenleri
├── lib/
│   ├── excel-parser/      # Akilli Excel parser
│   ├── auth.ts            # NextAuth config
│   ├── prisma.ts          # Prisma client
│   └── utils.ts           # Yardimci fonksiyonlar
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types

prisma/
├── schema.prisma          # Veritabani semasi
└── seed.ts               # Demo veri scripti
```

## API Endpoints

| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | /api/routers | Router listesi |
| POST | /api/routers | Yeni router |
| PATCH | /api/routers/[id] | Router guncelle |
| POST | /api/routers/[id]/quick-assign | Hizli RVM/DIM-DB atama |
| GET | /api/rvm | RVM listesi |
| GET | /api/rvm/filters | RVM filtre secenekleri |
| POST | /api/rvm | Yeni RVM |
| GET | /api/dimdb | DIM-DB listesi |
| POST | /api/dimdb | Yeni DIM-DB |
| POST | /api/dimdb/bulk | Toplu DIM-DB ekleme |
| POST | /api/import | Excel import |
| GET | /api/dashboard/stats | Dashboard istatistikleri |

## Lisans

MIT
