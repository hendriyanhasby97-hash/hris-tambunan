// Layout/Employee/employee.js
import { supabase } from '../../App/koneksi.js';

// State global data pegawai untuk manipulasi filtering, pagination & statistik
let masterPegawai = []; // Menyimpan data hasil filter/pencarian aktif
let allPegawaiRaw = [];  // Menyimpan seluruh data murni hasil fetch Supabase

// Manajemen Pagination
let currentPage = 1;
const itemsPerPage = 25;

// Element Catcher
const tableBody = document.getElementById('table-body');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const filterRuangan = document.getElementById('filter-ruangan');
const filterKelompok = document.getElementById('filter-kelompok');
const formPegawai = document.getElementById('form-pegawai');
const modalElement = new bootstrap.Modal(document.getElementById('modalPegawai'));
const detailModalElement = new bootstrap.Modal(document.getElementById('modalDetailPegawai'));

// List seluruh 35 field untuk otomasi pembersihan/baca data form & validasi import
const fields = [
    'nik', 'nama', 'jeniskelamin', 'agama', 'statuspernikahan', 'pasangan', 'jumlahanak', 'alamat', 
    'nip', 'status', 'kelompoktenaga', 'golongan', 'tmtpangkat', 'tmtplanjut', 'kelompokjabatan', 
    'jabatan', 'tmtjabatan', 'tmtcpns', 'bup', 'tmtpensiun', 'masukrs', 'masakerja', 'jpendidikan', 
    'fpendidikan', 'jrspendidikan', 'asalpendidikan', 'tahunlulus', 'ruangan', 'notatugas', 'tmt', 
    'bpjs', 'bpjstktaspen', 'npwp', 'email', 'nohp'
];

document.addEventListener('DOMContentLoaded', () => {
    // Tampilkan data user terotentikasi di header navbar
    const sessionData = localStorage.getItem('hris_session');
    if (sessionData) {
        const user = JSON.parse(sessionData);
        document.getElementById('user-display').innerText = `${user.username} (${user.role})`;
    }

    // Ambil Data Utama dari Supabase
    fetchEmployeeData();

    // Event Listener Real-Time Filter & Search
    searchInput.addEventListener('input', () => { currentPage = 1; applyFiltersAndSearch(); });
    filterStatus.addEventListener('change', () => { currentPage = 1; applyFiltersAndSearch(); });
    filterRuangan.addEventListener('change', () => { currentPage = 1; applyFiltersAndSearch(); });
    filterKelompok.addEventListener('change', () => { currentPage = 1; applyFiltersAndSearch(); });

    // Event Reset Form ketika Tombol Tambah di-klik
    document.getElementById('btn-tambah').addEventListener('click', () => {
        document.getElementById('id_pegawai').value = '';
        formPegawai.reset();
        document.getElementById('modal-title').innerText = 'Tambah Pegawai Baru';
    });

    // Event Listeners Interaksi Fitur Ekspor & Impor File
    document.getElementById('btn-trigger-import').addEventListener('click', () => {
        document.getElementById('import-excel-file').click();
    });
    document.getElementById('import-excel-file').addEventListener('change', handleImportExcel);

    document.getElementById('btn-export-excel').addEventListener('click', () => exportDataFile('xlsx'));
    document.getElementById('btn-export-csv').addEventListener('click', () => exportDataFile('csv'));
    document.getElementById('btn-export-pdf').addEventListener('click', exportDataPDF);
});

// 1. FUNGSI AMBIL DATA UTAMA & HITUNG STATISTIK BOX
async function fetchEmployeeData() {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Memperbarui tabel...</td></tr>`;
    
    const { data, error } = await supabase
        .from('employee')
        .select('*')
        .order('nama', { ascending: true });

    if (error) {
        console.error("Gagal menarik data:", error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data dari Supabase!</td></tr>`;
        return;
    }

    allPegawaiRaw = data || [];
    calculateSummaryBoxes(allPegawaiRaw);
    populateFilterOptions(allPegawaiRaw);
    
    applyFiltersAndSearch(); 
}

