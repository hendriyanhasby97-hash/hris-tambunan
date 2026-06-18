import { supabase } from '../app/koneksi.js';

// Inisialisasi State Global
let masterPegawai = [];
let dataTerfilter = [];
let currentPage = 1;
let itemsPerPage = 25;
let currentEditNik = null;

// Elemen DOM Utama
const tableBody = document.getElementById('tableBody');
const formPegawai = document.getElementById('formPegawai');
const modalPegawaiElement = document.getElementById('modalPegawai');
const modalPegawai = new bootstrap.Modal(modalPegawaiElement);
const modalPegawaiLabel = document.getElementById('modalPegawaiLabel');
const modalDetail = new bootstrap.Modal(document.getElementById('modalDetailPegawai'));
const detailBody = document.getElementById('detailBody');

// Elemen Filter & Pagination
const searchKeyword = document.getElementById('searchKeyword');
const filterStatus = document.getElementById('filterStatus');
const filterKelTenaga = document.getElementById('filterKelTenaga');
const filterKelJabatan = document.getElementById('filterKelJabatan');
const limitSelect = document.getElementById('limitSelect');
const paginationInfo = document.getElementById('paginationInfo');
const paginationControls = document.getElementById('paginationControls');

// Jalankan saat halaman siap
document.addEventListener('DOMContentLoaded', () => {
    initSistem();
});

/**
 * 0. INISIALISASI UTAMA & SUNTIK TOMBOL IO
 */
async function initSistem() {
    // Suntik tombol Ekspor & Impor secara programmatis di sebelah tombol "Tambah Pegawai" agar rapi
    const containerTombol = document.querySelector('#formFilter .text-md-end');
    if (containerTombol) {
        const divButtonGroop = document.createElement('div');
        divButtonGroop.className = 'd-flex gap-1 mt-2 justify-content-md-end flex-wrap';
        divButtonGroop.innerHTML = `
            <button type="button" class="btn btn-outline-success btn-sm" id="btnExportExcel"><i class="fas fa-file-excel"></i> Excel</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" id="btnExportCsv"><i class="fas fa-file-csv"></i> CSV</button>
            <button type="button" class="btn btn-outline-danger btn-sm" id="btnExportPdf"><i class="fas fa-file-pdf"></i> PDF</button>
            <button type="button" class="btn btn-dark btn-sm" id="btnTriggerImport"><i class="fas fa-upload"></i> Import</button>
            <input type="file" id="inputImportFile" class="d-none" accept=".xlsx, .xls, .csv">
        `;
        containerTombol.appendChild(divButtonGroop);
    }

    // Pasang Event Listeners
    searchKeyword.addEventListener('input', jalankanFilter);
    filterStatus.addEventListener('change', jalankanFilter);
    filterKelTenaga.addEventListener('change', jalankanFilter);
    filterKelJabatan.addEventListener('change', jalankanFilter);
    
    limitSelect.addEventListener('change', () => {
        itemsPerPage = parseInt(limitSelect.value);
        currentPage = 1;
        renderTabel();
    });

    formPegawai.addEventListener('submit', handleFormSubmit);
    modalPegawaiElement.addEventListener('hidden.bs.modal', resetForm);

    // Ambil Data dari Supabase
    await ambilMasterData();
    pasangMekanismeIO();
}

/**
 * 1. READ - Ambil Master Data & Hitung Counters
 */
