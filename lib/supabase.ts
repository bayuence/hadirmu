import { createClient } from '@supabase/supabase-js'

// ============================================
// SUPABASE CLIENT
// ============================================

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

const isConfigured =
  supabaseUrl     !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder-key' &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')

if (!isConfigured) {
  console.warn('⚠️  Supabase belum dikonfigurasi — mode DEMO aktif.')
  console.warn('    Edit .env.local lalu restart pnpm dev.')
}

export const supabase               = createClient(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured   = isConfigured

// ============================================
// HELPER: silent schema / network errors
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSchemaError(error: any): boolean {
  if (!error) return false
  if (error.code === '42P01') return true                              // relation does not exist
  if (error.message?.includes('Failed to fetch')) return true         // network / cold-start
  return false
}

// ============================================
// TYPE DEFINITIONS  (matches spreadsheet columns)
// ============================================

/** Row in the `jamaah` table — matches spreadsheet headers exactly */
export type Jamaah = {
  id:            string          // UUID internal PK
  no:            number | null   // NO — row number from spreadsheet
  prefix:        string | null   // PREFIX (Bp. / Ibu / etc.)
  gelar:         string | null   // GELAR (H. / Hj. / Dr. / etc.)
  nama_lengkap:  string          // NAMA LENGKAP
  jenis_kelamin: 'L' | 'P' | null // JENIS KELAMIN
  jenjang:       string | null   // JENJANG (Dewasa / Remaja)
  id_tgl_lahir:  string          // ID/TGL LAHIR — 6-digit DDMMYY, scan key
  no_wa:         string | null   // NO WhatsApp
  aktif:         boolean
  face_descriptor: string | null // Face recognition embedding
  created_at:    string
  updated_at:    string
}

export type LogPresensi = {
  id:           string
  jamaah_id:    string
  tanggal:      string
  jam_masuk:    string
  status:       'H' | 'A' | 'I' | 'S'
  metode_input: string
  keterangan:   string | null
  created_at:   string
}

export type AntreanGagal = {
  id:               string
  temp_id:          string
  timestamp:        string
  status:           'pending' | 'resolved' | 'ignored'
  linked_jamaah_id: string | null
  face_descriptor:  string | null // Captured face descriptor of the unrecognized face
  resolved_at:      string | null
  resolved_by:      string | null
  created_at:       string
}

export type SystemSettings = {
  id:            string
  setting_key:   string
  setting_value: string
  setting_type:  'string' | 'boolean' | 'number' | 'json'
  description:   string | null
  updated_at:    string
  updated_by:    string | null
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

/**
 * Cari jamaah berdasarkan ID/TGL LAHIR (6-digit DDMMYY)
 */
export async function findJamaahByIdLahir(idLahir: string) {
  const { data, error } = await supabase
    .from('jamaah')
    .select('*')
    .eq('id_tgl_lahir', idLahir)
    .eq('aktif', true)
    .single()

  if (error) {
    if (error.code !== 'PGRST116' && !isSchemaError(error)) {
      console.error('Error finding jamaah:', error)
    }
    return null
  }

  return data as Jamaah | null
}

/**
 * Catat kehadiran jamaah
 */
export async function catatKehadiran(
  jamaahId:    string,
  metodeInput: string = 'manual',
  keterangan?: string
) {
  const { data, error } = await supabase
    .from('log_presensi')
    .insert({
      jamaah_id:    jamaahId,
      tanggal:      new Date().toISOString().split('T')[0],  // YYYY-MM-DD
      jam_masuk:    new Date().toTimeString().split(' ')[0], // HH:MM:SS
      status:       'H',
      metode_input: metodeInput,
      keterangan:   keterangan || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'Sudah presensi hari ini', data: null }
    }
    if (!isSchemaError(error)) {
      console.error('Error catat kehadiran:', error)
    }
    return { success: false, message: error.message || 'Gagal mencatat kehadiran', data: null }
  }

  return { success: true, message: 'Kehadiran berhasil dicatat', data }
}

/**
 * Tambah ke antrean gagal (wajah tidak dikenal)
 */
export async function tambahAntreanGagal(tempId: string, faceDescriptor?: number[]) {
  const insertPayload: any = { temp_id: tempId, status: 'pending' }
  if (faceDescriptor) {
    insertPayload.face_descriptor = JSON.stringify(faceDescriptor)
  }

  const { data, error } = await supabase
    .from('antrean_gagal')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    if (!isSchemaError(error)) {
      console.error('Error tambah antrean gagal:', error)
    }
    return null
  }

  return data as AntreanGagal
}

/**
 * Ambil semua antrean gagal yang pending
 */
export async function getAntreanGagalPending() {
  const { data, error } = await supabase
    .from('antrean_gagal')
    .select('*')
    .eq('status', 'pending')
    .order('timestamp', { ascending: false })

  if (error) {
    if (!isSchemaError(error)) {
      console.error('Error get antrean gagal:', error)
    }
    return []
  }

  return data as AntreanGagal[]
}

/**
 * Tautkan antrean gagal ke jamaah dan catat kehadiran
 */
