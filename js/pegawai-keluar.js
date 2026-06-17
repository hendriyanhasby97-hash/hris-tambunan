// Import objek supabase langsung dari koneksi.js
import { supabase } from '../app/koneksi.js';

// Inisialisasi Element DOM
const tbodyPegawaiKeluar = document.getElementById('tbodyPegawaiKeluar');
const formPegawaiKeluar = document.getElementById('formPegawaiKeluar');
const modalElement = document.getElementById('modalPegawaiKeluar');
const modalPegawaiKeluar = new bootstrap.Modal(modalElement);
const modalLabel = document.getElementById('modalPegawaiKeluarLabel');
const idKeluarInput = document.getElementById('idKeluar');
const btnTambah = document.getElementById('btnTambah');

const nikInput = document.getElementById('nik');
const namaInput = document.getElementById('nama');
const bagianInput = document.getElementById('bagian');
const unitTugasInput = document.getElementById('unit_tugas');
const tmtInput = document.getElementById('tmt_keluar');
const jenisKeluarInput = document.getElementById('jenis_keluar');
const keteranganInput = document.getElementById('keterangan');

const filterTahun = document.getElementById('filterTahun');
const inputCari = document.getElementById('inputCari'); 
const limitData = document.getElementById('limitData');
const infoPagination = document.getElementById('infoPagination');
const paginationControls = document.getElementById('paginationControls');

// State Pagination Global
let currentPage = 1;
let itemsPerPage = parseInt(limitData.value);

// Event Listeners
document.addEventListener('DOMContentLoaded', loadData);
formPegawaiKeluar.addEventListener('submit', handleFormSubmit);
btnTambah.addEventListener('click', resetForm);

filterTahun.addEventListener('change', () => { currentPage = 1; loadData(); });
inputCari.addEventListener('input', () => { currentPage = 1; loadData(); });
limitData.addEventListener('change', () => {
    itemsPerPage = parseInt(limitData.value);
    currentPage = 1;
    loadData();
});

// Otomatis lookup data saat input NIK kehilangan fokus / berubah
nikInput.addEventListener('change', CariDataMasterPegawai);

/**
 * 0. AUTO POPULATE - Cek master data pegawai berdasarkan NIK
 */
async function CariDataMasterPegawai() {
    const nikValue = nikInput.value.trim();
    if (!nikValue) return;

    try {
        const { data, error } = await supabase
            .from('pegawai')
            .select('nama, kelompok_pegawai, ruangan')
            .eq('nik', nikValue)
            .maybeSingle();

        if (error) throw error;

        // Jika data ditemukan, isi form secara otomatis
        if (data) {
            if (!namaInput.value) namaInput.value = data.nama || '';
            if (!bagianInput.value) bagianInput.value = data.kelompok_pegawai || '';
            if (!unitTugasInput.value) unitTugasInput.value = data.ruangan || '';
        }
    } catch (error) {
        console.error("Gagal melakukan lookup data master:", error.message);
    }
}

/**
 * 1. READ - Ambil data dari tabel pegawai_keluar & Saring dengan Pagination
 */
async function loadData() {
    try {
        tbodyPegawaiKeluar.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Memuat data...</td></tr>`;

        let query = supabase.from('pegawai_keluar').select('*');

        // Filter rentang tahun TMT Keluar di server
        const tahunTerpilih = filterTahun.value;
        if (tahunTerpilih) {
            query = query
                .gte('tmt_keluar', `${tahunTerpilih}-01-01`)
                .lte('tmt_keluar', `${tahunTerpilih}-12-31`);
        }

        const { data, error } = await query.order('tmt_keluar', { ascending: false });
        if (error) throw error;

        // Saring kata kunci pencarian (NIK atau Nama) di sisi Client
        const kataKunci = inputCari.value.toLowerCase().trim();
        const dataTerfilter = data.filter(item => {
            const nikStr = item.nik ? String(item.nik).toLowerCase() : '';
            const namaStr = item.nama ? String(item.nama).toLowerCase() : '';
            return nikStr.includes(kataKunci) || namaStr.includes(kataKunci);
        });

        // Logika Pagination
        const totalItems = dataTerfilter.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const dataHalamanIni = dataTerfilter.slice(startIndex, endIndex);

        // Update Text Info
        if (totalItems > 0) {
            infoPagination.innerText = `Menampilkan ${startIndex + 1} sampai ${endIndex} dari ${totalItems} data`;
        } else {
            infoPagination.innerText = `Menampilkan 0 data`;
        }

        tbodyPegawaiKeluar.innerHTML = '';
        if (dataHalamanIni.length === 0) {
            tbodyPegawaiKeluar.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Data pegawai keluar kosong.</td></tr>`;
            setupPaginationControls(totalPages);
            return;
        }

        // Render baris ke tabel HTML
        dataHalamanIni.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td><b>${item.nik}</b></td>
                <td>${item.nama}</td>
                <td>${item.bagian || '-'}</td>
                <td>${item.unit_tugas || '-'}</td>
                <td><span class="badge bg-danger">${formatDate(item.tmt_keluar)}</span></td>
                <td><span class="text-secondary font-weight-bold">${item.jenis_keluar || '-'}</span></td>
                <td><small class="text-muted">${item.keterangan || '-'}</small></td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="editData('${item.id_keluar}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData('${item.id_keluar}')">Hapus</button>
                </td>
            `;
            tbodyPegawaiKeluar.appendChild(row);
        });

        setupPaginationControls(totalPages);

    } catch (error) {
        console.error(error);
        tbodyPegawaiKeluar.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

/**
 * Helper: Gambarkan tombol pagination dinamis
 */
function setupPaginationControls(totalPages) {
    paginationControls.innerHTML = '';

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link" onclick="changePage(${currentPage - 1})">Sebelumnya</button>`;
    paginationControls.appendChild(prevLi);

    const maxVisible = 3; 
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${currentPage === i ? 'active' : ''}`;
        pageLi.innerHTML = `<button class="page-link" onclick="changePage(${i})">${i}</button>`;
        paginationControls.appendChild(pageLi);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<button class="page-link" onclick="changePage(${currentPage + 1})">Selanjutnya</button>`;
    paginationControls.appendChild(nextLi);
}