// Menghitung angka ringkasan statistik secara riil berdasarkan isi kolom status
function calculateSummaryBoxes(data) {
    document.getElementById('stat-total').innerText = data.length;
    document.getElementById('stat-aktif').innerText = data.filter(p => p.status === 'Aktif').length;
    document.getElementById('stat-pensiun').innerText = data.filter(p => p.status === 'Pensiun').length;
    document.getElementById('stat-meninggal').innerText = data.filter(p => p.status === 'Meninggal').length;
    document.getElementById('stat-resign').innerText = data.filter(p => p.status === 'Resign').length;
}

// Otomatis mengisi pilihan dropdown filter sesuai data unik yang ada di database
function populateFilterOptions(data) {
    const ruanganUnik = [...new Set(data.map(item => item.ruangan).filter(Boolean))];
    const kelompokUnik = [...new Set(data.map(item => item.kelompoktenaga).filter(Boolean))];

    const currentRuangan = filterRuangan.value;
    const currentKelompok = filterKelompok.value;

    filterRuangan.innerHTML = '<option value="">Semua Ruangan</option>';
    ruanganUnik.forEach(r => {
        filterRuangan.innerHTML += `<option value="${r}">${r}</option>`;
    });

    filterKelompok.innerHTML = '<option value="">Semua Kelompok</option>';
    kelompokUnik.forEach(k => {
        filterKelompok.innerHTML += `<option value="${k}">${k}</option>`;
    });

    filterRuangan.value = currentRuangan;
    filterKelompok.value = currentKelompok;
}

// 2. FUNGSI PENCARIAN & FILTER MULTI-CONDITIONAL
function applyFiltersAndSearch() {
    const keyword = searchInput.value.toLowerCase().trim();
    const statusVal = filterStatus.value;
    const ruanganVal = filterRuangan.value;
    const kelompokVal = filterKelompok.value;

    masterPegawai = allPegawaiRaw.filter(p => {
        const matchKeyword = 
            (p.nik && p.nik.toLowerCase().includes(keyword)) ||
            (p.nama && p.nama.toLowerCase().includes(keyword)) ||
            (p.jabatan && p.jabatan.toLowerCase().includes(keyword));

        const matchStatus = statusVal === "" || p.status === statusVal;
        const matchRuangan = ruanganVal === "" || p.ruangan === ruanganVal;
        const matchKelompok = kelompokVal === "" || p.kelompoktenaga === kelompokVal;

        return matchKeyword && matchStatus && matchRuangan && matchKelompok;
    });

    renderTable();
}

// 3. LOGIKA RENDER TABEL UTAMA DENGAN PAGINATION (MAX 25 DATA/PAGE)
function renderTable() {
    const totalItems = masterPegawai.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    // Batasi jika halaman aktif melampaui total halaman sesudah difilter
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = masterPegawai.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary">Tidak ada data pegawai yang cocok.</td></tr>`;
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }

    let rows = '';
    paginatedItems.forEach(p => {
        rows += `
            <tr>
                <td class="fw-bold text-secondary">${p.nik || '-'}</td>
                <td><strong>${p.nama || '-'}</strong></td>
                <td>${p.nip || '<span class="text-muted small">Belum Ada</span>'}</td>
                <td>${p.jabatan || '-'}</td>
                <td><span class="badge bg-secondary">${p.ruangan || '-'}</span></td>
                <td>${p.masakerja || '-'}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info text-white btn-view" data-id="${p.id_pegawai}">Lihat</button>
                        <button class="btn btn-warning text-white btn-edit" data-id="${p.id_pegawai}">Edit</button>
                        <button class="btn btn-danger btn-delete" data-id="${p.id_pegawai}">Hapus</button>
                    </div>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = rows;

    renderPaginationControls(totalPages);
    initActionButtons();
}

// Membuat item tombol halaman navigasi
function renderPaginationControls(totalPages) {
    if (totalPages <= 1) {
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }

    let html = `<nav><ul class="pagination pagination-sm justify-content-center mt-3">`;
    
    // Tombol Previous
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" data-page="${currentPage - 1}">Sebelumnya</button>
        </li>`;

    // Deretan Nomor Halaman
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <button class="page-link" data-page="${i}">${i}</button>
            </li>`;
    }

    // Tombol Next
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link" data-page="${currentPage + 1}">Berikutnya</button>
        </li>`;

    html += `</ul></nav>`;
    document.getElementById('pagination-container').innerHTML = html;

    // Pasang Event Klik ke Tombol-Tombol Pagination
    document.querySelectorAll('#pagination-container button.page-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetPage = parseInt(e.target.getAttribute('data-page'));
            if (!isNaN(targetPage) && targetPage > 0) {
                currentPage = targetPage;
                renderTable();
            }
        });
    });
}

