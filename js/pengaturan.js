import { supabase } from '../app/koneksi.js';

// Kamus Router Pemetaan Struktur Database Ke-10 Data Master
const MAP_MASTER = {
    jabatan: { tabel: 'master_jabatan', pk: 'id', kolom: 'nama_jabatan', label: 'Jabatan', file: 'Master_Jabatan' },
    pangkat: { tabel: 'master_pangkat', pk: 'id', kolom: 'nama_pangkat', label: 'Pangkat / Golongan', file: 'Master_Pangkat_Golongan' },
    ruangan: { tabel: 'master_ruangan', pk: 'id', kolom: 'nama_ruangan', label: 'Ruangan', file: 'Master_Ruangan' },
    kel_pegawai: { tabel: 'master_kelompok_pegawai', pk: 'id', kolom: 'nama_kelompok', label: 'Kelompok Pegawai', file: 'Master_Kelompok_Pegawai' },
    kel_jabatan: { tabel: 'master_kelompok_jabatan', pk: 'id', kolom: 'nama_kelompok_jabatan', label: 'Kelompok Jabatan', file: 'Master_Kelompok_Jabatan' },
    bup: { tabel: 'rentang_bup', pk: 'id', kolom: 'umur', label: 'Rentang BUP (Usia Pensiun)', file: 'Master_Rentang_BUP' },
    jenjang: { tabel: 'master_jenjang', pk: 'id', kolom: 'nama_jenjang', label: 'Jenjang Pendidikan', file: 'Master_Jenjang_Pendidikan' },
    fakultas: { tabel: 'master_fakultas', pk: 'id', kolom: 'nama_fakultas', label: 'Fakultas', file: 'Master_Fakultas' },
    jurusan: { tabel: 'master_jurusan', pk: 'id', kolom: 'nama_jurusan', label: 'Jurusan', file: 'Master_Jurusan' },
    bidang: { tabel: 'master_bidang', pk: 'id', kolom: 'nama_bidang', label: 'Bidang', file: 'Master_Bidang' }
};

// Pointer Active Node Default
let activeKey = 'jabatan';
let listData = [];
let currentPage = 1;
let itemsPerPage = 10;

// Element DOM Mapping
const tbodyMaster = document.getElementById('tbodyMaster');
const formMaster = document.getElementById('formMaster');
const modalMaster = new bootstrap.Modal(document.getElementById('modalMaster'));
const modalMasterLabel = document.getElementById('modalMasterLabel');
const idMasterInput = document.getElementById('idMaster');
const namaItemInput = document.getElementById('nama_item');
const inputCari = document.getElementById('inputCari');
const limitData = document.getElementById('limitData');
const infoPagination = document.getElementById('infoPagination');
const paginationControls = document.getElementById('paginationControls');

const txtJudulMaster = document.getElementById('txtJudulMaster');
const thNamaKolom = document.getElementById('thNamaKolom');
const lblFormInput = document.getElementById('lblFormInput');
const btnTambah = document.getElementById('btnTambah');

document.addEventListener('DOMContentLoaded', () => {
    bacaHashDanNavigasi();
    window.addEventListener('hashchange', bacaHashDanNavigasi);
    
    // Register Event Handler
    formMaster.addEventListener('submit', handleFormSubmit);
    btnTambah.addEventListener('click', resetForm);
    inputCari.addEventListener('input', () => { currentPage = 1; renderTabel(); });
    limitData.addEventListener('change', () => { itemsPerPage = parseInt(limitData.value); currentPage = 1; renderTabel(); });
    
    pasangMekanismeIO();
});

/**
 * 1. ROUTER ENGINE - Baca hash URL browser untuk ganti tab otomatis
 */
function bacaHashDanNavigasi() {
    const hash = window.location.hash.replace('#', '');
    if (hash && MAP_MASTER[hash]) {
        activeKey = hash;
    } else {
        activeKey = 'jabatan';
    }

    // Set highlight aktif pada list navigasi kiri
    document.querySelectorAll('#v-pills-tab .nav-link').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === activeKey) btn.classList.add('active');
    });

    // Sesuaikan Label Text UI Dinamis
    const current = MAP_MASTER[activeKey];
    txtJudulMaster.innerText = `Pengaturan Master ${current.label}`;
    thNamaKolom.innerText = `Nama ${current.label}`;
    lblFormInput.innerText = `Nama ${current.label}`;
    btnTambah.innerText = `+ Tambah ${current.label}`;

    currentPage = 1;
    inputCari.value = '';
    ambilDataDariSupabase();
}

/**
 * 2. READ - Ambil data referensi aktif dari server
 */