function changePage(pageNumber) {
    currentPage = pageNumber;
    loadData();
}

/**
 * 2. CREATE & UPDATE - Simpan data Ke Tabel pegawai_keluar (Tanpa File Upload)
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const id_keluar = idKeluarInput.value;
    const payload = {
        nik: nikInput.value.trim(),
        nama: namaInput.value.trim(),
        bagian: bagianInput.value.trim(),
        unit_tugas: unitTugasInput.value.trim(),
        tmt_keluar: tmtInput.value,
        jenis_keluar: jenisKeluarInput.value,
        keterangan: keteranganInput.value.trim()
    };
    
    try {
        if (id_keluar === "") {
            // PROSES INSERT BARU
            const { error } = await supabase
                .from('pegawai_keluar')
                .insert([payload]);

            if (error) throw error;
            alert('Data pegawai keluar berhasil ditambahkan!');
        } else {
            // PROSES UPDATE DATA LAMA (Menggunakan Primary Key id_keluar)
            const { error } = await supabase
                .from('pegawai_keluar')
                .update(payload)
                .eq('id_keluar', id_keluar);

            if (error) throw error;
            alert('Data pegawai keluar berhasil diperbarui!');
        }

        modalPegawaiKeluar.hide();
        loadData();

    } catch (error) {
        console.error(error);
        alert(`Gagal menyimpan data: ${error.message}`);
    }
}

/**
 * 3. EDIT POPULATE - Ambil baris tunggal berdasarkan id_keluar
 */
async function editData(id_keluar) {
    resetForm();
    modalLabel.innerText = "Edit Data Pegawai Keluar";
    try {
        const { data, error } = await supabase
            .from('pegawai_keluar')
            .select('*')
            .eq('id_keluar', id_keluar)
            .single();

        if (error) throw error;

        idKeluarInput.value = data.id_keluar;
        nikInput.value = data.nik || '';
        namaInput.value = data.nama || '';
        bagianInput.value = data.bagian || '';
        unitTugasInput.value = data.unit_tugas || '';
        tmtInput.value = data.tmt_keluar || '';
        jenisKeluarInput.value = data.jenis_keluar || '';
        keteranganInput.value = data.keterangan || '';

        modalPegawaiKeluar.show();
    } catch (error) {
        console.error(error);
        alert(`Gagal memuat detail data: ${error.message}`);
    }
}

/**
 * 4. DELETE - Hapus baris data berdasarkan id_keluar
 */
async function deleteData(id_keluar) {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan pegawai keluar ini?')) return;
    try {
        const { error } = await supabase
            .from('pegawai_keluar')
            .delete()
            .eq('id_keluar', id_keluar);

        if (error) throw error;
        alert('Data berhasil dihapus!');
        loadData();
    } catch (error) {
        console.error(error);
        alert(`Gagal menghapus data: ${error.message}`);
    }
}

function resetForm() {
    formPegawaiKeluar.reset();
    idKeluarInput.value = "";
    modalLabel.innerText = "Tambah Pegawai Keluar";
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Ekspos fungsi ke objek window global agar onclick di HTML bisa mendeteksi aksinya
window.editData = editData;
window.deleteData = deleteData;
window.changePage = changePage;
