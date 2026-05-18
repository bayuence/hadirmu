"use client"

import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  ScanFace,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Menu,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { ScannerView } from "@/components/dashboard/scanner-view"
import { JamaahDataView } from "@/components/dashboard/jamaah-data-view"
import { RekapBulananView } from "@/components/dashboard/rekap-bulanan-view"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

type ViewType = "dashboard" | "scanner" | "jamaah" | "rekap"

const navItems = [
  { id: "dashboard" as ViewType, label: "Dasbor", icon: LayoutDashboard },
  { id: "scanner" as ViewType, label: "Kamera Pemindai", icon: ScanFace },
  { id: "jamaah" as ViewType, label: "Data Jamaah", icon: Users },
  { id: "rekap" as ViewType, label: "Rekap Bulanan", icon: CalendarDays },
]

export default function DashboardPage() {
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Real-time Database Password States
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [dbPassword, setDbPassword] = useState("admin123")
  const [newPassword, setNewPassword] = useState("")
  const [showProfilePassword, setShowProfilePassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const [activeView, setActiveView] = useState<ViewType>("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  // Check auth state on client side
  useEffect(() => {
    const auth = localStorage.getItem("hadirmu_admin_auth")
    if (auth === "true") {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }
  }, [])

  // Sync password from database when authenticated
  useEffect(() => {
    async function fetchPassword() {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'admin_password')
          .single()
        
        if (data && data.setting_value) {
          setDbPassword(data.setting_value)
        } else if (error && error.code === 'PGRST116') {
          // Row does not exist, seed it!
          await supabase.from('system_settings').insert({
            setting_key: 'admin_password',
            setting_value: 'admin123',
            setting_type: 'string',
            description: 'Password akses portal admin/pengurus'
          })
          setDbPassword('admin123')
        }
      } catch (err) {
        console.warn('Gagal membaca password dari database, menggunakan fallback admin123', err)
      }
    }

    if (isAuthenticated) {
      fetchPassword()
    }
  }, [isAuthenticated])

  // Login handler connected to Supabase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError("")
    
    try {
      let targetPassword = "admin123"
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_password')
        .single()
      
      if (data && data.setting_value) {
        targetPassword = data.setting_value
      } else if (error && error.code === 'PGRST116') {
        // Seed it if missing
        await supabase.from('system_settings').insert({
          setting_key: 'admin_password',
          setting_value: 'admin123',
          setting_type: 'string',
          description: 'Password akses portal admin/pengurus'
        })
      }
      
      setTimeout(() => {
        if (password === targetPassword) {
          localStorage.setItem("hadirmu_admin_auth", "true")
          setIsAuthenticated(true)
          setDbPassword(targetPassword)
          setLoginError("")
          setPassword("")
        } else {
          setLoginError("Password salah! Silakan coba lagi.")
        }
        setIsLoggingIn(false)
      }, 500)
    } catch (err) {
      console.error('Koneksi database terputus, mencocokkan dengan fallback local...', err)
      setTimeout(() => {
        const fallback = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123"
        if (password === fallback) {
          localStorage.setItem("hadirmu_admin_auth", "true")
          setIsAuthenticated(true)
          setLoginError("")
          setPassword("")
        } else {
          setLoginError("Password salah! Silakan coba lagi.")
        }
        setIsLoggingIn(false)
      }, 500)
    }
  }

  // Update password in database
  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) return
    setIsSavingPassword(true)
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: newPassword.trim(), updated_at: new Date().toISOString() })
        .eq('setting_key', 'admin_password')
      
      if (error) {
        toast({ title: 'Gagal memperbarui password', description: error.message, variant: 'destructive' })
      } else {
        setDbPassword(newPassword.trim())
        setNewPassword("")
        toast({ title: '✅ Password diperbarui', description: 'Gunakan password baru ini untuk masuk portal selanjutnya.' })
        setProfileDialogOpen(false)
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Gagal menyimpan password', description: 'Periksa koneksi database Anda.', variant: 'destructive' })
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("hadirmu_admin_auth")
    setIsAuthenticated(false)
    setMobileMenuOpen(false)
  }

  const currentDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const shortDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const getActiveSchedule = () => {
    const day = new Date().getDay()
    if (day === 1) return "SENIN"
    if (day === 4) return "KAMIS"
    return "SENIN"
  }

  const handleNavClick = (view: ViewType) => {
    setActiveView(view)
    setMobileMenuOpen(false)
  }

  // 1. Loading Splash Screen
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="text-center space-y-3">
          <ScanFace className="h-10 w-10 text-primary mx-auto animate-pulse" />
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] animate-pulse">Initializing Portal...</p>
        </div>
      </div>
    )
  }

  // 2. Premium Login Screen (Theme-Responsive!)
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background relative overflow-hidden select-none transition-colors duration-300">
        {/* Background decorative glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary/8 dark:bg-primary/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-cyan-500/8 dark:bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />

        <div className="w-full max-w-sm px-6 py-8 mx-4 rounded-xl border border-border/80 bg-card/65 backdrop-blur-xl shadow-2xl relative z-10 space-y-6 transition-all duration-300">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-lg mx-auto shadow-lg shadow-primary/20">
              H
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground uppercase mt-4">HADIRMU</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
              Admin & Pengurus Portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Password Akses
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Masukkan password admin..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 text-xs bg-muted/40 border border-border rounded-md text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-all font-mono tracking-widest text-center"
                  autoFocus
                  disabled={isLoggingIn}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none active:scale-95 transition-all"
                >
                  {showLoginPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {loginError && (
                <p className="text-[10px] text-destructive text-center mt-1">
                  ⚠️ {loginError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-10 text-xs uppercase tracking-widest font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-all active:scale-98 shadow-md shadow-primary/10"
            >
              {isLoggingIn ? "Memverifikasi..." : "Masuk Portal"}
            </Button>
          </form>

          {/* Footer note */}
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">
              Khusus pengurus dan petugas piket presensi
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 3. Main Dashboard Application
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-card text-card-foreground border-r border-border transition-all duration-200 ease-out",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-sm shrink-0">
            H
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-sm tracking-tight uppercase">HadirMu</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Attendance
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs font-medium tracking-wide transition-all duration-150 active:scale-98",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Collapse Button */}
        <div className="p-2 border-t border-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center w-full p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 active:scale-98"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-14 md:pb-0">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 rounded-md active:scale-98">
                  <Menu className="h-4 w-4" strokeWidth={1.5} />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-card text-card-foreground p-0 border-border flex flex-col h-full">
                <SheetHeader className="px-4 py-5 border-b border-border">
                  <SheetTitle className="flex items-center gap-3 text-foreground animate-none">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-sm">
                      H
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-sm tracking-tight uppercase">HadirMu</span>
                      <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-widest">
                        Attendance
                      </span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-2 space-y-0.5 flex-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeView === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-xs font-medium tracking-wide transition-all duration-150 active:scale-98",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </nav>
                <div className="p-2 border-t border-border mt-auto">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-xs font-semibold tracking-wide text-destructive hover:bg-destructive/10 transition-all duration-150 active:scale-98"
                  >
                    <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>Keluar</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Date Display */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
              <h1 className="text-xs md:text-sm font-medium text-card-foreground tracking-tight">
                <span className="hidden sm:inline">{currentDate}</span>
                <span className="sm:hidden">{shortDate}</span>
              </h1>
              <span className="px-2 py-0.5 text-[9px] md:text-[10px] font-semibold rounded uppercase tracking-widest bg-primary/8 text-primary border border-primary/20 w-fit">
                {getActiveSchedule()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-md h-8 w-8 active:scale-98"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" strokeWidth={1.5} />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={1.5} />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Admin Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 h-8 rounded-md active:scale-98">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="/avatar.png" alt="Admin" />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-xs font-medium tracking-tight">
                    Admin
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-md border-border">
                <DropdownMenuItem onClick={() => setProfileDialogOpen(true)} className="text-xs cursor-pointer">
                  <User className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setProfileDialogOpen(true)} className="text-xs cursor-pointer">
                  <Settings className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-xs text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto p-4 md:p-5">
          {activeView === "dashboard" && <DashboardView />}
          {activeView === "scanner" && <ScannerView />}
          {activeView === "jamaah" && <JamaahDataView />}
          {activeView === "rekap" && <RekapBulananView />}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex items-center justify-around h-14 px-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-md transition-all duration-150 active:scale-98",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-md transition-colors duration-150",
                    isActive ? "bg-primary/10" : ""
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className="text-[9px] font-semibold tracking-wide uppercase">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Dialog Profil & Ubah Password */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4 sm:mx-auto rounded-md border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold uppercase tracking-wide">
              Profil & Keamanan Portal
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kelola password keamanan untuk masuk ke Portal Admin & Pengurus HadirMu.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            {/* Informasi Akun */}
            <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/20">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  AD
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-semibold text-foreground uppercase">Administrator Portal</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Peran: Pengurus Piket / Admin</p>
              </div>
            </div>

            {/* Password Saat Ini */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Password Saat Ini</Label>
              <div className="relative">
                <Input
                  type={showProfilePassword ? "text" : "password"}
                  value={dbPassword}
                  readOnly
                  className="h-9 text-xs rounded-md font-mono tracking-widest bg-muted/40 text-muted-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowProfilePassword(!showProfilePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showProfilePassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Ubah Password Baru */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ganti Password Baru</Label>
              <Input
                type="text"
                placeholder="Masukkan password baru..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 text-xs rounded-md font-mono tracking-widest"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setProfileDialogOpen(false)
                setNewPassword("")
              }}
              className="w-full sm:w-auto h-9 text-xs uppercase tracking-wide font-semibold rounded-md active:scale-98"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleUpdatePassword}
              disabled={isSavingPassword || !newPassword.trim()}
              className="w-full sm:w-auto h-9 text-xs uppercase tracking-wide font-semibold rounded-md active:scale-98"
            >
              {isSavingPassword ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Simpan Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
