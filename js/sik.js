import { supabase } from '../app/koneksi.js';

const tbodySik = document.getElementById('tbodySik');
const formSik = document.getElementById('formSik');
const modalSik = new bootstrap.Modal(document.getElementById('modalSik'));
const modalSikLabel = document.getElementById('modalSikLabel');
const sikIdInput = document.getElementById('sikId');
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
formSik.addEventListener('submit', handleFormSubmit);
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
        tbodySik.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Memuat data...</td></tr>`;
        let query = supabase.from('berkas_sik').select('*');
        if (filterTahun.value) {
            query = query.gte('tgl_terbit', `${filterTahun.value}-01-01`).lte('tgl_terbit', `${filterTahun.value}-12-31`);
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
        tbodySik.innerHTML = '';

        if (dataHalamanIni.length === 0) {
            tbodySik.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Data kosong.</td></tr>`;
            setupPaginationControls(totalPages);
            return;
        }

        dataHalamanIni.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td><b>${item.nik}</b></td>
                <td>${item.nama || '-'}</td>
                <td>${item.bidang || '-'}</td>
                <td>${item.no_sip || '-'}</td>
                <td>${formatDate(item.tgl_terbit)}</td>
                <td>${formatDate(item.tgl_berakhir)}</td>
                <td>${item.lampiran_url ? `<a href="${item.lampiran_url}" target="_blank" class="btn btn-outline-info btn-sm">Lihat</a>` : '-'}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editData('${item.id_sik}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData('${item.id_sik}', '${item.lampiran_url}')">Hapus</button>
                </td>
            `;
            tbodySik.appendChild(row);
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
    const id = sikIdInput.value;
    const fileInput = document.getElementById('file_url');
    try {
        let fileUrl = null;
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('lampiran_sik').upload(fileName, file);
            if (uploadError) throw uploadError;
            fileUrl = supabase.storage.from('lampiran_sik').getPublicUrl(fileName).data.publicUrl;
        }

        const payload = {
            nik: nikInput.value.trim(),
            nama: namaInput.value,
            bidang: document.getElementById('bidang').value.trim(),
            no_sip: document.getElementById('no_sip').value.trim(),
            tgl_terbit: document.getElementById('tgl_terbit').value,
            tgl_berakhir: document.getElementById('tgl_berakhir').value
        };
        if (fileUrl) payload.lampiran_url = fileUrl;

        if (id === "") {
            const { error } = await supabase.from('berkas_sik').insert([payload]);
            if (error) throw error;
            alert('Data SIK berhasil ditambahkan!');
        } else {
            const { error } = await supabase.from('berkas_sik').update(payload).eq('id_sik', id);
            if (error) throw error;
            alert('Data SIK berhasil diperbarui!');
        }
        modalSik.hide(); loadData();
    } catch (error) { alert(error.message); }
}

async function editData(id) {
    resetForm(); modalSikLabel.innerText = "Edit Berkas SIK";
    try {
        const { data, error } = await supabase.from('berkas_sik').select('*').eq('id_sik', id).single();
        if (error) throw error;
        sikIdInput.value = data.id_sik;
        nikInput.value = data.nik;
        namaInput.value = data.nama || '';
        document.getElementById('bidang').value = data.bidang || '';
        document.getElementById('no_sip').value = data.no_sip || '';
        document.getElementById('tgl_terbit').value = data.tgl_terbit;
        document.getElementById('tgl_berakhir').value = data.tgl_berakhir;
        if (data.lampiran_url) {
            editFilePreview.style.display = 'block';
            editFilePreview.innerHTML = `<a href="${data.lampiran_url}" target="_blank">Lihat Berkas Lama</a>`;
        }
        modalSik.show();
    } catch (e) { alert(e.message); }
}

async function deleteData(id, fileUrl) {
    if (!confirm('Hapus data SIK ini?')) return;
    try {
        const { error } = await supabase.from('berkas_sik').delete().eq('id_sik', id);
        if (error) throw error;
        if (fileUrl) {
            const fileName = fileUrl.split('/').pop();
            await supabase.storage.from('lampiran_sik').remove([fileName]);
        }
        alert('Data berhasil dihapus!'); loadData();
    } catch (e) { alert(e.message); }
}

function resetForm() { formSik.reset(); sikIdInput.value = ""; editFilePreview.style.display = 'none'; modalSikLabel.innerText = "Tambah Berkas SIK"; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('id-ID', {year:'numeric', month:'2-digit', day:'2-digit'}) : '-'; }

window.editData = editData; window.deleteData = deleteData; window.changePage = changePage;
