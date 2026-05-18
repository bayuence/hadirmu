"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Users, UserCheck, UserX, Percent, Clock, Wifi, WifiOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type Stats   = { total_jamaah: number; hadir: number; tidak_hadir: number; persentase: number }
type FeedItem = { id: string; name: string; avatar: string; time: string; isNew?: boolean }
type WeeklyPt = { day: string; hadir: number; tidakHadir: number }

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("")
}

const chartConfig = {
  hadir:      { label: "Hadir",       color: "var(--chart-2)" },
  tidakHadir: { label: "Tidak Hadir", color: "var(--chart-3)" },
}

const EMPTY_STATS: Stats = { total_jamaah: 0, hadir: 0, tidak_hadir: 0, persentase: 0 }

export function DashboardView() {
  const [mounted,    setMounted]    = useState(false)      // prevents hydration mismatch
  const [stats,      setStats]      = useState<Stats>(EMPTY_STATS)
  const [liveFeed,   setLiveFeed]   = useState<FeedItem[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyPt[]>([])
  const [loading,    setLoading]    = useState(true)
  const [realtimeOk, setRealtimeOk] = useState(false)
  const statsRef = useRef<Stats>(stats)
  statsRef.current = stats

  // Only run on client
  useEffect(() => { setMounted(true) }, [])

  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const [{ count: totalJamaah }, { count: hadir }] = await Promise.all([
        supabase.from("jamaah").select("id", { count: "exact", head: true }).eq("aktif", true),
        supabase.from("log_presensi").select("id", { count: "exact", head: true }).eq("tanggal", today),
      ])
      const total      = totalJamaah ?? 0
      const hadirCnt   = hadir       ?? 0
      const tidakHadir = Math.max(0, total - hadirCnt)
      const persen     = total > 0 ? Math.round((hadirCnt / total) * 100) : 0
      setStats({ total_jamaah: total, hadir: hadirCnt, tidak_hadir: tidakHadir, persentase: persen })
    } catch (e) {
      console.error("loadStats:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFeed = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const { data } = await supabase
        .from("log_presensi")
        .select("id, jam_masuk, jamaah:jamaah_id(prefix, gelar, nama_lengkap)")
        .eq("tanggal", today)
        .order("jam_masuk", { ascending: false })
        .limit(8)
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setLiveFeed(data.map((row: any) => {
          const j    = row.jamaah ?? {}
          const name = `${j.prefix ?? ""} ${j.gelar ?? ""} ${j.nama_lengkap ?? ""}`.trim()
          return { id: row.id, name: name || "—", avatar: getInitials(name), time: (row.jam_masuk ?? "").slice(0, 5) }
        }))
      }
    } catch (e) { console.error("loadFeed:", e) }
  }, [])

  const loadWeekly = useCallback(async (total: number) => {
    try {
      const { data } = await supabase
        .from("log_presensi").select("tanggal").order("tanggal", { ascending: false }).limit(500)
      if (!data) return
      const counts: Record<string, number> = {}
      data.forEach(r => { counts[r.tanggal] = (counts[r.tanggal] ?? 0) + 1 })
      const dates = Object.keys(counts).sort().slice(-7)
      const fb    = total || 155
      setWeeklyData(dates.map(d => ({
        day:        new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        hadir:      counts[d],
        tidakHadir: Math.max(0, fb - counts[d]),
      })))
    } catch (e) { console.error("loadWeekly:", e) }
  }, [])

  useEffect(() => {
    loadStats()
    loadFeed()
  }, [loadStats, loadFeed])

  useEffect(() => {
    if (!loading) loadWeekly(stats.total_jamaah)
  }, [loading, stats.total_jamaah, loadWeekly])

  // Polling fallback every 15s
  useEffect(() => {
    const t = setInterval(() => { loadStats(); loadFeed() }, 15_000)
    return () => clearInterval(t)
  }, [loadStats, loadFeed])

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "log_presensi" }, async (payload) => {
        const rec = payload.new as { id: string; jamaah_id: string; jam_masuk: string }
        const { data: j } = await supabase
          .from("jamaah").select("prefix, gelar, nama_lengkap").eq("id", rec.jamaah_id).single()
        const name = j ? `${j.prefix ?? ""} ${j.gelar ?? ""} ${j.nama_lengkap}`.trim() : "Jamaah"
        const item: FeedItem = {
          id:     rec.id, name, avatar: getInitials(name),
          time:   rec.jam_masuk?.slice(0, 5) ?? new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          isNew:  true,
        }
        setLiveFeed(prev => [item, ...prev].slice(0, 8))
        setStats(prev => {
          const hadir = prev.hadir + 1
          return { ...prev, hadir, tidak_hadir: Math.max(0, prev.total_jamaah - hadir), persentase: prev.total_jamaah > 0 ? Math.round((hadir / prev.total_jamaah) * 100) : 0 }
        })
        setTimeout(() => setLiveFeed(prev => prev.map(x => x.id === rec.id ? { ...x, isNew: false } : x)), 4000)
      })
      .subscribe(s => setRealtimeOk(s === "SUBSCRIBED"))
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Stat cards (all values use mounted guard to prevent SSR mismatch) ──────
  const statCards = [
    { label: "TOTAL JAMAAH",   value: !mounted || loading ? "…" : stats.total_jamaah.toString(), icon: Users,     sub: "Anggota aktif" },
    { label: "HADIR HARI INI", value: !mounted || loading ? "…" : stats.hadir.toString(),         icon: UserCheck, sub: !mounted ? "" : `${stats.persentase}% kehadiran` },
    { label: "BELUM HADIR",    value: !mounted || loading ? "…" : stats.tidak_hadir.toString(),  icon: UserX,     sub: !mounted ? "" : `${100 - stats.persentase}% dari total` },
    { label: "PERSENTASE",     value: !mounted || loading ? "…" : `${stats.persentase}%`,         icon: Percent,   sub: "Kehadiran hari ini" },
  ]

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="border-border">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-xl md:text-2xl font-semibold text-card-foreground tracking-tight">{stat.value}</p>
                    <p className="text-[9px] md:text-[10px] font-medium text-muted-foreground">{stat.sub}</p>
                  </div>
                  <div className="p-2 rounded-md bg-primary/8 border border-primary/10">
                    <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide">Tren Kehadiran</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!mounted || weeklyData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground uppercase tracking-wider">
                {!mounted ? "Memuat…" : "Belum ada data presensi"}
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={30} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hadir"      fill="var(--color-hadir)"      radius={[2,2,0,0]} />
                    <Bar dataKey="tidakHadir" fill="var(--color-tidakHadir)" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide">Live Feed</CardTitle>
            {mounted && (
              <div className="flex items-center gap-1.5">
                {realtimeOk ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                    </span>
                    <Wifi className="h-3 w-3 text-success" strokeWidth={1.5} />
                    <span className="text-[9px] text-success font-semibold uppercase tracking-wider">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Polling</span>
                  </>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[280px]">
              <div className="px-2 pb-4">
                {!mounted || liveFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[220px] gap-2">
                    <Clock className="h-7 w-7 text-muted-foreground/30" strokeWidth={1.5} />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center px-4">
                      {!mounted ? "Memuat…" : "Belum ada presensi hari ini"}
                    </p>
                  </div>
                ) : (
                  liveFeed.map(item => (
                    <div key={item.id} className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-md transition-all duration-500",
                      item.isNew ? "bg-success/10 border border-success/20" : "hover:bg-muted/30"
                    )}>
                      <Avatar className="h-7 w-7 rounded-md shrink-0">
                        <AvatarFallback className={cn(
                          "text-[9px] font-semibold rounded-md border",
                          item.isNew ? "bg-success/20 text-success border-success/30" : "bg-primary/8 text-primary border-primary/10"
                        )}>{item.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-card-foreground truncate">{item.name}</p>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" strokeWidth={1.5} />{item.time}
                        </div>
                      </div>
                      <span className={cn(
                        "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border shrink-0",
                        item.isNew ? "bg-success/20 text-success border-success/30" : "bg-success/10 text-success border-success/20"
                      )}>Hadir</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
