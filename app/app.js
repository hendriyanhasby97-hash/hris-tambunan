import { supabase } from '../app/koneksi.js';

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');
    
    const btnLogin = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const loginAlert = document.getElementById('loginAlert');
    const alertMessage = document.getElementById('alertMessage');

    // 1. FITUR SHOW / HIDE PASSWORD INTERAKTIF
    togglePassword.addEventListener('click', () => {
        const tipeSekarang = passwordInput.getAttribute('type');
        if (tipeSekarang === 'password') {
            passwordInput.setAttribute('type', 'text');
            eyeIcon.className = 'bi bi-eye-slash';
            togglePassword.setAttribute('title', 'Sembunyikan Password');
        } else {
            passwordInput.setAttribute('type', 'password');
            eyeIcon.className = 'bi bi-eye';
            togglePassword.setAttribute('title', 'Lihat Password');
        }
    });

    // 2. LOGIKA UTAMA SUBMIT AUTHENTICATION & REDIRECT ROUTING
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Reset state alert box & pasang status loading animasi
        loginAlert.classList.add('d-none');
        btnLogin.disabled = true;
        btnText.innerText = "MEMERIKSA DATA...";
        btnSpinner.classList.remove('d-none');

        try {
            // --- OPSI A: BYPASS AKUN SUPERADMIN UTAMA MASTER ---
            if (username.toLowerCase() === 'admin' && password === 'adminsuper2026') {
                suksesLogin("Selamat Datang Superadmin!");
                return;
            }

            // --- OPSI B: LOOKUP VALIDASI KE TABEL PEGAWAI DI SUPABASE ---
            // Memeriksa apakah input username cocok dengan kolom 'nik' ATAU kolom 'email'
            const { data: pegawai, error } = await supabase
                .from('pegawai')
                .select('nik, nama, password, status')
                .or(`nik.eq.${username},email.eq.${username}`)
                .maybeSingle();

            if (error) throw error;

            // Jalankan Verifikasi Record
            if (pegawai) {
                // Periksa apakah password di database cocok
                if (pegawai.password === password) {
                    // Proteksi tambahan: Pastikan status pegawainya masih Aktif
                    if (String(pegawai.status).toLowerCase() === 'aktif') {
                        suksesLogin(pegawai.nama);
                    } else {
                        tampilkanPesanGagal("Akses ditolak! Status kepegawaian Anda sudah tidak aktif.");
                    }
                } else {
                    tampilkanPesanGagal("Password yang Anda masukkan salah!");
                }
            } else {
                tampilkanPesanGagal("Akun NIK / Username tidak terdaftar!");
            }

        } catch (err) {
            console.error("Login Error:", err.message);
            tampilkanPesanGagal("Koneksi gagal: " + err.message);
        } finally {
            // Kembalikan tombol ke keadaan semula jika proses selesai/gagal
            btnLogin.disabled = false;
            btnText.innerText = "MASUK SISTEM";
            btnSpinner.classList.add('d-none');
        }
    });

    // Helper: Pemicu saat login berhasil lolos seleksi
    function suksesLogin(namaUser) {
        // Simpan session mini di localStorage browser (opsional, sangat baik untuk penanda status)
        localStorage.setItem('session_admin_name', namaUser);
        localStorage.setItem('is_logged_in', 'true');

        // ROUTING UTAMA: Langsung lempar panggilan ke halaman dashboard admin utama
        window.location.href = 'admin.html';
    }

    // Helper: Memunculkan kotak pesan kesalahan
    function tampilkanPesanGagal(pesan) {
        alertMessage.innerText = pesan;
        loginAlert.classList.remove('d-none');
        passwordInput.value = '';
        passwordInput.focus();
    }
});
