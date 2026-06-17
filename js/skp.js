import { supabase } from '../app/koneksi.js';

const tbodySkp = document.getElementById('tbodySkp');
const formSkp = document.getElementById('formSkp');
const modalSkp = new bootstrap.Modal(document.getElementById('modalSkp'));
const modalSkpLabel = document.getElementById('modalSkpLabel');
const skpIdInput = document.getElementById('skpId');
const editFilePreview = document.getElementById('editFilePreview');
const btnTambah = document.getElementById('btnTambah');

const nikInput = document.getElementById('nik');
const namaInput = document.getElementById('nama');
const nipInput = document.getElementById('nip');
const jabatanInput = document.getElementById('jabatan');

const filterTahun = document.getElementById('filterTahun');
const inputCari = document.getElementById('inputCari'); 
const limitData = document.getElementById('limitData');
const infoPagination = document.getElementById('infoPagination');
const paginationControls = document.getElementById('paginationControls');

let currentPage = 1, itemsPerPage = parseInt(limitData.value);

document.addEventListener('DOMContentLoaded', loadData);
formSkp.addEventListener('submit', handleFormSubmit);
btnTambah.addEventListener('click', resetForm);
filterTahun.addEventListener('change', () => { currentPage = 1; loadData(); });
inputCari.addEventListener('input', () => { currentPage = 1; loadData(); });
limitData.addEventListener('change', () => { itemsPerPage = parseInt(limitData.value); currentPage = 1; loadData(); });
nikInput.addEventListener('change', CariDataMasterPegawai);

async function CariDataMasterPegawai() {
    const nikValue = nikInput.value.trim();
    if (!nikValue) { namaInput.value = ''; nipInput.value = ''; jabatanInput.value = ''; return; }
    try {
        namaInput.value = 'Mencari...';
        const { data } = await supabase.from('pegawai').select('nama, nip, jabatan').eq('nik', nikValue).maybeSingle();
        if (data) {
            namaInput.value = data.nama || '';
            nipInput.value = data.nip || '-';
            jabatanInput.value = data.jabatan || '-';
        } else {
            namaInput.value = ''; nipInput.value = ''; jabatanInput.value = '';
            alert(`NIK "${nikValue}" tidak terdaftar di data master pegawai!`);
            nikInput.value = '';
        }
    } catch (e) { console.error(e); }
}

async function loadData() {
    try {
        tbodySkp.innerHTML = `<tr><td colspan="10" class="text-center text-muted">Memuat data...</td></tr>`;
        let query = supabase.from('skp_pegawai').select('*');
        if (filterTahun.value) {
            query = query.eq('tahun_skp', parseInt(filterTahun.value));
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
        tbodySkp.innerHTML = '';

        if (dataHalamanIni.length === 0) {
            tbodySkp.innerHTML = `<tr><td colspan="10" class="text-center text-muted">Data kosong.</td></tr>`;
            setupPaginationControls(totalPages);
            return;
        }

        dataHalamanIni.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td><b>${item.nik}</b></td>
                <td>${item.nama}<br><small class="text-muted">NIP: ${item.nip || '-'}</small></td>
                <td><small>${item.jabatan || '-'}</small></td>
                <td><span class="badge bg-dark">${item.tahun_skp}</span></td>
                <td><small>Penilai: ${item.pejabat_penilai || '-'}<br>Atasan: ${item.atasan_pejabat_penilai || '-'}</small></td>
                <td><small>${item.capaian_kinerja_organisasi || '-'}</small></td>
                <td><span class="badge bg-outline-secondary text-dark border">${item.predikat_kinerja_pegawai || '-'}</span></td>
                <td>${item.lampiran_skp ? `<a href="${item.lampiran_skp}" target="_blank" class="btn btn-outline-info btn-sm">Lihat</a>` : '-'}</td>
                <td>
                    <button class="btn btn-warning btn-sm shadow-sm" onclick="editData('${item.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm shadow-sm" onclick="deleteData('${item.id}', '${item.lampiran_skp}')">Hapus</button>
                </td>
            `;
            tbodySkp.appendChild(row);
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
    const id = skpIdInput.value;
    const fileInput = document.getElementById('lampiran_skp');
    try {
        let fileUrl = null;
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('lampiran_skp').upload(fileName, file);
            if (uploadError) throw uploadError;
            fileUrl = supabase.storage.from('lampiran_skp').getPublicUrl(fileName).data.publicUrl;
        }

        const payload = {
            nik: nikInput.value.trim(),
            nama: namaInput.value,
            nip: nipInput.value,
            jabatan: jabatanInput.value,
            pejabat_penilai: document.getElementById('pejabat_penilai').value.trim(),
            atasan_pejabat_penilai: document.getElementById('atasan_pejabat_penilai').value.trim(),
            tahun_skp: parseInt(document.getElementById('tahun_skp').value),
            capaian_kinerja_organisasi: document.getElementById('capaian_kinerja_organisasi').value.trim(),
            predikat_kinerja_pegawai: document.getElementById('predikat_kinerja_pegawai').value.trim(),
            catatan_rekomendasi: document.getElementById('catatan_rekomendasi').value.trim()
        };
        if (fileUrl) payload.lampiran_skp = fileUrl;

        if (id === "") {
            const { error } = await supabase.from('skp_pegawai').insert([payload]);
            if (error) throw error;
            alert('Data SKP berhasil ditambahkan!');
        } else {
            const { error } = await supabase.from('skp_pegawai').update(payload).eq('id', id);
            if (error) throw error;
            alert('Data SKP berhasil diperbarui!');
        }
        modalSkp.hide(); loadData();
    } catch (error) { alert(error.message); }
}

async function editData(id) {
    resetForm(); modalSkpLabel.innerText = "Edit Berkas SKP";
    try {
        const { data, error } = await supabase.from('skp_pegawai').select('*').eq('id', id).single();
        if (error) throw error;
        skpIdInput.value = data.id;
        nikInput.value = data.nik;
        namaInput.value = data.nama || '';
        nipInput.value = data.nip || '';
        jabatanInput.value = data.jabatan || '';
        document.getElementById('pejabat_penilai').value = data.pejabat_penilai || '';
        document.getElementById('atasan_pejabat_penilai').value = data.atasan_pejabat_penilai || '';
        document.getElementById('tahun_skp').value = data.tahun_skp;
        document.getElementById('capaian_kinerja_organisasi').value = data.capaian_kinerja_organisasi || '';
        document.getElementById('predikat_kinerja_pegawai').value = data.predikat_kinerja_pegawai || '';
        document.getElementById('catatan_rekomendasi').value = data.catatan_rekomendasi || '';
        if (data.lampiran_skp) {
            editFilePreview.style.display = 'block';
            editFilePreview.innerHTML = `<a href="${data.lampiran_skp}" target="_blank">Lihat Berkas Lama</a>`;
        }
        modalSkp.show();
    } catch (e) { alert(e.message); }
}

async function deleteData(id, fileUrl) {
    if (!confirm('Hapus berkas SKP ini?')) return;
    try {
        const { error } = await supabase.from('skp_pegawai').delete().eq('id', id);
        if (error) throw error;
        if (fileUrl) {
            const fileName = fileUrl.split('/').pop();
            await supabase.storage.from('lampiran_skp').remove([fileName]);
        }
        alert('Data berhasil dihapus!'); loadData();
    } catch (e) { alert(e.message); }
}

function resetForm() { formSkp.reset(); skpIdInput.value = ""; editFilePreview.style.display = 'none'; modalSkpLabel.innerText = "Tambah Berkas SKP"; }

window.editData = editData; window.deleteData = deleteData; window.changePage = changePage;
