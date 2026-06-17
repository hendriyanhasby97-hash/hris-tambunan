document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const mainFrame = document.getElementById('mainFrame');
    const pageTitle = document.getElementById('pageTitle');
    const btnLogout = document.getElementById('btnLogout');
    
    const singleLinks = document.querySelectorAll('.nav-link-custom[data-target]');
    const submenuItems = document.querySelectorAll('.submenu-item');

    // 1. LOGIKA UTAMA INTERAKSI HIDE & SHOW SIDEBAR VIA CLASS TOGGLED
    btnToggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('toggled');
    });

    // Helper untuk membersihkan status aktif di semua tempat menu
    function bersihkanSemuaStatusAktif() {
        singleLinks.forEach(link => link.classList.remove('active'));
        submenuItems.forEach(item => item.classList.remove('active'));
    }

    // 2. MANAGEMENT ROUTING LINK UTAMA (Seperti Menu Dashboard)
    singleLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            bersihkanSemuaStatusAktif();
            
            this.classList.add('active');
            const target = this.getAttribute('data-target');
            mainFrame.src = target;
            pageTitle.innerText = this.innerText.trim();

            // Otomatis tutup semua collapse dropdown lain yang sedang terbuka agar rapi
            const openCollapses = document.querySelectorAll('.collapse.show');
            openCollapses.forEach(collapse => {
                const bsCollapse = bootstrap.Collapse.getInstance(collapse);
                if (bsCollapse) bsCollapse.hide();
            });
        });
    });

    // 3. MANAGEMENT ROUTING CHILD LINKS (Item di Dalam Dropdown Accordion)
    submenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            bersihkanSemuaStatusAktif();

            this.classList.add('active');
            
            // Berikan tanda highlight active juga pada induk dropdown group-nya
            const parentGroup = this.closest('.menu-group')?.querySelector('.nav-link-custom');
            if (parentGroup) parentGroup.classList.add('active');

            const target = this.getAttribute('data-target');
            mainFrame.src = target;

            // Bersihkan teks angka penanda index agar judul topbar bersih rapi
            const labelJudul = this.innerText.replace(/^\d+\.\s*/, '');
            pageTitle.innerText = labelJudul.trim();
        });
    });

    // 4. HANDLER EVENT TOMBOL LOGOUT UTAMA
    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Apakah Anda yakin ingin keluar dari aplikasi manajemen admin?")) {
            alert("Sesi superadmin telah ditutup.");
            // window.location.href = 'login.html';
        }
    });
});
