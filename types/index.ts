// Type definitions untuk aplikasi HadirMu

export type ViewType = "dashboard" | "scanner" | "jamaah" | "rekap"

export type AttendanceStatus = "hadir" | "tidak_dikenal"

export type ScanResult = {
  id: string
  name: string
  status: AttendanceStatus
  avatar: string
  time: string
} | null

export type UnresolvedScan = {
  tempId: string
  thumbnail: string
  timestamp: string
  timeAgo: string
}

export type Jamaah = {
  id: number
  jamaahId: string
  prefix: string
  gelar: string
  namaLengkap: string
  jenisKelamin: "L" | "P"
  jenjang: "Dewasa" | "Remaja"
}

export type JamaahDatabase = Record<string, { name: string; avatar: string }>

export type RealtimeFeedItem = {
  id: number
  name: string
  time: string
  avatar: string
}

export type WeekData = {
  senin: "H" | "A" | "-"
  kamis: "H" | "A" | "-"
}

export type AttendanceRecord = {
  id: number
  nama: string
  minggu1: WeekData
  minggu2: WeekData
  minggu3: WeekData
  minggu4: WeekData
  minggu5: WeekData
  totalHadir: number
  totalPertemuan: number
}

export type StatCard = {
  label: string
  value: string
  icon: any
  change: string
  trend: "up" | "down"
}

export type WeeklyChartData = {
  day: string
  hadir: number
  tidakHadir: number
}
