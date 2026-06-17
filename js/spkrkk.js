// Import objek supabase langsung dari koneksi.js (Keluar folder js/ lalu masuk ke app/)
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

// Event Listeners
document.addEventListener('DOMContentLoaded', loadData);
formSpk.addEventListener('submit', handleFormSubmit);
btnTambah.addEventListener('click', resetForm);

// Listener untuk memicu pencarian & filter tahun
filterTahun.addEventListener('change', loadData);
inputCari.addEventListener('input', loadData); // Mengetik langsung menyaring data secara instan

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
 * 1. READ - Ambil data dari Supabase & Saring Instan di Sisi Client
 */
async function loadData() {
    try {
        // Ambil struktur query awal ke Supabase
        let query = supabase
            .from('berkas_spkrkk')
            .select('*');

        // Saring berdasarkan tahun di server (jika tahun dipilih)
        const tahunTerpilih = filterTahun.value;
        if (tahunTerpilih) {
            query = query
                .gte('tanggal_terbit', `${tahunTerpilih}-01-01`)
                .lte('tanggal_terbit', `${tahunTerpilih}-12-31`);
        }

        // Eksekusi data dari database
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // --- LOGIKA PENCARIAN DI SISI CLIENT (JAVASCRIPT) ---
        const kataKunci = inputCari.value.toLowerCase().trim();
        
        // Proses memfilter array data secara aman tanpa peduli tipe data kolom di database
        const dataTerfilter = data.filter(item => {
            const nikStr = item.nik ? String(item.nik).toLowerCase() : '';
            const namaStr = item.nama ? String(item.nama).toLowerCase() : '';
            
            // Return true jika nik atau nama mengandung kata kunci yang diketik
            return nikStr.includes(kataKunci) || namaStr.includes(kataKunci);
        });

        // Render data ke dalam tabel HTML
        tbodySpk.innerHTML = '';
        
        if (dataTerfilter.length === 0) {
            tbodySpk.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Data tidak ditemukan.</td></tr>`;
            return;
        }

        dataTerfilter.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
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

    } catch (error) {
        console.error(error);
        tbodySpk.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
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
            // PROSES INSERT
            const { error: insertError } = await supabase
                .from('berkas_spkrkk')
                .insert([{ 
                    nik, 
                    nama,
                    no_spk, 
                    tanggal_terbit, 
                    tanggal_berakhir, 
                    file_url: fileUrl 
                }]);

            if (insertError) throw insertError;
            alert('Data berkas berhasil ditambahkan!');

        } else {
            // PROSES UPDATE
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
 * 3. EDIT POPULATE - Ambil data untuk dimasukkan ke modal
 */
async function editData(id) {
    resetForm();
    modalSpkLabel.innerText = "Edit Berkas SPK RKK";
    
    try {
        const { data, error } = await supabase
            .from('berkas_spkrkk')
            .select('*')
            .eq('id', id)
            .single();

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
 * 4. DELETE - Hapus baris tabel & berkas di storage
 */
async function deleteData(id, fileUrl) {
    if (!confirm('Apakah Anda yakin ingin menghapus berkas ini?')) return;

    try {
        const { error: deleteError } = await supabase
            .from('berkas_spkrkk')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        if (fileUrl) {
            const fileName = fileUrl.split('/').pop();
            await supabase.storage
                .from('lampiran_spkrkk')
                .remove([fileName]);
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

// Daftarkan fungsi ke objek window secara global agar onclick="..." di HTML bisa membaca fungsi ini
window.editData = editData;
window.deleteData = deleteData;
