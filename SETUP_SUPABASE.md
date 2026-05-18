# 🚀 Setup Supabase untuk HadirMu

Panduan lengkap untuk menghubungkan aplikasi HadirMu ke Supabase.

---

## 📋 Langkah 1: Setup Database di Supabase

### 1.1 Buat Project Supabase
1. Buka [https://supabase.com](https://supabase.com)
2. Login atau Sign Up
3. Klik **"New Project"**
4. Isi detail project:
   - **Name**: HadirMu
   - **Database Password**: (simpan password ini!)
   - **Region**: Southeast Asia (Singapore) - pilih yang terdekat
5. Klik **"Create new project"**
6. Tunggu ~2 menit sampai project selesai dibuat

### 1.2 Jalankan SQL Schema
1. Di dashboard Supabase, buka **SQL Editor** (ikon di sidebar kiri)
2. Klik **"New query"**
3. Copy seluruh isi file `supabase-schema.sql` dari root project
4. Paste ke SQL Editor
5. Klik **"Run"** atau tekan `Ctrl+Enter`
6. Pastikan muncul pesan sukses: **"Success. No rows returned"**

### 1.3 Verifikasi Tabel Sudah Dibuat
1. Buka **Table Editor** di sidebar
2. Pastikan tabel berikut sudah ada:
   - ✅ `jamaah` (10 sample data)
   - ✅ `log_presensi`
   - ✅ `antrean_gagal`
   - ✅ `system_settings` (3 default settings)

---

## 🔑 Langkah 2: Setup Environment Variables

### 2.1 Dapatkan API Credentials
1. Di dashboard Supabase, klik **Settings** (ikon gear di sidebar)
2. Pilih **API** di menu kiri
3. Copy 2 nilai ini:
   - **Project URL** (contoh: `https://xxxxx.supabase.co`)
   - **anon public** key (key yang panjang)

### 2.2 Buat File .env.local
1. Di root project, buat file baru: `.env.local`
2. Isi dengan:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
```

3. Ganti nilai di atas dengan credentials Anda
4. **PENTING**: File `.env.local` sudah ada di `.gitignore`, jangan commit ke Git!

### 2.3 Restart Dev Server
```bash
# Stop server yang sedang running (Ctrl+C)
# Lalu jalankan ulang:
pnpm dev
```

---

## ✅ Langkah 3: Test Koneksi

### 3.1 Test Input ID Manual
1. Buka aplikasi di `http://localhost:3000`
2. Klik menu **"Kamera Pemindai"**
3. Klik **"Tap to Enter ID"**
4. Masukkan ID: `150575` (Bp. H. Ahmad Sudrajat)
5. Klik tombol **Send** (ikon pesawat)
6. **Hasil yang diharapkan**:
   - ✅ Muncul toast notification: "✅ Kehadiran Tercatat"
   - ✅ Scan Result menampilkan nama: "Bp. H. Ahmad Sudrajat"
   - ✅ Status: "Verified"

### 3.2 Test ID Tidak Dikenal
1. Masukkan ID: `999999` (tidak ada di database)
2. Klik **Send**
3. **Hasil yang diharapkan**:
   - ⚠️ Muncul toast: "⚠️ ID Tidak Dikenal"
   - ⚠️ Status: "Unknown"
   - ⚠️ Badge di tab "Antrean Gagal" bertambah

### 3.3 Test Antrean Gagal & Tautkan
1. Klik tab **"Antrean Gagal"**
2. Lihat item yang baru ditambahkan (UNKNOWN-xxxxx)
3. Klik tombol **"Tautkan"**
4. Cari nama: "Budi" atau pilih dari list
5. Klik **"Tautkan Sekarang"**
6. **Hasil yang diharapkan**:
   - ✅ Toast: "✅ Berhasil Ditautkan"
   - ✅ Item hilang dari antrean
   - ✅ Kehadiran tercatat di database

### 3.4 Test Suspend/Resume Session
1. Klik tombol **"Suspend"** di card Session Control
2. **Hasil yang diharapkan**:
   - 🔴 Toast: "🔴 Session Suspended"
   - 🔴 Scanner overlay menjadi blur
   - 🔴 Input ID disabled
3. Klik **"Resume"**
4. **Hasil yang diharapkan**:
   - 🟢 Toast: "🟢 Session Active"
   - 🟢 Scanner aktif kembali

### 3.5 Verifikasi di Database
1. Buka **Table Editor** di Supabase
2. Buka tabel **`log_presensi`**
3. Pastikan ada record baru dengan:
   - ✅ `jamaah_id` sesuai
   - ✅ `tanggal` = hari ini
   - ✅ `jam_masuk` = waktu input
   - ✅ `status` = 'H'
   - ✅ `metode_input` = 'manual'

---

## 🔍 Troubleshooting

### ❌ Error: "Supabase credentials not found"
**Solusi**:
1. Pastikan file `.env.local` ada di root project
2. Pastikan nama variable benar: `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Restart dev server: `pnpm dev`

### ❌ Error: "relation 'jamaah' does not exist"
**Solusi**:
1. SQL schema belum dijalankan
2. Buka SQL Editor di Supabase
3. Jalankan ulang file `supabase-schema.sql`

### ❌ Toast notification tidak muncul
**Solusi**:
1. Pastikan `<Toaster />` sudah ada di `app/layout.tsx`
2. Restart dev server

### ❌ Data tidak tersimpan ke database
**Solusi**:
1. Cek console browser (F12) untuk error
2. Pastikan credentials Supabase benar
3. Cek koneksi internet
4. Verifikasi RLS (Row Level Security) tidak menghalangi:
   - Buka **Authentication** > **Policies**
   - Pastikan tidak ada policy yang memblokir

---

## 📊 Struktur Database

### Tabel: `jamaah`
Menyimpan data master jamaah/anggota
- **id**: UUID (Primary Key)
- **id_jamaah**: VARCHAR(6) - Format DDMMYY (tanggal lahir)
- **nama_lengkap**: VARCHAR(255)
- **jenis_kelamin**: CHAR(1) - 'L' atau 'P'
- **jenjang**: VARCHAR(20) - 'Dewasa' atau 'Remaja'

### Tabel: `log_presensi`
Menyimpan riwayat kehadiran
- **id**: UUID (Primary Key)
- **jamaah_id**: UUID (Foreign Key ke jamaah)
- **tanggal**: DATE
- **jam_masuk**: TIME
- **status**: CHAR(1) - 'H', 'A', 'I', 'S'
- **metode_input**: VARCHAR(20) - 'manual', 'face_scan', dll

### Tabel: `antrean_gagal`
Menyimpan scan wajah yang tidak dikenali
- **id**: UUID (Primary Key)
- **temp_id**: VARCHAR(50) - Format UNKNOWN-XXX
- **status**: VARCHAR(20) - 'pending', 'resolved', 'ignored'
- **linked_jamaah_id**: UUID (Foreign Key ke jamaah)

### Tabel: `system_settings`
Menyimpan pengaturan sistem
- **setting_key**: VARCHAR(100) - Unique
- **setting_value**: TEXT
- **setting_type**: VARCHAR(20) - 'string', 'boolean', 'number', 'json'

---

## 🎯 Fitur yang Sudah Terintegrasi

### ✅ Input ID 6 Digit
- Query ke database berdasarkan `id_jamaah`
- Auto-insert ke `log_presensi` jika ditemukan
- Validasi duplikasi (1 jamaah = 1 presensi per hari)

### ✅ Antrean Gagal
- Auto-insert ke `antrean_gagal` jika ID tidak ditemukan
- Load data pending dari database saat page load
- Real-time update UI

### ✅ Tautkan Nama
- Dropdown jamaah dari database (real-time)
- Search/filter nama
- Update status antrean + insert log presensi

### ✅ Suspend/Resume Session
- Sync status ke `system_settings` table
- Persistent across page reload
- Toast notification

---

## 🚀 Next Steps

### Fitur yang Bisa Ditambahkan:
1. **Face Recognition**
   - Integrasi face-api.js atau TensorFlow.js
   - Simpan face embedding di kolom `face_embedding`
   - Auto-match wajah dengan database

2. **Real-time Updates**
   - Gunakan Supabase Realtime
   - Live feed kehadiran tanpa refresh
   - Notifikasi real-time

3. **Dashboard Statistics**
   - Gunakan view `v_statistik_hari_ini`
   - Chart kehadiran dari `log_presensi`
   - Export laporan PDF/Excel

4. **Authentication**
   - Supabase Auth untuk login admin
   - Role-based access control
   - Audit log

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

---

## 💡 Tips

1. **Development**: Gunakan Supabase local development untuk testing
2. **Production**: Setup environment variables di Vercel/hosting
3. **Backup**: Export database secara berkala
4. **Security**: Aktifkan RLS untuk production
5. **Monitoring**: Gunakan Supabase Dashboard untuk monitoring queries

---

**Selamat! Aplikasi HadirMu sudah terhubung ke Supabase! 🎉**
