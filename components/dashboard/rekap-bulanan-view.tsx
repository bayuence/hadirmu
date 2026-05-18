"use client"

import { useState, useEffect } from "react"
import { Calendar, FileSpreadsheet, FileText, RefreshCw, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type AttendanceStatus = "H" | "S" | "I" | "A" | "-"

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const years = ["2024", "2025", "2026"]

function StatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded-sm text-[10px] font-bold transition-all duration-200 select-none",
        status === "H" && "bg-success/15 text-success border border-success/35",
        status === "S" && "bg-amber-500/15 text-amber-500 border border-amber-500/35",
        status === "I" && "bg-cyan-500/15 text-cyan-500 border border-cyan-500/35",
        status === "A" && "bg-destructive/15 text-destructive border border-destructive/35",
        status === "-" && "bg-muted/50 text-muted-foreground/40 border border-border"
      )}
    >
      {status}
    </span>
  )
}

export function RekapBulananView() {
  const [selectedMonth, setSelectedMonth] = useState("Mei")
  const [selectedYear, setSelectedYear] = useState("2026")
  const [jamaahList, setJamaahList] = useState<any[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, string>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Cell selection state for modal
  const [selectedCell, setSelectedCell] = useState<{
    jamaahId: string
    jamaahName: string
    dateStr: string
    fullLabel: string
    currentStatus: AttendanceStatus
  } | null>(null)

  // Get all session dates (Mondays & Thursdays) for the selected month/year
  const getSessionDates = () => {
    const monthIndex = months.indexOf(selectedMonth)
    const year = parseInt(selectedYear)
    const dates: { dateStr: string; label: string; dayNum: number; fullLabel: string }[] = []
    
    if (monthIndex === -1 || isNaN(year)) return dates

    const date = new Date(year, monthIndex, 1)
    while (date.getMonth() === monthIndex) {
      const day = date.getDay() // 1 = Monday, 4 = Thursday
      if (day === 1 || day === 4) {
        const yyyy = date.getFullYear()
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        
        dates.push({
          dateStr,
          label: day === 1 ? 'S' : 'K',
          dayNum: date.getDate(),
          fullLabel: `${day === 1 ? 'Senin' : 'Kamis'}, ${date.getDate()} ${selectedMonth} ${selectedYear}`
        })
      }
      date.setDate(date.getDate() + 1)
    }
    return dates
  }

  const sessionDates = getSessionDates()

  const loadRecapData = async () => {
    setIsLoading(true)
    try {
      // 1. Fetch all active jamaah
      const { data: jamaahData, error: jError } = await supabase
        .from('jamaah')
        .select('id, prefix, gelar, nama_lengkap, no')
        .eq('aktif', true)
        .order('no', { ascending: true, nullsFirst: false })

      if (jError) throw jError

      // 2. Fetch all log_presensi for the selected month/year
      const monthIndex = months.indexOf(selectedMonth) + 1
      const startDate = `${selectedYear}-${String(monthIndex).padStart(2, '0')}-01`
      const endDate = `${selectedYear}-${String(monthIndex).padStart(2, '0')}-31`

      const { data: logData, error: lError } = await supabase
        .from('log_presensi')
        .select('jamaah_id, tanggal, status')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)

      if (lError) throw lError

      // 3. Create a map of present dates: jamaahId -> dateStr -> status
      const map: Record<string, Record<string, string>> = {}
      logData?.forEach((log: any) => {
        const jId = log.jamaah_id
        const dateStr = log.tanggal
        if (!map[jId]) map[jId] = {}
        map[jId][dateStr] = log.status || 'Hadir'
      })

      setJamaahList(jamaahData || [])
      setAttendanceMap(map)
    } catch (error) {
      console.error('Error loading recap data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecapData()
  }, [selectedMonth, selectedYear])

  const getStatus = (jamaahId: string, dateStr: string): AttendanceStatus => {
    const status = attendanceMap[jamaahId]?.[dateStr]
    if (status === 'Hadir') return 'H'
    if (status === 'Sakit') return 'S'
    if (status === 'Izin') return 'I'
    if (status === 'Alpa') return 'A'

    // Check if the date is in the future
    const todayStr = new Date().toISOString().split('T')[0]
    if (dateStr > todayStr) {
      return '-' // Future date, no session yet
    }

    return 'A' // Past date, absent/Alpa by default
  }

  const handleCellClick = (jId: string, jName: string, dateStr: string, fullLabel: string) => {
    const currentStatus = getStatus(jId, dateStr)
    setSelectedCell({
      jamaahId: jId,
      jamaahName: jName,
      dateStr,
      fullLabel,
      currentStatus
    })
  }

  const handleUpdateStatus = async (newStatus: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    if (!selectedCell) return
    
    setIsSaving(true)
    try {
      const { jamaahId, dateStr } = selectedCell

      const { error } = await supabase
        .from('log_presensi')
        .upsert({
          jamaah_id: jamaahId,
          tanggal: dateStr,
          status: newStatus,
          jam_masuk: new Date().toLocaleTimeString('id-ID', { hour12: false }),
          metode_input: 'Admin'
        }, {
          onConflict: 'jamaah_id,tanggal'
        })

      if (error) throw error

      // Reload data and close dialog
      await loadRecapData()
      setSelectedCell(null)
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Month/Year Selector and Export */}
      <Card className="border-border">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Month Selector */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-36 h-9 text-xs rounded-md">
                  <Calendar className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month} className="text-xs">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Selector */}
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-24 h-9 text-xs rounded-md">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year} className="text-xs">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export & Refresh Buttons */}
            <div className="flex gap-2">
              <Button onClick={loadRecapData} variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-md active:scale-98">
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-md active:scale-98">
                <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">Export</span> PDF
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-md active:scale-98">
                <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">Export</span> Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Matrix Table */}
      <Card className="border-border">
        <CardHeader className="px-3 pt-3 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide">
            Laporan Presensi Bulanan — {selectedMonth} {selectedYear}
          </CardTitle>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md border border-border">
            <Info className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
            <span>Sesi: Senin & Kamis (Klik badge status untuk mengubah)</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/30">
                    <th
                      className="sticky left-0 z-20 bg-muted/30 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider border-b border-r border-border min-w-[180px]"
                    >
                      Nama Lengkap
                    </th>
                    {sessionDates.map((session) => (
                      <th
                        key={session.dateStr}
                        className="px-2 py-3 text-center border-b border-r border-border min-w-[60px]"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-semibold text-foreground">
                            {session.dayNum}
                          </span>
                          <span className="text-[8px] font-semibold text-muted-foreground uppercase mt-0.5">
                            {session.label === 'S' ? 'Senin' : 'Kamis'}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider border-b border-border min-w-[80px]">
                      Kehadiran
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={sessionDates.length + 2} className="py-12 text-center text-xs text-muted-foreground uppercase tracking-wider">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Memuat Laporan Presensi...
                      </td>
                    </tr>
                  ) : jamaahList.length === 0 ? (
                    <tr>
                      <td colSpan={sessionDates.length + 2} className="py-12 text-center text-xs text-muted-foreground uppercase tracking-wider">
                        Tidak ada data jamaah aktif
                      </td>
                    </tr>
                  ) : (
                    jamaahList.map((j, index) => {
                      const fullName = `${j.prefix || ''} ${j.gelar || ''} ${j.nama_lengkap}`.trim()
                      
                      // Compute totals for this month
                      let presentCount = 0
                      let heldSessions = 0
                      const todayStr = new Date().toISOString().split('T')[0]

                      sessionDates.forEach(session => {
                        const status = getStatus(j.id, session.dateStr)
                        if (status === 'H') presentCount++
                        if (session.dateStr <= todayStr) heldSessions++
                      })

                      return (
                        <tr
                          key={j.id}
                          className={cn(
                            "hover:bg-muted/20 transition-colors duration-100",
                            index % 2 === 0 ? "bg-background" : "bg-muted/5"
                          )}
                        >
                          <td className="sticky left-0 z-10 px-3 py-3 text-xs font-semibold border-r border-border bg-inherit truncate max-w-[200px]">
                            {fullName}
                          </td>
                          {sessionDates.map((session) => {
                            const status = getStatus(j.id, session.dateStr)
                            return (
                              <td
                                key={session.dateStr}
                                onClick={() => handleCellClick(j.id, fullName, session.dateStr, session.fullLabel)}
                                className="px-2 py-2 text-center border-r border-border cursor-pointer hover:bg-muted/40 transition-colors active:bg-muted/60"
                              >
                                <StatusBadge status={status} />
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center gap-0.5 text-xs font-mono">
                              <span className="font-semibold text-success">{presentCount}</span>
                              <span className="text-muted-foreground/50">/</span>
                              <span className="text-muted-foreground">{heldSessions}</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-border">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Keterangan:
            </span>
            <div className="flex items-center gap-1.5">
              <StatusBadge status="H" />
              <span className="text-xs">Hadir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status="S" />
              <span className="text-xs">Sakit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status="I" />
              <span className="text-xs">Izin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status="A" />
              <span className="text-xs">Alpa (Tidak Hadir)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status="-" />
              <span className="text-xs">Belum Berlangsung</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Status Dialog */}
      <Dialog open={selectedCell !== null} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="sm:max-w-md mx-4 sm:mx-auto rounded-md border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold uppercase tracking-wide">
              Ubah Status Kehadiran
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1.5">
              Sesuaikan status kehadiran untuk <strong>{selectedCell?.jamaahName}</strong> pada <strong>{selectedCell?.fullLabel}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {/* HADIR */}
            <button
              onClick={() => handleUpdateStatus('Hadir')}
              disabled={isSaving}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 active:scale-97",
                selectedCell?.currentStatus === 'H'
                  ? "bg-success/15 border-success text-success font-semibold shadow-sm"
                  : "bg-background border-border hover:bg-muted/30 text-foreground"
              )}
            >
              <span className="text-lg font-bold">H</span>
              <span className="text-[10px] uppercase tracking-wider mt-1">Hadir</span>
            </button>

            {/* SAKIT */}
            <button
              onClick={() => handleUpdateStatus('Sakit')}
              disabled={isSaving}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 active:scale-97",
                selectedCell?.currentStatus === 'S'
                  ? "bg-amber-500/15 border-amber-500 text-amber-500 font-semibold shadow-sm"
                  : "bg-background border-border hover:bg-muted/30 text-foreground"
              )}
            >
              <span className="text-lg font-bold">S</span>
              <span className="text-[10px] uppercase tracking-wider mt-1">Sakit</span>
            </button>

            {/* IZIN */}
            <button
              onClick={() => handleUpdateStatus('Izin')}
              disabled={isSaving}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 active:scale-97",
                selectedCell?.currentStatus === 'I'
                  ? "bg-cyan-500/15 border-cyan-500 text-cyan-500 font-semibold shadow-sm"
                  : "bg-background border-border hover:bg-muted/30 text-foreground"
              )}
            >
              <span className="text-lg font-bold">I</span>
              <span className="text-[10px] uppercase tracking-wider mt-1">Izin</span>
            </button>

            {/* ALPA */}
            <button
              onClick={() => handleUpdateStatus('Alpa')}
              disabled={isSaving}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 active:scale-97",
                selectedCell?.currentStatus === 'A'
                  ? "bg-destructive/15 border-destructive text-destructive font-semibold shadow-sm"
                  : "bg-background border-border hover:bg-muted/30 text-foreground"
              )}
            >
              <span className="text-lg font-bold">A</span>
              <span className="text-[10px] uppercase tracking-wider mt-1">Alpa</span>
            </button>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedCell(null)}
              className="w-full sm:w-auto h-9 text-xs uppercase tracking-wide font-semibold rounded-md active:scale-98"
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
