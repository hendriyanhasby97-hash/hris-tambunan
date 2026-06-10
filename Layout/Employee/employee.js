import { supabase } from '../../App/koneksi.js';

export const EmployeeCRUD = {
    async getAll() {
        const { data, error } = await supabase.from('employee').select('*').order('nama', { ascending: true });
        if (error) console.error(error);
        return data;
    },
    async create(employeeData) {
        const { error } = await supabase.from('employee').insert([employeeData]);
        if (error) alert("Error: " + error.message);
    },
    async delete(id_pegawai) {
        const { error } = await supabase.from('employee').delete().eq('id_pegawai', id_pegawai);
        if (error) alert("Error: " + error.message);
    }
};
