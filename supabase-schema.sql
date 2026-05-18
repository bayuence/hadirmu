-- ============================================================
--  HADIRMU — SUPABASE SQL SCHEMA
--  Matches spreadsheet: DAFTAR ABSENSI KELOMPOK BP
--  Columns: NO | PREFIX | GELAR | NAMA LENGKAP | JENIS KELAMIN | JENJANG | ID/TGL LAHIR | NO WhatsApp
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- DROP existing tables (clean slate)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS log_presensi    CASCADE;
DROP TABLE IF EXISTS antrean_gagal   CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS jamaah          CASCADE;
DROP VIEW  IF EXISTS v_statistik_hari_ini;

-- ────────────────────────────────────────────────────────────
-- TABLE: jamaah
--   Maps 1-to-1 with spreadsheet Row 2 headers
-- ────────────────────────────────────────────────────────────
CREATE TABLE jamaah (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Spreadsheet column: NO  (row number, optional helper)
  no            INTEGER,

  -- Spreadsheet column: PREFIX  (Bp. / Ibu / etc.)
  prefix        VARCHAR(20),

  -- Spreadsheet column: GELAR  (H. / Hj. / Dr. / etc.)
  gelar         VARCHAR(30),

  -- Spreadsheet column: NAMA LENGKAP
  nama_lengkap  VARCHAR(150)  NOT NULL,

  -- Spreadsheet column: JENIS KELAMIN  (L = Laki-laki, P = Perempuan)
  jenis_kelamin CHAR(1)       CHECK (jenis_kelamin IN ('L', 'P')),

  -- Spreadsheet column: JENJANG  (Dewasa / Remaja)
  jenjang       VARCHAR(20)   DEFAULT 'Dewasa',

  -- Spreadsheet column: ID/TGL LAHIR  (6-digit DDMMYY, unique identifier used for scanning)
  id_tgl_lahir  VARCHAR(10)   UNIQUE NOT NULL,

  -- Spreadsheet column: NO WhatsApp
  no_wa         VARCHAR(20),

  -- Internal metadata
  aktif         BOOLEAN       DEFAULT TRUE,
  face_descriptor TEXT,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Index for fast lookup by id_tgl_lahir (used every scan)
CREATE INDEX idx_jamaah_id_tgl_lahir ON jamaah (id_tgl_lahir);
CREATE INDEX idx_jamaah_aktif        ON jamaah (aktif);
CREATE INDEX idx_jamaah_nama         ON jamaah (nama_lengkap);

-- ────────────────────────────────────────────────────────────
-- TABLE: log_presensi
--   One row per attendance event, references jamaah.id
-- ────────────────────────────────────────────────────────────
CREATE TABLE log_presensi (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  jamaah_id     UUID        NOT NULL REFERENCES jamaah(id) ON DELETE CASCADE,
  tanggal       DATE        NOT NULL DEFAULT CURRENT_DATE,
  jam_masuk     TIME        NOT NULL DEFAULT CURRENT_TIME,
  status        CHAR(1)     NOT NULL DEFAULT 'H'  CHECK (status IN ('H','A','I','S')),
  metode_input  VARCHAR(30) DEFAULT 'manual',
  keterangan    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate attendance for the same day
  UNIQUE (jamaah_id, tanggal)
);

CREATE INDEX idx_log_jamaah_id ON log_presensi (jamaah_id);
CREATE INDEX idx_log_tanggal   ON log_presensi (tanggal DESC);

-- ────────────────────────────────────────────────────────────
-- TABLE: antrean_gagal
--   Holds unrecognised scan events waiting to be linked
-- ────────────────────────────────────────────────────────────
CREATE TABLE antrean_gagal (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  temp_id          VARCHAR(50) NOT NULL UNIQUE,
  timestamp        TIMESTAMPTZ DEFAULT NOW(),
  status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','resolved','ignored')),
  linked_jamaah_id UUID        REFERENCES jamaah(id) ON DELETE SET NULL,
  face_descriptor  TEXT,
  resolved_at      TIMESTAMPTZ,
  resolved_by      VARCHAR(50),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_antrean_status    ON antrean_gagal (status);
CREATE INDEX idx_antrean_timestamp ON antrean_gagal (timestamp DESC);

-- ────────────────────────────────────────────────────────────
-- TABLE: system_settings
--   Key-value store for runtime configuration (session state, etc.)
-- ────────────────────────────────────────────────────────────
CREATE TABLE system_settings (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key   VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT         NOT NULL DEFAULT '',
  setting_type  VARCHAR(20)  DEFAULT 'string' CHECK (setting_type IN ('string','boolean','number','json')),
  description   TEXT,
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_by    VARCHAR(50)
);

-- ────────────────────────────────────────────────────────────
-- VIEW: v_statistik_hari_ini
--   Used by dashboard to show today's attendance summary
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_statistik_hari_ini AS
SELECT
  COUNT(*)                                               AS total_jamaah,
  COUNT(lp.id)                                           AS hadir,
  COUNT(*) - COUNT(lp.id)                                AS tidak_hadir,
  ROUND(COUNT(lp.id)::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS persentase_kehadiran
FROM jamaah j
LEFT JOIN log_presensi lp
  ON lp.jamaah_id = j.id AND lp.tanggal = CURRENT_DATE
WHERE j.aktif = TRUE;

-- ────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at trigger
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_jamaah_updated_at
  BEFORE UPDATE ON jamaah
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- SEED: system_settings defaults
-- ────────────────────────────────────────────────────────────
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('session_suspended', 'false',   'boolean', 'Whether the scan session is currently paused'),
  ('kelompok_name',     'Kelompok BP', 'string', 'Name of the jamaah group'),
  ('admin_password',    'admin123', 'string',  'Password akses portal admin/pengurus'),
  ('app_version',       '1.0.0',   'string',  'Application version')
ON CONFLICT (setting_key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- SAMPLE DATA  (matches your spreadsheet format exactly)
-- Remove or replace with your real CSV import
-- ────────────────────────────────────────────────────────────
INSERT INTO jamaah (no, prefix, gelar, nama_lengkap, jenis_kelamin, jenjang, id_tgl_lahir, no_wa) VALUES
  (1,  'Bp.',  'H.',   'Ahmad Sudrajat',    'L', 'Dewasa', '150575', '08123456789'),
  (2,  'Ibu',  'Hj.',  'Siti Nurhaliza',    'P', 'Dewasa', '220380', '08987654321'),
  (3,  'Bp.',  '',     'Budi Santoso',      'L', 'Dewasa', '100590', '08112233445'),
  (4,  'Ibu',  '',     'Dewi Lestari',      'P', 'Dewasa', '051295', '08556677889'),
  (5,  '',     '',     'Rizky Pratama',     'L', 'Remaja', '150504', '08998877665')
ON CONFLICT (id_tgl_lahir) DO NOTHING;
