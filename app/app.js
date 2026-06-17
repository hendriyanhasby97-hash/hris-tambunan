// app.js
import { getPegawai, savePegawai, deletePegawai } from './pegawai.js';

const formPegawai = document.getElementById('formPegawai');
const tableBody = document.getElementById('tableBody');
let currentId = null;

// Load data pertama kali
document.addEventListener('DOMContentLoaded', loadData);

// Fungsi untuk mengambil dan menampilkan data ke tabel
async function loadData() {
    try {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading data...</td></tr>';
        const data = await getPegawai();
        renderTable(data);
    } catch (error) {
        console.error("Error loading data:", error);
        alert("Gagal memuat data pegawai.");
    }
}

// Menampilkan data ke tabel HTML (hanya menampilkan kolom penting agar tabel tidak kepanjangan)
function renderTable(data) {
    tableBody.innerHTML = '';
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada data pegawai</td></tr>';
        return;
    }

    data.forEach((pegawai, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${pegawai.nip || '-'}</td>
            <td>${pegawai.nama || '-'}</td>
            <td>${pegawai.jabatan || '-'}</td>
            <td>${pegawai.no_telp || '-'}</td>
            <td>
                <button class="btn btn-sm btn-warning btn-edit" data-id="${pegawai.id_pegawai}">Edit</button>
                <button class="btn btn-sm btn-danger btn-delete" data-id="${pegawai.id_pegawai}">Hapus</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Pasang event listener untuk tombol edit dan hapus
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => handleEdit(e, data));
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });
}

// Handle submit form (Insert/Update)
formPegawai.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Mengumpulkan data dari form
    const formData = new FormData(formPegawai);
    const dataObj = Object.fromEntries(formData.entries());

    try {
        await savePegawai(dataObj, currentId);
        alert(currentId ? "Data berhasil diubah!" : "Data berhasil ditambahkan!");
        
        formPegawai.reset();
        currentId = null;
        document.getElementById('btnSubmit').textContent = 'Simpan Data';
        loadData();
    } catch (error) {
        console.error("Error saving data:", error);
        alert("Terjadi kesalahan saat menyimpan data.");
    }
});

// Handle Edit (Memasukkan data ke form)
function handleEdit(e, allData) {
    const id = e.target.getAttribute('data-id');
    const pegawai = allData.find(p => p.id_pegawai == id);
    
    if (pegawai) {
        currentId = pegawai.id_pegawai;
        document.getElementById('btnSubmit').textContent = 'Update Data';
        
        // Isi otomatis setiap input berdasarkan name
        Object.keys(pegawai).forEach(key => {
            const input = formPegawai.elements[key];
            if (input) {
                input.value = pegawai[key];
            }
        });
        
        // Scroll ke atas form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Handle Delete
async function handleDelete(e) {
    const id = e.target.getAttribute('data-id');
    if (confirm('Apakah Anda yakin ingin menghapus data pegawai ini?')) {
        try {
            await deletePegawai(id);
            alert('Data berhasil dihapus!');
            loadData();
        } catch (error) {
            console.error("Error deleting data:", error);
            alert("Gagal menghapus data.");
        }
    }
}

// Handle Batal / Reset form
document.getElementById('btnReset').addEventListener('click', () => {
    currentId = null;
    document.getElementById('btnSubmit').textContent = 'Simpan Data';
});
