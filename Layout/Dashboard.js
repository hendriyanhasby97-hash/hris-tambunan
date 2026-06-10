// Layout/Dashboar.js
import { supabase } from '../App/koneksi.js';

export const Dashboard = {
    async renderCharts() {
        // 1. Ambil data agregat dari Supabase
        const { data: employees, error } = await supabase.from('employee').select('jeniskelamin, ruangan');
        if (error) return console.error(error);

        // 2. Hitung total data untuk Grafik 1 (Jenis Kelamin)
        const pria = employees.filter(e => e.jeniskelamin?.toLowerCase() === 'pria').length;
        const wanita = employees.filter(e => e.jeniskelamin?.toLowerCase() === 'wanita').length;

        // Render Grafik Jenis Kelamin (Chart.js)
        const ctxSex = document.getElementById('chartJenisKelamin').getContext('2d');
        new Chart(ctxSex, {
            type: 'pie',
            data: {
                labels: ['Pria', 'Wanita'],
                datasets: [{ data: [pria, wanita], backgroundColor: ['#3498db', '#e74c3c'] }]
            }
        });

        // 3. Hitung total data untuk Grafik 2 (Distribusi per Ruangan)
        const ruanganMap = {};
        employees.forEach(e => {
            const r = e.ruangan || 'Tidak Diketahui';
            ruanganMap[r] = (ruanganMap[r] || 0) + 1;
        });

        // Render Grafik Ruangan
        const ctxRoom = document.getElementById('chartRuangan').getContext('2d');
        new Chart(ctxRoom, {
            type: 'bar',
            data: {
                labels: Object.keys(ruanganMap),
                datasets: [{
                    label: 'Jumlah Pegawai',
                    data: Object.values(ruanganMap),
                    backgroundColor: '#2ecc71'
                }]
            }
        });
    }
};
