import { supabase } from '../app/koneksi.js';

const chartInstances = {};

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

        // Filter data yang belum update mandiri (is_updated != true)
        const pegawaiBelumUpdate = pegawai.filter(p => p.is_updated !== true);

        // C. REGISTER EVENT EXPORT (HANYA NIK, NAMA, KETERANGAN)
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
 * Logika C1: Export Excel Minimalis (Hanya NIK, Nama, Keterangan)
 */
function exportToExcel(dataList) {
    if (dataList.length === 0) return alert("Sempurna! Tidak ada data pegawai yang belum diperbarui.");

    const formattedData = dataList.map((item, index) => ({
        "NO": index + 1,
        "NIK": item.nik || '-',
        "NAMA PEGAWAI": item.nama || '-',
        "KETERANGAN": "Belum Update Data Mandiri"
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Belum Update");

    XLSX.writeFile(workbook, `Rekap_Belum_Update_${Date.now()}.xlsx`);
}

/**
 * Logika C2: Export PDF Minimalis (Portrait A4 - Rapi & Bersih)
 */
function exportToPdf(dataList) {
    if (dataList.length === 0) return alert("Sempurna! Tidak ada data pegawai yang belum diperbarui.");

    const { jsPDF } = window.jspdf;
    // Menggunakan orientasi Portrait ('p') standar ukuran A4 karena hanya 3 kolom
    const doc = new jsPDF('p', 'pt', 'a4'); 

    // Judul Dokumen
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN REKAP DATA PEGAWAI BELUM UPDATE", 40, 45);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 40, 60);

    const headers = [["NO", "NIK", "NAMA PEGAWAI", "KETERANGAN"]];
    
    const bodyRows = dataList.map((item, index) => [
        index + 1,
        item.nik || '-',
        item.nama || '-',
        "Belum Melakukan Update Data Mandiri"
    ]);

    // Gambar tabel pas di halaman portrait A4
    doc.autoTable({
        head: headers,
        body: bodyRows,
        startY: 75,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255], fontStyle: 'bold' }, // Tema Merah Peringatan
        columnStyles: {
            0: { cellWidth: 35, halign: 'center' }, // No
            1: { cellWidth: 100 },                  // NIK
            2: { cellWidth: 200 },                  // Nama
            3: { cellWidth: 180 }                   // Keterangan
        }
    });

    doc.save(`Rekap_Belum_Update_${Date.now()}.pdf`);
}
