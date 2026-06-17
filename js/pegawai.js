// pegawai.js
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

// READ
export async function getPegawai() {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('id_pegawai', { ascending: false });
    
    if (error) throw error;
    return data;
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
