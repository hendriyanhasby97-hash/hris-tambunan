// Layout/Users/IndexUser.js
import { supabase } from '../../App/koneksi.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Ambil data spesifik pegawai ini berdasarkan email yang login
        const { data: pegawai, error } = await supabase
            .from('employee')
            .select('nama, nip, jabatan, ruangan, status')
            .eq('email', user.email)
            .single();

        if (pegawai) {
            document.getElementById('user-nama').innerText = pegawai.nama;
            document.getElementById('user-nip').innerText = pegawai.nip || '-';
            document.getElementById('user-jabatan').innerText = pegawai.jabatan;
            document.getElementById('user-ruangan').innerText = pegawai.ruangan;
        }
    }
});