async function ambilMasterData() {
    try {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">Memuat data master pegawai...</td></tr>`;
        const { data, error } = await supabase.from('pegawai').select('*');
        if (error) throw error;

        masterPegawai = data || [];
        hitungSummaryCounters(masterPegawai);
        jalankanFilter();
    } catch (err) {
        console.error("Gagal memuat data pegawai:", err.message);
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Gagal memuat data: ${err.message}</td></tr>`;
    }
}

/**
 * 2. HITUNG RINGKASAN METRIK (SUMMARY BOXES)
 */
function hitungSummaryCounters(data) {
    document.getElementById('totPegawai').innerText = data.length;
    document.getElementById('totAktif').innerText = data.filter(p => String(p.status).toLowerCase() === 'aktif').length;
    document.getElementById('totPensiun').innerText = data.filter(p => String(p.status).toLowerCase() === 'pensiun').length;
    document.getElementById('totResign').innerText = data.filter(p => String(p.status).toLowerCase() === 'resign').length;
    document.getElementById('totMutasi').innerText = data.filter(p => String(p.status).toLowerCase() === 'mutasi').length;
    
    const statusTerdata = ['aktif', 'pensiun', 'resign', 'mutasi'];
    document.getElementById('totLainnya').innerText = data.filter(p => !p.status || !statusTerdata.includes(String(p.status).toLowerCase())).length;
}

/**
 * 3. LOGIKA FILTER BERLAPIS
 */
function jalankanFilter() {
    const keyword = searchKeyword.value.toLowerCase().trim();
    const statusVal = filterStatus.value.toLowerCase();
    const tenagaVal = filterKelTenaga.value.toLowerCase();
    const jabatanVal = filterKelJabatan.value.toLowerCase();

    dataTerfilter = masterPegawai.filter(item => {
        const cocokKeyword = !keyword || 
            (item.nik && String(item.nik).toLowerCase().includes(keyword)) ||
            (item.nama && String(item.nama).toLowerCase().includes(keyword));

        const cocokStatus = !statusVal || (item.status && String(item.status).toLowerCase() === statusVal);
        const cocokTenaga = !tenagaVal || (item.kelompok_pegawai && String(item.kelompok_pegawai).toLowerCase() === tenagaVal);
        const cocokJabatan = !jabatanVal || (item.kelompok_jabatan && String(item.kelompok_jabatan).toLowerCase() === jabatanVal);

        return cocokKeyword && cocokStatus && cocokTenaga && cocokJabatan;
    });

    currentPage = 1;
    renderTabel();
}

/**
 * 4. RENDER TABEL & PAGINATION
 */
function renderTabel() {
    const totalItems = dataTerfilter.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const dataHalamanIni = dataTerfilter.slice(startIndex, endIndex);

    paginationInfo.innerText = totalItems > 0 
        ? `Menampilkan ${startIndex + 1} sampai ${endIndex} dari ${totalItems} data` 
        : `Menampilkan 0 data`;

    tableBody.innerHTML = '';
    if (dataHalamanIni.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">Tidak ada data pegawai yang cocok.</td></tr>`;
        renderPaginationControls(totalPages);
        return;
    }

    dataHalamanIni.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center">${startIndex + index + 1}</td>
            <td><b>${item.nik}</b><br><span class="text-small text-muted">${item.nip || '-'}</span></td>
            <td><b>${item.nama}</b><br><span class="text-small text-secondary"><i class="fas fa-door-open me-1"></i>${item.ruangan || '-'}</span></td>
            <td><span class="badge ${getStatusBadgeClass(item.status)}">${item.status || 'Lainnya'}</span><br><span class="text-small text-muted">${item.kelompok_jabatan || '-'}</span></td>
            <td><span class="badge bg-dark">${item.gol || '-'}</span><br><span class="text-small text-muted">${item.jabatan || '-'}</span></td>
            <td><span class="text-small d-block fw-bold">${item.fakultas || '-'}</span><span class="text-small text-muted">${item.jurusan || '-'}</span></td>
            <td><span class="text-small d-block">${formatDate(item.masuk_rs)}</span><span class="text-small text-success fw-bold">${item.masa_kerja_rs || '-'}</span></td>
            <td class="text-center">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-info text-white" onclick="lihatDetail('${item.nik}')" title="Detail"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-warning text-dark" onclick="editPegawai('${item.nik}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger" onclick="hapusPegawai('${item.nik}')" title="Hapus"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    paginationControls.innerHTML = '';
    
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link" onclick="gantiHalaman(${currentPage - 1})">«</button>`;
    paginationControls.appendChild(prevLi);

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${currentPage === i ? 'active' : ''}`;
            pageLi.innerHTML = `<button class="page-link" onclick="gantiHalaman(${i})">${i}</button>`;
            paginationControls.appendChild(pageLi);
        } else if (i === 2 || i === totalPages - 1) {
            const separatorLi = document.createElement('li');
            separatorLi.className = 'page-item disabled';
            separatorLi.innerHTML = '<span class="page-link">...</span>';
            paginationControls.appendChild(separatorLi);
        }
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<button class="page-link" onclick="gantiHalaman(${currentPage + 1})">»</button>`;
    paginationControls.appendChild(nextLi);
}

function gantiHalaman(p) { currentPage = p; renderTabel(); }

