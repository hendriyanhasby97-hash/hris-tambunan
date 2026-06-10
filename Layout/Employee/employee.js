// Layout/Employee/employee.js
import { supabase } from '../../App/koneksi.js';

export const EmployeeCRUD = {
    // READ: Ambil semua data pegawai
    async getAll() {
        const { data, error } = await supabase
            .from('employee')
            .select('*')
            .order('nama', { ascending: true });
        
        if (error) throw error;
        return data;
    },

    // CREATE: Tambah pegawai baru
    async create(employeeData) {
        const { data, error } = await supabase
            .from('employee')
            .insert([employeeData])
            .select();

        if (error) throw error;
        return data;
    },

    // UPDATE: Ubah data pegawai berdasarkan id_pegawai
    async update(id_pegawai, updatedData) {
        const { data, error } = await supabase
            .from('employee')
            .update(updatedData)
            .eq('id_pegawai', id_pegawai)
            .select();

        if (error) throw error;
        return data;
    },

    // DELETE: Hapus pegawai
    async delete(id_pegawai) {
        const { data, error } = await supabase
            .from('employee')
            .delete()
            .eq('id_pegawai', id_pegawai);

        if (error) throw error;
        return data;
    },

    // Fungsi Pembantu: Memetakan elemen form HTML ke Object Database
    getFormData() {
        return {
            nik: document.getElementById('nik').value,
            nama: document.getElementById('nama').value,
            jeniskelamin: document.getElementById('jeniskelamin').value,
            agama: document.getElementById('agama').value,
            statuspernikahan: document.getElementById('statuspernikahan').value,
            pasangan: document.getElementById('pasangan').value,
            jumlahanak: parseInt(document.getElementById('jumlahanak').value) || 0,
            alamat: document.getElementById('alamat').value,
            nip: document.getElementById('nip').value,
            status: document.getElementById('status').value,
            kelompoktenaga: document.getElementById('kelompoktenaga').value,
            golongan: document.getElementById('golongan').value,
            tmtpangkat: document.getElementById('tmtpangkat').value || null, // format: YYYY-MM-DD
            tmtplanjut: document.getElementById('tmtplanjut').value || null,
            kelompokjabatan: document.getElementById('kelompokjabatan').value,
            jabatan: document.getElementById('jabatan').value,
            tmtjabatan: document.getElementById('tmtjabatan').value || null,
            tmtcpns: document.getElementById('tmtcpns').value || null,
            bup: document.getElementById('bup').value,
            tmtpensiun: document.getElementById('tmtpensiun').value || null,
            masukrs: document.getElementById('masukrs').value || null,
            masakerja: document.getElementById('masakerja').value,
            jpendidikan: document.getElementById('jpendidikan').value,
            fpendidikan: document.getElementById('fpendidikan').value,
            jrspendidikan: document.getElementById('jrspendidikan').value,
            asalpendidikan: document.getElementById('asalpendidikan').value,
            tahunlulus: document.getElementById('tahunlulus').value,
            ruangan: document.getElementById('ruangan').value,
            notatugas: document.getElementById('notatugas').value,
            tmt: document.getElementById('tmt').value || null,
            bpjs: document.getElementById('bpjs').value,
            bpjstktaspen: document.getElementById('bpjstktaspen').value,
            npwp: document.getElementById('npwp').value,
            email: document.getElementById('email').value,
            nohp: document.getElementById('nohp').value
        };
    }
};
