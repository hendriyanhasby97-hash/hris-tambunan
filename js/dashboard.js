import { supabase } from '../app/koneksi.js';

// Global instances holder untuk chart agar tidak bentrok tumpang tindih waktu dirender ulang
const chartInstances = {};

document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
    try {
        // Ambil seluruh data dari tabel pegawai
        const { data: pegawai, error } = await supabase.from('pegawai').select('*');
        if (error) throw error;

        // A. HITUNG METRIK SUMMARY CARDS
        renderSummaryCards(pegawai);

        // B. PROSES DISTRIBUSI KATEGORI & RENDER TABEL + DIAGRAM
        processAndRenderCategory(pegawai, 'kelompok_pegawai', 'tblTenaga', 'chartTenagaBar', 'chartTenagaPie');
        processAndRenderCategory(pegawai, 'kelompok_jabatan', 'tblJabatan', 'chartJabatanBar', 'chartJabatanPie');
        processAndRenderCategory(pegawai, 'jenis_kelamin', 'tblGender', 'chartGenderBar', 'chartGenderPie');
        processAndRenderCategory(pegawai, 'agama', 'tblAgama', 'chartAgamaBar', 'chartAgamaPie');
        
        // Sub-Pendidikan
        processAndRenderCategory(pegawai, 'jenjang', 'tblJenjang', 'chartJenjangBar', 'chartJenjangPie');
        processAndRenderCategory(pegawai, 'fakultas', 'tblFakultas', 'chartFakultasBar', 'chartFakultasPie');
        processAndRenderCategory(pegawai, 'jurusan', 'tblJurusan', 'chartJurusanBar', 'chartJurusanPie');

        // C. REGISTER EVENT EXPORT BUTTONS
        // Filter data yang 'is_updated' tidak true (artinya false atau null)
        const pegawaiBelumUpdate = pegawai.filter(p => p.is_updated !== true);

        document.getElementById('btnExportExcel').addEventListener('click', () => exportToExcel(pegawaiBelumUpdate));
        document.getElementById('btnExportPdf').addEventListener('click', () => exportToPdf(pegawaiBelumUpdate));

    } catch (err) {
        console.error("Dashboard error:", err.message);
    }
}

/**
 * Logika A: Render Metrik Utama Atas
 */
function renderSummaryCards(data) {
    const total = data.length;
    // Asumsi status text: 'Aktif', 'Masuk'/'CPNS'/'Baru', 'Keluar'/'Pensiun'
    const aktif = data.filter(p => String(p.status).toLowerCase() === 'aktif').length;
    const masuk = data.filter(p => String(p.status).toLowerCase() === 'masuk' || String(p.status).toLowerCase() === 'baru').length;
    const keluar = data.filter(p => String(p.status).toLowerCase() === 'keluar').length;

    document.getElementById('txtTotal').innerText = total;
    document.getElementById('txtAktif').innerText = aktif;
    document.getElementById('txtMasuk').innerText = masuk;
    document.getElementById('txtKeluar').innerText = keluar;
}

/**
 * Logika B: Pengelompokan Data, Hitung Persentase, Inject HTML Tabel, & Integrasi Chart.js
 */
