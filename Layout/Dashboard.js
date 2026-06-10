import { supabase } from '../App/koneksi.js';

export const Dashboard = {
    async renderCharts() {
        const { data: employees, error } = await supabase.from('employee').select('jeniskelamin, ruangan');
        if (error || !employees) return;

        const pria = employees.filter(e => e.jeniskelamin?.toLowerCase() === 'pria').length;
        const wanita = employees.filter(e => e.jeniskelamin?.toLowerCase() === 'wanita').length;

        new Chart(document.getElementById('chartJenisKelamin').getContext('2d'), {
            type: 'pie',
            data: { labels: ['Pria', 'Wanita'], datasets: [{ data: [pria, wanita], backgroundColor: ['#3498db', '#e74c3c'] }] }
        });

        const ruanganMap = {};
        employees.forEach(e => {
            const r = e.ruangan || 'Lainnya';
            ruanganMap[r] = (ruanganMap[r] || 0) + 1;
        });

        new Chart(document.getElementById('chartRuangan').getContext('2d'), {
            type: 'bar',
            data: { labels: Object.keys(ruanganMap), datasets: [{ label: 'Jumlah', data: Object.values(ruanganMap), backgroundColor: '#2ecc71' }] }
        });
    }
};
