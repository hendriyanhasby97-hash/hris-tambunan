import { supabase } from '../app/koneksi.js'; // <- Perhatikan! Jika nama folder Anda "App", ubah menjadi '../App/koneksi.js'

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

    // 1. FITUR SHOW / HIDE PASSWORD
    togglePassword.addEventListener('click', () => {
        const tipeSekarang = passwordInput.getAttribute('type');
        if (tipeSekarang === 'password') {
            passwordInput.setAttribute('type', 'text');
            eyeIcon.className = 'bi bi-eye-slash';
        } else {
            passwordInput.setAttribute('type', 'password');
            eyeIcon.className = 'bi bi-eye';
        }
    });

    // 2. LOGIKA UTAMA PROSES LOGIN
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Berikan respon visual loading saat tombol ditekan
        loginAlert.classList.add('d-none');
        btnLogin.disabled = true;
        btnText.innerText = "MEMERIKSA DATA...";
        btnSpinner.classList.remove('d-none');

        try {
            // BYPASS AKUN SUPERADMIN MASTER
            if (username.toLowerCase() === 'admin' && password === 'adminsuper2026') {
                suksesLogin("Selamat Datang Superadmin!");
                return;
            }

            // KONEKSI CHECK KE SUPABASE
            const { data: pegawai, error } = await supabase
                .from('pegawai')
                .select('nik, nama, password, status')
                .or(`nik.eq.${username},email.eq.${username}`)
                .maybeSingle();

            if (error) throw error;

            if (pegawai) {
                if (pegawai.password === password) {
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
            tampilkanPesanGagal("Gagal terhubung ke database. Periksa konfigurasi RLS/Koneksi Anda.");
        } finally {
            btnLogin.disabled = false;
            btnText.innerText = "MASUK SISTEM";
            btnSpinner.classList.add('d-none');
        }
    });

function suksesLogin(pegawai) {
    // Simpan informasi penting ke localStorage
    localStorage.setItem('user_name', pegawai.nama);
    localStorage.setItem('user_role', pegawai.role); // simpan 'superadmin', 'admin', atau 'user'
    localStorage.setItem('is_logged_in', 'true');
    
    window.location.href = 'pegawai.html'; // Arahkan ke halaman utama
}

    function tampilkanPesanGagal(pesan) {
        alertMessage.innerText = pesan;
        loginAlert.classList.remove('d-none');
        passwordInput.value = '';
        passwordInput.focus();
    }
});