/**
 * 5. CREATE & UPDATE HANDLER
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(formPegawai);
    const payload = {};

    formData.forEach((value, key) => {
        payload[key] = value.trim() === "" ? null : value;
    });

    payload.is_updated = true; 

    try {
        if (currentEditNik === null) {
            const { error } = await supabase.from('pegawai').insert([payload]);
            if (error) throw error;
            alert('Data pegawai baru berhasil ditambahkan!');
        } else {
            const { error } = await supabase.from('pegawai').update(payload).eq('nik', currentEditNik);
            if (error) throw error;
            alert('Data pegawai berhasil diperbarui!');
        }
        modalPegawai.hide();
        await ambilMasterData();
    } catch (err) {
        alert('Gagal menyimpan data: ' + err.message);
    }
}

/**
 * 6. EDIT POPULATE & DELETE
 */
async function editPegawai(nik) {
    resetForm();
    currentEditNik = nik;
    modalPegawaiLabel.innerText = "Edit Data Pegawai";
    
    const pegawai = masterPegawai.find(p => p.nik === nik);
    if (!pegawai) return;

    const inputs = formPegawai.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.name && pegawai[input.name] !== undefined) {
            input.value = pegawai[input.name] || '';
        }
    });

    formPegawai.querySelector('input[name="nik"]').readOnly = true;
    modalPegawai.show();
}

async function hapusPegawai(nik) {
    if (!confirm(`Apakah Anda yakin ingin menghapus data pegawai dengan NIK: ${nik}?`)) return;
    try {
        const { error } = await supabase.from('pegawai').delete().eq('nik', nik);
        if (error) throw error;
        alert('Data pegawai berhasil deleted!');
        await ambilMasterData();
    } catch (err) {
        alert('Gagal menghapus data: ' + err.message);
    }
}

/**
 * 7. MODAL VIEW DETAIL LENGKAP
 */
function lihatDetail(nik) {
    const p = masterPegawai.find(peg => peg.nik === nik);
    if (!p) return;

    detailBody.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <h6 class="text-primary border-bottom pb-2"><i class="fas fa-user me-2"></i>Profil Pribadi</h6>
                <table class="table table-sm table-borderless small">
                    <tr><td width="35%"><b>NIK</b></td><td>: ${p.nik}</td></tr>
                    <tr><td><b>NIP</b></td><td>: ${p.nip || '-'}</td></tr>
                    <tr><td><b>Nama</b></td><td>: ${p.nama}</td></tr>
                    <tr><td><b>TTL</b></td><td>: ${p.tempat_lahir || '-'}, ${formatDate(p.tanggal_lahir)}</td></tr>
                    <tr><td><b>Gender</b></td><td>: ${p.jenis_kelamin || '-'}</td></tr>
                    <tr><td><b>Agama</b></td><td>: ${p.agama || '-'}</td></tr>
                    <tr><td><b>Status Fam</b></td><td>: ${p.status_keluarga || '-'}</td></tr>
                    <tr><td><b>Alamat</b></td><td>: ${p.alamat || '-'}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-success border-bottom pb-2"><i class="fas fa-briefcase me-2"></i>Kepegawaian & Ruangan</h6>
                <table class="table table-sm table-borderless small">
                    <tr><td width="35%"><b>Status Kerja</b></td><td>: <span class="badge ${getStatusBadgeClass(p.status)}">${p.status || 'Aktif'}</span></td></tr>
                    <tr><td><b>Ruangan</b></td><td>: ${p.ruangan || '-'}</td></tr>
                    <tr><td><b>Kel. Pegawai</b></td><td>: ${p.kelompok_pegawai || '-'}</td></tr>
                    <tr><td><b>Kel. Jabatan</b></td><td>: ${p.kelompok_jabatan || '-'}</td></tr>
                    <tr><td><b>Jabatan</b></td><td>: ${p.jabatan || '-'}</td></tr>
                    <tr><td><b>Golongan</b></td><td>: ${p.gol || '-'}</td></tr>
                    <tr><td><b>Masa Kerja RS</b></td><td>: ${p.masa_kerja_rs || '-'}</td></tr>
                    <tr><td><b>TMT Masuk RS</b></td><td>: ${formatDate(p.masuk_rs)}</td></tr>
                </table>
            </div>
            <div class="col-12 mt-2">
                <h6 class="text-info border-bottom pb-2"><i class="fas fa-graduation-cap me-2"></i>Pendidikan & Kredensial Lainnya</h6>
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-sm table-borderless small">
                            <tr><td width="35%"><b>Jenjang</b></td><td>: ${p.jenjang || '-'}</td></tr>
                            <tr><td><b>Fakultas</b></td><td>: ${p.fakultas || '-'}</td></tr>
                            <tr><td><b>Jurusan</b></td><td>: ${p.jurusan || '-'}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-sm table-borderless small">
                            <tr><td width="40%"><b>No. BPJS Kes</b></td><td>: ${p.no_bpjsn || '-'}</td></tr>
                            <tr><td><b>No. BPJS Ketenagakerjaan</b></td><td>: ${p.no_bpjsket_taspen || '-'}</td></tr>
                            <tr><td><b>NPWP</b></td><td>: ${p.npwp || '-'}</td></tr>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    modalDetail.show();
}

