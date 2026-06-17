import { supabase } from '../app/koneksi.js';

const TABLE_NAME = 'pegawai';

// CREATE / UPDATE
export async function savePegawai(data, id = null) {
    if (id) {
        const { data: result, error } = await supabase
            .from(TABLE_NAME)
            .update(data)
            .eq('id_pegawai', id)
            .select();
        if (error) throw error;
        return result;
    } else {
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
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });

    if (search) {
        query = query.or(`nik.ilike.%${search}%,nama.ilike.%${search}%`);
    }

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.kelompok_pegawai) query = query.eq('kelompok_pegawai', filters.kelompok_pegawai);
    if (filters.kelompok_jabatan) query = query.eq('kelompok_jabatan', filters.kelompok_jabatan);

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, count, error } = await query
        .order('id_pegawai', { ascending: false })
        .range(from, to);
    
    if (error) throw error;
    return { data, totalCount: count }; 
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

// GET REKAP (UNTUK KOTAK ANGKA)
export async function getSummaryPegawai() {
    const { data, error } = await supabase.from(TABLE_NAME).select('status');
    if (error) throw error;

    return {
        total: data.length,
        aktif: data.filter(p => p.status === 'Aktif').length,
        pensiun: data.filter(p => p.status === 'Pensiun').length,
        resign: data.filter(p => p.status === 'Resign').length,
        mutasi: data.filter(p => p.status === 'Mutasi').length,
        lainnya: data.filter(p => !['Aktif', 'Pensiun', 'Resign', 'Mutasi'].includes(p.status)).length
    };
}
