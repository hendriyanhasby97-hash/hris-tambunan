// App/App.js

// Fungsi Logout Global
window.logoutApp = (pathToRoot) => {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
        // Hapus tiket login custom kita
        localStorage.removeItem('hris_session');
        window.location.href = pathToRoot; 
    }
};

// Cek Keamanan Sesi Multi-Role saat Halaman Dimuat
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('hris_session');
    const currentPath = window.location.pathname;
    
    // Cek apakah user sedang berada di halaman login
    const isLoginPage = currentPath.endsWith('login.html') || currentPath.endsWith('/') || currentPath.includes('login');

    // Jika TIDAK ADA SESI dan sedang maksa buka halaman dalam (Dashboard/Pegawai)
    if (!session && !isLoginPage) {
        console.log("Akses ditolak: Anda belum login!");
        alert("Sesi Anda kosong atau Anda belum login.");
        
        // Redirect dinamis ke login.html berdasarkan level folder
        if (currentPath.includes('/Layout/Employee/')) {
            window.location.href = '../../login.html';
        } else if (currentPath.includes('/Layout/')) {
            window.location.href = '../login.html';
        } else {
            window.location.href = 'login.html';
        }
    }
});
