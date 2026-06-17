import { supabase } from '../app/koneksi.js';

const chartInstances = {};

// Blueprint daftar kolom yang akan diperiksa kelengkapannya beserta nama rapinya
const kamusKolomPegawai = {
    nama: 'Nama',
    nip: 'NIP',
    status: 'Status',
    kelompok_pegawai: 'Kelompok Pegawai',
    kelompok_jabatan: 'Kelompok Jabatan',
    gol: 'Golongan',
    tmt_pangkat: 'TMT Pangkat',
    tmt_berikutnya: 'TMT Berikutnya',
    jabatan: 'Jabatan',
    jenis_kelamin: 'Jenis Kelamin',
    agama: 'Agama',
    rentang_bup: 'Rentang BUP',
    tmt_pensiun: 'TMT Pensiun',
    tmt_cpns: 'TMT CPNS',
    masuk_rs: 'Masuk RS',
    masa_kerja_rs: 'Masa Kerja RS',
    tempat_lahir: 'Tempat Lahir',
    tanggal_lahir: 'Tanggal Lahir',
    status_keluarga: 'Status Keluarga',
    alamat: 'Alamat',
    jenjang: 'Jenjang',
    fakultas: 'Fakultas',
    jurusan: 'Jurusan',
    ruangan: 'Ruangan',
    no_bpjsn: 'No BPJS',
    no_bpjsket_taspen: 'No Taspen',
    npwp: 'NPWP',
    email: 'Email',
    no_telp: 'No Telp'
};

document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
    try {
        const { data: pegawai, error } = await supabase.from('pegawai').select('*');
        if (error) throw error;

        // A. HITUNG METRIK CARDS
        renderSummaryCards(pegawai);

        // B. PROSES GRAFIK & TABEL ANALISIS
        processAndRenderCategory(pegawai, 'kelompok_pegawai', 'tblTenaga', 'chartTenagaBar', 'chartTenagaPie');
        processAndRenderCategory(pegawai, 'kelompok_jabatan', 'tblJabatan', 'chartJabatanBar', 'chartJabatanPie');
        processAndRenderCategory(pegawai, 'jenis_kelamin', 'tblGender', 'chartGenderBar', 'chartGenderPie');
        processAndRenderCategory(pegawai, 'agama', 'tblAgama', 'chartAgamaBar', 'chartAgamaPie');
        
        processAndRenderCategory(pegawai, 'jenjang', 'tblJenjang', 'chartJenjangBar', 'chartJenjangPie');
        processAndRenderCategory(pegawai, 'fakultas', 'tblFakultas', 'chartFakultasBar', 'chartFakultasPie');
        processAndRenderCategory(pegawai, 'jurusan', 'tblJurusan', 'chartJurusanBar', 'chartJurusanPie');

        // Filter data pegawai yang belum diperbarui (is_updated != true)
        const pegawaiBelumUpdate = pegawai.filter(p => p.is_updated !== true);

        // C. REGISTER EVENT EXPORT DENGAN KETERANGAN OTOMATIS
        document.getElementById('btnExportExcel').addEventListener('click', () => exportToExcel(pegawaiBelumUpdate));
        document.getElementById('btnExportPdf').addEventListener('click', () => exportToPdf(pegawaiBelumUpdate));

    } catch (err) {
        console.error("Dashboard error:", err.message);
    }
}

function renderSummaryCards(data) {
    const total = data.length;
    const aktif = data.filter(p => String(p.status).toLowerCase() === 'aktif').length;
    const masuk = data.filter(p => String(p.status).toLowerCase() === 'masuk' || String(p.status).toLowerCase() === 'baru').length;
    const keluar = data.filter(p => String(p.status).toLowerCase() === 'keluar').length;

    document.getElementById('txtTotal').innerText = total;
    document.getElementById('txtAktif').innerText = aktif;
    document.getElementById('txtMasuk').innerText = masuk;
    document.getElementById('txtKeluar').innerText = keluar;
}

