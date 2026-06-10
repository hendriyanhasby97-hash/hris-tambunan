// Layout/Employee/employee.js
import { supabase } from '../../App/koneksi.js';

// State global data pegawai untuk manipulasi filtering client-side
let masterPegawai = [];

// Element Catcher
const tableBody = document.getElementById('table-body');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const filterRuangan = document.getElementById('filter-ruangan');
const filterKelompok = document.getElementById('filter-kelompok');
const formPegawai = document.getElementById('form-pegawai');
const modalElement = new bootstrap.Modal(document.getElementById('modalPegawai'));
const detailModalElement = new bootstrap.Modal(document.getElementById('modalDetailPegawai'));

// List seluruh 35 field untuk otomasi pembersihan/baca data form
const fields = [
    'nik', 'nama', 'jeniskelamin', 'agama', 'statuspernikahan', 'pasangan', 'jumlahanak', 'alamat', 
    'nip', 'status', 'kelompoktenaga', 'golongan', 'tmtpangkat', 'tmtplanjut', 'kelompokjabatan', 
    'jabatan', 'tmtjabatan', 'tmtcpns', 'bup', 'tmtpensiun', 'masukrs', 'masakerja', 'jpendidikan', 
    'fpendidikan', 'jrspendidikan', 'asalpendidikan', 'tahunlulus', 'ruangan', 'notatugas', 'tmt', 
    'bpjs', 'bpjstktaspen', 'npwp', 'email', 'nohp'
];

document.addEventListener('DOMContentLoaded', () => {
    // Tampilkan data user terotentikasi di header navbar
    const sessionData = localStorage.getItem('hris_session');
    if (sessionData) {
        const user = JSON.parse(sessionData);
        document.getElementById('user-display').innerText = `${user.username} (${user.role})`;
    }

    // Ambil Data dari Supabase
    fetchEmployeeData();

    // Event Listener Real-Time Filter & Search
    searchInput.addEventListener('input', applyFiltersAndSearch);
    filterStatus.addEventListener('change', applyFiltersAndSearch);
    filterRuangan.addEventListener('change', applyFiltersAndSearch);
    filterKelompok.addEventListener('change', applyFiltersAndSearch);

    // Event Reset Form ketika Tombol Tambah di-klik
    document.getElementById('btn-tambah').addEventListener('click', () => {
        document.getElementById('id_pegawai').value = '';
        formPegawai.reset();
        document.getElementById('modal-title').innerText = 'Tambah Pegawai Baru';
    });
});

// 1. FUNGSI AMBIL DATA UTAMA & GENERATE FILTER OPTION
async function fetchEmployeeData() {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Memperbarui tabel...</td></tr>`;
    
    const { data, error } = await supabase
        .from('employee')
        .select('*')
        .order('nama', { ascending: true });

    if (error) {
        console.error("Gagal menarik data:", error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data dari Supabase!</td></tr>`;
        return;
    }

    masterPegawai = data || [];
    populateFilterOptions(masterPegawai);
    renderTable(masterPegawai);
}

// Otomatis mengisi pilihan dropdown filter sesuai data unik yang ada di database
function populateFilterOptions(data) {
    const ruanganUnik = [...new Set(data.map(item => item.ruangan).filter(Boolean))];
    const kelompokUnik = [...new Set(data.map(item => item.kelompoktenaga).filter(Boolean))];

    // Simpan nilai pilihan saat ini agar tidak ter-reset saat fetch ulang
    const currentRuangan = filterRuangan.value;
    const currentKelompok = filterKelompok.value;

    filterRuangan.innerHTML = '<option value="">Semua Ruangan</option>';
    ruanganUnik.forEach(r => {
        filterRuangan.innerHTML += `<option value="${r}">${r}</option>`;
    });

    filterKelompok.innerHTML = '<option value="">Semua Kelompok</option>';
    kelompokUnik.forEach(k => {
        filterKelompok.innerHTML += `<option value="${k}">${k}</option>`;
    });

    filterRuangan.value = currentRuangan;
    filterKelompok.value = currentKelompok;
}

