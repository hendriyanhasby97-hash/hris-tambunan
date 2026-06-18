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

// Elemen Automasi Form
const formKelompokPegawai = document.getElementById('formKelompokPegawai');
const formNip = document.getElementById('formNip');
const formTmtCpns = document.getElementById('formTmtCpns');
const formMasukRs = document.getElementById('formMasukRs');
const formMasaKerjaRs = document.getElementById('formMasaKerjaRs');
const formTanggalLahir = document.getElementById('formTanggalLahir');
const formRentangBup = document.getElementById('formRentangBup');
const formTmtPensiun = document.getElementById('formTmtPensiun');

// Jalankan saat halaman siap
document.addEventListener('DOMContentLoaded', () => {
    initSistem();
});

/**
 * 0. INISIALISASI UTAMA & SUNTIK TOMBOL IO + POPULATE ALL MASTERS
 */
async function initSistem() {
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

    // Pasang Event Listeners Filter & Limit
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

    // BIND EVENT OTOMASI FORM PENILAIAN & KREDENSIAL
    formKelompokPegawai.addEventListener('change', handleKelompokPegawaiChange);
    formNip.addEventListener('input', handleNipInput);
    formMasukRs.addEventListener('change', hitungMasaKerjaOtomatis);
    formTanggalLahir.addEventListener('change', hitungTmtPensiunOtomatis);
    formRentangBup.addEventListener('change', hitungTmtPensiunOtomatis);

    // Ambil Data Master Dropdown Sekaligus
    await muatSemuaDropdownMaster();
    
    // Ambil Data master pegawai dari Supabase
    await ambilMasterData();
    pasangMekanismeIO();
}

/**
 * UTALITAS: Ambil data dari tabel master & masukkan ke element select
 */
async function loadDropdownMaster(tableName, columnName, elementId) {
    try {
        const selectEl = document.getElementById(elementId);
        if (!selectEl) return;
        
        const { data, error } = await supabase.from(tableName).select('*').order(columnName, { ascending: true });
        if (error) throw error;

        // Ambil opsi default pertama
        const defaultOpt = selectEl.innerHTML;
        selectEl.innerHTML = defaultOpt;

        (data || []).forEach(row => {
            const val = row[columnName];
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            selectEl.appendChild(opt);
        });
    } catch (e) {
        console.error(`Gagal memuat master dropdown ${tableName}:`, e.message);
    }
}

async function muatSemuaDropdownMaster() {
    await loadDropdownMaster('master_kelompok_pegawai', 'nama_kelompok', 'formKelompokPegawai');
    await loadDropdownMaster('master_ruangan', 'nama_ruangan', 'formRuangan');
    await loadDropdownMaster('master_kelompok_jabatan', 'nama_kelompok_jabatan', 'formKelompokJabatan');
    await loadDropdownMaster('master_jabatan', 'nama_jabatan', 'formJabatan');
    await loadDropdownMaster('master_pangkat', 'nama_pangkat', 'formGol');
    await loadDropdownMaster('master_jenjang', 'nama_jenjang', 'formJenjang');
    await loadDropdownMaster('master_fakultas', 'nama_fakultas', 'formFakultas');
    await loadDropdownMaster('master_jurusan', 'nama_jurusan', 'formJurusan');
    
    // Khusus rentang BUP, sesuaikan dengan nama kolom dinamis (contoh: umur)
    await loadDropdownMaster('rentang_bup', 'umur', 'formRentangBup');
}

/**
 * LOGIKA UTAMA 14 RULES BISNIS
 */

// Rule 1: NIP bisa diisi jika kelompok pegawai ASN
function handleKelompokPegawaiChange() {
    const isAsn = String(formKelompokPegawai.value).toUpperCase() === 'ASN';
    if (isAsn) {
        formNip.disabled = false;
        formNip.placeholder = "Isi NIP 18 Digit";
    } else {
        formNip.disabled = true;
        formNip.value = "";
        formNip.placeholder = "Terkunci (Hanya untuk ASN)";
        formTmtCpns.value = "";
    }
}

