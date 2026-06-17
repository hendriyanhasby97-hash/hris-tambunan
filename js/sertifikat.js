import { supabase } from '../app/koneksi.js';

const tbodySertifikat = document.getElementById('tbodySertifikat');
const formSertifikat = document.getElementById('formSertifikat');
const modalSertifikat = new bootstrap.Modal(document.getElementById('modalSertifikat'));
const modalSertifikatLabel = document.getElementById('modalSertifikatLabel');
const sertifikatIdInput = document.getElementById('sertifikatId');
const editFilePreview = document.getElementById('editFilePreview');
const btnTambah = document.getElementById('btnTambah');
const nikInput = document.getElementById('nik');
const namaInput = document.getElementById('nama');
const filterTahun = document.getElementById('filterTahun');
const inputCari = document.getElementById('inputCari'); 
const limitData = document.getElementById('limitData');
const infoPagination = document.getElementById('infoPagination');
const paginationControls = document.getElementById('paginationControls');

let currentPage = 1, itemsPerPage = parseInt(limitData.value);

document.addEventListener('DOMContentLoaded', loadData);
formSertifikat.addEventListener('submit', handleFormSubmit);
btnTambah.addEventListener('click', resetForm);
filterTahun.addEventListener('change', () => { currentPage = 1; loadData(); });
inputCari.addEventListener('input', () => { currentPage = 1; loadData(); });
limitData.addEventListener('change', () => { itemsPerPage = parseInt(limitData.value); currentPage = 1; loadData(); });
nikInput.addEventListener('change', CariNamaPegawai);

async function CariNamaPegawai() {
    const nikValue = nikInput.value.trim();
    if (!nikValue) { namaInput.value = ''; return; }
    try {
        namaInput.value = 'Mencari data...';
        const { data } = await supabase.from('pegawai').select('nama').eq('nik', nikValue).maybeSingle();
        if (data) { namaInput.value = data.nama; } 
        else { namaInput.value = ''; alert(`NIK "${nikValue}" tidak ditemukan!`); nikInput.value = ''; }
    } catch (e) { console.error(e); }
}