// 4. HANDLER INTERAKSI ACTION BUTTONS (VIEW, EDIT, DELETE)
function initActionButtons() {
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const p = allPegawaiRaw.find(item => item.id_pegawai == id);
            if (!p) return;

            let detailHtml = '';
            fields.forEach(field => {
                detailHtml += `
                    <tr>
                        <th width="35%" class="bg-light ps-3 fw-bold text-uppercase">${field}</th>
                        <td class="ps-3">${p[field] !== null && p[field] !== undefined ? p[field] : '-'}</td>
                    </tr>
                `;
            });
            document.getElementById('detail-view-body').innerHTML = detailHtml;
            detailModalElement.show();
        });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const p = allPegawaiRaw.find(item => item.id_pegawai == id);
            if (!p) return;

            document.getElementById('id_pegawai').value = p.id_pegawai;
            document.getElementById('modal-title').innerText = 'Edit Data Pegawai: ' + p.nama;

            fields.forEach(field => {
                document.getElementById(field).value = p[field] || '';
            });

            bootstrap.Tab.getInstance(document.getElementById('pribadi-tab')).show();
            modalElement.show();
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const p = allPegawaiRaw.find(item => item.id_pegawai == id);
            
            if (confirm(`Apakah Anda yakin ingin menghapus data pegawai bernama "${p.nama}"?`)) {
                const { error } = await supabase
                    .from('employee')
                    .delete()
                    .eq('id_pegawai', id);

                if (error) {
                    alert("Gagal menghapus data: " + error.message);
                } else {
                    alert("Pegawai berhasil dihapus!");
                    fetchEmployeeData();
                }
            }
        });
    });
}

// 5. SUBMIT HANDLING FORM (TAMBAH / UPDATE JALUR BERSAMA)
formPegawai.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const idPegawai = document.getElementById('id_pegawai').value;
    const btnSimpan = document.getElementById('btn-simpan');
    
    btnSimpan.innerText = 'Menyimpan...';
    btnSimpan.disabled = true;

    const payload = {};
    fields.forEach(field => {
        const val = document.getElementById(field).value.trim();
        payload[field] = val === "" ? null : val;
    });

    if (idPegawai) {
        const { error } = await supabase
            .from('employee')
            .update(payload)
            .eq('id_pegawai', idPegawai);

        if (error) {
            alert("Gagal memperbarui data: " + error.message);
        } else {
            alert("Perubahan data pegawai berhasil disimpan!");
            modalElement.hide();
            fetchEmployeeData();
        }
    } else {
        const { error } = await supabase
            .from('employee')
            .insert([payload]);

        if (error) {
            alert("Gagal menambahkan pegawai: " + error.message);
        } else {
            alert("Pegawai baru berhasil didaftarkan ke sistem!");
            modalElement.hide();
            fetchEmployeeData();
        }
    }

    btnSimpan.innerText = 'Simpan Data';
    btnSimpan.disabled = false;
});

