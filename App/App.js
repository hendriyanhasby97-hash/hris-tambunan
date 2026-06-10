// App/App.js
import { supabase } from './koneksi.js';

// Fungsi Logout Global
// Dibuat menjadi window.logoutApp agar bisa dipanggil langsung dari tombol di HTML (onclick)
window.logoutApp = async (pathToRoot) => {
    // Lakukan proses sign out di Supabase
    await supabase.auth.signOut();
    
    // Arahkan kembali ke halaman login sesuai path yang diberikan
    window.location.href = pathToRoot; 
};

// Cek sesi (session) saat halaman apa pun dimuat
document.addEventListener('DOMContentLoaded', async () => {
    // Ambil status sesi user dari Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    // Cek apakah URL saat ini adalah halaman login
    const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/');

    // Jika user belum login dan mencoba mengakses halaman selain login, tolak aksesnya
    if (!session && !isLoginPage) {
        console.log("Akses ditolak: Silakan login terlebih dahulu.");
        alert("Sesi Anda telah habis atau Anda belum login.");
        
        // Sesuaikan dengan letak file login.html kamu
        // Jika file HTML-mu diletakkan bertingkat di GitHub Pages, gunakan logic pengalihan ke root aplikasi
        window.location.href = '../login.html'; 
    }
});