async function loadData() {
    try {
        tbodySertifikat.innerHTML = `<tr><td colspan="11" class="text-center text-muted">Memuat data...</td></tr>`;
        let query = supabase.from('sertifikat_pegawai').select('*');
        if (filterTahun.value) {
            query = query.gte('tanggal_pelaksanaan', `${filterTahun.value}-01-01`).lte('tanggal_pelaksanaan', `${filterTahun.value}-12-31`);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        const kataKunci = inputCari.value.toLowerCase().trim();
        const dataTerfilter = data.filter(item => {
            return (item.nik && String(item.nik).toLowerCase().includes(kataKunci)) || (item.nama && String(item.nama).toLowerCase().includes(kataKunci));
        });

        const totalItems = dataTerfilter.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
        const dataHalamanIni = dataTerfilter.slice(startIndex, endIndex);

        infoPagination.innerText = totalItems > 0 ? `Menampilkan ${startIndex + 1} sampai ${endIndex} dari ${totalItems} data` : `Menampilkan 0 data`;
        tbodySertifikat.innerHTML = '';

        if (dataHalamanIni.length === 0) {
            tbodySertifikat.innerHTML = `<tr><td colspan="11" class="text-center text-muted">Data kosong.</td></tr>`;
            setupPaginationControls(totalPages);
            return;
        }

        dataHalamanIni.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td><b>${item.nik}</b></td>
                <td>${item.nama || '-'}</td>
                <td>${item.no_sertifikat || '-'}</td>
                <td>${item.jenis_sertifikat || '-'}</td>
                <td>${item.judul_kegiatan || '-'}</td>
                <td>${formatDate(item.tanggal_pelaksanaan)}</td>
                <td><span class="badge bg-secondary">${item.jpl || '0'} JPL</span></td>
                <td><span class="badge bg-success">${item.skp || '0'} SKP</span></td>
                <td>${item.file_sertifikat ? `<a href="${item.file_sertifikat}" target="_blank" class="btn btn-outline-info btn-sm">Lihat</a>` : '-'}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editData('${item.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData('${item.id}', '${item.file_sertifikat}')">Hapus</button>
                </td>
            `;
            tbodySertifikat.appendChild(row);
        });
        setupPaginationControls(totalPages);
    } catch (error) { console.error(error); }
}

function setupPaginationControls(totalPages) {
    paginationControls.innerHTML = '';
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link" onclick="changePage(${currentPage - 1})">Sebelumnya</button>`;
    paginationControls.appendChild(prevLi);

    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
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

function changePage(p) { currentPage = p; loadData(); }

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = sertifikatIdInput.value;
    const fileInput = document.getElementById('file_sertifikat');
    try {
        let fileUrl = null;
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('lampiran').upload(fileName, file);
            if (uploadError) throw uploadError;
            fileUrl = supabase.storage.from('lampiran').getPublicUrl(fileName).data.publicUrl;
        }

        const payload = {
            nik: nikInput.value.trim(),
            nama: namaInput.value,
            no_sertifikat: document.getElementById('no_sertifikat').value.trim(),
            jenis_sertifikat: document.getElementById('jenis_sertifikat').value.trim(),
            judul_kegiatan: document.getElementById('judul_kegiatan').value.trim(),
            tanggal_pelaksanaan: document.getElementById('tanggal_pelaksanaan').value,
            mulai: document.getElementById('mulai').value,
            selesai: document.getElementById('selesai').value,
            jpl: parseInt(document.getElementById('jpl').value) || 0,
            skp: parseFloat(document.getElementById('skp').value) || 0
        };
        if (fileUrl) payload.file_sertifikat = fileUrl;

        if (id === "") {
            const { error } = await supabase.from('sertifikat_pegawai').insert([payload]);
            if (error) throw error;
            alert('Sertifikat berhasil ditambahkan!');
        } else {
            const { error } = await supabase.from('sertifikat_pegawai').update(payload).eq('id', id);
            if (error) throw error;
            alert('Sertifikat berhasil diperbarui!');
        }
        modalSertifikat.hide(); loadData();
    } catch (error) { alert(error.message); }
}

async function editData(id) {
    resetForm(); modalSertifikatLabel.innerText = "Edit Sertifikat";
    try {
        const { data, error } = await supabase.from('sertifikat_pegawai').select('*').eq('id', id).single();
        if (error) throw error;
        sertifikatIdInput.value = data.id;
        nikInput.value = data.nik;
        namaInput.value = data.nama || '';
        document.getElementById('no_sertifikat').value = data.no_sertifikat || '';
        document.getElementById('jenis_sertifikat').value = data.jenis_sertifikat || '';
        document.getElementById('judul_kegiatan').value = data.judul_kegiatan || '';
        document.getElementById('tanggal_pelaksanaan').value = data.tanggal_pelaksanaan;
        document.getElementById('mulai').value = data.mulai;
        document.getElementById('selesai').value = data.selesai;
        document.getElementById('jpl').value = data.jpl;
        document.getElementById('skp').value = data.skp;
        if (data.file_sertifikat) {
            editFilePreview.style.display = 'block';
            editFilePreview.innerHTML = `<a href="${data.file_sertifikat}" target="_blank">Lihat Sertifikat Lama</a>`;
        }
        modalSertifikat.show();
    } catch (e) { alert(e.message); }
}

async function deleteData(id, fileUrl) {
    if (!confirm('Hapus sertifikat ini?')) return;
    try {
        const { error } = await supabase.from('sertifikat_pegawai').delete().eq('id', id);
        if (error) throw error;
        if (fileUrl) {
            const fileName = fileUrl.split('/').pop();
            await supabase.storage.from('lampiran').remove([fileName]);
        }
        alert('Data berhasil dihapus!'); loadData();
    } catch (e) { alert(e.message); }
}

function resetForm() { formSertifikat.reset(); sertifikatIdInput.value = ""; editFilePreview.style.display = 'none'; modalSertifikatLabel.innerText = "Tambah Sertifikat"; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('id-ID', {year:'numeric', month:'2-digit', day:'2-digit'}) : '-'; }

window.editData = editData; window.deleteData = deleteData; window.changePage = changePage;