function processAndRenderCategory(data, column, tableId, barId, pieId) {
    const counts = {};
    let validTotal = 0;

    // Distribusi hitung frekuensi kemunculan data string
    data.forEach(item => {
        const val = item[column] ? String(item[column]).trim() : 'Tidak Diisi';
        counts[val] = (counts[val] || 0) + 1;
        validTotal++;
    });

    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '';

    const labels = [];
    const values = [];
    const percentages = [];

    // Sorting berdasarkan jumlah terbanyak
    const sortedCategories = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    sortedCategories.forEach(([key, count]) => {
        const pct = validTotal > 0 ? ((count / validTotal) * 100).toFixed(1) : 0;
        labels.push(key);
        values.push(count);
        percentages.push(pct);

        // Append isi baris persentase tabel ke HTML
        const row = document.createElement('tr');
        row.innerHTML = `<td>${key}</td><td><b>${count}</b></td><td><small class="text-primary">${pct}%</small></td>`;
        tbody.appendChild(row);
    });

    // Skema palette warna acak konstan untuk grafik agar variatif
    const colors = [
        '#0d6efd', '#20c997', '#ffc107', '#dc3545', '#0dcaf0', 
        '#6610f2', '#fd7e14', '#6c757d', '#20c997', '#e83e8c'
    ];

    // Render Bar Chart
    if (chartInstances[barId]) chartInstances[barId].destroy();
    chartInstances[barId] = new Chart(document.getElementById(barId), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Total', data: values, backgroundColor: colors.slice(0, labels.length) }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Render Pie Chart
    if (chartInstances[pieId]) chartInstances[pieId].destroy();
    chartInstances[pieId] = new Chart(document.getElementById(pieId), {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length) }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
    });
}

// Susunan kolom lengkap sesuai spesifikasi blueprint rekap data Anda (Poin C)
const targetColumns = [
    'nama', 'nip', 'status', 'kelompok_pegawai', 'kelompok_jabatan', 'gol', 'tmt_pangkat', 
    'tmt_berikutnya', 'jabatan', 'jenis_kelamin', 'agama', 'rentang_bup', 'tmt_pensiun', 
    'tmt_cpns', 'masuk_rs', 'masa_kerja_rs', 'tempat_lahir', 'tanggal_lahir', 'status_keluarga', 
    'alamat', 'jenjang', 'fakultas', 'jurusan', 'ruangan', 'no_bpjsn', 'no_bpjsket_taspen', 
    'npwp', 'email', 'no_telp'
];

/**
 * Logika C1: Export Data Pegawai Belum Update ke Excel (XLSX)
 */
function exportToExcel(dataList) {
    if (dataList.length === 0) return alert("Sempurna! Tidak ada data pegawai yang belum diperbarui.");

    // Bangun mapping objek array terstruktur rapi untuk baris sheet
    const formattedData = dataList.map((item, index) => {
        const rowObj = { "No": index + 1 };
        targetColumns.forEach(col => {
            rowObj[col.toUpperCase()] = item[col] || '-';
        });
        return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Belum Update");

    // Unduh otomatis file biner excel
    XLSX.writeFile(workbook, `Rekap_Pegawai_Belum_Update_${Date.now()}.xlsx`);
}

/**
 * Logika C2: Export Data Pegawai Belum Update ke Dokumen PDF (Lanskap & Otomatis Pecah Halaman)
 */
function exportToPdf(dataList) {
    if (dataList.length === 0) return alert("Sempurna! Tidak ada data pegawai yang belum diperbarui.");

    const { jsPDF } = window.jspdf;
    // Set orientasi landscape (l) karena total kolom sangat panjang ke samping
    const doc = new jsPDF('l', 'pt', 'a1'); 

    doc.text("LAPORAN REKAP DATA PEGAWAI BELUM UPDATE / EDIT", 40, 40);
    
    // Header tabel konversi string uppercase
    const headers = [["NO", ...targetColumns.map(c => c.toUpperCase())]];

    // Konten isi data tabel baris per baris
    const bodyRows = dataList.map((item, index) => {
        return [
            index + 1,
            ...targetColumns.map(col => item[col] || '-')
        ];
    });

    // Gambar tabel menggunakan plugin autoTable agar tulisan otomatis pas & membungkus (wrap string)
    doc.autoTable({
        head: headers,
        body: bodyRows,
        startY: 60,
        theme: 'grid',
        styles: { fontSize: 8, overflow: 'linebreak', cellPadding: 4 },
        headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255] }, // Warna merah tegas menandakan alert/belum update
    });

    doc.save(`Rekap_Pegawai_Belum_Update_${Date.now()}.pdf`);
}
