// Mock data untuk development - akan diganti dengan Supabase nanti

import type {
  JamaahDatabase,
  Jamaah,
  RealtimeFeedItem,
  UnresolvedScan,
  WeeklyChartData,
  AttendanceRecord,
} from "@/types"

// Database jamaah untuk lookup berdasarkan ID
export const jamaahDatabase: JamaahDatabase = {
  "150575": { name: "Bp. H. Ahmad Sudrajat", avatar: "AS" },
  "220380": { name: "Ibu Hj. Siti Nurhaliza", avatar: "SN" },
  "100590": { name: "Bp. Budi Santoso", avatar: "BS" },
  "051295": { name: "Ibu Dewi Lestari", avatar: "DL" },
  "150504": { name: "Rizky Pratama", avatar: "RP" },
  "120688": { name: "Bp. Hendra Wijaya", avatar: "HW" },
  "080792": { name: "Ibu Ratna Sari", avatar: "RS" },
  "250199": { name: "Ahmad Fauzi", avatar: "AF" },
  "110385": { name: "Bp. Surya Atmaja", avatar: "SA" },
  "030691": { name: "Ibu Kartini Putri", avatar: "KP" },
}

// List lengkap jamaah untuk dropdown/search
export const jamaahList = [
  { id: "150575", name: "Bp. H. Ahmad Sudrajat" },
  { id: "220380", name: "Ibu Hj. Siti Nurhaliza" },
  { id: "100590", name: "Bp. Budi Santoso" },
  { id: "051295", name: "Ibu Dewi Lestari" },
  { id: "150504", name: "Rizky Pratama" },
  { id: "120688", name: "Bp. Hendra Wijaya" },
  { id: "080792", name: "Ibu Ratna Sari" },
  { id: "250199", name: "Ahmad Fauzi" },
  { id: "110385", name: "Bp. Surya Atmaja" },
  { id: "030691", name: "Ibu Kartini Putri" },
]

// Data jamaah lengkap untuk CRUD
export const initialJamaahData: Jamaah[] = [
  {
    id: 1,
    jamaahId: "150575",
    prefix: "Bp.",
    gelar: "H.",
    namaLengkap: "Ahmad Sudrajat",
    jenisKelamin: "L",
    jenjang: "Dewasa",
  },
  {
    id: 2,
    jamaahId: "220380",
    prefix: "Ibu",
    gelar: "Hj.",
    namaLengkap: "Siti Nurhaliza",
    jenisKelamin: "P",
    jenjang: "Dewasa",
  },
  {
    id: 3,
    jamaahId: "100590",
    prefix: "Bp.",
    gelar: "",
    namaLengkap: "Budi Santoso",
    jenisKelamin: "L",
    jenjang: "Dewasa",
  },
  {
    id: 4,
    jamaahId: "051295",
    prefix: "Ibu",
    gelar: "",
    namaLengkap: "Dewi Lestari",
    jenisKelamin: "P",
    jenjang: "Dewasa",
  },
  {
    id: 5,
    jamaahId: "150504",
    prefix: "",
    gelar: "",
    namaLengkap: "Rizky Pratama",
    jenisKelamin: "L",
    jenjang: "Remaja",
  },
]

// Real-time feed untuk dashboard
export const realtimeFeed: RealtimeFeedItem[] = [
  { id: 1, name: "Bp. Ahmad Sudrajat", time: "19:32:15", avatar: "AS" },
  { id: 2, name: "Ibu Siti Nurhaliza", time: "19:31:42", avatar: "SN" },
  { id: 3, name: "Bp. Budi Santoso", time: "19:30:58", avatar: "BS" },
  { id: 4, name: "Ibu Dewi Lestari", time: "19:30:21", avatar: "DL" },
  { id: 5, name: "Bp. Hendra Wijaya", time: "19:29:45", avatar: "HW" },
  { id: 6, name: "Ibu Ratna Sari", time: "19:28:33", avatar: "RS" },
  { id: 7, name: "Bp. Joko Widodo", time: "19:27:18", avatar: "JW" },
  { id: 8, name: "Ibu Mega Wati", time: "19:26:05", avatar: "MW" },
]

// Data chart kehadiran mingguan
export const weeklyChartData: WeeklyChartData[] = [
  { day: "Sen 1", hadir: 92, tidakHadir: 64 },
  { day: "Kam 1", hadir: 88, tidakHadir: 68 },
  { day: "Sen 2", hadir: 95, tidakHadir: 61 },
  { day: "Kam 2", hadir: 102, tidakHadir: 54 },
  { day: "Sen 3", hadir: 98, tidakHadir: 58 },
  { day: "Kam 3", hadir: 105, tidakHadir: 51 },
  { day: "Sen 4", hadir: 98, tidakHadir: 58 },
]