// 2. LOGIKA RENDER TABEL UTAMA (NIK, Nama, NIP, Jabatan, Ruangan, Masa Kerja, Aksi)
function renderTable(dataPegawai) {
    if (dataPegawai.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary">Tidak ada data pegawai yang cocok.</td></tr>`;
        return;
    }

    let rows = '';
    dataPegawai.forEach(p => {
        rows += `
            <tr>
                <td class="fw-bold text-secondary">${p.nik || '-'}</td>
                <td><strong>${p.nama || '-'}</strong></td>
                <td>${p.nip || '<span class="text-muted small">Belum Ada</span>'}</td>
                <td>${p.jabatan || '-'}</td>
                <td><span class="badge bg-secondary">${p.ruangan || '-'}</span></td>
                <td>${p.masakerja || '-'}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info text-white btn-view" data-id="${p.id_pegawai}">Lihat</button>
                        <button class="btn btn-warning text-white btn-edit" data-id="${p.id_pegawai}">Edit</button>
                        <button class="btn btn-danger btn-delete" data-id="${p.id_pegawai}">Hapus</button>
                    </div>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = rows;

    // Pasang Event Interceptor untuk tombol aksi dinamik
    initActionButtons();
}

// 3. FUNGSI PENCARIAN & FILTER MULTI-CONDITIONAL
function applyFiltersAndSearch() {
    const keyword = searchInput.value.toLowerCase().trim();
    const statusVal = filterStatus.value;
    const ruanganVal = filterRuangan.value;
    const kelompokVal = filterKelompok.value;

    const filtered = masterPegawai.filter(p => {
        // Cocokkan Kriteria Pencarian (NIK, Nama, Jabatan)
        const matchKeyword = 
            (p.nik && p.nik.toLowerCase().includes(keyword)) ||
            (p.nama && p.nama.toLowerCase().includes(keyword)) ||
            (p.jabatan && p.jabatan.toLowerCase().includes(keyword));

        // Cocokkan Dropdown Filter
        const matchStatus = statusVal === "" || p.status === statusVal;
        const matchRuangan = ruanganVal === "" || p.ruangan === ruanganVal;
        const matchKelompok = kelompokVal === "" || p.kelompoktenaga === kelompokVal;

        return matchKeyword && matchStatus && matchRuangan && matchKelompok;
    });

    renderTable(filtered);
}

// 4. HANDLER INTERAKSI ACTION BUTTONS
function initActionButtons() {
    // Tombol Detail View All Data
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const p = masterPegawai.find(item => item.id_pegawai == id);
            if (!p) return;

            let detailHtml = '';
            fields.forEach(field => {
                const labelKosong = field.toUpperCase();
                detailHtml += `
                    <tr>
                        <th width="35%" class="bg-light ps-3 fw-bold">${labelKosong}</th>
                        <td class="ps-3">${p[field] !== null && p[field] !== undefined ? p[field] : '-'}</td>
                    </tr>
                `;
            });
            document.getElementById('detail-view-body').innerHTML = detailHtml;
            detailModalElement.show();
        });
    });

    // Tombol Edit
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const p = masterPegawai.find(item => item.id_pegawai == id);
            if (!p) return;

            document.getElementById('id_pegawai').value = p.id_pegawai;
            document.getElementById('modal-title').innerText = 'Edit Data Pegawai: ' + p.nama;

            // Isi nilai modal form dari row database secara berkala
            fields.forEach(field => {
                document.getElementById(field).value = p[field] || '';
            });

            // Aktifkan tab pertama form kembali
            bootstrap.Tab.getInstance(document.getElementById('pribadi-tab')).show();
            modalElement.show();
        });
    });

    // Tombol Hapus Data
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const p = masterPegawai.find(item => item.id_pegawai == id);
            
            if (confirm(`Apakah Anda yakin ingin menghapus data pegawai bernama "${p.nama}"?`)) {
                const { error } = await supabase
                    .from('employee')
                    .delete()
                    .eq('id_pegawai', id);

                if (error) {
                    alert("Gagal menghapus data: " + error.message);
                } else {
                    alert("Pegawai berhasil dihapus!");
                    fetchEmployeeData(); // Refresh ulang state tabel
                }
            }
        });
    });
}

// 5. SUBMIT HANDLING (TAMBAH / UPDATE JALUR BERSAMA)
formPegawai.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const idPegawai = document.getElementById('id_pegawai').value;
    const btnSimpan = document.getElementById('btn-simpan');
    
    btnSimpan.innerText = 'Menyimpan...';
    btnSimpan.disabled = true;

    // Kumpulkan nilai inputan ke bentuk Object Payload mapping Supabase
    const payload = {};
    fields.forEach(field => {
        const val = document.getElementById(field).value.trim();
        payload[field] = val === "" ? null : val; // Kosongan form di-set menjadi null di Supabase
    });

    if (idPegawai) {
        // Mode Operasi: EDIT / UPDATE DATA
        const { error } = await supabase
            .from('employee')
            .update(payload)
            .eq('id_pegawai', idPegawai);

        if (error) {
            alert("Gagal memperbarui data: " + error.message);
        } else {
            alert("Perubahan data pegawai berhasil disimpan!");
            modalElement.hide();
            fetchEmployeeData();
        }
    } else {
        // Mode Operasi: TAMBAH DATA BARU
        const { error } = await supabase
            .from('employee')
            .insert([payload]);

        if (error) {
            alert("Gagal menambahkan pegawai: " + error.message);
        } else {
            alert("Pegawai baru berhasil didaftarkan ke sistem!");
            modalElement.hide();
            fetchEmployeeData();
        }
    }

    btnSimpan.innerText = 'Simpan Data';
    btnSimpan.disabled = false;
});
