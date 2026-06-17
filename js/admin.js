document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const mainFrame = document.getElementById('mainFrame');
    const pageTitle = document.getElementById('pageTitle');
    const btnLogout = document.getElementById('btnLogout');
    
    const singleLinks = document.querySelectorAll('.nav-link-custom[data-target]');
    const submenuItems = document.querySelectorAll('.submenu-item');

    // 1. LOGIKA UTAMA INTERAKSI HIDE & SHOW SIDEBAR
    btnToggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('toggled');
    });

    function bersihkanSemuaStatusAktif() {
        singleLinks.forEach(link => link.classList.remove('active'));
        submenuItems.forEach(item => item.classList.remove('active'));
    }

    // 2. MANAGEMENT LINK UTAMA (Dashboard)
    singleLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            bersihkanSemuaStatusAktif();
            
            this.classList.add('active');
            const target = this.getAttribute('data-target');
            mainFrame.src = target;
            
            // Mengambil text murni tanpa tag icon didalamnya
            pageTitle.innerText = this.textContent.trim();

            const openCollapses = document.querySelectorAll('.collapse.show');
            openCollapses.forEach(collapse => {
                const bsCollapse = bootstrap.Collapse.getInstance(collapse);
                if (bsCollapse) bsCollapse.hide();
            });
        });
    });

    // 3. MANAGEMENT DROPDOWN SUBMENU ITEMS
    submenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            bersihkanSemuaStatusAktif();

            this.classList.add('active');
            
            const parentGroup = this.closest('.menu-group')?.querySelector('.nav-link-custom');
            if (parentGroup) parentGroup.classList.add('active');

            const target = this.getAttribute('data-target');
            mainFrame.src = target;

            // Langsung ambil textContent tanpa perlu regex remove angka lagi
            pageTitle.innerText = this.textContent.trim();
        });
    });

    // 4. ACTION LOGOUT HANDLER
    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Apakah Anda yakin ingin keluar dari aplikasi manajemen admin?")) {
            alert("Sesi superadmin telah ditutup.");
            // window.location.href = 'login.html';
        }
    });
});