/**
 * UTALITAS HELPERS
 */
function resetForm() {
    formPegawai.reset();
    currentEditNik = null;
    modalPegawaiLabel.innerText = "Form Data Pegawai";
    formPegawai.querySelector('input[name="nik"]').readOnly = false;
    const firstTab = document.querySelector('#pegawaiTabs button:first-child');
    if (firstTab) bootstrap.Tab.getInstance(firstTab)?.show();
}

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('id-ID', {year:'numeric', month:'2-digit', day:'2-digit'}) : '-';
}

function getStatusBadgeClass(status) {
    switch (String(status).toLowerCase()) {
        case 'aktif': return 'bg-success';
        case 'pensiun': return 'bg-secondary';
        case 'resign': return 'bg-warning text-dark';
        case 'mutasi': return 'bg-info text-dark';
        default: return 'bg-dark';
    }
}

/**
 * 8. UTALITAS SHARED UTILITY UTK DOWNLOAD EXCEL, CSV, PDF & IMPORT
 */
function pasangMekanismeIO() {
    document.getElementById('btnExportExcel')?.addEventListener('click', () => {
        if(dataTerfilter.length === 0) return alert("Data kosong!");
        const ws = XLSX.utils.json_to_sheet(dataTerfilter);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pegawai");
        XLSX.writeFile(wb, `Data_Pegawai_${Date.now()}.xlsx`);
    });

    document.getElementById('btnExportCsv')?.addEventListener('click', () => {
        if(dataTerfilter.length === 0) return alert("Data kosong!");
        const ws = XLSX.utils.json_to_sheet(dataTerfilter);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Data_Pegawai_${Date.now()}.csv`;
        link.click();
    });

    document.getElementById('btnExportPdf')?.addEventListener('click', () => {
        if(dataTerfilter.length === 0) return alert("Data kosong!");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'pt', 'a3');
        doc.text("REKAP DATA MASTER PEGAWAI SIM RS", 40, 40);
        
        const heads = [["No", "NIK", "NIP", "Nama Pegawai", "Status", "Ruangan", "Jabatan", "Gol", "Jenjang", "No Telp"]];
        const body = dataTerfilter.map((item, idx) => [
            idx + 1, item.nik, item.nip || '-', item.nama, item.status || 'Aktif',
            item.ruangan || '-', item.jabatan || '-', item.gol || '-', item.jenjang || '-', item.no_telp || '-'
        ]);
        
        doc.autoTable({ head: heads, body: body, startY: 55, theme: 'grid', styles: { fontSize: 8 } });
        doc.save(`Data_Pegawai_${Date.now()}.pdf`);
    });

    const fileInput = document.getElementById('inputImportFile');
    document.getElementById('btnTriggerImport')?.addEventListener('click', () => fileInput?.click());
    
    fileInput?.addEventListener('change', function() {
        if (this.files.length === 0) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                if (json.length === 0) return alert("File Excel/CSV kosong!");

                const { error } = await supabase.from('pegawai').insert(json);
                if (error) throw error;
                
                alert(`Sukses mengimpor ${json.length} records data pegawai baru!`);
                await ambilMasterData();
            } catch (err) { alert("Gagal impor data master: " + err.message); }
        };
        reader.readAsBinaryString(this.files[0]);
        this.value = '';
    });
}

// Global register
window.editPegawai = editPegawai;
window.hapusPegawai = hapusPegawai;
window.lihatDetail = lihatDetail;
window.gantiHalaman = gantiHalaman;
