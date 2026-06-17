// js/pegawai.js
import { supabase } from '../app/koneksi.js';

const TABLE_NAME = 'pegawai';

// CREATE / UPDATE
export async function savePegawai(data, id = null) {
    if (id) {
        // Update
        const { data: result, error } = await supabase
            .from(TABLE_NAME)
            .update(data)
            .eq('id_pegawai', id)
            .select();
        if (error) throw error;
        return result;
    } else {
        // Insert
        const { data: result, error } = await supabase
            .from(TABLE_NAME)
            .insert([data])
            .select();
        if (error) throw error;
        return result;
    }
}

// READ DENGAN PENCARIAN, FILTER, DAN PAGINATION
export async function getPegawai(page = 1, limit = 25, search = '', filters = {}) {
    // Siapkan query dasar dan minta total data (count: exact)
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });

    // PENCARIAN: Mencari berdasarkan NIK atau Nama menggunakan ilike (case-insensitive)
    if (search) {
        query = query.or(`nik.ilike.%${search}%,nama.ilike.%${search}%`);
    }

    // FILTER: Menerapkan filter jika ada nilainya
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.kelompok_pegawai) query = query.eq('kelompok_pegawai', filters.kelompok_pegawai);
    if (filters.kelompok_jabatan) query = query.eq('kelompok_jabatan', filters.kelompok_jabatan);

    // PAGINATION: Menghitung rentang data (Supabase menggunakan indeks berbasis 0)
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Eksekusi query dengan order dan range pagination
    const { data, count, error } = await query
        .order('id_pegawai', { ascending: false })
        .range(from, to);
    
    if (error) throw error;
    return { data, totalCount: count }; // Mengembalikan data dan total keseluruhan baris
}

// DELETE
export async function deletePegawai(id) {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id_pegawai', id);
    
    if (error) throw error;
    return true;
}

// MENGAMBIL REKAP STATUS PEGAWAI (UNTUK KOTAK ANGKA DI ATAS)
export async function getSummaryPegawai() {
    // Kita hanya mengambil kolom 'status' agar performa tetap cepat
    const { data, error } = await supabase.from(TABLE_NAME).select('status');
    if (error) throw error;

    // Menghitung jumlah per kategori
    const summary = {
        total: data.length,
        aktif: data.filter(p => p.status === 'Aktif').length,
        pensiun: data.filter(p => p.status === 'Pensiun').length,
        resign: data.filter(p => p.status === 'Resign').length,
        mutasi: data.filter(p => p.status === 'Mutasi').length,
        lainnya: data.filter(p => !['Aktif', 'Pensiun', 'Resign', 'Mutasi'].includes(p.status)).length
    };
    
    return summary;
}
