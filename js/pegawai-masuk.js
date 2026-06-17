// Import objek supabase langsung dari koneksi.js
import { supabase } from '../app/koneksi.js';

// Inisialisasi Element DOM
const tbodyPegawaiMasuk = document.getElementById('tbodyPegawaiMasuk');
const formPegawaiMasuk = document.getElementById('formPegawaiMasuk');
const modalElement = document.getElementById('modalPegawaiMasuk');
const modalPegawaiMasuk = new bootstrap.Modal(modalElement);
const modalLabel = document.getElementById('modalPegawaiMasukLabel');
const idMasukInput = document.getElementById('idMasuk');
const btnTambah = document.getElementById('btnTambah');

const nikInput = document.getElementById('nik');
const namaInput = document.getElementById('nama');
const jkInput = document.getElementById('jenis_kelamin');
const agamaInput = document.getElementById('agama');
const bagianInput = document.getElementById('bagian');
const tmtInput = document.getElementById('tmt_masuk');
const pendidikanInput = document.getElementById('pendidikan');

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
formPegawaiMasuk.addEventListener('submit', handleFormSubmit);
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
 * 0. AUTO POPULATE - Cek master data pegawai berdasarkan NIK (Opsional bantu isi jika ada)
 */
async function CariDataMasterPegawai() {
    const nikValue = nikInput.value.trim();
    if (!nikValue) return;

    try {
        // Query cek ke tabel master 'pegawai'
        const { data, error } = await supabase
            .from('pegawai')
            .select('nama, jenis_kelamin, agama, jenjang, jurusan')
            .eq('nik', nikValue)
            .maybeSingle();

        if (error) throw error;

        // Jika data pegawai master ditemukan, bantu isikan field form agar cepat
        if (data) {
            if (!namaInput.value) namaInput.value = data.nama || '';
            if (!jkInput.value) jkInput.value = data.jenis_kelamin || '';
            if (!agamaInput.value) agamaInput.value = data.agama || '';
            
            if (!pendidikanInput.value && data.jenjang) {
                pendidikanInput.value = `${data.jenjang} ${data.jurusan || ''}`.trim();
            }
        }
    } catch (error) {
        console.error("Gagal melakukan lookup data master:", error.message);
    }
}

/**
 * 1. READ - Ambil data dari tabel pegawai_masuk & Saring dengan Pagination
 */
async function loadData() {
    try {
        tbodyPegawaiMasuk.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Memuat data...</td></tr>`;

        let query = supabase.from('pegawai_masuk').select('*');

        // Filter rentang tahun TMT Masuk di server
        const tahunTerpilih = filterTahun.value;
        if (tahunTerpilih) {
            query = query
                .gte('tmt_masuk', `${tahunTerpilih}-01-01`)
                .lte('tmt_masuk', `${tahunTerpilih}-12-31`);
        }

        const { data, error } = await query.order('tmt_masuk', { ascending: false });
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

        tbodyPegawaiMasuk.innerHTML = '';
        if (dataHalamanIni.length === 0) {
            tbodyPegawaiMasuk.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Data pegawai masuk kosong.</td></tr>`;
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
                <td>${item.jenis_kelamin || '-'}</td>
                <td>${item.agama || '-'}</td>
                <td>${item.bagian || '-'}</td>
                <td><span class="badge bg-info text-dark">${formatDate(item.tmt_masuk)}</span></td>
                <td><small>${item.pendidikan || '-'}</small></td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="editData('${item.id_masuk}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData('${item.id_masuk}')">Hapus</button>
                </td>
            `;
            tbodyPegawaiMasuk.appendChild(row);
        });

        setupPaginationControls(totalPages);

    } catch (error) {
        console.error(error);
        tbodyPegawaiMasuk.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error: ${error.message}</td></tr>`;
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
 * 2. CREATE & UPDATE - Simpan data Ke Tabel pegawai_masuk (Tanpa File Upload)
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const id_masuk = idMasukInput.value;
    const payload = {
        nik: nikInput.value.trim(),
        nama: namaInput.value.trim(),
        jenis_kelamin: jkInput.value,
        agama: agamaInput.value.trim(),
        bagian: bagianInput.value.trim(),
        tmt_masuk: tmtInput.value,
        pendidikan: pendidikanInput.value.trim()
    };
    
    try {
        if (id_masuk === "") {
            // PROSES INSERT BARU
            const { error } = await supabase
                .from('pegawai_masuk')
                .insert([payload]);

            if (error) throw error;
            alert('Data pegawai masuk berhasil ditambahkan!');
        } else {
            // PROSES UPDATE DATA LAMA (Menggunakan Primary Key id_masuk)
            const { error } = await supabase
                .from('pegawai_masuk')
                .update(payload)
                .eq('id_masuk', id_masuk);

            if (error) throw error;
            alert('Data pegawai masuk berhasil diperbarui!');
        }

        modalPegawaiMasuk.hide();
        loadData();

    } catch (error) {
        console.error(error);
        alert(`Gagal menyimpan data: ${error.message}`);
    }
}

/**
 * 3. EDIT POPULATE - Ambil baris tunggal berdasarkan id_masuk
 */
async function editData(id_masuk) {
    resetForm();
    modalLabel.innerText = "Edit Data Pegawai Masuk";
    try {
        const { data, error } = await supabase
            .from('pegawai_masuk')
            .select('*')
            .eq('id_masuk', id_masuk)
            .single();

        if (error) throw error;

        idMasukInput.value = data.id_masuk;
        nikInput.value = data.nik || '';
        namaInput.value = data.nama || '';
        jkInput.value = data.jenis_kelamin || '';
        agamaInput.value = data.agama || '';
        bagianInput.value = data.bagian || '';
        tmtInput.value = data.tmt_masuk || '';
        pendidikanInput.value = data.pendidikan || '';

        modalPegawaiMasuk.show();
    } catch (error) {
        console.error(error);
        alert(`Gagal memuat detail data: ${error.message}`);
    }
}

/**
 * 4. DELETE - Hapus baris data berdasarkan id_masuk
 */
async function deleteData(id_masuk) {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan pegawai masuk ini?')) return;
    try {
        const { error } = await supabase
            .from('pegawai_masuk')
            .delete()
            .eq('id_masuk', id_masuk);

        if (error) throw error;
        alert('Data berhasil dihapus!');
        loadData();
    } catch (error) {
        console.error(error);
        alert(`Gagal menghapus data: ${error.message}`);
    }
}

function resetForm() {
    formPegawaiMasuk.reset();
    idMasukInput.value = "";
    modalLabel.innerText = "Tambah Pegawai Masuk";
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