async function ambilDataDariSupabase() {
    const current = MAP_MASTER[activeKey];
    try {
        tbodyMaster.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3"><i class="bi bi-arrow-repeat spin"></i> Memuat data master...</td></tr>`;
        
        const { data, error } = await supabase.from(current.tabel).select('*').order(current.kolom, { ascending: true });
        if (error) throw error;

        listData = data || [];
        renderTabel();
    } catch (e) {
        tbodyMaster.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error: ${e.message}</td></tr>`;
    }
}

/**
 * 3. RENDER TABEL & PAGINATION
 */
function renderTabel() {
    const current = MAP_MASTER[activeKey];
    const keyword = inputCari.value.toLowerCase().trim();
    
    // Proses Saring Kata Kunci
    const dataTerfilter = listData.filter(item => 
        item[current.kolom] && String(item[current.kolom]).toLowerCase().includes(keyword)
    );

    const totalItems = dataTerfilter.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const dataHalamanIni = dataTerfilter.slice(startIndex, startIndex + itemsPerPage);

    infoPagination.innerText = `Total: ${totalItems} data`;
    tbodyMaster.innerHTML = '';

    if (dataHalamanIni.length === 0) {
        tbodyMaster.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">Data referensi kosong.</td></tr>`;
        paginationControls.innerHTML = '';
        return;
    }

    dataHalamanIni.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center text-muted">${startIndex + index + 1}</td>
            <td><b>${item[current.kolom]}</b></td>
            <td class="text-center">
                <button class="btn btn-warning btn-sm py-0 px-2 me-1" onclick="editData('${item[current.pk]}')"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-danger btn-sm py-0 px-2" onclick="deleteData('${item[current.pk]}')"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbodyMaster.appendChild(tr);
    });

    // Render tombol halaman ringkas
    paginationControls.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const li = document.createElement('li');
            li.className = `page-item ${currentPage === i ? 'active' : ''}`;
            li.innerHTML = `<button class="page-link" onclick="changePage(${i})">${i}</button>`;
            paginationControls.appendChild(li);
        }
    }
}

function changePage(p) { currentPage = p; renderTabel(); }

/**
 * 4. CREATE & UPDATE HANDLER
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const current = MAP_MASTER[activeKey];
    const id = idMasterInput.value;
    const payload = { [current.kolom]: namaItemInput.value.trim() };

    try {
        if (id === "") {
            const { error } = await supabase.from(current.tabel).insert([payload]);
            if (error) throw error;
        } else {
            const { error } = await supabase.from(current.tabel).update(payload).eq(current.pk, id);
            if (error) throw error;
        }
        modalMaster.hide();
        ambilDataDariSupabase();
    } catch (e) { alert("Gagal menyimpan: " + e.message); }
}

/**
 * 5. EDIT FETCH POPULATE
 */
async function editData(id) {
    resetForm();
    const current = MAP_MASTER[activeKey];
    modalMasterLabel.innerText = `Edit Master ${current.label}`;
    
    try {
        const { data, error } = await supabase.from(current.tabel).select('*').eq(current.pk, id).single();
        if (error) throw error;

        idMasterInput.value = data[current.pk];
        namaItemInput.value = data[current.kolom];
        modalMaster.show();
    } catch (e) { alert(e.message); }
}

/**
 * 6. DELETE RECORD
 */
async function deleteData(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data referensi master ini?')) return;
    const current = MAP_MASTER[activeKey];
    try {
        const { error } = await supabase.from(current.tabel).delete().eq(current.pk, id);
        if (error) throw error;
        ambilDataDariSupabase();
    } catch (e) { alert(e.message); }
}

function resetForm() {
    formMaster.reset();
    idMasterInput.value = "";
    modalMasterLabel.innerText = `Tambah Master ${MAP_MASTER[activeKey].label}`;
}

/**
 * 7. CORE UTALITAS EKSPOR & IMPOR BULK FILE
 */
function pasangMekanismeIO() {
    document.getElementById('btnExportExcel').addEventListener('click', () => {
        if(listData.length === 0) return alert("Data kosong!");
        const current = MAP_MASTER[activeKey];
        const rows = listData.map((item, i) => ({ "No": i+1, [current.label]: item[current.kolom] }));
        const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1"); XLSX.writeFile(wb, `${current.file}.xlsx`);
    });

    document.getElementById('btnExportCsv').addEventListener('click', () => {
        if(listData.length === 0) return alert("Data kosong!");
        const current = MAP_MASTER[activeKey];
        const rows = listData.map((item, i) => ({ "No": i+1, [current.label]: item[current.kolom] }));
        const ws = XLSX.utils.json_to_sheet(rows); const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${current.file}.csv`; link.click();
    });

    document.getElementById('btnExportPdf').addEventListener('click', () => {
        if(listData.length === 0) return alert("Data kosong!");
        const current = MAP_MASTER[activeKey];
        const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'pt', 'a4');
        doc.text(`DATA REKAP MASTER ${current.label.toUpperCase()}`, 40, 40);
        const heads = [["No", `Nama ${current.label}`]];
        const body = listData.map((item, idx) => [idx + 1, item[current.kolom]]);
        doc.autoTable({ head: heads, body: body, startY: 55, theme: 'grid' });
        doc.save(`${current.file}.pdf`);
    });

    const fileInput = document.getElementById('inputImportFile');
    document.getElementById('btnTriggerImport').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', function() {
        if (this.files.length === 0) return;
        const current = MAP_MASTER[activeKey];
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                if (json.length === 0) return alert("File kosong!");

                const payloads = json.map(row => {
                    // Cari baris cell value text kolom pertama excel
                    const cellValue = row[Object.keys(row)[0]];
                    return { [current.kolom]: cellValue };
                });

                const { error } = await supabase.from(current.tabel).insert(payloads);
                if (error) throw error;
                
                alert(`Sukses mengimpor ${payloads.length} data master baru!`);
                ambilDataDariSupabase();
            } catch (err) { alert("Gagal impor: " + err.message); }
        };
        reader.readAsBinaryString(this.files[0]); this.value = '';
    });
}

// Daftarkan fungsi pemicu baris ke scope window global
window.editData = editData; window.deleteData = deleteData; window.changePage = changePage;
