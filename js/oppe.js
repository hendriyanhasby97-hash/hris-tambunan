// Import objek supabase langsung dari koneksi.js
import { supabase } from '../app/koneksi.js';

// Inisialisasi Element DOM
const tbodyOppe = document.getElementById('tbodyOppe');
const formOppe = document.getElementById('formOppe');
const modalOppeElement = document.getElementById('modalOppe');
const modalOppe = new bootstrap.Modal(modalOppeElement);
const modalOppeLabel = document.getElementById('modalOppeLabel');
const oppeIdInput = document.getElementById('oppeId');
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
formOppe.addEventListener('submit', handleFormSubmit);
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
 * 1. READ - Ambil data berkas_oppe & Saring Instan dengan Pagination
 */
async function loadData() {
    try {
        tbodyOppe.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Memuat data...</td></tr>`;

        let query = supabase.from('berkas_oppe').select('*');

        // Filter berdasarkan kolom 'tahun' di server (jika tahun dipilih)
        const tahunTerpilih = filterTahun.value;
        if (tahunTerpilih) {
            query = query.eq('tahun', parseInt(tahunTerpilih));
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        // Proses Saring Kata Kunci Pencarian (NIK atau Nama) di sisi Client
        const kataKunci = inputCari.value.toLowerCase().trim();
        const dataTerfilter = data.filter(item => {
            const nikStr = item.nik ? String(item.nik).toLowerCase() : '';
            const namaStr = item.nama ? String(item.nama).toLowerCase() : '';
            return nikStr.includes(kataKunci) || namaStr.includes(kataKunci);
        });

        // Logika Utama Pagination
        const totalItems = dataTerfilter.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        
        const dataHalamanIni = dataTerfilter.slice(startIndex, endIndex);

        // Update teks info baris data
        if (totalItems > 0) {
            infoPagination.innerText = `Menampilkan ${startIndex + 1} sampai ${endIndex} dari ${totalItems} data`;
        } else {
            infoPagination.innerText = `Menampilkan 0 data`;
        }

        // Render Baris Tabel
        tbodyOppe.innerHTML = '';
        if (dataHalamanIni.length === 0) {
            tbodyOppe.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Data tidak ditemukan.</td></tr>`;
            setupPaginationControls(totalPages);
            return;
        }

        dataHalamanIni.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td><b>${item.nik}</b></td>
                <td>${item.nama || '-'}</td>
                <td><span class="badge bg-secondary">${item.tahun}</span></td>
                <td>${item.nilai_abc || '-'}</td>
                <td><b>${item.nilai_ratarata}</b></td>
                <td>${item.kesimpulan || '-'}</td>
                <td>
                    ${item.file_url ? `<a href="${item.file_url}" target="_blank" class="btn btn-outline-info btn-sm">Lihat Berkas</a>` : '-'}
                </td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="editData('${item.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData('${item.id}', '${item.file_url}')">Hapus</button>
                </td>
            `;
            tbodyOppe.appendChild(row);
        });

        setupPaginationControls(totalPages);

    } catch (error) {
        console.error(error);
        tbodyOppe.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

/**
 * Helper Logika Navigasi Ringkas (Membatasi jumlah tombol angka)
 */
function setupPaginationControls(totalPages) {
    paginationControls.innerHTML = '';

    // Tombol SEBELUMNYA
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link" onclick="changePage(${currentPage - 1})">Sebelumnya</button>`;
    paginationControls.appendChild(prevLi);

    // Tombol Angka Dinamis (Maksimal 3 tombol aktif terdekat)
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

    // Tombol SELANJUTNYA
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
 * 2. CREATE & UPDATE - Simpan data & Upload File ke Storage lampiran_oppe
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const id = oppeIdInput.value;
    const nik = nikInput.value;
    const nama = namaInput.value;
    const tahun = parseInt(document.getElementById('tahun').value);
    const nilai_abc = document.getElementById('nilai_abc').value;
    const nilai_ratarata = parseFloat(document.getElementById('nilai_ratarata').value);
    const kesimpulan = document.getElementById('kesimpulan').value;
    const fileInput = document.getElementById('file_url');
    
    try {
        let fileUrl = null;

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${Date.now()}_${file.name}`; 

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('lampiran_oppe')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('lampiran_oppe')
                .getPublicUrl(fileName);

            fileUrl = urlData.publicUrl;
        }

        if (id === "") {
            // PROSES INSERT
            const { error: insertError } = await supabase
                .from('berkas_oppe')
                .insert([{ nik, nama, tahun, nilai_abc, nilai_ratarata, kesimpulan, file_url: fileUrl }]);

            if (insertError) throw insertError;
            alert('Data berkas OPPE berhasil ditambahkan!');
        } else {
            // PROSES UPDATE
            const updateData = { nik, nama, tahun, nilai_abc, nilai_ratarata, kesimpulan };
            if (fileUrl) updateData.file_url = fileUrl;

            const { error: updateError } = await supabase
                .from('berkas_oppe')
                .update(updateData)
                .eq('id', id);

            if (updateError) throw updateError;
            alert('Data berkas OPPE berhasil diperbarui!');
        }

        modalOppe.hide();
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
    modalOppeLabel.innerText = "Edit Berkas OPPE";
    try {
        const { data, error } = await supabase.from('berkas_oppe').select('*').eq('id', id).single();
        if (error) throw error;

        oppeIdInput.value = data.id;
        nikInput.value = data.nik;
        namaInput.value = data.nama || '';
        document.getElementById('tahun').value = data.tahun;
        document.getElementById('nilai_abc').value = data.nilai_abc;
        document.getElementById('nilai_ratarata').value = data.nilai_ratarata;
        document.getElementById('kesimpulan').value = data.kesimpulan;
        
        if (data.file_url) {
            editFilePreview.style.display = 'block';
            editFilePreview.innerHTML = `File saat ini: <a href="${data.file_url}" target="_blank">Lihat Berkas OPPE</a>`;
        }
        modalOppe.show();
    } catch (error) {
        console.error(error);
        alert(`Gagal memuat data: ${error.message}`);
    }
}

/**
 * 4. DELETE
 */
async function deleteData(id, fileUrl) {
    if (!confirm('Apakah Anda yakin ingin menghapus berkas OPPE ini?')) return;
    try {
        const { error: deleteError } = await supabase.from('berkas_oppe').delete().eq('id', id);
        if (deleteError) throw deleteError;

        if (fileUrl) {
            const fileName = fileUrl.split('/').pop();
            await supabase.storage.from('lampiran_oppe').remove([fileName]);
        }
        alert('Data berhasil dihapus!');
        loadData();
    } catch (error) {
        console.error(error);
        alert(`Gagal menghapus data: ${error.message}`);
    }
}

function resetForm() {
    formOppe.reset();
    oppeIdInput.value = "";
    modalOppeLabel.innerText = "Tambah Berkas OPPE";
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