// 6. FITUR DOWNLOAD / EXPORT DATA (EXCEL & CSV VIA SHEETJS)
function exportDataFile(format) {
    if (masterPegawai.length === 0) {
        alert("Tidak ada data yang tersedia untuk diekspor!");
        return;
    }

    // Melakukan mapping data agar headers di file Excel rapi menggunakan huruf kapital
    const dataClean = masterPegawai.map(p => {
        const row = {};
        fields.forEach(f => {
            row[f.toUpperCase()] = p[f] !== null ? p[f] : '';
        });
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataClean);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Pegawai");

    if (format === 'xlsx') {
        XLSX.writeFile(workbook, "Data_Pegawai_HRIS.xlsx");
    } else if (format === 'csv') {
        XLSX.writeFile(workbook, "Data_Pegawai_HRIS.csv", { bookType: 'csv' });
    }
}

// 7. FITUR DOWNLOAD EXPORT PDF (VIA jspdf + jspdf-autotable)
function exportDataPDF() {
    if (masterPegawai.length === 0) {
        alert("Tidak ada data untuk diekspor!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');

    doc.setFont("Helvetica", "bold");
    doc.text("DATA PEGAWAI - HRIS SYSTEM", 14, 15);
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 21);

    // Filter kolom utama saja yang ditaruh ke PDF agar muat di kertas landscape A4
    const headers = [["NIK", "NAMA LENGKAP", "NIP", "JABATAN", "RUANGAN/UNIT", "STATUS"]];
    const bodyRows = masterPegawai.map(p => [
        p.nik || '-',
        p.nama || '-',
        p.nip || '-',
        p.jabatan || '-',
        p.ruangan || '-',
        p.status || '-'
    ]);

    doc.autoTable({
        head: headers,
        body: bodyRows,
        startY: 25,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 9 }
    });

    doc.save("Data_Pegawai_HRIS.pdf");
}

// 8. FITUR IMPORT DATA DARI EXCEL / CSV (OTOMATIS BULK INSERT KE SUPABASE)
function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const dataBinary = evt.target.result;
            const workbook = XLSX.read(dataBinary, { type: 'binary' });
            
            // Baca sheet pertama
            const sheetName = workbook.SheetNames[0];
            const rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            if (rawJson.length === 0) {
                alert("File kosong atau tidak berisi baris data!");
                return;
            }

            // Normalisasi data: Konversi seluruh key/headers dari file menjadi lowercase 
            // agar sinkron secara otomatis dengan field nama kolom Supabase
            const payloads = rawJson.map(row => {
                const item = {};
                
                // Set default null untuk ke-35 field
                fields.forEach(f => item[f] = null);

                // Tarik data yang cocok berdasarkan header (tidak sensitif huruf besar-kecil)
                Object.keys(row).forEach(key => {
                    const normalizedKey = key.trim().toLowerCase();
                    if (fields.includes(normalizedKey)) {
                        const val = String(row[key]).trim();
                        item[normalizedKey] = val === "" ? null : val;
                    }
                });
                return item;
            });

            // Jalankan validasi kelayakan minimum
            const validPayloads = payloads.filter(p => p.nik && p.nama);
            if (validPayloads.length === 0) {
                alert("Gagal mengimpor! Pastikan dokumen memiliki kolom bernama 'nik' dan 'nama' dengan isi tidak boleh kosong.");
                return;
            }

            if (confirm(`Apakah Anda yakin ingin memasukkan ${validPayloads.length} data pegawai baru ini ke dalam database?`)) {
                // Bulk insert langsung ke tabel employee Supabase
                const { error } = await supabase
                    .from('employee')
                    .insert(validPayloads);

                if (error) {
                    throw new Error(error.message);
                }

                alert(`Berhasil mengimpor ${validPayloads.length} data pegawai baru!`);
                document.getElementById('import-excel-file').value = ''; // Reset slot file input
                fetchEmployeeData(); // Sinkronisasi tabel utama
            }

        } catch (err) {
            console.error(err);
            alert("Terjadi kegagalan saat membaca/mengimpor file: " + err.message);
        }
    };

    reader.readAsBinaryString(file);
}
