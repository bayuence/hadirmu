# 🎯 HadirMu - Sistem Presensi Pengenalan Wajah

Aplikasi presensi modern dengan face recognition untuk masjid/komunitas, dibangun dengan Next.js 16 dan Supabase.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Latest-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2-38bdf8?logo=tailwind-css)

---

## ✨ Fitur Utama

### 🎥 Scanner Presensi
- **Input Manual ID 6 Digit** (format: DDMMYY - tanggal lahir)
- **Face Recognition** (coming soon - integrasi face-api.js)
- **Session Control** - Suspend/Resume sistem presensi
- **Real-time Feedback** - Toast notifications untuk setiap aksi

### 📋 Manajemen Data
- **CRUD Jamaah** - Tambah, edit, hapus data jamaah
- **Search & Filter** - Cari berdasarkan nama atau ID
- **Kategori** - Dewasa / Remaja
- **Gender** - Laki-laki / Perempuan

### 📊 Dashboard & Laporan
- **Statistik Real-time** - Total jamaah, hadir, tidak hadir, persentase
- **Live Feed** - Daftar kehadiran real-time
- **Chart Mingguan** - Visualisasi tren kehadiran
- **Rekap Bulanan** - Tabel kehadiran per minggu dengan export PDF/Excel

### 🔗 Antrean Gagal & Linking
- **Auto-queue** - ID tidak dikenal masuk antrean otomatis
- **Manual Linking** - Admin bisa menautkan wajah ke data jamaah
- **Search Jamaah** - Dropdown dengan search untuk linking cepat

### 🎨 UI/UX Premium
- **Dark/Light Mode** - Toggle theme dengan smooth transition
- **Responsive Design** - Mobile-first, tablet, desktop
- **Bottom Navigation** - Mobile navigation yang intuitif
- **Sidebar Collapsible** - Desktop sidebar yang bisa di-collapse
- **Toast Notifications** - Feedback visual untuk setiap aksi
- **Loading States** - Spinner dan disabled states

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ atau Bun
- pnpm (recommended) atau npm
- Akun Supabase (gratis)

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd hadirmu

# Install dependencies
pnpm install

# Setup environment variables
cp .env.local.example .env.local
# Edit .env.local dengan credentials Supabase Anda

# Run development server
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 🗄️ Setup Database

