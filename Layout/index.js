// Layout/index.js
import { supabase } from '../App/koneksi.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Tampilkan nama user aktif di header
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        document.getElementById('user-email').innerText = user.email;
    }

    // Handle Tombol Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '/login.html';
        });
    }
});
