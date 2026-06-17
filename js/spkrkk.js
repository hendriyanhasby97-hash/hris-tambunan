// Import objek supabase langsung dari koneksi.js
import { supabase } from '../app/koneksi.js';

// Inisialisasi Element DOM
const tbodySpk = document.getElementById('tbodySpk');
const formSpk = document.getElementById('formSpk');
const modalSpkElement = document.getElementById('modalSpk');
const modalSpk = new bootstrap.Modal(modalSpkElement);
const modalSpkLabel = document.getElementById('modalSpkLabel');
const spkIdInput = document.getElementById('spkId');
const editFilePreview = document.getElementById('editFilePreview');
const btnTambah = document.getElementById('btnTambah');

const nikInput = document.getElementById('nik');
const namaInput = document.getElementById('nama');
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
formSpk.addEventListener('submit', handleFormSubmit);
btnTambah.addEventListener('click', resetForm);

// Perubahan filter & pencarian mereset halaman kembali ke 1
filterTahun.addEventListener('change', () => { currentPage = 1; loadData(); });
inputCari.addEventListener('input', () => { currentPage = 1; loadData(); });

// Perubahan pilihan batas data per halaman
limitData.addEventListener('change', () => {
    itemsPerPage = parseInt(limitData.value);
    currentPage = 1;
    loadData();
});

// Listener saat user selesai mengisi NIK
nikInput.addEventListener('change', CariNamaPegawai);

/**
 * 0. AUTO POPULATE - Cari nama berdasarkan NIK di tabel pegawai
 */
async function CariNamaPegawai() {
    const nikValue = nikInput.value.trim();
    if (!nikValue) {
        namaInput.value = '';
        return;
    }

    try {
        namaInput.value = 'Mencari data...';
        const { data, error } = await supabase
            .from('pegawai')
            .select('nama')
            .eq('nik', nikValue)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            namaInput.value = data.nama;
        } else {
            namaInput.value = '';
            alert(`NIK "${nikValue}" tidak ditemukan di database pegawai!`);
            nikInput.value = '';
            nikInput.focus();
        }
    } catch (error) {
        console.error(error);
        namaInput.value = '';
        alert(`Gagal memuat nama pegawai: ${error.message}`);
    }
}

/**
 * 1. READ - Ambil data & Saring Instan dengan Pagination Rapi
 */
