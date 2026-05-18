# Panduan Struktur Proyek HadirMu

## 📁 Struktur Folder yang Sudah Dibuat

```
hadirmu/
├── app/
│   ├── layout.tsx          # Layout utama dengan ThemeProvider
│   └── page.tsx             # Halaman utama dengan navigasi sidebar
│
├── components/
│   ├── dashboard/
│   │   ├── dashboard-view.tsx      # View dashboard dengan statistik
│   │   ├── scanner-view.tsx        # View scanner wajah & input manual
│   │   ├── jamaah-data-view.tsx    # View data jamaah (CRUD)
│   │   └── rekap-bulanan-view.tsx  # View rekap kehadiran bulanan
│   │
│   ├── ui/                  # Komponen UI dari shadcn/ui (57 files)
│   └── theme-provider.tsx   # Provider untuk dark/light mode
│
├── lib/
│   ├── utils.ts            # Utility functions (cn, dll)
│   └── mock-data.ts        # 🆕 Mock data untuk development
│
├── types/
│   └── index.ts            # 🆕 Type definitions
│
└── hooks/
    ├── use-mobile.ts
    └── use-toast.ts
```

## ✅ Status Implementasi

### Sudah Selesai:
1. ✅ Layout utama dengan sidebar responsif
2. ✅ Navigasi dengan 4 view utama
3. ✅ Dashboard dengan statistik dan chart
4. ✅ Scanner view dengan input manual ID
5. ✅ Data jamaah dengan CRUD operations
6. ✅ Rekap bulanan dengan tabel kehadiran
7. ✅ Dark/Light mode toggle
8. ✅ Mobile responsive dengan bottom navigation
9. ✅ Semua menggunakan mock data (useState)

### Perlu Dibuat:
1. 🔄 File `lib/mock-data.ts` - Centralized mock data
2. 🔄 File `types/index.ts` - Type definitions
3. 🔄 Animasi scan-line untuk scanner (CSS)

## 🎯 Cara Menjalankan

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Buka browser di `http://localhost:3000`

## 📝 Mock Data yang Digunakan

### 1. Data Jamaah (jamaahDatabase)
- ID: 6 digit (DDMMYY format)
- Contoh: "150575" = 15 Mei 1975
- Total: 10 jamaah dummy

### 2. Data Kehadiran Real-time
- Live feed dengan timestamp
- Status: Hadir/Tidak Dikenal
- Auto-update setiap scan

### 3. Data Statistik
- Total Jamaah: 156
- Hadir Hari Ini: 98
- Tidak Hadir: 58
- Persentase: 87%

### 4. Data Rekap Bulanan
- Format: Senin & Kamis per minggu
- Status: H (Hadir), A (Absent), - (No Session)
- 5 minggu per bulan

## 🔧 Fitur Utama

### Scanner View
- **Face Scanner**: Simulasi kamera dengan overlay
- **Manual Input**: Input 6-digit ID dengan PIN pad style
- **Session Control**: Suspend/Resume scanning
- **Unresolved Queue**: Antrean wajah tidak dikenal
- **Linking Sheet**: Tautkan wajah ke data jamaah

### Dashboard View
- **Stats Cards**: 4 kartu statistik utama
- **Weekly Chart**: Bar chart kehadiran mingguan
- **Live Feed**: Real-time scan feed dengan scroll

### Jamaah Data View
- **Search**: Cari berdasarkan nama atau ID
- **Filter**: Filter berdasarkan kategori (Dewasa/Remaja)
- **CRUD**: Add, Edit, Delete jamaah
- **Responsive**: Card view (mobile) & Table view (desktop)

### Rekap Bulanan View
- **Month/Year Selector**: Pilih bulan dan tahun
- **Attendance Matrix**: Tabel kehadiran per minggu
- **Export**: PDF & Excel (UI only, belum fungsional)
- **Legend**: Keterangan status kehadiran

## 🎨 Design System

### Colors
- Primary: Biru (untuk aksen utama)
- Success: Hijau (untuk status hadir)
- Destructive: Merah (untuk status tidak hadir/error)
- Muted: Abu-abu (untuk background dan text secondary)

### Typography
- Font: Geist Sans & Geist Mono
- Sizes: 9px - 24px (responsive)
- Tracking: Wide untuk uppercase text

### Spacing
- Consistent: 2, 3, 4 (0.5rem, 0.75rem, 1rem)
- Padding: p-3, p-4
- Gap: gap-2, gap-3, gap-4

## 🚀 Next Steps (Setelah Mock Data Berjalan)

1. **Setup Supabase**
   - Buat tabel `jamaah`
   - Buat tabel `kehadiran`
   - Buat tabel `face_embeddings`

2. **Integrasi Database**
   - Install `@supabase/supabase-js`
   - Buat Supabase client
   - Replace mock data dengan real queries

3. **Face Recognition**
   - Integrasi dengan face-api.js atau TensorFlow.js
   - Setup camera access
   - Implement face matching logic

4. **Authentication**
   - Setup Supabase Auth
   - Protect admin routes
   - Add login page

## 📚 Dependencies Utama

- **Next.js 16**: React framework
- **React 19**: UI library
- **Tailwind CSS 4**: Styling
- **Radix UI**: Headless UI components
- **Lucide React**: Icon library
- **Recharts**: Chart library
- **next-themes**: Dark mode support

## 🐛 Known Issues

1. Scanner view file terpotong di line terakhir (SheetDescription)
2. Animasi scan-line belum ada di globals.css
3. Export PDF/Excel belum fungsional (UI only)

## 💡 Tips Development

1. Gunakan `pnpm dev` untuk hot reload
2. Test di mobile view dengan DevTools
3. Toggle dark/light mode untuk test theme
4. Semua data saat ini di state lokal (akan hilang saat refresh)
