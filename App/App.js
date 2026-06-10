// App/App.js
import { supabase } from './koneksi.js';
import { AppController } from '../Controller/AppController.js';

class App {
    async init() {
        // 1. Cek sesi login saat ini
        const { data: { session } } = await supabase.auth.getSession();
        
        // 2. Pantau perubahan status login (Login / Logout)
        supabase.auth.onAuthStateChange((event, session) => {
            this.handleRouting(session);
        });

        this.handleRouting(session);
    }

    async handleRouting(session) {
        if (!session) {
            // Jika belum login, arahkan ke halaman login (misal: login.html)
            console.log("User belum login, alihkan ke login.html");
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = '/login.html';
            }
            return;
        }

        // Jika sudah login, cek role via Controller
        try {
            const userRole = await AppController.getUserRole(session.user.id);
            AppController.redirectBasedOnRole(userRole);
        } catch (error) {
            console.error("Gagal memproses routing:", error.message);
        }
    }
}

// Jalankan aplikasi saat dokumen siap
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
