import { supabase } from '../app/koneksi.js';

const tbodyStr = document.getElementById('tbodyStr');
const formStr = document.getElementById('formStr');
const modalStr = new bootstrap.Modal(document.getElementById('modalStr'));
const modalStrLabel = document.getElementById('modalStrLabel');
const strIdInput = document.getElementById('strId');
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
formStr.addEventListener('submit', handleFormSubmit);
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
        tbodyStr.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Memuat data...</td></tr>`;
        let query = supabase.from('berkas_str').select('*');
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
        tbodyStr.innerHTML = '';

        if (dataHalamanIni.length === 0) {
            tbodyStr.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Data kosong.</td></tr>`;
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
                <td>${item.no_str || '-'}</td>
                <td>${formatDate(item.tgl_terbit)}</td>
                <td>${formatDate(item.tgl_berakhir)}</td>
                <td>${item.lampiran_url ? `<a href="${item.lampiran_url}" target="_blank" class="btn btn-outline-info btn-sm">Lihat</a>` : '-'}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editData('${item.id_str}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteData('${item.id_str}', '${item.lampiran_url}')">Hapus</button>
                </td>
            `;
            tbodyStr.appendChild(row);
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
    const id = strIdInput.value;
    const fileInput = document.getElementById('file_url');
    try {
        let fileUrl = null;
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('lampiran_str').upload(fileName, file);
            if (uploadError) throw uploadError;
            fileUrl = supabase.storage.from('lampiran_str').getPublicUrl(fileName).data.publicUrl;
        }

        const payload = {
            nik: nikInput.value.trim(),
            nama: namaInput.value,
            bidang: document.getElementById('bidang').value.trim(),
            no_str: document.getElementById('no_str').value.trim(),
            tgl_terbit: document.getElementById('tgl_terbit').value,
            tgl_berakhir: document.getElementById('tgl_berakhir').value
        };
        if (fileUrl) payload.lampiran_url = fileUrl;

        if (id === "") {
            const { error } = await supabase.from('berkas_str').insert([payload]);
            if (error) throw error;
            alert('Data STR berhasil ditambahkan!');
        } else {
            const { error } = await supabase.from('berkas_str').update(payload).eq('id_str', id);
            if (error) throw error;
            alert('Data STR berhasil diperbarui!');
        }
        modalStr.hide(); loadData();
    } catch (error) { alert(error.message); }
}

async function editData(id) {
    resetForm(); modalStrLabel.innerText = "Edit Berkas STR";
    try {
        const { data, error } = await supabase.from('berkas_str').select('*').eq('id_str', id).single();
        if (error) throw error;
        strIdInput.value = data.id_str;
        nikInput.value = data.nik;
        namaInput.value = data.nama || '';
        document.getElementById('bidang').value = data.bidang || '';
        document.getElementById('no_str').value = data.no_str || '';
        document.getElementById('tgl_terbit').value = data.tgl_terbit;
        document.getElementById('tgl_berakhir').value = data.tgl_berakhir;
        if (data.lampiran_url) {
            editFilePreview.style.display = 'block';
            editFilePreview.innerHTML = `<a href="${data.lampiran_url}" target="_blank">Lihat Berkas Lama</a>`;
        }
        modalStr.show();
    } catch (e) { alert(e.message); }
}

async function deleteData(id, fileUrl) {
    if (!confirm('Hapus data STR ini?')) return;
    try {
        const { error } = await supabase.from('berkas_str').delete().eq('id_str', id);
        if (error) throw error;
        if (fileUrl) {
            const fileName = fileUrl.split('/').pop();
            await supabase.storage.from('lampiran_str').remove([fileName]);
        }
        alert('Data berhasil dihapus!'); loadData();
    } catch (e) { alert(e.message); }
}

function resetForm() { formStr.reset(); strIdInput.value = ""; editFilePreview.style.display = 'none'; modalStrLabel.innerText = "Tambah Berkas STR"; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('id-ID', {year:'numeric', month:'2-digit', day:'2-digit'}) : '-'; }

window.editData = editData; window.deleteData = deleteData; window.changePage = changePage;
