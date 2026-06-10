// Layout/Employee/employee.js
import { supabase } from '../../App/koneksi.js';

export const EmployeeCRUD = {
    // Fungsi untuk mengambil semua data pegawai
    async getAll() {
        const { data, error } = await supabase
            .from('employee')
            .select('*')
            .order('nama', { ascending: true }); // Mengurutkan berdasarkan nama (A-Z)
            
        if (error) {
            console.error("Error mengambil data:", error);
            return [];
        }
        return data;
    },

    // Fungsi untuk menambah data pegawai baru
    async create(employeeData) {
        const { error } = await supabase
            .from('employee')
            .insert([employeeData]);
            
        if (error) {
            alert("Gagal menyimpan data: " + error.message);
        } else {
            alert("Data pegawai berhasil ditambahkan!");
        }
    },

    // Fungsi untuk menghapus data pegawai berdasarkan ID
    async delete(id_pegawai) {
        const { error } = await supabase
            .from('employee')
            .delete()
            .eq('id_pegawai', id_pegawai);
            
        if (error) {
            alert("Gagal menghapus data: " + error.message);
        }
    }
};