### 1. Buat Project Supabase
1. Buka [https://supabase.com](https://supabase.com)
2. Buat project baru
3. Tunggu ~2 menit sampai selesai

### 2. Jalankan SQL Schema
1. Buka **SQL Editor** di dashboard Supabase
2. Copy isi file `supabase-schema.sql`
3. Paste dan **Run**
4. Verifikasi 4 tabel sudah dibuat:
   - ✅ `jamaah`
   - ✅ `log_presensi`
   - ✅ `antrean_gagal`
   - ✅ `system_settings`

### 3. Setup Credentials
1. Buka **Settings** > **API** di Supabase
2. Copy **Project URL** dan **anon public key**
3. Paste ke file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Restart dev server: `pnpm dev`

📖 **Panduan lengkap**: Lihat file `SETUP_SUPABASE.md`

---

## 📁 Struktur Project

```
hadirmu/
├── app/
│   ├── layout.tsx          # Root layout dengan ThemeProvider
│   ├── page.tsx             # Main page dengan navigation
│   └── globals.css          # Global styles + animations
│
├── components/
│   ├── dashboard/
│   │   ├── dashboard-view.tsx      # Dashboard dengan stats & chart
│   │   ├── scanner-view.tsx        # Scanner + input manual + antrean
│   │   ├── jamaah-data-view.tsx    # CRUD data jamaah
│   │   └── rekap-bulanan-view.tsx  # Rekap kehadiran bulanan
│   │
│   ├── ui/                  # 57 komponen UI dari shadcn/ui
│   └── theme-provider.tsx   # Dark/Light mode provider
│
├── lib/
│   ├── supabase.ts         # Supabase client + database functions
│   ├── mock-data.ts        # Mock data untuk development
│   └── utils.ts            # Utility functions (cn, dll)
│
├── types/
│   └── index.ts            # TypeScript type definitions
│
├── hooks/
│   ├── use-toast.ts        # Toast notification hook
│   └── use-mobile.ts       # Mobile detection hook
│
├── supabase-schema.sql     # SQL schema untuk database
├── SETUP_SUPABASE.md       # Panduan setup database
└── .env.local              # Environment variables (jangan commit!)
```

---

## 🔧 Tech Stack

### Frontend
- **Next.js 16** - React framework dengan App Router
- **React 19** - UI library
- **TypeScript 5.7** - Type safety
- **Tailwind CSS 4** - Utility-first CSS
- **shadcn/ui** - Komponen UI premium
- **Lucide React** - Icon library
- **Recharts** - Chart library
- **next-themes** - Dark mode support

### Backend & Database
- **Supabase** - PostgreSQL database + Auth + Storage
- **@supabase/supabase-js** - Supabase client library

### Development Tools
- **pnpm** - Fast package manager
- **ESLint** - Code linting
- **Turbopack** - Fast bundler (Next.js 16)

---

## 📊 Database Schema

### Tabel: `jamaah`
```sql
- id: UUID (PK)
- id_jamaah: VARCHAR(6) UNIQUE -- Format: DDMMYY
- prefix: VARCHAR(10) -- Bp., Ibu, dll
- gelar: VARCHAR(10) -- H., Hj., dll
- nama_lengkap: VARCHAR(255)
- jenis_kelamin: CHAR(1) -- 'L' atau 'P'
- jenjang: VARCHAR(20) -- 'Dewasa' atau 'Remaja'
- foto_url: TEXT
- face_embedding: TEXT -- Untuk face recognition
- aktif: BOOLEAN
```

### Tabel: `log_presensi`
```sql
- id: UUID (PK)
- jamaah_id: UUID (FK)
- tanggal: DATE
- jam_masuk: TIME
- status: CHAR(1) -- 'H', 'A', 'I', 'S'
- metode_input: VARCHAR(20) -- 'manual', 'face_scan', dll
- keterangan: TEXT
```

### Tabel: `antrean_gagal`
```sql
- id: UUID (PK)
- temp_id: VARCHAR(50) UNIQUE -- Format: UNKNOWN-XXX
- thumbnail_url: TEXT
- face_embedding: TEXT
- status: VARCHAR(20) -- 'pending', 'resolved', 'ignored'
- linked_jamaah_id: UUID (FK)
```

### Tabel: `system_settings`
```sql
- setting_key: VARCHAR(100) UNIQUE
- setting_value: TEXT
- setting_type: VARCHAR(20) -- 'string', 'boolean', 'number', 'json'
```

---

## 🎯 Cara Menggunakan

### 1. Input ID Manual
1. Buka menu **"Kamera Pemindai"**
2. Klik **"Tap to Enter ID"**
3. Masukkan 6 digit ID (contoh: `150575`)
4. Klik tombol **Send** (ikon pesawat)
5. ✅ Jika ID ditemukan: Kehadiran tercatat
6. ⚠️ Jika ID tidak ditemukan: Masuk antrean gagal

### 2. Tautkan Antrean Gagal
1. Klik tab **"Antrean Gagal"**
2. Klik tombol **"Tautkan"** pada item
3. Cari nama jamaah di dropdown
4. Klik **"Tautkan Sekarang"**
5. ✅ Kehadiran tercatat dan item dihapus dari antrean

### 3. Suspend/Resume Session
1. Klik tombol **"Suspend"** di Session Control
2. 🔴 Sistem presensi dihentikan sementara
3. Klik **"Resume"** untuk mengaktifkan kembali
4. 🟢 Sistem aktif kembali

### 4. Kelola Data Jamaah
1. Buka menu **"Data Jamaah"**
2. Gunakan search untuk mencari
3. Filter berdasarkan kategori (Dewasa/Remaja)
4. Klik **"Add New"** untuk tambah data
5. Klik ikon **Edit** atau **Delete** untuk kelola data

### 5. Lihat Rekap Bulanan
1. Buka menu **"Rekap Bulanan"**
2. Pilih bulan dan tahun
3. Lihat tabel kehadiran per minggu
4. Klik **"Export PDF"** atau **"Export Excel"** (coming soon)

---

## 🔐 Security

### Environment Variables
- ✅ `.env.local` sudah ada di `.gitignore`
- ✅ Credentials tidak pernah di-commit ke Git
- ✅ Gunakan `NEXT_PUBLIC_*` untuk client-side variables

### Supabase Security
- 🔒 Row Level Security (RLS) bisa diaktifkan untuk production
- 🔒 Anon key aman untuk client-side (read-only by default)
- 🔒 Service role key hanya untuk server-side

### Best Practices
- ✅ Input validation di client & server
- ✅ SQL injection prevention (Supabase handles this)
- ✅ XSS prevention (React handles this)
- ✅ HTTPS only in production

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel

# Set environment variables di Vercel Dashboard
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Netlify
```bash
# Install Netlify CLI
pnpm add -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables di Netlify Dashboard
```

### Docker
```dockerfile
# Dockerfile sudah include di project (coming soon)
docker build -t hadirmu .
docker run -p 3000:3000 hadirmu
```

---

## 🛠️ Development

### Available Scripts
```bash
# Development
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Database
# Lihat SETUP_SUPABASE.md untuk SQL commands
```

### Code Style
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Conventional commits
- ✅ Component-driven development

---

## 📝 TODO / Roadmap

### Phase 1: Core Features ✅
- [x] Setup Next.js + TypeScript
- [x] UI/UX design dengan shadcn/ui
- [x] Supabase integration
- [x] Input ID manual
- [x] Antrean gagal & linking
- [x] CRUD data jamaah
- [x] Dashboard & statistik
- [x] Rekap bulanan

### Phase 2: Face Recognition 🚧
- [ ] Integrasi face-api.js
- [ ] Camera access & capture
- [ ] Face detection & recognition
- [ ] Face embedding storage
- [ ] Auto-match dengan database

### Phase 3: Advanced Features 📋
- [ ] Supabase Auth (login admin)
- [ ] Role-based access control
- [ ] Real-time updates (Supabase Realtime)
- [ ] Export PDF/Excel
- [ ] QR Code presensi
- [ ] Mobile app (React Native)
- [ ] WhatsApp notifications
- [ ] Audit log

### Phase 4: Analytics & Reporting 📊
- [ ] Advanced analytics dashboard
- [ ] Custom date range reports
- [ ] Attendance trends
- [ ] Absentee alerts
- [ ] Monthly/yearly summaries

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Authors

- **Your Name** - Initial work

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide](https://lucide.dev/) - Icon library
- [v0.dev](https://v0.dev/) - Initial UI design

---

## 📞 Support

Jika ada pertanyaan atau masalah:
- 📖 Baca `SETUP_SUPABASE.md` untuk panduan database
- 🐛 Buka issue di GitHub
- 💬 Diskusi di GitHub Discussions

---

**Made with ❤️ for the community**
