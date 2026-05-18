"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Pencil, Trash2, Filter, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { supabase, type Jamaah } from "@/lib/supabase"

// ─── Local form type ──────────────────────────────────────────────────────────
type JamaahForm = {
  no:            string
  prefix:        string
  gelar:         string
  nama_lengkap:  string
  jenis_kelamin: 'L' | 'P'
  jenjang:       string
  id_tgl_lahir:  string   // ID/TGL LAHIR — 6-digit DDMMYY
  no_wa:         string
}

const emptyForm: JamaahForm = {
  no:            '',
  prefix:        'Bp',
  gelar:         '',
  nama_lengkap:  '',
  jenis_kelamin: 'L',
  jenjang:       'Dewasa',
  id_tgl_lahir:  '',
  no_wa:         '',
}

// ─── Component ────────────────────────────────────────────────────────────────
export function JamaahDataView() {
  const { toast } = useToast()
  const [jamaahList,    setJamaahList]    = useState<Jamaah[]>([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [isSaving,      setIsSaving]      = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [filterJenjang, setFilterJenjang] = useState('all')
  const [dialogOpen,    setDialogOpen]    = useState(false)
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [form,          setForm]          = useState<JamaahForm>(emptyForm)

  // Load from Supabase
  useEffect(() => { loadData() }, [])

  async function loadData() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('jamaah')
      .select('*')
      .eq('aktif', true)
      .order('no', { ascending: true, nullsFirst: false })

    if (error) {
      toast({ title: 'Gagal memuat data', description: error.message, variant: 'destructive' })
    } else {
      setJamaahList((data || []) as Jamaah[])
    }
    setIsLoading(false)
  }

  // Filter
  const filtered = jamaahList.filter((j) => {
    const q = searchQuery.toLowerCase()
    const matchQ =
      j.nama_lengkap.toLowerCase().includes(q) ||
      (j.prefix || '').toLowerCase().includes(q) ||
      j.id_tgl_lahir.includes(q) ||
      (j.no_wa || '').includes(q)
    const matchJenjang = filterJenjang === 'all' || j.jenjang === filterJenjang
    return matchQ && matchJenjang
  })

  // Open Add dialog
  function openAdd() {
    setEditingId(null)
    setForm({
      ...emptyForm,
      prefix: 'Bp' // Default for Laki-laki Dewasa
    })
    setDialogOpen(true)
  }

  // Open Edit dialog
  function openEdit(j: Jamaah) {
    setEditingId(j.id)
    setForm({
      no:            j.no?.toString() || '',
      prefix:        j.prefix        || '',
      gelar:         j.gelar         || '',
      nama_lengkap:  j.nama_lengkap,
      jenis_kelamin: j.jenis_kelamin || 'L',
      jenjang:       j.jenjang       || 'Dewasa',
      id_tgl_lahir:  j.id_tgl_lahir,
      no_wa:         j.no_wa         || '',
    })
    setDialogOpen(true)
  }

  // Auto-determine prefix based on gender & jenjang
  const getAutoPrefix = (jk: 'L' | 'P', jenjang: string): string => {
    if (jk === 'L') {
      return jenjang === 'Dewasa' ? 'Bp' : 'Sdr'
    } else {
      return jenjang === 'Dewasa' ? 'Ibu' : 'Sdri'
    }
  }

  const handleGenderChange = (v: 'L' | 'P') => {
    setForm(prev => {
      const autoPrefix = getAutoPrefix(v, prev.jenjang)
      return {
        ...prev,
        jenis_kelamin: v,
        prefix: autoPrefix
      }
    })
  }

  const handleJenjangChange = (v: string) => {
    setForm(prev => {
      const autoPrefix = getAutoPrefix(prev.jenis_kelamin, v)
      return {
        ...prev,
        jenjang: v,
        prefix: autoPrefix
      }
    })
  }

  // Save (insert or update)
  async function handleSave() {
    if (!form.nama_lengkap.trim() || !form.id_tgl_lahir.trim()) {
      toast({ title: 'Data tidak lengkap', description: 'Nama Lengkap dan ID/TGL LAHIR wajib diisi.', variant: 'destructive' })
      return
    }

    setIsSaving(true)

    // Auto-calculate NO if adding a new jamaah
    let finalNo = form.no ? parseInt(form.no) : null
    if (!editingId) {
      const activeNos = jamaahList.map(j => j.no).filter(n => typeof n === 'number')
      if (activeNos.length > 0) {
        finalNo = Math.max(...activeNos) + 1
      } else {
        finalNo = 1
      }
    }

    const payload = {
      no:            finalNo,
      prefix:        form.prefix.trim()       || null,
      gelar:         form.gelar.trim()        || null,
      nama_lengkap:  form.nama_lengkap.trim(),
      jenis_kelamin: form.jenis_kelamin,
      jenjang:       form.jenjang             || 'Dewasa',
      id_tgl_lahir:  form.id_tgl_lahir.trim(),
      no_wa:         form.no_wa.trim()        || null,
      aktif:         true,
    }

    let error
    if (editingId) {
      ;({ error } = await supabase.from('jamaah').update(payload).eq('id', editingId))
    } else {
      ;({ error } = await supabase.from('jamaah').insert(payload))
    }

    if (error) {
      toast({ title: 'Gagal menyimpan', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: editingId ? '✅ Data diperbarui' : '✅ Data ditambahkan', description: form.nama_lengkap })
      setDialogOpen(false)
      loadData()
    }
    setIsSaving(false)
  }

  // Soft delete (set aktif = false)
  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus ${nama}?`)) return
    const { error } = await supabase.from('jamaah').update({ aktif: false }).eq('id', id)
    if (error) {
      toast({ title: 'Gagal menghapus', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Data dihapus', description: nama })
      loadData()
    }
  }

  const setField = (key: keyof JamaahForm, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Search / Filter / Add */}
      <Card className="border-border">
        <CardContent className="p-3">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <Input
                placeholder="Cari nama, ID/TGL LAHIR, atau no WA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-md"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterJenjang} onValueChange={setFilterJenjang}>
                <SelectTrigger className="w-full sm:w-40 h-9 text-xs rounded-md">
                  <Filter className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"    className="text-xs">Semua Jenjang</SelectItem>
                  <SelectItem value="Dewasa" className="text-xs">Dewasa</SelectItem>
                  <SelectItem value="Remaja" className="text-xs">Remaja</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => loadData()} variant="outline" size="sm" className="h-9 text-xs rounded-md gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button onClick={openAdd} size="sm" className="h-9 text-xs uppercase tracking-wide font-semibold rounded-md w-full sm:w-auto active:scale-98">
                <Plus className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
                Tambah
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border">
        <CardHeader className="px-3 pt-3 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide">
            {isLoading ? 'Memuat...' : `Data Jamaah (${filtered.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((j) => (
              <div key={j.id} className="p-3 rounded-md border border-border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-muted/50 text-muted-foreground border border-border">
                        {j.id_tgl_lahir}
                      </span>
                      <span className={cn(
                        "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border",
                        j.jenjang === "Dewasa"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-warning/10 text-warning border-warning/20"
                      )}>
                        {j.jenjang}
                      </span>
                    </div>
                    <p className="font-medium text-xs truncate">
                      {j.prefix} {j.gelar} {j.nama_lengkap}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={cn(
                        "text-[9px] uppercase tracking-wider",
                        j.jenis_kelamin === "L" ? "text-primary" : "text-pink-500"
                      )}>
                        {j.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                      </span>
                      {j.no_wa && (
                        <span className="text-[9px] text-muted-foreground font-mono">{j.no_wa}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-primary hover:bg-primary/10 active:scale-98" onClick={() => openEdit(j)}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-destructive hover:bg-destructive/10 active:scale-98" onClick={() => handleDelete(j.id, `${j.prefix || ''} ${j.nama_lengkap}`.trim())}>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-xs uppercase tracking-wider">
                Tidak ada data
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-10  text-[10px] font-semibold uppercase tracking-wider py-2">No</TableHead>
                  <TableHead className="w-24  text-[10px] font-semibold uppercase tracking-wider py-2">ID/TGL LAHIR</TableHead>
                  <TableHead className="w-16  text-[10px] font-semibold uppercase tracking-wider py-2">PREFIX</TableHead>
                  <TableHead className="w-16  text-[10px] font-semibold uppercase tracking-wider py-2">GELAR</TableHead>
                  <TableHead className="       text-[10px] font-semibold uppercase tracking-wider py-2">NAMA LENGKAP</TableHead>
                  <TableHead className="w-20  text-center text-[10px] font-semibold uppercase tracking-wider py-2">JNS KEL</TableHead>
                  <TableHead className="w-20  text-[10px] font-semibold uppercase tracking-wider py-2">JENJANG</TableHead>
                  <TableHead className="w-28  text-[10px] font-semibold uppercase tracking-wider py-2">NO WA</TableHead>
                  <TableHead className="w-20  text-center text-[10px] font-semibold uppercase tracking-wider py-2">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto" strokeWidth={1.5} />
                    </TableCell>
                  </TableRow>
                ) : filtered.map((j, idx) => (
                  <TableRow key={j.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs text-muted-foreground py-2">{j.no ?? idx + 1}</TableCell>
                    <TableCell className="py-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-muted/50 text-muted-foreground border border-border">
                        {j.id_tgl_lahir}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs py-2">{j.prefix  || '—'}</TableCell>
                    <TableCell className="text-xs py-2">{j.gelar   || '—'}</TableCell>
                    <TableCell className="text-xs font-medium py-2">{j.nama_lengkap}</TableCell>
                    <TableCell className="text-center py-2">
                      <span className={cn(
                        "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border",
                        j.jenis_kelamin === "L"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-pink-500/10 text-pink-500 border-pink-500/20"
                      )}>
                        {j.jenis_kelamin}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className={cn(
                        "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border",
                        j.jenjang === "Dewasa"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-warning/10 text-warning border-warning/20"
                      )}>
                        {j.jenjang}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground py-2">{j.no_wa || '—'}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-primary hover:bg-primary/10 active:scale-98" onClick={() => openEdit(j)}>
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-destructive hover:bg-destructive/10 active:scale-98" onClick={() => handleDelete(j.id, `${j.prefix || ''} ${j.nama_lengkap}`.trim())}>
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground uppercase tracking-wider">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4 sm:mx-auto rounded-md border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold uppercase tracking-wide">
              {editingId ? 'Edit Data Jamaah' : 'Tambah Jamaah Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Form pintar otomatis: Prefix disesuaikan otomatis berdasarkan pilihan Jenis Kelamin & Jenjang Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-3">
            {/* NAMA LENGKAP */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">NAMA LENGKAP *</Label>
              <Input placeholder="Ahmad Sudrajat" value={form.nama_lengkap} onChange={(e) => setField('nama_lengkap', e.target.value)} className="h-9 text-xs rounded-md" />
            </div>

            {/* ID/TGL LAHIR */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ID/TGL LAHIR *</Label>
              <Input placeholder="150575" maxLength={6} value={form.id_tgl_lahir} onChange={(e) => setField('id_tgl_lahir', e.target.value)} className="font-mono tracking-widest h-9 text-xs rounded-md" />
            </div>

            {/* Row: JENIS KELAMIN + JENJANG */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">JENIS KELAMIN</Label>
                <Select value={form.jenis_kelamin} onValueChange={handleGenderChange}>
                  <SelectTrigger className="h-9 text-xs rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L" className="text-xs">L — Laki-laki</SelectItem>
                    <SelectItem value="P" className="text-xs">P — Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">JENJANG</Label>
                <Select value={form.jenjang} onValueChange={handleJenjangChange}>
                  <SelectTrigger className="h-9 text-xs rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dewasa" className="text-xs">Dewasa</SelectItem>
                    <SelectItem value="Remaja" className="text-xs">Remaja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row: PREFIX + GELAR */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PREFIX (Otomatis)</Label>
                <Select value={form.prefix || '-'} onValueChange={(v) => setField('prefix', v === '-' ? '' : v)}>
                  <SelectTrigger className="h-9 text-xs rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-" className="text-xs">— Tanpa Prefix</SelectItem>
                    <SelectItem value="Bp" className="text-xs">Bp</SelectItem>
                    <SelectItem value="Ibu" className="text-xs">Ibu</SelectItem>
                    <SelectItem value="Sdr" className="text-xs">Sdr</SelectItem>
                    <SelectItem value="Sdri" className="text-xs">Sdri</SelectItem>
                    <SelectItem value="Ust" className="text-xs">Ust (Ustadz)</SelectItem>
                    <SelectItem value="Ustd" className="text-xs">Ustd (Ustadzah)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">GELAR</Label>
                <Select value={form.gelar || '-'} onValueChange={(v) => setField('gelar', v === '-' ? '' : v)}>
                  <SelectTrigger className="h-9 text-xs rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-" className="text-xs">— Tanpa Gelar</SelectItem>
                    <SelectItem value="H" className="text-xs">H (Haji)</SelectItem>
                    <SelectItem value="Hj" className="text-xs">Hj (Hajjah)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* NO WhatsApp */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">NO WhatsApp</Label>
              <Input placeholder="08123456789" value={form.no_wa} onChange={(e) => setField('no_wa', e.target.value)} className="h-9 text-xs rounded-md font-mono" inputMode="tel" />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto h-9 text-xs uppercase tracking-wide font-semibold rounded-md active:scale-98">
              Batal
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto h-9 text-xs uppercase tracking-wide font-semibold rounded-md active:scale-98">
              {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : editingId ? 'Update' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
