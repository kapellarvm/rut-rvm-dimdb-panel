# Neon'dan AWS PostgreSQL'e (Coolify) Migration Rehberi

Bu döküman, Neon PostgreSQL veritabanından AWS Lightsail üzerinde Coolify ile çalışan PostgreSQL'e veri aktarımı adımlarını içerir.

## Ön Gereksinimler

- AWS Lightsail sunucusu
- Coolify kurulu ve çalışır durumda
- SSH erişimi
- Neon veritabanı bağlantı bilgileri

---

## 1. Lightsail Sunucusuna Bağlanma

```bash
ssh ubuntu@SUNUCU-IP
# veya
ssh root@SUNUCU-IP
```

---

## 2. PostgreSQL Client Kurulumu

```bash
sudo apt update && sudo apt install -y postgresql-client
```

---

## 3. Coolify'da Yeni PostgreSQL Oluşturma

1. Coolify Dashboard'a git
2. **Add New Resource** > **Database** > **PostgreSQL**
3. Oluştur ve connection string'i al

Connection string formatı:
```
postgres://postgres:SIFRE@CONTAINER_ADI:5432/postgres
```

---

## 4. Neon'dan Veri Export Etme

Lightsail sunucusunda:

```bash
pg_dump 'postgresql://KULLANICI:SIFRE@HOST.neon.tech/VERITABANI?sslmode=require' \
  --data-only \
  --inserts \
  --no-owner \
  --no-acl \
  > ~/neon_backup.sql
```

### Örnek (Gerçek değerlerle):
```bash
pg_dump 'postgresql://neondb_owner:npg_0Dsl1LBtcAMu@ep-round-darkness-ah4gh0o3-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' \
  --data-only \
  --inserts \
  --no-owner \
  --no-acl \
  > ~/neon_backup.sql
```

### Export Doğrulama:
```bash
# Dosya oluştu mu kontrol et
ls -la ~/neon_backup.sql

# İçeriğe göz at
head -50 ~/neon_backup.sql
```

---

## 5. Uygulama Schema'sını Oluşturma

Önce Next.js uygulamasında Prisma ile tabloları oluştur.

### Uygulama Container'ını Bulma:
```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.CreatedAt}}" | head -20
```

### Schema Oluşturma:
```bash
docker exec -it UYGULAMA_CONTAINER_ADI sh -c "npx prisma db push"
```

---

## 6. PostgreSQL Container'ını Bulma

```bash
docker ps | grep postgres
```

Çıktı örneği:
```
18370498a3ae   postgres:17-alpine   ...   icwwcwkck4co88osks044gwg  (YENİ)
93f21dcadf30   postgres:17-alpine   ...   uc00oswc0s4w0044w4w0s440  (ESKİ)
6092db6f505b   postgres:15-alpine   ...   coolify-db                (Coolify internal)
```

> ⚠️ Doğru container'ı seçtiğinden emin ol! En son oluşturulan yeni olandır.

---

## 7. AWS PostgreSQL'e Import Etme

```bash
docker exec -i POSTGRES_CONTAINER_ADI psql -U postgres -d postgres < ~/neon_backup.sql
```

### Örnek:
```bash
docker exec -i icwwcwkck4co88osks044gwg psql -U postgres -d postgres < /home/ubuntu/neon_backup.sql
```

---

## 8. Import Doğrulama

```bash
# Kullanıcı sayısını kontrol et
docker exec -i CONTAINER_ADI psql -U postgres -d postgres -c "SELECT COUNT(*) FROM \"User\";"

# RVM sayısını kontrol et
docker exec -i CONTAINER_ADI psql -U postgres -d postgres -c "SELECT COUNT(*) FROM \"RvmUnit\";"

# Tüm tabloları listele
docker exec -i CONTAINER_ADI psql -U postgres -d postgres -c "\dt"
```

---

## 9. Uygulama Environment Variables

Coolify'da uygulamanın environment variables bölümüne:

```env
DATABASE_URL=postgres://postgres:SIFRE@CONTAINER_ADI:5432/postgres
NEXTAUTH_URL=https://DOMAIN.com
NEXTAUTH_SECRET=GUCLU_RANDOM_KEY
AUTH_TRUST_HOST=true
NODE_ENV=production
HOSTNAME=0.0.0.0
```

> ⚠️ `NEXTAUTH_SECRET` yazımına dikkat! (NEXTAUTH_SECRE değil)

---

## 10. Vercel'den AWS'e Redirect (Opsiyonel)

Eski Vercel deployment'ı yeni adrese yönlendirmek için `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "destination": "https://YENİ-DOMAIN.com/$1",
      "permanent": true
    }
  ]
}
```

---

## Sorun Giderme

### UntrustedHost Hatası
```
[auth][error] UntrustedHost: Host must be trusted
```
**Çözüm:** Environment variables'a ekle:
```env
AUTH_TRUST_HOST=true
```

### MissingSecret Hatası
```
[auth][error] MissingSecret: Please define a `secret`
```
**Çözüm:** `NEXTAUTH_SECRET` doğru yazıldığından emin ol (T harfi eksik olabilir)

### Container Bulunamadı
```
Error response from daemon: No such container
```
**Çözüm:** Container yeniden deploy edilmiş olabilir, yeni ID'yi bul:
```bash
docker ps --format "table {{.Names}}\t{{.CreatedAt}}" | head -10
```

### Dosya Bulunamadı
```
bash: /root/neon_backup.sql: No such file or directory
```
**Çözüm:** Dosyanın tam yolunu bul:
```bash
find / -name "neon_backup.sql" 2>/dev/null
```

---

## Özet Komutlar (Hızlı Referans)

```bash
# 1. PostgreSQL client kur
sudo apt update && sudo apt install -y postgresql-client

# 2. Neon'dan export
pg_dump 'NEON_CONNECTION_STRING' --data-only --inserts --no-owner --no-acl > ~/neon_backup.sql

# 3. Container'ları listele
docker ps | grep postgres

# 4. Schema oluştur (uygulama container'ında)
docker exec -it APP_CONTAINER sh -c "npx prisma db push"

# 5. Import et
docker exec -i POSTGRES_CONTAINER psql -U postgres -d postgres < ~/neon_backup.sql

# 6. Doğrula
docker exec -i POSTGRES_CONTAINER psql -U postgres -d postgres -c "SELECT COUNT(*) FROM \"User\";"
```

---

## Tarih
- **Migration Tarihi:** 2025-01-06
- **Kaynak:** Neon PostgreSQL
- **Hedef:** AWS Lightsail + Coolify PostgreSQL