async function loadData() {
    try {
        tbodySpk.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Memuat data...</td></tr>`;

        let query = supabase.from('berkas_spkrkk').select('*');

        const tahunTerpilih = filterTahun.value;
        if (tahunTerpilih) {
            query = query
                .gte('tanggal_terbit', `${tahunTerpilih}-01-01`)
                .lte('tanggal_terbit', `${tahunTerpilih}-12-31`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        // Proses Saring Kata Kunci (Pencarian)
        const kataKunci = inputCari.value.toLowerCase().trim();
        const dataTerfilter = data.filter(item => {
            const nikStr = item.nik ? String(item.nik).toLowerCase() : '';
            const namaStr = item.nama ? String(item.nama).toLowerCase() : '';
            return nikStr.includes(kataKunci) || namaStr.includes(kataKunci);
        });

        // --- LOGIKA UTAMA PAGINATION ---
        const totalItems = dataTerfilter.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        
        // Memotong array data khusus untuk halaman aktif saat ini
        const dataHalamanIni = dataTerfilter.slice(startIndex, endIndex);

        // Update teks info baris data
        if (totalItems > 0) {
            infoPagination.innerText = `Menampilkan ${startIndex + 1} sampai ${endIndex} dari ${totalItems} data`;
        } else {
            infoPagination.innerText = `Menampilkan 0 data`;
        }

        // Render Baris Tabel
        tbodySpk.innerHTML = '';
        if (dataHalamanIni.length === 0) {
            tbodySpk.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Data tidak ditemukan.</td></tr>`;
            setupPaginationControls(totalPages);
            return;
        }

        dataHalamanIni.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td><b>${item.nik}</b></td>
                <td>${item.nama || '-'}</td>
                <td>${item.no_spk}</td>
                <td>${formatDate(item.tanggal_terbit)}</td>
                <td>${formatDate(item.tanggal_berakhir)}</td>
                <td>
                    ${item.file_url ? `<a href="${item.file_url}" target="_blank" class="btn btn-outline-info btn-sm">Lihat Berkas</a>` : '-'}
                </td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="editData('${item.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData('${item.id}', '${item.file_url}')">Hapus</button>
                </td>
            `;
            tbodySpk.appendChild(row);
        });

        // Buat kontrol tombol pagination
        setupPaginationControls(totalPages);

    } catch (error) {
        console.error(error);
        tbodySpk.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

/**
 * Helper Logika Navigasi Ringkas (Membatasi jumlah tombol angka agar jgn terlalu panjang)
 */
function setupPaginationControls(totalPages) {
    paginationControls.innerHTML = '';

    // 1. Tombol SEBELUMNYA
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link" onclick="changePage(${currentPage - 1})">Sebelumnya</button>`;
    paginationControls.appendChild(prevLi);

    // 2. Tombol Angka Dinamis (Dibatasi maksimal hanya memunculkan 3 tombol aktif terdekat)
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

    // 3. Tombol SELANJUTNYA
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<button class="page-link" onclick="changePage(${currentPage + 1})">Selanjutnya</button>`;
    paginationControls.appendChild(nextLi);
}

/**
 * Helper untuk berganti halaman data
 */
function changePage(pageNumber) {
    currentPage = pageNumber;
    loadData();
}

/**
 * 2. CREATE & UPDATE - Simpan data & Upload File ke Storage
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const id = spkIdInput.value;
    const nik = nikInput.value;
    const nama = namaInput.value;
    const no_spk = document.getElementById('no_spk').value;
    const tanggal_terbit = document.getElementById('tanggal_terbit').value;
    const tanggal_berakhir = document.getElementById('tanggal_berakhir').value;
    const fileInput = document.getElementById('file_url');
    
    try {
        let fileUrl = null;

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${Date.now()}_${file.name}`; 

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('lampiran_spkrkk')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('lampiran_spkrkk')
                .getPublicUrl(fileName);

            fileUrl = urlData.publicUrl;
        }

        if (id === "") {
            const { error: insertError } = await supabase
                .from('berkas_spkrkk')
                .insert([{ nik, nama, no_spk, tanggal_terbit, tanggal_berakhir, file_url: fileUrl }]);

            if (insertError) throw insertError;
            alert('Data berkas berhasil ditambahkan!');
        } else {
            const updateData = { nik, nama, no_spk, tanggal_terbit, tanggal_berakhir };
            if (fileUrl) updateData.file_url = fileUrl;

            const { error: updateError } = await supabase
                .from('berkas_spkrkk')
                .update(updateData)
                .eq('id', id);

            if (updateError) throw updateError;
            alert('Data berkas berhasil diperbarui!');
        }

        modalSpk.hide();
        loadData();

    } catch (error) {
        console.error(error);
        alert(`Gagal menyimpan data: ${error.message}`);
    }
}

/**
 * 3. EDIT POPULATE
 */
async function editData(id) {
    resetForm();
    modalSpkLabel.innerText = "Edit Berkas SPK RKK";
    try {
        const { data, error } = await supabase.from('berkas_spkrkk').select('*').eq('id', id).single();
        if (error) throw error;

        spkIdInput.value = data.id;
        nikInput.value = data.nik;
        namaInput.value = data.nama || '';
        document.getElementById('no_spk').value = data.no_spk;
        document.getElementById('tanggal_terbit').value = data.tanggal_terbit;
        document.getElementById('tanggal_berakhir').value = data.tanggal_berakhir;
        
        if (data.file_url) {
            editFilePreview.style.display = 'block';
            editFilePreview.innerHTML = `File saat ini: <a href="${data.file_url}" target="_blank">Lihat Berkas</a>`;
        }
        modalSpk.show();
    } catch (error) {
        console.error(error);
        alert(`Gagal memuat data: ${error.message}`);
    }
}

/**
 * 4. DELETE
 */
async function deleteData(id, fileUrl) {
    if (!confirm('Apakah Anda yakin ingin menghapus berkas ini?')) return;
    try {
        const { error: deleteError } = await supabase.from('berkas_spkrkk').delete().eq('id', id);
        if (deleteError) throw deleteError;

        if (fileUrl) {
            const fileName = fileUrl.split('/').pop();
            await supabase.storage.from('lampiran_spkrkk').remove([fileName]);
        }
        alert('Data berhasil dihapus!');
        loadData();
    } catch (error) {
        console.error(error);
        alert(`Gagal menghapus data: ${error.message}`);
    }
}

function resetForm() {
    formSpk.reset();
    spkIdInput.value = "";
    modalSpkLabel.innerText = "Tambah Berkas SPK RKK";
    editFilePreview.style.display = 'none';
    editFilePreview.innerHTML = '';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Daftarkan fungsi ke objek window global agar bisa dipanggil element HTML onclick
window.editData = editData;
window.deleteData = deleteData;
window.changePage = changePage;
