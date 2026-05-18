import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    // Pastikan payload berbentuk array (kumpulan data jamaah)
    if (!payload || !Array.isArray(payload)) {
      return NextResponse.json(
        { error: 'Payload harus berupa array of objects.' },
        { status: 400 }
      );
    }

    if (action === 'upsert') {
      // Upsert: akan INSERT jika id_tgl_lahir belum ada, atau UPDATE jika sudah ada
      const { data, error } = await supabase
        .from('jamaah')
        .upsert(payload, { onConflict: 'id_tgl_lahir' })
        .select();

      if (error) {
        console.error('Supabase upsert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil sinkronisasi ${payload.length} baris data jamaah.`,
        data
      });
    }

    return NextResponse.json({ error: 'Action tidak dikenali.' }, { status: 400 });

  } catch (error: any) {
    console.error('Sync API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
