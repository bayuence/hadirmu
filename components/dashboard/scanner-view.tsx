"use client"

import { useState, useRef, useEffect } from "react"
import { Send, CheckCircle, XCircle, ScanFace, Hash, AlertOctagon, RefreshCw, Users, Link2, Clock, Search, X, UserPlus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  findJamaahByIdLahir,
  catatKehadiran,
  tambahAntreanGagal,
  getAntreanGagalPending,
  tautkanAntreanKeJamaah,
  getAllJamaahAktif,
  getSystemSetting,
  updateSystemSetting,
  isSupabaseConfigured,
  updateJamaahFaceDescriptor,
  getLogPresensiHariIni,
  hapusPresensiHariIni,
  hapusAntreanGagal,
  type Jamaah,
  type AntreanGagal as AntreanGagalType,
} from "@/lib/supabase"

type ScanResult = {
  id: string
  name: string
  status: "hadir" | "tidak_dikenal"
  avatar: string
  time: string
} | null

type UnresolvedScan = {
  id: string
  tempId: string
  thumbnail: string
  timestamp: string
  timeAgo: string
}

type JamaahListItem = {
  id: string
  id_jamaah: string
  name: string
  face_descriptor?: Float32Array | null
}


export function ScannerView() {
  const { toast } = useToast()
  const [idInput, setIdInput] = useState("")
  const [scanResult, setScanResult] = useState<ScanResult>(null)
  const [isScanning, setIsScanning] = useState(true)
  const [isSessionSuspended, setIsSessionSuspended] = useState(false)
  const [activeTab, setActiveTab] = useState<"scanner" | "queue" | "attendance">("scanner")
  const [unresolvedScans, setUnresolvedScans] = useState<UnresolvedScan[]>([])
  const [linkingSheet, setLinkingSheet] = useState<{ open: boolean; scan: UnresolvedScan | null }>({ open: false, scan: null })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJamaah, setSelectedJamaah] = useState<JamaahListItem | null>(null)
  const [jamaahList, setJamaahList] = useState<JamaahListItem[]>([])
  const [todaysAttendance, setTodaysAttendance] = useState<{ id: string; jamaahId: string; idJamaah: string; name: string; time: string; metode: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)

  // Smart Anti-Spam Face Scanner Refs
  const isProcessingRef = useRef(false)
  const recentFailedScansRef = useRef<{ descriptor: number[], timestamp: number }[]>([])

  // Face recognition states
  const [faceapi, setFaceapi] = useState<any>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)

  // Assign stream to video element whenever either becomes available
  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream
      videoRef.current.play().catch(err => {
        console.warn('Autoplay prevented or video play failed:', err)
      })
    }
  }, [mediaStream])

  // Camera lifecycle — start/stop based on session state
  useEffect(() => {
    if (!isSessionSuspended) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => { stopCamera() }
  }, [isSessionSuspended])

  async function startCamera() {
    setCameraError(null)
    setCameraReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setMediaStream(stream)  // triggers useEffect to assign to videoRef
    } catch (err: unknown) {
      const error = err as Error
      if (error.name === 'NotAllowedError') {
        setCameraError('Akses kamera ditolak. Izinkan kamera di browser.')
      } else if (error.name === 'NotFoundError') {
        setCameraError('Kamera tidak ditemukan di perangkat ini.')
      } else {
        setCameraError('Kamera tidak dapat diakses: ' + error.message)
      }
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setMediaStream(null)
    setCameraReady(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Load face-api dynamically and load models
  useEffect(() => {
    const initFaceApiAndModels = async () => {
      setIsModelLoading(true)
      try {
        console.log('Loading face-api.js dynamically...')
        const api = await import('@vladmandic/face-api')
        setFaceapi(api)

        // Load models
        await api.nets.ssdMobilenetv1.loadFromUri('/models')
        await api.nets.faceLandmark68Net.loadFromUri('/models')
        await api.nets.faceRecognitionNet.loadFromUri('/models')
        
        setModelsLoaded(true)
        console.log('face-api.js models loaded successfully!')
        toast({
          title: "🤖 Face Recognition Active",
          description: "Model AI pengenalan wajah berhasil diaktifkan",
        })
      } catch (error) {
        console.error('Error loading face-api models:', error)
        toast({
          title: "⚠️ Model AI Gagal Dimuat",
          description: "Gagal mengaktifkan pengenal wajah otomatis.",
          variant: "destructive"
        })
      } finally {
        setIsModelLoading(false)
      }
    }
    initFaceApiAndModels()
  }, [])

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    try {
      // Load session status
      const sessionSetting = await getSystemSetting('session_suspended')
      if (sessionSetting) {
        setIsSessionSuspended(sessionSetting.setting_value === 'true')
        setIsScanning(sessionSetting.setting_value !== 'true')
      }

      // Load antrean gagal
      const antrean = await getAntreanGagalPending()
      setUnresolvedScans(
        antrean.map((item) => ({
          id: item.id,
          tempId: item.temp_id,
          thumbnail: item.temp_id.replace('UNKNOWN-', 'U'),
          timestamp: new Date(item.timestamp).toLocaleTimeString('id-ID'),
          timeAgo: getTimeAgo(new Date(item.timestamp)),
        }))
      )

      // Load jamaah list and parse descriptors into Float32Array!
      const jamaahData = await getAllJamaahAktif()
      setJamaahList(
        jamaahData.map((j) => {
          let parsedDescriptor: Float32Array | null = null
          if (j.face_descriptor) {
            try {
              const arr = JSON.parse(j.face_descriptor) as number[]
              parsedDescriptor = new Float32Array(arr)
            } catch (e) {
              console.error('Error parsing face descriptor for jamaah:', j.nama_lengkap, e)
            }
          }
          return {
            id: j.id,
            id_jamaah: j.id_tgl_lahir,
            name: `${j.prefix || ''} ${j.gelar || ''} ${j.nama_lengkap}`.trim(),
            face_descriptor: parsedDescriptor,
          }
        })
      )

      // Load today's log_presensi
      const attendanceLogs = await getLogPresensiHariIni(100)
      setTodaysAttendance(
        attendanceLogs.map((log: any) => ({
          id: log.id,
          jamaahId: log.jamaah_id,
          idJamaah: log.jamaah?.id_tgl_lahir || '',
          name: `${log.jamaah?.prefix || ''} ${log.jamaah?.gelar || ''} ${log.jamaah?.nama_lengkap || 'Jamaah'}`.trim(),
          time: log.jam_masuk,
          metode: log.metode_input,
        }))
      )
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast({
        title: "Error",
        description: "Gagal memuat data awal",
        variant: "destructive",
      })
    }
  }

  function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'Baru saja'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} menit lalu`
    const hours = Math.floor(minutes / 60)
    return `${hours} jam lalu`
  }

  function getInitials(name: string): string {
    const words = name.split(' ').filter(w => w.length > 0)
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Helper for face recognition distance matching
  function euclideanDistance(arr1: Float32Array | number[], arr2: Float32Array | number[]) {
    if (arr1.length !== arr2.length) return 1
    let sum = 0
    for (let i = 0; i < arr1.length; i++) {
      const diff = arr1[i] - arr2[i]
      sum += diff * diff
    }
    return Math.sqrt(sum)
  }

  const triggerAttendanceForJamaah = async (jamaah: JamaahListItem, confidence: number) => {
    setIsScanning(false) // Pause further scanning while recording
    setIsLoading(true)

    try {
      const result = await catatKehadiran(jamaah.id, 'face_id', `Wajah terverifikasi (Kecocokan ${confidence}%)`)

      setScanResult({
        id: jamaah.id_jamaah,
        name: jamaah.name,
        status: "hadir",
        avatar: getInitials(jamaah.name),
        time: new Date().toLocaleTimeString("id-ID"),
      })

      if (result.success) {
        toast({
          title: "✅ Wajah Terverifikasi (AI)",
          description: `${jamaah.name} berhasil presensi (${confidence}% kecocokan)`,
        })
      } else if (result.message === 'Sudah presensi hari ini') {
        toast({
          title: "⚠️ Anda Sudah Presensi Hari Ini!",
          description: `${jamaah.name} sudah tercatat hadir hari ini.`,
        })
      } else {
        toast({
          title: "ℹ️ Informasi",
          description: result.message || `${jamaah.name} sudah presensi hari ini`,
        })
      }

      // Resume scanning after 4 seconds
      setTimeout(() => {
        setScanResult(null)
        setIsScanning(true)
        isProcessingRef.current = false // Release lock
      }, 4000)

    } catch (error) {
      console.error('Error in face match attendance registration:', error)
      setIsScanning(true)
      isProcessingRef.current = false // Release lock
    } finally {
      setIsLoading(false)
    }
  }

  const triggerUnrecognizedFace = async (descriptor: number[]) => {
    setIsScanning(false) // Pause further scanning while recording
    setIsLoading(true)

    try {
      const tempId = `UNKNOWN-${Math.floor(100000 + Math.random() * 900000)}`
      
      // Insert into antrean_gagal in Supabase with the face descriptor!
      await tambahAntreanGagal(tempId, descriptor)

      setScanResult({
        id: tempId,
        name: "Wajah Tidak Dikenal",
        status: "tidak_dikenal",
        avatar: "?",
        time: new Date().toLocaleTimeString("id-ID"),
      })

      toast({
        title: "⚠️ Wajah Tidak Dikenal",
        description: "Ditambahkan ke antrean verifikasi untuk ditautkan oleh Admin.",
        variant: "destructive"
      })

      // Reload unresolved scans so the list updates
      await loadInitialData()

      // Resume scanning after 4 seconds
      setTimeout(() => {
        setScanResult(null)
        setIsScanning(true)
        isProcessingRef.current = false // Release lock
      }, 4000)

    } catch (error) {
      console.error('Error recording unrecognized face:', error)
      setIsScanning(true)
      isProcessingRef.current = false // Release lock
    } finally {
      setIsLoading(false)
    }
  }

  // Active Real-Time Face Recognition Loop
  useEffect(() => {
    let active = true
    let intervalId: any = null

    if (cameraReady && modelsLoaded && faceapi && !isSessionSuspended && isScanning && videoRef.current) {
      const detectFace = async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !active) return
        if (isProcessingRef.current) return // Strictly block if already processing a match/failed scan!

        try {
          isProcessingRef.current = true // Set processing lock

          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptor()

          if (detection && active) {
            const box = detection.detection.box
            const vWidth = videoRef.current?.videoWidth || 1280
            const vHeight = videoRef.current?.videoHeight || 720

            // 1. Min Size check to avoid tiny snippets or background faces
            const minWidth = 140
            const minHeight = 140
            if (box.width < minWidth || box.height < minHeight) {
              console.log(`[AI Filter] Ignored: Face too small (${Math.round(box.width)}x${Math.round(box.height)})`)
              isProcessingRef.current = false
              return
            }

            // 2. Padding cut-off check (ensure face is not half-visible/cut off at borders)
            const padX = 40
            const padY = 40
            if (
              box.x < padX ||
              box.y < padY ||
              (box.x + box.width) > (vWidth - padX) ||
              (box.y + box.height) > (vHeight - padY)
            ) {
              console.log(`[AI Filter] Ignored: Face cut-off or touching boundaries. (x: ${Math.round(box.x)}, y: ${Math.round(box.y)}, w: ${Math.round(box.width)}, h: ${Math.round(box.height)})`)
              isProcessingRef.current = false
              return
            }

            // 3. Horizontal and Vertical Center alignment check
            const faceCenterX = box.x + box.width / 2
            const faceCenterY = box.y + box.height / 2
            const screenCenterX = vWidth / 2
            const screenCenterY = vHeight / 2

            // Maximum allowed distance from the center of the frame (within 25% of dimensions)
            const maxDistX = vWidth * 0.25
            const maxDistY = vHeight * 0.25

            const distX = Math.abs(faceCenterX - screenCenterX)
            const distY = Math.abs(faceCenterY - screenCenterY)

            if (distX > maxDistX || distY > maxDistY) {
              console.log(`[AI Filter] Ignored: Face is not centered inside target zone. (distX: ${Math.round(distX)}, distY: ${Math.round(distY)})`)
              isProcessingRef.current = false
              return
            }

            console.log(`[AI Filter] PASS! Face is perfectly centered and sized. (Width: ${Math.round(box.width)}, Height: ${Math.round(box.height)})`)

            const descriptor = Array.from(detection.descriptor) as number[]
            
            // Match descriptor with loaded list
            let bestMatch: { jamaah: JamaahListItem; distance: number } | null = null

            for (const j of jamaahList) {
              if (!j.face_descriptor) continue
              try {
                // j.face_descriptor is already a Float32Array!
                const distance = euclideanDistance(descriptor, j.face_descriptor)
                console.log(`[AI Matcher] Comparing with ${j.name}, Distance: ${distance.toFixed(4)}`)
                
                // Threshold < 0.60 is the industry standard (more tolerant)
                if (distance < 0.60) {
                  if (!bestMatch || distance < bestMatch.distance) {
                    bestMatch = { jamaah: j, distance }
                  }
                }
              } catch (e) {
                console.error('Error matching descriptor:', e)
              }
            }

            if (bestMatch && active) {
              const confidence = Math.round((1 - bestMatch.distance) * 100)
              console.log(`[AI Matcher] SUCCESS! Matched with ${bestMatch.jamaah.name} (Dist: ${bestMatch.distance.toFixed(4)}, Conf: ${confidence}%)`)
              await triggerAttendanceForJamaah(bestMatch.jamaah, confidence)
            } else if (active) {
              console.log('[AI Matcher] No match below threshold 0.60.')
              
              // Smart de-duplication: check if we recently captured this unrecognized face in the last 45s
              const now = Date.now()
              recentFailedScansRef.current = recentFailedScansRef.current.filter(item => now - item.timestamp < 45000)

              const isRecentDuplicate = recentFailedScansRef.current.some(item => 
                euclideanDistance(descriptor, item.descriptor) < 0.55
              )

              if (!isRecentDuplicate) {
                console.log('[AI Matcher] Face not recognized. Adding to Verification Queue.')
                recentFailedScansRef.current.push({ descriptor, timestamp: now })
                await triggerUnrecognizedFace(descriptor)
              } else {
                console.log('[AI Matcher] Face unrecognized but detected as recent duplicate. Skipping db write.')
                // If it is a duplicate, release the lock immediately so we can keep scanning, but do NOT record to Supabase!
                isProcessingRef.current = false
              }
            } else {
              isProcessingRef.current = false // Release lock
            }
          } else {
            isProcessingRef.current = false // Release lock
          }
        } catch (err) {
          console.error('Error in face detection loop:', err)
          isProcessingRef.current = false // Release lock on error
        }
      }

      // Scan every 600ms to balance performance & response speed
      intervalId = setInterval(detectFace, 600)
    }

    return () => {
      active = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [cameraReady, modelsLoaded, faceapi, isSessionSuspended, isScanning, jamaahList])

  const handleIdSubmit = async () => {
    if (idInput.length === 6 && !isSessionSuspended) {
      setIsLoading(true)
      try {
        // Cari jamaah di database
        const jamaah = await findJamaahByIdLahir(idInput)
        
        if (jamaah) {
          // Jamaah ditemukan - catat kehadiran
          const result = await catatKehadiran(jamaah.id, 'manual')
          
          if (result.success) {
            const fullName = `${jamaah.prefix || ''} ${jamaah.gelar || ''} ${jamaah.nama_lengkap}`.trim()
            setScanResult({
              id: jamaah.id_tgl_lahir,
              name: fullName,
              status: "hadir",
              avatar: getInitials(fullName),
              time: new Date().toLocaleTimeString("id-ID"),
            })
            
            toast({
              title: "✅ Kehadiran Tercatat",
              description: `${fullName} berhasil presensi`,
            })
          } else {
            // Sudah presensi hari ini
            toast({
              title: "ℹ️ Informasi",
              description: result.message,
              variant: "default",
            })
            
            const fullName = `${jamaah.prefix || ''} ${jamaah.gelar || ''} ${jamaah.nama_lengkap}`.trim()
            setScanResult({
              id: jamaah.id_tgl_lahir,
              name: fullName,
              status: "hadir",
              avatar: getInitials(fullName),
              time: new Date().toLocaleTimeString("id-ID"),
            })
          }
        } else {
          // Jamaah tidak ditemukan - tambah ke antrean gagal
          const tempId = `UNKNOWN-${String(Date.now()).slice(-6)}`
          const antrean = await tambahAntreanGagal(tempId)
          
          if (antrean) {
            const newUnresolved: UnresolvedScan = {
              id: antrean.id,
              tempId: antrean.temp_id,
              thumbnail: antrean.temp_id.replace('UNKNOWN-', 'U'),
              timestamp: new Date(antrean.timestamp).toLocaleTimeString('id-ID'),
              timeAgo: 'Baru saja',
            }
            setUnresolvedScans(prev => [newUnresolved, ...prev])
          }
          
          setScanResult({
            id: idInput,
            name: `ID: ${idInput}`,
            status: "tidak_dikenal",
            avatar: "??",
            time: new Date().toLocaleTimeString("id-ID"),
          })
          
          toast({
            title: "⚠️ ID Tidak Dikenal",
            description: "ID tidak ditemukan di database. Ditambahkan ke antrean gagal.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error submit ID:', error)
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat memproses ID",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        setIdInput("")
      }
    }
  }

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6)
    setIdInput(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleIdSubmit()
    }
  }

  const handleSessionToggle = async () => {
    const newStatus = !isSessionSuspended
    setIsSessionSuspended(newStatus)
    setIsScanning(!newStatus)
    if (newStatus) {
      setIdInput("")
    }

    // Update ke database
    try {
      await updateSystemSetting('session_suspended', newStatus.toString(), 'admin')
      toast({
        title: newStatus ? "🔴 Session Suspended" : "🟢 Session Active",
        description: newStatus 
          ? "Sistem presensi dihentikan sementara" 
          : "Sistem presensi aktif kembali",
      })
    } catch (error) {
      console.error('Error toggle session:', error)
      toast({
        title: "Error",
        description: "Gagal mengubah status session",
        variant: "destructive",
      })
    }
  }

  const openLinkingSheet = (scan: UnresolvedScan) => {
    setLinkingSheet({ open: true, scan })
    setSearchQuery("")
    setSelectedJamaah(null)
  }

  const closeLinkingSheet = () => {
    setLinkingSheet({ open: false, scan: null })
    setSearchQuery("")
    setSelectedJamaah(null)
  }

  const handleLinkJamaah = async () => {
    if (selectedJamaah && linkingSheet.scan) {
      setIsLoading(true)
      try {
        // Tautkan antrean ke jamaah dan catat kehadiran
        const result = await tautkanAntreanKeJamaah(
          linkingSheet.scan.id,
          selectedJamaah.id,
          'admin'
        )

        const isAlreadyPresensi = result.message === 'Sudah presensi hari ini'

        if (result.success || isAlreadyPresensi) {
          // Hapus dari antrean lokal
          setUnresolvedScans(prev => prev.filter(s => s.id !== linkingSheet.scan?.id))
          
          if (result.success) {
            toast({
              title: "✅ Berhasil Ditautkan",
              description: `${selectedJamaah.name} berhasil ditautkan dan kehadiran tercatat`,
            })
          } else {
            toast({
              title: "✅ Wajah Ditautkan (Sudah Hadir)",
              description: `${selectedJamaah.name} berhasil ditautkan. Status presensi hari ini sudah terisi.`,
            })
          }
          
          closeLinkingSheet()
          
          // Reload initial data so the scanner loads the newly linked face descriptor into memory!
          await loadInitialData()
        } else {
          toast({
            title: "Gagal Menautkan",
            description: result.message || "Terjadi kesalahan saat menghubungi database.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error link jamaah:', error)
        toast({
          title: "Error",
          description: "Gagal menautkan jamaah",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleCancelAttendance = async (jamaahId: string) => {
    setIsLoading(true)
    try {
      const result = await hapusPresensiHariIni(jamaahId)
      if (result.success) {
        toast({
          title: "✅ Presensi Dibatalkan",
          description: "Data kehadiran hari ini berhasil dihapus.",
        })
        // Reload all data to refresh statistics and the today's attendance list
        await loadInitialData()
      } else {
        toast({
          title: "Gagal Membatalkan",
          description: result.message || "Gagal menghapus log presensi dari database.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error canceling attendance:', error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat membatalkan presensi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteQueueItem = async (antreanId: string, tempId: string) => {
    setIsLoading(true)
    try {
      const result = await hapusAntreanGagal(antreanId)
      if (result.success) {
        toast({
          title: "🗑️ Antrean Dihapus",
          description: `Item ${tempId} berhasil dibuang dari antrean.`,
        })
        // Reload all initial data to refresh lists
        await loadInitialData()
      } else {
        toast({
          title: "Gagal Menghapus",
          description: result.message || "Gagal menghapus antrean dari database.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting queue item:', error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus antrean.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredJamaah = jamaahList.filter(j =>
    j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.id.includes(searchQuery)
  )

  const todayDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase()

  return (
    <div className="space-y-4">
      {!isSupabaseConfigured && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertOctagon className="h-5 w-5 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-semibold text-warning uppercase tracking-wide">
                  Mode Demo - Database Belum Terhubung
                </h3>
                <p className="text-xs text-muted-foreground">
                  Aplikasi berjalan dalam mode demo. Data tidak akan tersimpan ke database.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <a
                    href="/SETUP_SUPABASE.md"
                    target="_blank"
                    className="text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 transition-colors"
                  >
                    📖 Panduan Setup
                  </a>
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
                  >
                    🚀 Buka Supabase
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className={cn(
        "border transition-all duration-200",
        isSessionSuspended 
          ? "border-destructive/30 bg-destructive/5" 
          : "border-border"
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-md transition-colors duration-200",
                isSessionSuspended 
                  ? "bg-destructive/10 text-destructive" 
                  : "bg-muted text-muted-foreground"
              )}>
                <AlertOctagon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="space-y-0">
                <p className={cn(
                  "text-xs font-semibold uppercase tracking-wide transition-colors duration-200",
                  isSessionSuspended ? "text-destructive" : "text-foreground"
                )}>
                  Session Control
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {isSessionSuspended ? "System paused" : "System active"}
                </p>
              </div>
            </div>
            <button
              onClick={handleSessionToggle}
              className={cn(
                "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border transition-all duration-150 active:scale-98",
                isSessionSuspended 
                  ? "bg-success/10 text-success border-success/30 hover:bg-success/20" 
                  : "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
              )}
            >
              {isSessionSuspended ? "Resume" : "Suspend"}
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-md border border-border">
        <button
          onClick={() => setActiveTab("scanner")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wide transition-all duration-150 active:scale-98",
            activeTab === "scanner"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ScanFace className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">Scanner</span>
        </button>
        <button
          onClick={() => setActiveTab("queue")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wide transition-all duration-150 active:scale-98 relative",
            activeTab === "queue"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">Antrean Gagal</span>
          <span className="sm:hidden">Antrean</span>
          {unresolvedScans.length > 0 && (
            <span className={cn(
              "min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full",
              activeTab === "queue"
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
            )}>
              {unresolvedScans.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wide transition-all duration-150 active:scale-98 relative",
            activeTab === "attendance"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">Presensi Berhasil</span>
          <span className="sm:hidden">Hadir</span>
          {todaysAttendance.length > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full bg-emerald-500 text-white">
              {todaysAttendance.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "scanner" && (
        <>
          {/* ─── BIOMETRIC SCANNER ─────────────────────────────── */}
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              {/* Camera viewport */}
              <div className="relative w-full aspect-[4/3] md:aspect-video bg-black overflow-hidden">

                {/* ── Live video feed ── */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onCanPlay={() => setCameraReady(true)}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                    cameraReady && !isSessionSuspended ? "opacity-100" : "opacity-0"
                  )}
                />

                {/* ── Camera loading / suspended background ── */}
                {(!cameraReady || isSessionSuspended) && !cameraError && (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <ScanFace className="h-10 w-10 text-zinc-600 mx-auto animate-pulse" strokeWidth={1} />
                      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                        {isSessionSuspended ? "Camera Off" : "Initializing Camera..."}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Camera permission error ── */}
                {cameraError && !isSessionSuspended && (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                    <div className="text-center space-y-3 px-6">
                      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                        <XCircle className="h-7 w-7 text-red-400" strokeWidth={1.5} />
                      </div>
                      <p className="text-[10px] text-red-400 uppercase tracking-wider max-w-[200px]">{cameraError}</p>
                      <button onClick={startCamera} className="text-[10px] text-cyan-400 uppercase tracking-wider underline underline-offset-2">
                        Coba Lagi
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Session suspended overlay ── */}
                {isSessionSuspended && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="text-center space-y-4 px-6">
                      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
                        <AlertOctagon className="h-8 w-8 text-red-400" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-[0.25em] mb-1">System Status</p>
                        <p className="text-sm font-semibold text-white uppercase tracking-widest">Session Suspended</p>
                      </div>
                      <button
                        onClick={handleSessionToggle}
                        className="px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                      >
                        Resume Session
                      </button>
                    </div>
                  </div>
                )}

                {/* ── HUD overlay (visible when camera active) ── */}
                {cameraReady && !isSessionSuspended && (
                  <div className="absolute inset-0 pointer-events-none">

                    {/* ── Face ID Ring (SVG) ── */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className={cn(
                          "relative",
                          scanResult?.status === 'hadir'
                            ? 'animate-face-ring-success'
                            : scanResult?.status === 'tidak_dikenal'
                            ? 'animate-face-ring-error'
                            : ''
                        )}
                        style={{ width: 'min(56%, 260px)', aspectRatio: '1' }}
                      >
                        <svg
                          viewBox="0 0 200 200"
                          fill="none"
                          className="w-full h-full"
                          style={{ overflow: 'visible' }}
                        >
                          {/* ── 48 tick marks evenly around the circle ── */}
                          {Array.from({ length: 48 }).map((_, i) => {
                            const angle = (i / 48) * 2 * Math.PI - Math.PI / 2
                            const big = i % 4 === 0            // every 4th mark is longer
                            const r1 = big ? 73 : 76
                            const r2 = 82
                            const x1 = 100 + r1 * Math.cos(angle)
                            const y1 = 100 + r1 * Math.sin(angle)
                            const x2 = 100 + r2 * Math.cos(angle)
                            const y2 = 100 + r2 * Math.sin(angle)
                            const color =
                              scanResult?.status === 'hadir'
                                ? `rgba(52,211,153,${big ? 0.9 : 0.5})`
                                : scanResult?.status === 'tidak_dikenal'
                                ? `rgba(248,113,113,${big ? 0.9 : 0.5})`
                                : `rgba(255,255,255,${big ? 0.55 : 0.22})`
                            return (
                              <line
                                key={i}
                                x1={x1} y1={y1}
                                x2={x2} y2={y2}
                                stroke={color}
                                strokeWidth={big ? 2 : 1.2}
                                strokeLinecap="round"
                              />
                            )
                          })}

                          {/* ── Outer rotating dashed ring (scanning only) ── */}
                          {!scanResult && (
                            <circle
                              cx="100" cy="100" r="88"
                              stroke="rgba(34,211,238,0.45)"
                              strokeWidth="1.5"
                              strokeDasharray="5 11"
                              strokeLinecap="round"
                              className="animate-face-ring-scan"
                              style={{ transformOrigin: '100px 100px' }}
                            />
                          )}

                          {/* ── Inner counter-rotating ring (scanning only) ── */}
                          {!scanResult && (
                            <circle
                              cx="100" cy="100" r="70"
                              stroke="rgba(34,211,238,0.18)"
                              strokeWidth="1"
                              strokeDasharray="3 14"
                              strokeLinecap="round"
                              className="animate-face-ring-scan-reverse"
                              style={{ transformOrigin: '100px 100px' }}
                            />
                          )}

                          {/* ── Solid ring on result ── */}
                          {scanResult && (
                            <circle
                              cx="100" cy="100" r="88"
                              stroke={scanResult.status === 'hadir' ? '#34d399' : '#f87171'}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                      </div>
                    </div>

                    {/* ── Status label — center below ring ── */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        style={{ marginTop: 'min(32%, 155px)' }}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full animate-dot-blink',
                              scanResult?.status === 'hadir' ? 'bg-emerald-400'
                              : scanResult?.status === 'tidak_dikenal' ? 'bg-red-400'
                              : 'bg-cyan-400'
                            )}
                          />
                          <span className="text-[10px] font-mono tracking-[0.18em] text-white/80 uppercase">
                            {scanResult?.status === 'hadir' ? 'Face Verified'
                             : scanResult?.status === 'tidak_dikenal' ? 'Not Recognized'
                             : 'Scanning Face'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Corner brackets (4 corners) ── */}
                    <div className="absolute top-4 left-4">
                      <div className="w-7 h-7 border-l-[2.5px] border-t-[2.5px] border-white/30 rounded-tl" />
                    </div>
                    <div className="absolute top-4 right-4">
                      <div className="w-7 h-7 border-r-[2.5px] border-t-[2.5px] border-white/30 rounded-tr" />
                    </div>
                    <div className="absolute bottom-14 left-4">
                      <div className="w-7 h-7 border-l-[2.5px] border-b-[2.5px] border-white/30 rounded-bl" />
                    </div>
                    <div className="absolute bottom-14 right-4">
                      <div className="w-7 h-7 border-r-[2.5px] border-b-[2.5px] border-white/30 rounded-br" />
                    </div>

                    {/* ── Bottom HUD bar ── */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm border border-white/10">
                        <span className="text-[9px] font-mono text-cyan-400/80 uppercase tracking-widest">AI · FACE ID</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm border border-white/10">
                        <span className="text-[9px] font-mono text-white/40">30 FPS</span>
                      </div>
                    </div>

                    {/* ── Scan result card — glassmorphism overlay ── */}
                    {scanResult && (
                      <div className="absolute bottom-12 left-3 right-3 animate-result-in">
                        <div className={cn(
                          'rounded-2xl border backdrop-blur-xl px-4 py-3 flex items-center gap-3',
                          scanResult.status === 'hadir'
                            ? 'bg-emerald-950/80 border-emerald-400/25'
                            : 'bg-red-950/80 border-red-400/25'
                        )}>
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border',
                            scanResult.status === 'hadir'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          )}>
                            {scanResult.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{scanResult.name}</p>
                            <p className="text-[10px] font-mono text-white/45 mt-0.5">ID: {scanResult.id} · {scanResult.time}</p>
                          </div>
                          {scanResult.status === 'hadir' ? (
                            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" strokeWidth={2} />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400 shrink-0" strokeWidth={2} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

          {/* Manual authorization card — shown when not suspended */}
          {!isSessionSuspended && (

            <Card className="border-border">
              <CardHeader className="px-3 pt-3 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  Manual Authorization
                </CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Enter 6-digit ID (DDMMYY)
                </p>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-center gap-1.5 md:gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-10 h-12 md:w-11 md:h-14 rounded-md border flex items-center justify-center text-lg md:text-xl font-mono font-semibold transition-all duration-100",
                          idInput[i]
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border bg-muted/20 text-muted-foreground/30"
                        )}
                      >
                        {idInput[i] || "•"}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center gap-6 text-[9px] text-muted-foreground uppercase tracking-[0.15em]">
                    <span>DD</span>
                    <span>MM</span>
                    <span>YY</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Enter ID"
                        value={idInput}
                        onChange={handleIdChange}
                        onKeyDown={handleKeyDown}
                        maxLength={6}
                        className="text-center font-mono text-lg tracking-widest h-11 opacity-0 absolute inset-0"
                        autoComplete="off"
                      />
                      <button
                        onClick={() => inputRef.current?.focus()}
                        className="w-full h-11 rounded-md border border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wider hover:bg-muted/40 transition-colors duration-150 active:scale-98"
                      >
                        Tap to Enter ID
                      </button>
                    </div>
                    <Button
                      onClick={handleIdSubmit}
                      disabled={idInput.length !== 6 || isLoading}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 rounded-md uppercase text-xs font-semibold tracking-wide active:scale-98 disabled:opacity-30"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <Send className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === "queue" && (
        <Card className="border-border">
          <CardHeader className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" strokeWidth={1.5} />
                Antrean Pemindaian Gagal
              </CardTitle>
              <span className="text-[10px] text-muted-foreground font-mono">
                {unresolvedScans.length} item
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Wajah tidak dikenal - perlu ditautkan ke data jamaah
            </p>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {unresolvedScans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 rounded-md bg-success/10 border border-success/20 flex items-center justify-center mb-3">
                  <CheckCircle className="h-7 w-7 text-success" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-1">
                  Antrean Kosong
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider max-w-xs">
                  Semua pemindaian telah berhasil diidentifikasi
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {unresolvedScans.map((scan) => (
                  <div
                    key={scan.tempId}
                    className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/10 hover:bg-muted/20 transition-colors duration-150"
                  >
                    <Avatar className="h-12 w-12 rounded-md border border-border shrink-0">
                      <AvatarFallback className="bg-muted/30 text-muted-foreground text-xs font-semibold rounded-md">
                        {scan.thumbnail}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground font-mono">
                        {scan.tempId}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                        <span className="text-[10px] text-muted-foreground">
                          {scan.timestamp}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({scan.timeAgo})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        onClick={() => openLinkingSheet(scan)}
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] uppercase tracking-wide font-semibold px-3 h-8 rounded-md active:scale-98"
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                        Tautkan
                      </Button>
                      <Button
                        onClick={() => handleDeleteQueueItem(scan.id, scan.tempId)}
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 hover:border-destructive text-destructive hover:bg-destructive/10 text-[10px] uppercase tracking-wide font-semibold px-3 h-8 rounded-md active:scale-98"
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "attendance" && (
        <Card className="border-border">
          <CardHeader className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" strokeWidth={1.5} />
                Presensi Berhasil (Hari Ini)
              </CardTitle>
              <span className="text-[10px] text-muted-foreground font-mono">
                {todaysAttendance.length} jamaah
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Daftar jamaah yang berhasil melakukan scan wajah atau input ID manual hari ini
            </p>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {todaysAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 rounded-md bg-muted/10 border border-border flex items-center justify-center mb-3">
                  <Clock className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-1">
                  Belum Ada Presensi
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider max-w-xs">
                  Belum ada jamaah yang melakukan presensi hari ini
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysAttendance.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/10 hover:bg-muted/20 transition-colors duration-150"
                  >
                    <Avatar className="h-10 w-10 rounded-md border border-border shrink-0">
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold rounded-md">
                        {getInitials(item.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                          ID: {item.idJamaah}
                        </span>
                        <span className="text-muted-foreground/30 text-[9px] font-mono">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {item.time}
                          </span>
                        </div>
                        <span className="text-muted-foreground/30 text-[9px] font-mono">•</span>
                        <span className={cn(
                          "text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                          item.metode === 'face_id' 
                            ? "bg-cyan-500/5 text-cyan-600 border-cyan-500/15" 
                            : "bg-amber-500/5 text-amber-600 border-amber-500/15"
                        )}>
                          {item.metode === 'face_id' ? 'Face AI' : 'Manual ID'}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleCancelAttendance(item.jamaahId)}
                      variant="outline"
                      size="sm"
                      className="border-destructive/30 hover:border-destructive text-destructive hover:bg-destructive/10 text-[10px] uppercase tracking-wide font-semibold px-3 h-8 rounded-md active:scale-98 shrink-0 animate-fade-in"
                    >
                      Batal Ngaji
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet open={linkingSheet.open} onOpenChange={(open) => !open && closeLinkingSheet()}>
        <SheetContent side="bottom" className="rounded-t-xl max-h-[85vh]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" strokeWidth={1.5} />
              Tautkan Jamaah
            </SheetTitle>
            <SheetDescription className="text-[10px] uppercase tracking-wider">
              Pilih nama jamaah untuk {linkingSheet.scan?.tempId}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <Input
                type="text"
                placeholder="Cari nama atau ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs rounded-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-1 pr-3">
                {filteredJamaah.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground uppercase tracking-wider">
                    Tidak ada hasil
                  </div>
                ) : (
                  filteredJamaah.map((jamaah) => (
                    <button
                      key={jamaah.id}
                      onClick={() => setSelectedJamaah(jamaah)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-md border transition-all duration-150 active:scale-98",
                        selectedJamaah?.id === jamaah.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30"
                      )}
                    >
                      <div className="flex-1 text-left">
                        <p className="text-xs font-medium">{jamaah.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          ID: {jamaah.id}
                        </p>
                      </div>
                      {selectedJamaah?.id === jamaah.id && (
                        <CheckCircle className="h-4 w-4 text-primary" strokeWidth={2} />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <SheetFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeLinkingSheet}
              className="w-full sm:w-auto h-10 text-xs uppercase tracking-wide font-semibold rounded-md active:scale-98"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleLinkJamaah}
              disabled={!selectedJamaah || isLoading}
              className="w-full sm:w-auto h-10 text-xs uppercase tracking-wide font-semibold rounded-md active:scale-98 disabled:opacity-30"
            >
              {isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" strokeWidth={1.5} />
              ) : (
                <Link2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
              )}
              Tautkan Sekarang
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