// Initial unresolved scans (wajah tidak dikenal)
export const initialUnresolvedScans: UnresolvedScan[] = [
  {
    tempId: "UNKNOWN-042",
    thumbnail: "U1",
    timestamp: "19:32:15",
    timeAgo: "3 menit lalu",
  },
  {
    tempId: "UNKNOWN-043",
    thumbnail: "U2",
    timestamp: "19:33:48",
    timeAgo: "2 menit lalu",
  },
  {
    tempId: "UNKNOWN-044",
    thumbnail: "U3",
    timestamp: "19:34:22",
    timeAgo: "1 menit lalu",
  },
]

// Data rekap kehadiran bulanan
export const monthlyAttendanceData: AttendanceRecord[] = [
  {
    id: 1,
    nama: "Bp. H. Ahmad Sudrajat",
    minggu1: { senin: "H", kamis: "H" },
    minggu2: { senin: "H", kamis: "A" },
    minggu3: { senin: "H", kamis: "H" },
    minggu4: { senin: "H", kamis: "H" },
    minggu5: { senin: "-", kamis: "-" },
    totalHadir: 7,
    totalPertemuan: 8,
  },
  {
    id: 2,
    nama: "Ibu Hj. Siti Nurhaliza",
    minggu1: { senin: "H", kamis: "H" },
    minggu2: { senin: "H", kamis: "H" },
    minggu3: { senin: "A", kamis: "H" },
    minggu4: { senin: "H", kamis: "H" },
    minggu5: { senin: "-", kamis: "-" },
    totalHadir: 7,
    totalPertemuan: 8,
  },
  {
    id: 3,
    nama: "Bp. Budi Santoso",
    minggu1: { senin: "H", kamis: "A" },
    minggu2: { senin: "A", kamis: "H" },
    minggu3: { senin: "H", kamis: "H" },
    minggu4: { senin: "H", kamis: "A" },
    minggu5: { senin: "-", kamis: "-" },
    totalHadir: 5,
    totalPertemuan: 8,
  },
  {
    id: 4,
    nama: "Ibu Dewi Lestari",
    minggu1: { senin: "H", kamis: "H" },
    minggu2: { senin: "H", kamis: "H" },
    minggu3: { senin: "H", kamis: "H" },
    minggu4: { senin: "H", kamis: "H" },
    minggu5: { senin: "-", kamis: "-" },
    totalHadir: 8,
    totalPertemuan: 8,
  },
  {
    id: 5,
    nama: "Rizky Pratama",
    minggu1: { senin: "H", kamis: "H" },
    minggu2: { senin: "H", kamis: "A" },
    minggu3: { senin: "A", kamis: "A" },
    minggu4: { senin: "H", kamis: "H" },
    minggu5: { senin: "-", kamis: "-" },
    totalHadir: 5,
    totalPertemuan: 8,
  },
  {
    id: 6,
    nama: "Bp. Hendra Wijaya",
    minggu1: { senin: "H", kamis: "H" },
    minggu2: { senin: "H", kamis: "H" },
    minggu3: { senin: "H", kamis: "A" },
    minggu4: { senin: "A", kamis: "H" },
    minggu5: { senin: "-", kamis: "-" },
    totalHadir: 6,
    totalPertemuan: 8,
  },
  {
    id: 7,
    nama: "Ibu Ratna Sari Dewi",
    minggu1: { senin: "A", kamis: "H" },
    minggu2: { senin: "H", kamis: "H" },
    minggu3: { senin: "H", kamis: "H" },
    minggu4: { senin: "H", kamis: "H" },
    minggu5: { senin: "-", kamis: "-" },
    totalHadir: 7,
    totalPertemuan: 8,
  },
  {
    id: 8,
    nama: "Bp. Joko Susilo",
    minggu1: { senin: "H", kamis: "A" },
    minggu2: { senin: "H", kamis: "H" },
    minggu3: { senin: "H", kamis: "H" },
    minggu4: { senin: "H", kamis: "H" },
    minggu5: { senin: "-", kamis: "-" },
    totalHadir: 7,
    totalPertemuan: 8,
  },
]

// Months dan years untuk selector
export const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

export const years = ["2024", "2025", "2026"]