export async function tautkanAntreanKeJamaah(
  antreanId:     string,
  jamaahId:      string,
  adminUsername: string = 'admin'
) {
  console.log(`[LINK] Linking antreanId: ${antreanId} to jamaahId: ${jamaahId}`)
  
  // 1. Get the antrean record to find its face descriptor
  const { data: antreanData, error: fetchError } = await supabase
    .from('antrean_gagal')
    .select('face_descriptor')
    .eq('id', antreanId)
    .single()

  if (fetchError) {
    console.error('[LINK] Error fetching antrean_gagal:', fetchError)
  } else if (antreanData) {
    console.log('[LINK] Fetched antreanData successfully. descriptor length:', antreanData.face_descriptor?.length)
    
    if (antreanData.face_descriptor) {
      // 2. Copy the face descriptor to the jamaah table
      const { error: updateJamaahError } = await supabase
        .from('jamaah')
        .update({ face_descriptor: antreanData.face_descriptor })
        .eq('id', jamaahId)

      if (updateJamaahError) {
        console.error('[LINK] Error updating jamaah face_descriptor:', updateJamaahError)
      } else {
        console.log('[LINK] Successfully updated jamaah face_descriptor in DB!')
      }
    } else {
      console.warn('[LINK] face_descriptor inside antrean_gagal was NULL/EMPTY!')
    }
  }

  // 3. Mark the antrean as resolved
  const { error: updateError } = await supabase
    .from('antrean_gagal')
    .update({
      status:           'resolved',
      linked_jamaah_id: jamaahId,
      resolved_at:      new Date().toISOString(),
      resolved_by:      adminUsername,
    })
    .eq('id', antreanId)

  if (updateError) {
    if (!isSchemaError(updateError)) {
      console.error('[LINK] Error update antrean status:', updateError)
    }
    return { success: false, message: updateError.message || 'Gagal update antrean' }
  }

  return catatKehadiran(jamaahId, 'manual_link', 'Ditautkan dari antrean gagal')
}

/**
 * Ambil semua jamaah aktif (untuk dropdown / linking)
 */
export async function getAllJamaahAktif() {
  const { data, error } = await supabase
    .from('jamaah')
    .select('id, id_tgl_lahir, prefix, gelar, nama_lengkap, face_descriptor')
    .eq('aktif', true)
    .order('nama_lengkap', { ascending: true })

  if (error) {
    if (!isSchemaError(error)) {
      console.error('Error get jamaah:', error)
    }
    return []
  }

  return data as Pick<Jamaah, 'id' | 'id_tgl_lahir' | 'prefix' | 'gelar' | 'nama_lengkap' | 'face_descriptor'>[]
}

/**
 * Get system setting by key
 */
export async function getSystemSetting(key: string) {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('setting_key', key)
    .single()

  if (error) {
    if (error.code !== 'PGRST116' && !isSchemaError(error)) {
      console.error('Error get system setting:', error)
    }
    return null
  }

  return data as SystemSettings | null
}

/**
 * Update system setting
 */
export async function updateSystemSetting(
  key:       string,
  value:     string,
  updatedBy: string = 'admin'
) {
  const { data, error } = await supabase
    .from('system_settings')
    .update({ setting_value: value, updated_by: updatedBy })
    .eq('setting_key', key)
    .select()
    .single()

  if (error) {
    if (!isSchemaError(error)) {
      console.error('Error update system setting:', error)
    }
    return null
  }

  return data as SystemSettings
}

/**
 * Get statistik kehadiran hari ini (via view)
 */
export async function getStatistikHariIni() {
  const { data, error } = await supabase
    .from('v_statistik_hari_ini')
    .select('*')
    .single()

  if (error) {
    if (!isSchemaError(error)) {
      console.error('Error get statistik:', error)
    }
    return { total_jamaah: 0, hadir: 0, tidak_hadir: 0, persentase_kehadiran: 0 }
  }

  return data
}

/**
 * Get log presensi hari ini untuk live feed
 */
export async function getLogPresensiHariIni(limit: number = 10) {
  const { data, error } = await supabase
    .from('log_presensi')
    .select(`
      *,
      jamaah:jamaah_id (
        id_tgl_lahir,
        prefix,
        gelar,
        nama_lengkap
      )
    `)
    .eq('tanggal', new Date().toISOString().split('T')[0])
    .order('jam_masuk', { ascending: false })
    .limit(limit)

  if (error) {
    if (!isSchemaError(error)) {
      console.error('Error get log presensi:', error)
    }
    return []
  }

  return data
}

/**
 * Simpan / update face descriptor untuk jamaah
 */
export async function updateJamaahFaceDescriptor(jamaahId: string, descriptor: number[]) {
  const { data, error } = await supabase
    .from('jamaah')
    .update({ face_descriptor: JSON.stringify(descriptor) })
    .eq('id', jamaahId)
    .select()
    .single()

  if (error) {
    console.error('Error updating face descriptor:', error)
    return { success: false, message: error.message }
  }
  return { success: true, data }
}

/**
 * Hapus log presensi jamaah hari ini
 */
export async function hapusPresensiHariIni(jamaahId: string) {
  const { error } = await supabase
    .from('log_presensi')
    .delete()
    .eq('jamaah_id', jamaahId)
    .eq('tanggal', new Date().toISOString().split('T')[0])

  if (error) {
    console.error('Error deleting log presensi:', error)
    return { success: false, message: error.message || 'Gagal menghapus log presensi' }
  }

  return { success: true }
}

/**
 * Hapus antrean gagal (delete row completely)
 */
export async function hapusAntreanGagal(antreanId: string) {
  const { error } = await supabase
    .from('antrean_gagal')
    .delete()
    .eq('id', antreanId)

  if (error) {
    console.error('Error deleting antrean_gagal:', error)
    return { success: false, message: error.message || 'Gagal menghapus antrean gagal' }
  }

  return { success: true }
}


