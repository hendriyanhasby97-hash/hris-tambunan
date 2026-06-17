// Sesuaikan dengan endpoint API backend Anda
const API_URL = '/api/spkrkk'; 

// Inisialisasi Element DOM
const tbodySpk = document.getElementById('tbodySpk');
const formSpk = document.getElementById('formSpk');
const modalSpkElement = document.getElementById('modalSpk');
const modalSpk = new bootstrap.Modal(modalSpkElement);
const modalSpkLabel = document.getElementById('modalSpkLabel');
const spkIdInput = document.getElementById('spkId');
const editFilePreview = document.getElementById('editFilePreview');
const btnTambah = document.getElementById('btnTambah');

// Event Listeners
document.addEventListener('DOMContentLoaded', loadData);
formSpk.addEventListener('submit', handleFormSubmit);
btnTambah.addEventListener('click', resetForm);

/**
 * 1. READ - Mengambil data dari server dan menampilkannya di tabel
 */
async function loadData() {
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (!response.ok) throw new Error(result.message || 'Gagal mengambil data');

        tbodySpk.innerHTML = '';
        
        if (result.data.length === 0) {
            tbodySpk.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Belum ada berkas tersimpan.</td></tr>`;
            return;
        }

        result.data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><b>${item.nik}</b></td>
                <td>${item.no_spk}</td>
                <td>${formatDate(item.tanggal_terbit)}</td>
                <td>${formatDate(item.tanggal_berakhir)}</td>
                <td>
                    <a href="${item.file_url}" target="_blank" class="btn btn-outline-info btn-sm">Lihat Berkas</a>
                </td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="editData('${item.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData('${item.id}')">Hapus</button>
                </td>
            `;
            tbodySpk.appendChild(row);
        });

    } catch (error) {
        console.error(error);
        tbodySpk.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

/**
 * 2. CREATE & UPDATE - Menangani submit form (Tambah/Edit)
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const id = spkIdInput.value;
    const formData = new FormData(formSpk);
    
    // Tentukan method dan URL berdasarkan kondisi ID (kosong = Create, isi = Update)
    const isEdit = id !== "";
    const url = isEdit ? `${API_URL}/${id}` : API_URL;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            body: formData // Menggunakan FormData karena menyertakan file_url (file binary)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Gagal menyimpan data');

        alert(result.message || 'Data berhasil disimpan!');
        modalSpk.hide();
        loadData(); // Refresh tabel

    } catch (error) {
        console.error(error);
        alert(`Gagal: ${error.message}`);
    }
}

/**
 * 3. EDIT POPULATE - Mengambil satu data dan memasukkannya ke form modal
 */
async function editData(id) {
    resetForm();
    modalSpkLabel.innerText = "Edit Berkas SPK RKK";
    
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.message || 'Gagal mengambil detail data');

        const data = result.data;
        
        // Isi form dengan data yang didapat
        spkIdInput.value = data.id;
        document.getElementById('nik').value = data.nik;
        document.getElementById('no_spk').value = data.no_spk;
        document.getElementById('tanggal_terbit').value = data.tanggal_terbit.split('T')[0]; // Ambil YYYY-MM-DD saja
        document.getElementById('tanggal_berakhir').value = data.tanggal_berakhir.split('T')[0];
        
        // Tampilkan info file lama jika ada
        if (data.file_url) {
            editFilePreview.style.display = 'block';
            editFilePreview.innerHTML = `File saat ini: <a href="${data.file_url}" target="_blank">Lihat Berkas</a> <br><small class="text-muted">*Biarkan kosong jika tidak ingin mengubah berkas</small>`;
        }

        modalSpk.show();

    } catch (error) {
        console.error(error);
        alert(`Gagal memuat data edit: ${error.message}`);
    }
}

/**
 * 4. DELETE - Menghapus data berdasarkan ID
 */
async function deleteData(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus berkas SPK RKK ini?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Gagal menghapus data');

        alert(result.message || 'Data berhasil dihapus!');
        loadData(); // Refresh tabel

    } catch (error) {
        console.error(error);
        alert(`Gagal menghapus: ${error.message}`);
    }
}

/**
 * Helper: Reset Form ke kondisi awal
 */
function resetForm() {
    formSpk.reset();
    spkIdInput.value = "";
    modalSpkLabel.innerText = "Tambah Berkas SPK RKK";
    editFilePreview.style.display = 'none';
    editFilePreview.innerHTML = '';
}

/**
 * Helper: Format Tanggal ke format lokal Indonesia (DD/MM/YYYY)
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}
