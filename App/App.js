import { supabase } from './koneksi.js';

// Fungsi Logout Global (bisa dipanggil dari tombol HTML mana saja)
window.logoutApp = async (pathToRoot) => {
    await supabase.auth.signOut();
    window.location.href = pathToRoot; // Mengarahkan kembali ke index.html login
};

// Cek sesi saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Jika belum login dan bukan di halaman login, lempar kembali
    if (!session && !window.location.pathname.endsWith('index.html')) {
        // Asumsi jika belum login dikembalikan ke root
        console.log("Silakan login terlebih dahulu.");
    }
});
