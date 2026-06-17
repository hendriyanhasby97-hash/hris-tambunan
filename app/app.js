import { getPegawai, savePegawai, deletePegawai, getSummaryPegawai } from '../js/pegawai.js';

const formPegawai = document.getElementById('formPegawai');
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchKeyword');
const filterStatus = document.getElementById('filterStatus');
const filterKelTenaga = document.getElementById('filterKelTenaga');
const filterKelJabatan = document.getElementById('filterKelJabatan');
const paginationControls = document.getElementById('paginationControls');
const limitSelect = document.getElementById('limitSelect');
const paginationInfo = document.getElementById('paginationInfo');

const modalPegawai = new bootstrap.Modal(document.getElementById('modalPegawai'));

let currentId = null;
let currentPage = 1;
let itemsPerPage = 25; 

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadSummary();
});

[searchInput, filterStatus, filterKelTenaga, filterKelJabatan].forEach(el => {
    el.addEventListener('input', () => {
        currentPage = 1; 
        loadData();
    });
});

limitSelect.addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1; 
    loadData();
});

async function loadSummary() {
    try {
        const summary = await getSummaryPegawai();
        document.getElementById('totPegawai').textContent = summary.total;
        document.getElementById('totAktif').textContent = summary.aktif;
        document.getElementById('totPensiun').textContent = summary.pensiun;
        document.getElementById('totResign').textContent = summary.resign;
        document.getElementById('totMutasi').textContent = summary.mutasi;
        document.getElementById('totLainnya').textContent = summary.lainnya;
    } catch (error) {
        console.error("Gagal memuat rekap:", error);
    }
}

async function loadData() {
    try {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Memuat data...</td></tr>';
        
        const search = searchInput.value;
        const filters = {
            status: filterStatus.value,
            kelompok_pegawai: filterKelTenaga.value,
            kelompok_jabatan: filterKelJabatan.value
        };

        const result = await getPegawai(currentPage, itemsPerPage, search, filters);
        renderTable(result.data, result.totalCount);
    } catch (error) {
        console.error("Error loading data:", error);
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Gagal memuat data pegawai.</td></tr>';
    }
}

function renderTable(data, totalCount) {
    tableBody.innerHTML = '';
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data pegawai yang sesuai.</td></tr>';
        renderPagination(0);
        return;
    }

    data.forEach((pegawai, index) => {
        const tr = document.createElement('tr');
        const rowNum = (currentPage - 1) * itemsPerPage + index + 1;
        
        tr.innerHTML = `
            <td>${rowNum}</td>
            <td><strong>${pegawai.nik || '-'}</strong><br><span class="text-small">${pegawai.nip || '-'}</span></td>
            <td><strong>${pegawai.nama || '-'}</strong><br><span class="text-small">${pegawai.ruangan || '-'}</span></td>
            <td><strong>${pegawai.status || '-'}</strong><br><span class="text-small">${pegawai.kelompok_jabatan || '-'}</span></td>
            <td><strong>${pegawai.gol || '-'}</strong><br><span class="text-small">${pegawai.jabatan || '-'}</span></td>
            <td><strong>${pegawai.fakultas || '-'}</strong><br><span class="text-small">${pegawai.jurusan || '-'}</span></td>
            <td><strong>${pegawai.masuk_rs || '-'}</strong><br><span class="text-small">${pegawai.masa_kerja_rs || '-'}</span></td>
            <td class="text-center">
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-info text-white btn-view" data-id="${pegawai.id_pegawai}" title="Lihat Detail"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-warning text-white btn-edit" data-id="${pegawai.id_pegawai}" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${pegawai.id_pegawai}" title="Hapus"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => handleEdit(e.currentTarget.getAttribute('data-id'), data)));
    document.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', (e) => handleDelete(e.currentTarget.getAttribute('data-id'))));
    document.querySelectorAll('.btn-view').forEach(btn => btn.addEventListener('click', (e) => handleView(e.currentTarget.getAttribute('data-id'), data)));

    renderPagination(totalCount);
}

function renderPagination(totalCount) {
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    let html = '';
    
    if (totalCount === 0) {
        paginationInfo.textContent = "Tidak ada data";
    } else {
        const startData = (currentPage - 1) * itemsPerPage + 1;
        const endData = Math.min(currentPage * itemsPerPage, totalCount);
        
        // PASTIKAN BARIS INI MENGGUNAKAN BACKTICK (`) BUKAN KUTIP SATU (')
        paginationInfo.textContent = `Menampilkan ${startData} hingga ${endData} dari ${totalCount} data`;
    }

    html += `<li class="page-item ${currentPage === 1 || totalCount === 0 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">Sebelumnya</a>
             </li>`;
    
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                 </li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">Selanjutnya</a>
             </li>`;
             
    paginationControls.innerHTML = html;

    paginationControls.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.getAttribute('data-page'));
            if (page && page !== currentPage && page > 0 && page <= totalPages) {
                currentPage = page;
                loadData();
            }
        });
    });
}

formPegawai.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formPegawai);
    const dataObj = Object.fromEntries(formData.entries());

    try {
        await savePegawai(dataObj, currentId);
        alert(currentId ? "Data berhasil diubah!" : "Data berhasil ditambahkan!");
        
        modalPegawai.hide();
        loadData();
        loadSummary(); 
    } catch (error) {
        console.error("Error saving data:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
    }
});

function handleEdit(id, allData) {
    const pegawai = allData.find(p => p.id_pegawai == id);
    
    if (pegawai) {
        currentId = pegawai.id_pegawai;
        
        Object.keys(pegawai).forEach(key => {
            const input = formPegawai.elements[key];
            if (input) {
                input.value = pegawai[key];
            }
        });
        
        document.getElementById('modalPegawaiLabel').textContent = "Edit Data Pegawai";
        modalPegawai.show();
    }
}

function handleView(id, allData) {
    const pegawai = allData.find(p => p.id_pegawai == id);
    if (pegawai) {
        let detail = `DETAIL PEGAWAI:\n\nNIK: ${pegawai.nik || '-'}\nNama: ${pegawai.nama || '-'}\nJabatan: ${pegawai.jabatan || '-'}\nStatus: ${pegawai.status || '-'}\nAlamat: ${pegawai.alamat || '-'}\nNo Telp: ${pegawai.no_telp || '-'}`;
        alert(detail);
    }
}

async function handleDelete(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data pegawai ini?')) {
        try {
            await deletePegawai(id);
            alert('Data berhasil dihapus!');
            loadData();
            loadSummary(); 
        } catch (error) {
            console.error("Error deleting data:", error);
            alert("Gagal menghapus data.");
        }
    }
}

document.getElementById('modalPegawai').addEventListener('hidden.bs.modal', () => {
    formPegawai.reset();
    currentId = null;
    document.getElementById('modalPegawaiLabel').textContent = "Form Data Pegawai";
});