function processAndRenderCategory(data, column, tableId, barId, pieId) {
    const counts = {};
    let validTotal = 0;

    data.forEach(item => {
        const val = item[column] ? String(item[column]).trim() : 'Tidak Diisi';
        counts[val] = (counts[val] || 0) + 1;
        validTotal++;
    });

    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '';

    const labels = [];
    const values = [];

    const sortedCategories = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    sortedCategories.forEach(([key, count]) => {
        const pct = validTotal > 0 ? ((count / validTotal) * 100).toFixed(1) : 0;
        labels.push(key);
        values.push(count);

        const row = document.createElement('tr');
        row.innerHTML = `<td>${key}</td><td><b>${count}</b></td><td><small class="text-primary">${pct}%</small></td>`;
        tbody.appendChild(row);
    });

    const colors = ['#0d6efd', '#20c997', '#ffc107', '#dc3545', '#0dcaf0', '#6610f2', '#fd7e14', '#6c757d', '#e83e8c'];

    if (chartInstances[barId]) chartInstances[barId].destroy();
    chartInstances[barId] = new Chart(document.getElementById(barId), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length) }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

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

/**
 * Helper: Fungsi untuk mendeteksi field mana saja yang kosong pada 1 row data pegawai
 */
function hitungKomponenKosong(item) {
    const listKosong = [];
    
    for (const [key, labelNama] of Object.entries(kamusKolomPegawai)) {
        const valueData = item[key];
        // Jika data bernilai null, undefined, string kosong, atau strip (-)
        if (valueData === null || valueData === undefined || String(valueData).trim() === '' || String(valueData).trim() === '-') {
            listKosong.push(labelNama);
        }
    }

    if (listKosong.length === 0) {
        return "Data Lengkap (Belum diverifikasi)";
    } else {
        return `Belum diisi: ${listKosong.join(', ')}`;
    }
}

/**
 * Logika C1: Export Excel dengan rincian kolom kosong
 */
function exportToExcel(dataList) {
    if (dataList.length === 0) return alert("Sempurna! Seluruh data pegawai sudah diperbarui.");

    const formattedData = dataList.map((item, index) => ({
        "NO": index + 1,
        "NIK": item.nik || '-',
        "NAMA PEGAWAI": item.nama || '-',
        "KOMPONEN BELUM DIISI / DIPERBAHARUI": hitungKomponenKosong(item)
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rincian Belum Update");

    XLSX.writeFile(workbook, `Rekap_Detail_Belum_Update_${Date.now()}.xlsx`);
}

/**
 * Logika C2: Export PDF dengan rincian kolom kosong (Auto Wrap Text jika panjang)
 */
function exportToPdf(dataList) {
    if (dataList.length === 0) return alert("Sempurna! Seluruh data pegawai sudah diperbarui.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4'); 

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN REKAP KOMPONEN DATA PEGAWAI YANG BELUM DIISI", 40, 45);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} | Total: ${dataList.length} Pegawai`, 40, 60);

    const headers = [["NO", "NIK", "NAMA PEGAWAI", "KOMPONEN BELUM DIISI / DIPERBAHARUI"]];
    
    const bodyRows = dataList.map((item, index) => [
        index + 1,
        item.nik || '-',
        item.nama || '-',
        hitungKomponenKosong(item)
    ]);

    doc.autoTable({
        head: headers,
        body: bodyRows,
        startY: 75,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 5, overflow: 'linebreak' }, // Menghindari teks terpotong ke samping
        headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 30, halign: 'center' }, // No
            1: { cellWidth: 75 },                  // NIK
            2: { cellWidth: 120 },                 // Nama
            3: { cellWidth: 290 }                  // Keterangan dinamis komponen kosong
        }
    });

    doc.save(`Rekap_Detail_Belum_Update_${Date.now()}.pdf`);
}