// Rule 8: TMT CPNS Otomatis diurai dari NIP (Digit ke-9 sampai 14 => YYYYMM)
function handleNipInput() {
    const nip = formNip.value.trim();
    // Validasi panjang NIP PNS standar 18 digit
    if (nip.length >= 14) {
        const tahunStr = nip.substring(8, 12); // Indeks ke 8, 9, 10, 11 (4 digit)
        const bulanStr = nip.substring(12, 14); // Indeks ke 12, 13 (2 digit)
        
        const tahun = parseInt(tahunStr);
        const bulan = parseInt(bulanStr);

        if (tahun > 1950 && bulan >= 1 && bulan <= 12) {
            // TMT CPNS ditetapkan terhitung mulai tanggal 1 bulan pengangkatan
            formTmtCpns.value = `${tahunStr}-${bulanStr}-01`;
        } else {
            formTmtCpns.value = "";
        }
    } else {
        formTmtCpns.value = "";
    }
}

// Rule 9: Hitung Masa Kerja Otomatis (## Tahun ## Bulan ## Hari)
function hitungMasaKerjaOtomatis() {
    const tmtMasukVal = formMasukRs.value;
    if (!tmtMasukVal) {
        formMasaKerjaRs.value = "";
        return;
    }

    const tmtMasuk = new Date(tmtMasukVal);
    const sekarang = new Date();

    let tahun = sekarang.getFullYear() - tmtMasuk.getFullYear();
    let bulan = sekarang.getMonth() - tmtMasuk.getMonth();
    let hari = sekarang.getDate() - tmtMasuk.getDate();

    if (hari < 0) {
        bulan--;
        // Dapatkan total hari pada bulan sebelumnya
        const hariBulanLalu = new Date(sekarang.getFullYear(), sekarang.getMonth(), 0).getDate();
        hari += hariBulanLalu;
    }

    if (bulan < 0) {
        tahun--;
        bulan += 12;
    }

    if (tahun < 0) {
        formMasaKerjaRs.value = "0 Tahun 0 Bulan 0 Hari";
    } else {
        formMasaKerjaRs.value = `${tahun} Tahun ${bulan} Bulan ${hari} Hari`;
    }
}

// Rule 11: TMT Pensiun otomatisasi dihitung dari tanggal lahir + bup = tanggal 1 bulan berikutnya
function hitmtPensiunOtomatis() {}
function hitungTmtPensiunOtomatis() {
    const tglLahirVal = formTanggalLahir.value;
    const bupVal = formRentangBup.value;

    if (!tglLahirVal || !bupVal) {
        formTmtPensiun.value = "";
        return;
    }

    // Ambil angka usia dari string bup (misal "58 Tahun" atau "58" -> 58)
    const matchAngka = bupVal.match(/\d+/);
    if (!matchAngka) return;
    const bupTahun = parseInt(matchAngka[0]);

    const tglLahir = new Date(tglLahirVal);
    
    let tahunPensiun = tglLahir.getFullYear() + bupTahun;
    let bulanPensiun = tglLahir.getMonth() + 1; // Pindah langsung ke 1 bulan berikutnya

    if (bulanPensiun > 11) {
        bulanPensiun = 0;
        tahunPensiun++;
    }

    const mmStr = String(bulanPensiun + 1).padStart(2, '0');
    // Tanggal 1 pada bulan berikutnya
    formTmtPensiun.value = `${tahunPensiun}-${mmStr}-01`;
}

/**
 * DATA LOADER CORE CRUD
 */
async function ambilMasterData() {
    try {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>Memuat data master...</td></tr>`;
        const { data, error } = await supabase.from('pegawai').select('*');
        if (error) throw error;

        masterPegawai = data || [];
        hitungSummaryCounters(masterPegawai);
        jalankanFilter();
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${err.message}</td></tr>`;
    }
}

