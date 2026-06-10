// Controller/AppController.js
import { supabase } from '../App/koneksi.js';

export const AppController = {
    // Mengambil data role dari tabel roleaccess berdasarkan auth_id
    async getUserRole(authId) {
        const { data, error } = await supabase
            .from('roleaccess')
            .select('role')
            .eq('auth_id', authId)
            .single();

        if (error) {
            console.error("Error fetching role:", error);
            return 'user'; // default role terendah jika tidak ditemukan
        }
        return data?.role || 'user';
    },

    // Mengatur arah halaman berdasarkan role
    redirectBasedOnRole(role) {
        const path = window.location.pathname;

        // Daftar role manajemen/admin yang punya akses penuh
        const adminRoles = ['superadmin', 'admin', 'direktur', 'wadir', 'kepala bidang', 'Kepala Ruangan'];

        if (adminRoles.includes(role)) {
            // Jika admin/manajemen mengakses halaman user, alihkan ke index utama
            if (path.includes('/Users/')) {
                window.location.href = '/Layout/index.html';
            }
        } else if (role === 'user') {
            // Jika user biasa mencoba masuk ke dashboard utama/employee
            if (!path.includes('/Users/')) {
                window.location.href = '/Layout/Users/IndexUser.html';
            }
        }
    },

    // Fitur pengaman tambahan untuk disisipkan di dalam fungsi CRUD
    checkPermission(allowedRoles, currentRole) {
        return allowedRoles.includes(currentRole);
    }
};
