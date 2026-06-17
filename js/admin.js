document.addEventListener('DOMContentLoaded', () => {
    const sidebarLinks = document.querySelectorAll('.nav-link-custom');
    const mainFrame = document.getElementById('mainFrame');
    const pageTitle = document.getElementById('pageTitle');
    const btnLogout = document.getElementById('btnLogout');

    // 1. LOGIKA INTERAKSI PERGANTIAN HALAMAN (ROUTING MENU)
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Hapus status active dari semua menu lama
            sidebarLinks.forEach(item => item.classList.remove('active'));

            // Set status active ke menu yang baru saja diklik
            this.classList.add('active');

            // Ambil nama file html target
            const targetPage = this.getAttribute('data-target');
            
            // Ubah isi Iframe ke halaman baru secara real-time
            mainFrame.src = targetPage;

            // Ganti nama judul halaman di topbar agar dinamis
            pageTitle.innerText = this.innerText.trim();
        });
    });

    // 2. HANDLER ACTION LOGOUT ADMIN
    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Apakah Anda yakin ingin keluar dari Panel Superadmin?")) {
            alert("Sesi admin berakhir.");
            // Arahkan ke halaman login Anda jika ada, misal:
            // window.location.href = 'login.html';
        }
    });
});