function hitungSummaryCounters(data) {
    document.getElementById('totPegawai').innerText = data.length;
    document.getElementById('totAktif').innerText = data.filter(p => String(p.status).toLowerCase() === 'aktif').length;
    document.getElementById('totPensiun').innerText = data.filter(p => String(p.status).toLowerCase() === 'pensiun').length;
    document.getElementById('totResign').innerText = data.filter(p => String(p.status).toLowerCase() === 'resign').length;
    document.getElementById('totMutasi').innerText = data.filter(p => String(p.status).toLowerCase() === 'mutasi').length;
    
    const statusTerdata = ['aktif', 'pensiun', 'resign', 'mutasi'];
    document.getElementById('totLainnya').innerText = data.filter(p => !p.status || !statusTerdata.includes(String(p.status).toLowerCase())).length;
}

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
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">Data tidak ditemukan.</td></tr>`;
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
                    <button class="btn btn-info text-white" onclick="lihatDetail('${item.nik}')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-warning text-dark" onclick="editPegawai('${item.nik}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger" onclick="hapusPegawai('${item.nik}')"><i class="fas fa-trash"></i></button>
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
        }
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<button class="page-link" onclick="gantiHalaman(${currentPage + 1})">»</button>`;
    paginationControls.appendChild(nextLi);
}

function gantiHalaman(p) { currentPage = p; renderTabel(); }

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
            alert('Data pegawai baru berhasil disimpan!');
        } else {
            const { error } = await supabase.from('pegawai').update(payload).eq('nik', currentEditNik);
            if (error) throw error;
            alert('Data pegawai berhasil diperbarui!');
        }
        modalPegawai.hide();
        await ambilMasterData();
    } catch (err) { alert('Gagal menyimpan data: ' + err.message); }
}

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
    handleKelompokPegawaiChange(); // trigger visibilitas input NIP
    modalPegawai.show();
}

async function hapusPegawai(nik) {
    if (!confirm(`Hapus permanen data NIK: ${nik}?`)) return;
    try {
        const { error } = await supabase.from('pegawai').delete().eq('nik', nik);
        if (error) throw error;
        alert('Data pegawai berhasil dihapus!');
        await ambilMasterData();
    } catch (err) { alert('Gagal menghapus: ' + err.message); }
}

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
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-success border-bottom pb-2"><i class="fas fa-briefcase me-2"></i>Kepegawaian</h6>
                <table class="table table-sm table-borderless small">
                    <tr><td width="35%"><b>Status Kerja</b></td><td>: ${p.status || 'Aktif'}</td></tr>
                    <tr><td><b>Ruangan</b></td><td>: ${p.ruangan || '-'}</td></tr>
                    <tr><td><b>Kel. Pegawai</b></td><td>: ${p.kelompok_pegawai || '-'}</td></tr>
                    <tr><td><b>Jabatan</b></td><td>: ${p.jabatan || '-'}</td></tr>
                    <tr><td><b>Masa Kerja RS</b></td><td>: ${p.masa_kerja_rs || '-'}</td></tr>
                </table>
            </div>
        </div>
    `;
    modalDetail.show();
}

function resetForm() {
    formPegawai.reset();
    currentEditNik = null;
    modalPegawaiLabel.innerText = "Form Data Pegawai";
    formPegawai.querySelector('input[name="nik"]').readOnly = false;
    formNip.disabled = true;
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('id-ID', {year:'numeric', month:'2-digit', day:'2-digit'}) : '-'; }
function getStatusBadgeClass(status) {
    if(String(status).toLowerCase() === 'aktif') return 'bg-success';
    if(String(status).toLowerCase() === 'pensiun') return 'bg-secondary';
    return 'bg-dark';
}

function pasangMekanismeIO() {
    document.getElementById('btnExportExcel')?.addEventListener('click', () => {
        const ws = XLSX.utils.json_to_sheet(dataTerfilter); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pegawai"); XLSX.writeFile(wb, `Data_Pegawai.xlsx`);
    });
    document.getElementById('btnExportCsv')?.addEventListener('click', () => {
        const ws = XLSX.utils.json_to_sheet(dataTerfilter); const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Data_Pegawai.csv`; link.click();
    });
}

// Global register
window.editPegawai = editPegawai; window.hapusPegawai = hapusPegawai; window.lihatDetail = lihatDetail; window.gantiHalaman = gantiHalaman;
