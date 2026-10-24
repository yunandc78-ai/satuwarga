/**
 * SatuWarga 04 - Modern Management & Transparency System
 * RT 04 / RW 14 Kelurahan Cisaranten Kulon Kecamatan Arcamanik Kota Bandung
 * Revamped & Redesigned by Google DeepMind Antigravity
 */

// Konfigurasi URL Google Apps Script (Bisa disesuaikan pengurus)
const DEFAULT_APP_URL = "https://script.google.com/macros/s/AKfycbxgdFHADapoLJICM7_dpetnD8STQGOQCMV4wGtksz4UZzKshHzg9flfxaP6IdmTNs86/exec";
const APP_URL_STORAGE_KEY = 'SATUWARGA04_APP_URL';
let APP_URL = localStorage.getItem(APP_URL_STORAGE_KEY) || DEFAULT_APP_URL;
const PREVIEW_MODE = false;
const STORAGE_KEY = 'SATUWARGA04_LOCAL_DB';
const CONFIG_KEY = 'SATUWARGA04_CONFIG';

// Antrean Sinkronisasi Google Spreadsheet Real-Time
const sheetsSyncQueue = [];
let isProcessingSheetsQueue = false;
let lastSheetsSyncTime = '';

// Helper Penanggalan & Waktu Dinamis Indonesia
const NAMA_HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAMA_BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const currentNow = new Date();
const CURRENT_YEAR = currentNow.getFullYear();
const CURRENT_MONTH_IDX = currentNow.getMonth();
const CURRENT_MONTH_NAME = NAMA_BULAN_ID[CURRENT_MONTH_IDX];

// Rentang tahun kartu iuran 2026 s.d. 2036 (11 Tahun)
const DAFTAR_TAHUN_IURAN = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036];

// State Global Aplikasi
const VIEW_MODE_KEY = 'SATUWARGA04_VIEW_MODE';
let currentViewMode = localStorage.getItem(VIEW_MODE_KEY) || (window.innerWidth >= 1024 ? 'desktop' : 'mobile');
let currentUser = null; // null = Mode Warga (Akses Terbuka Tanpa Login)
let activeTab = 'beranda';
let adminSubTab = 'pengurus'; // 'pengurus' | 'keuangan' | 'surat' | 'sistem' | 'log'
let logSearchQuery = '';
let logFilterKategori = 'semua';
let logFilterTipe = 'semua';
let modalKartuTahun = CURRENT_YEAR;
let berandaTunggakanBulan = `${CURRENT_MONTH_NAME} ${CURRENT_YEAR}`;
let filterTunggakanMode = 'akumulasi'; // 'akumulasi' | 'bulan_lalu' | 'perbulan'
let wargaSearchQuery = '';
let wargaFilterStatus = 'semua'; // 'semua' | 'Tetap' | 'Kontrak'
let wargaFilterBlok = 'semua'; // 'semua' | 'Ciskul I' | 'Ciskul 6' | 'Ciskul 7' | ...
let subTabWarga = 'direktori'; // 'direktori' | 'statistik' | 'sensus'

// Chart Instances
let demografiChartInstance = null;
let berandaChartInstance = null;
let kasChartInstance = null;
let iuranChartInstance = null;
let blokChartInstance = null;
let berandaDistribusiBlokChartInstance = null;
let berandaDemografiChartInstance = null;

// Saldo Awal & Data Bawaan
const defaultKasData = [
  { id: 'K01', tanggal: `${CURRENT_YEAR}-01-01`, tipe: 'masuk', nominal: 0, keterangan: `Saldo Awal Kas RT 04 Tahun ${CURRENT_YEAR}` }
];

const defaultIuranData = [];

// Sample Data Awal untuk kemudahan pratinjau jika spreadsheet masih kosong
const sampleWargaData = [
  {
    id: 'W01',
    nama: 'Bambang Sudarsono',
    noRumah: 'Ciskul 9 No. 14',
    anggota: 4,
    telp: '08122334455',
    status: 'Tetap',
    istri: 'Endang Lestari',
    anak: 'Dimas Prasetyo, Andina Putri',
    ortu: '-',
    agama: 'Islam',
    pekerjaan: 'Wiraswasta'
  },
  {
    id: 'W02',
    nama: 'H. Ahmad Sobari',
    noRumah: 'Ciskul 9 No. 08',
    anggota: 3,
    telp: '08133445566',
    status: 'Tetap',
    istri: 'Hj. Rohanah',
    anak: 'Fikri Haikal',
    ortu: '-',
    agama: 'Islam',
    pekerjaan: 'ASN / PNS'
  },
  {
    id: 'W03',
    nama: 'Dedi Kurniawan',
    noRumah: 'Ciskul 8 No. 22',
    anggota: 5,
    telp: '08129876543',
    status: 'Tetap',
    istri: 'Nurul Hidayah',
    anak: 'Rizki, Salsa, Daffa',
    ortu: '-',
    agama: 'Islam',
    pekerjaan: 'Karyawan Swasta'
  },
  {
    id: 'W04',
    nama: 'Yohanes Kristianto',
    noRumah: 'Ciskul 7 No. 05',
    anggota: 3,
    telp: '08137788990',
    status: 'Kontrak',
    istri: 'Maria Fransisca',
    anak: 'Gabriel',
    ortu: '-',
    agama: 'Katolik',
    pekerjaan: 'Wiraswasta'
  }
];

// Sample Event Logs Awal untuk Audit Trail Sistem
const defaultLogsData = [
  { id: 'LOG-105', waktu: '2026-10-24 14:35:10', user: 'Super Admin RT 04', role: 'Administrator', kategori: 'AUTH', pesan: 'Masuk ke panel pengaturan & konfigurasi super user', tipe: 'info' },
  { id: 'LOG-104', waktu: '2026-10-24 13:20:45', user: 'H. Ahmad Sobari', role: 'Bendahara RT', kategori: 'IURAN', pesan: 'Penerimaan pembayaran iuran bulanan warga Ciskul 9 No. 14', tipe: 'success' },
  { id: 'LOG-103', waktu: '2026-10-24 11:15:30', user: 'Siti Rahmawati', role: 'Sekretaris RT', kategori: 'WARGA', pesan: 'Pembaruan opsi nomor rumah (1-70) di direktori KK', tipe: 'info' },
  { id: 'LOG-102', waktu: '2026-10-24 09:40:12', user: 'H. Ahmad Sobari', role: 'Bendahara RT', kategori: 'KAS', pesan: 'Pencatatan pengeluaran kas: Honor Satpam & Petugas Kebersihan', tipe: 'warning' },
  { id: 'LOG-101', waktu: '2026-10-23 20:05:00', user: 'Super Admin RT 04', role: 'Administrator', kategori: 'SISTEM', pesan: 'Sinkronisasi database cloud Google Spreadsheet berhasil', tipe: 'success' }
];

let db = {
  users: [
    { username: 'admin', password: '123', role: 'Administrator', namaWarga: 'Super Admin RT 04' },
    { username: 'ketua', password: '123', role: 'Ketua RT', namaWarga: 'Bambang Sudarsono' },
    { username: 'bendahara', password: '123', role: 'Bendahara RT', namaWarga: 'H. Ahmad Sobari' },
    { username: 'sekretaris', password: '123', role: 'Sekretaris RT', namaWarga: 'Siti Rahmawati' },
    { username: 'pengurus', password: '123', role: 'Pengurus RT', namaWarga: 'Dedi Kurniawan' }
  ],
  warga: [...sampleWargaData],
  kas: JSON.parse(JSON.stringify(defaultKasData)),
  iuran: JSON.parse(JSON.stringify(defaultIuranData)),
  agenda: [
    { id: 'A01', judul: 'Kerja Bakti Lingkungan Ciskul', tanggal: `${CURRENT_YEAR}-${String(CURRENT_MONTH_IDX + 1).padStart(2, '0')}-15`, jam: '07:30 WIB', lokasi: 'Fasum Lapangan RT 04', info: 'Pembersihan saluran drainase menjelang musim hujan dan pemangkasan dahan pohon.' },
    { id: 'A02', judul: 'Pertemuan Rutin Warga & Rembug Warga', tanggal: `${CURRENT_YEAR}-${String(CURRENT_MONTH_IDX + 1).padStart(2, '0')}-20`, jam: '19:30 WIB', lokasi: 'Balai Pertemuan RT 04', info: 'Laporan pertanggungjawaban kas bulanan dan musyawarah jadwal pos ronda malam.' }
  ],
  surat: [
    { id: 'S01', nama: 'Dimas Prasetyo', nik: '3273123456780001', alamat: 'Ciskul 9 No. 14', jenis: 'Pengantar Surat Keterangan Domisili', keperluan: 'Kelengkapan administrasi beasiswa perkuliahan', status: 'Selesai', tgl: `${CURRENT_YEAR}-01-10` }
  ],
  aspirasi: [
    { id: 'L01', pelapor: 'Dedi Kurniawan (Ciskul 8)', pesan: 'Lampu penerangan jalan utama dekat pos satpam nomor 2 padam sejak dua hari lalu. Mohon diganti.', status: 'Selesai', tgl: `${CURRENT_YEAR}-01-12`, respon: 'Sudah diganti dengan lampu LED 30 Watt baru oleh petugas ronda.' },
    { id: 'L02', pelapor: 'Ibu Rahma (Ciskul 9)', pesan: 'Usul perbaikan tutup selokan beton di gang belakang yang retak agar tidak membahayakan anak-anak bermain sepeda.', status: 'Diproses', tgl: `${CURRENT_YEAR}-01-18`, respon: 'Akan diagendakan penambalan semen pada saat kerja bakti tanggal 15 nanti.' }
  ],
  logs: [...defaultLogsData]
};

let appConfig = {
  kopBaris1: 'RUKUN TETANGGA 04 / RUKUN WARGA 14',
  kopBaris2: 'KELURAHAN CISARANTEN KULON KECAMATAN ARCAMANIK - KOTA BANDUNG',
  kopAlamat: 'Sekretariat: Jl. Ciskul Raya No. 9, RT 04 / RW 14, Arcamanik, Kota Bandung 40293',
  formatNoSurat: '04 / SK / [TAHUN] / RT 04',
  kalimatPembuka: 'Yang bertandatangan di bawah ini Pengurus RT 04 / RW 14 Kelurahan Cisaranten Kulon Kecamatan Arcamanik Kota Bandung, menerangkan dengan sebenarnya bahwa:',
  kalimatPenutup: 'Demikian surat pengantar ini dibuat dengan sebenarnya dan untuk dapat dipergunakan sebagaimana mestinya oleh pihak atau instansi terkait.',
  kotaSurat: 'Bandung',
  namaTtd: 'Bambang Sudarsono',
  jabatanTtd: 'Ketua RT 04 / RW 14',
  namaBendahara: 'H. Ahmad Sobari',
  jabatanBendahara: 'Bendahara RT 04 / RW 14',
  tarifIuran: 75000,
  kontakRt: '6281234567890',
  kontakBendahara: '6281234567891',
  kontakSekretaris: '6281234567892'
};

// Cek LocalStorage untuk persistensi offline
function loadLocalStorageData() {
  try {
    const savedDb = localStorage.getItem(STORAGE_KEY);
    if (savedDb) {
      const parsed = JSON.parse(savedDb);
      if (parsed && typeof parsed === 'object') {
        db = { ...db, ...parsed };
        if (Array.isArray(db.warga)) {
          db.warga.forEach(w => {
            if (w.noRumah && /\bCiskul 1\b/i.test(w.noRumah)) {
              w.noRumah = w.noRumah.replace(/\bCiskul 1\b/gi, 'Ciskul I');
            }
          });
        }
        if (!Array.isArray(db.logs) || db.logs.length === 0) {
          db.logs = [...defaultLogsData];
        }
      }
    }
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      if (parsedConfig && typeof parsedConfig === 'object') {
        appConfig = { ...appConfig, ...parsedConfig };
      }
    }
  } catch (e) {
    console.warn('Gagal membaca cache lokal:', e);
  }
}

function saveLocalStorageData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    localStorage.setItem(CONFIG_KEY, JSON.stringify(appConfig));
  } catch (e) {
    console.warn('Gagal menyimpan cache lokal:', e);
  }
}

// Efek Confetti saat transaksi/iuran berhasil
function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#10b981', '#059669', '#3b82f6', '#f59e0b']
    });
  }
}

// Update Jam & Tanggal Digital Real-Time
function startLiveClock() {
  function tick() {
    const now = new Date();
    const hari = NAMA_HARI_ID[now.getDay()];
    const tgl = now.getDate();
    const bln = NAMA_BULAN_ID[now.getMonth()];
    const thn = now.getFullYear();

    const jam = String(now.getHours()).padStart(2, '0');
    const mnt = String(now.getMinutes()).padStart(2, '0');
    const dtk = String(now.getSeconds()).padStart(2, '0');

    const dateEl = document.getElementById('liveDateText');
    const clockEl = document.getElementById('liveClockText');

    if (dateEl) dateEl.textContent = `${hari}, ${tgl} ${bln} ${thn}`;
    if (clockEl) clockEl.textContent = `${jam}:${mnt}:${dtk} WIB`;
  }
  tick();
  setInterval(tick, 1000);
}

// Helper Format Tanggal & Bulan dari Google Spreadsheet (Mencegah ISO Date mismatch)
function formatTanggalSheets(val) {
  if (!val) return new Date().toISOString().split('T')[0];
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const ms = d.getTime() + (str.endsWith('Z') ? 7 * 3600 * 1000 : 0);
    const wibDate = new Date(ms);
    const y = wibDate.getUTCFullYear();
    const m = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(wibDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return str;
}

function formatBulanSheets(val) {
  if (!val) return '';
  const str = String(val).trim();
  for (const bln of NAMA_BULAN_ID) {
    if (str.startsWith(bln)) return str;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const ms = d.getTime() + (str.endsWith('Z') ? 7 * 3600 * 1000 : 0);
    const wibDate = new Date(ms);
    const blnIdx = wibDate.getUTCMonth();
    const thn = wibDate.getUTCFullYear();
    if (blnIdx >= 0 && blnIdx < NAMA_BULAN_ID.length) {
      return `${NAMA_BULAN_ID[blnIdx]} ${thn}`;
    }
  }
  return str;
}

// Update Indikator Visual Cloud Sync Google Spreadsheet
function renderSheetsSyncIndicator(status, message) {
  const badge = document.getElementById('sheetsSyncBadge');
  const dot = document.getElementById('sheetsSyncDot');
  const icon = document.getElementById('sheetsSyncIcon');
  const text = document.getElementById('sheetsSyncText');
  if (!badge || !text) return;

  text.textContent = message;

  if (status === 'syncing') {
    badge.className = "cursor-pointer flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/50 text-[10px] text-amber-300 transition select-none shadow-2xs";
    if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping";
    if (icon) icon.className = "ph-bold ph-arrows-clockwise text-xs animate-spin text-amber-300";
  } else if (status === 'synced') {
    badge.className = "cursor-pointer flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/60 text-[10px] text-emerald-200 transition select-none shadow-2xs";
    if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400";
    if (icon) icon.className = "ph-bold ph-cloud-check text-xs text-emerald-300";
  } else if (status === 'error') {
    badge.className = "cursor-pointer flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/50 text-[10px] text-rose-300 transition select-none shadow-2xs";
    if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-rose-400";
    if (icon) icon.className = "ph-bold ph-cloud-slash text-xs text-rose-300";
  } else {
    badge.className = "cursor-pointer flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] text-emerald-300 hover:bg-emerald-900/80 transition select-none shadow-2xs group";
    if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-125 transition";
    if (icon) icon.className = "ph-bold ph-cloud-check text-xs";
  }
}

// Fungsi Sinkronisasi Data Masuk dari Google Spreadsheet
async function muatDataDariSheets(showSuccessToast = false) {
  if (PREVIEW_MODE || !APP_URL || APP_URL === "URL_GAS_KAMU_DISINI") {
    renderSheetsSyncIndicator('idle', 'Mode Offline');
    return;
  }
  renderSheetsSyncIndicator('syncing', 'Menghubungkan ke Google Spreadsheet...');
  try {
    const res = await fetch(APP_URL);
    const json = await res.json();
    if (json && json.status === 'success' && json.data) {
      if (json.data.users && json.data.users.length > 0) {
        db.users = json.data.users.map(u => ({
          username: String(u.Username || ''),
          password: String(u.Password || ''),
          role: u.Role || 'Pengurus RT',
          namaWarga: u.NamaWarga || u.Username
        }));
      }
      if (json.data.warga && json.data.warga.length > 0) {
        db.warga = json.data.warga.map(w => ({
          id: w.ID,
          nama: w.Nama,
          noRumah: (w.NoRumah || '').replace(/\bCiskul 1\b/gi, 'Ciskul I'),
          anggota: Number(w.Jiwa) || 1,
          telp: String(w.Telp || ''),
          status: w.Status,
          istri: w.Istri || '-',
          anak: w.Anak || '-',
          ortu: w.Ortu || '-',
          agama: w.Agama || 'Islam',
          pekerjaan: w.Pekerjaan || '-'
        }));
      }
      if (json.data.kas && json.data.kas.length > 0) {
        db.kas = json.data.kas.map(k => ({
          id: k.ID,
          tanggal: formatTanggalSheets(k.Tanggal),
          tipe: k.Tipe,
          nominal: Number(k.Nominal) || 0,
          keterangan: k.Keterangan
        }));
      }
      if (json.data.iuran) {
        db.iuran = json.data.iuran.map(i => ({
          id: i.ID,
          wargaId: i.WargaID,
          nama: i.Nama,
          bulan: formatBulanSheets(i.Bulan),
          nominal: Number(i.Nominal) || 0,
          status: i.Status,
          tglBayar: formatTanggalSheets(i.TglBayar)
        }));
      }
      if (json.data.agenda) {
        db.agenda = json.data.agenda.map(a => ({
          id: a.ID,
          judul: a.Judul,
          tanggal: formatTanggalSheets(a.Tanggal),
          jam: a.Jam,
          lokasi: a.Lokasi,
          info: a.Info
        }));
      }
      if (json.data.surat) {
        db.surat = json.data.surat.map(s => ({
          id: s.ID,
          nama: s.Nama,
          nik: String(s.NIK || ''),
          alamat: s.Alamat,
          jenis: s.Jenis,
          keperluan: s.Keperluan,
          status: s.Status,
          tgl: formatTanggalSheets(s.Tanggal)
        }));
      }
      if (json.data.aspirasi) {
        db.aspirasi = json.data.aspirasi.map(l => ({
          id: l.ID,
          pelapor: l.Pelapor,
          pesan: l.Pesan,
          status: l.Status,
          tgl: formatTanggalSheets(l.Tanggal),
          respon: l.Respon || ''
        }));
      }
      if (json.data.config && json.data.config.length > 0) {
        json.data.config.forEach(c => {
          if (c.Key && c.Value !== undefined) {
            appConfig[c.Key] = c.Key === 'tarifIuran' ? Number(c.Value) : c.Value;
          }
        });
      }
      saveLocalStorageData();
      const now = new Date();
      lastSheetsSyncTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      renderSheetsSyncIndicator('synced', `Sinkron Spreadsheet (pk ${lastSheetsSyncTime})`);
      if (showSuccessToast) {
        showToast('Database berhasil disinkronkan langsung dari Google Spreadsheet!');
      }
      renderApp();
    }
  } catch (err) {
    console.error("Sinkronisasi Sheets:", err);
    renderSheetsSyncIndicator('error', 'Koneksi Sheets Terganggu (Data Lokal Aktif)');
  }
}

// Antrean FIFO & Eksekusi Pengiriman Data ke Google Spreadsheet
async function processSheetsSyncQueue() {
  if (isProcessingSheetsQueue || sheetsSyncQueue.length === 0) return;
  isProcessingSheetsQueue = true;
  renderSheetsSyncIndicator('syncing', `Menyimpan ${sheetsSyncQueue.length} perubahan ke Google Spreadsheet...`);

  while (sheetsSyncQueue.length > 0) {
    const task = sheetsSyncQueue[0];
    let success = false;
    let attempt = 0;

    while (!success && attempt < 3) {
      attempt++;
      try {
        if (!PREVIEW_MODE && APP_URL && APP_URL !== "URL_GAS_KAMU_DISINI") {
          await fetch(APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: task.action, data: task.data })
          });
        }
        success = true;
      } catch (err) {
        console.warn(`Gagal kirim ${task.action} percobaan ke-${attempt}:`, err);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }
    // Hapus tugas setelah selesai
    sheetsSyncQueue.shift();
  }

  isProcessingSheetsQueue = false;
  const now = new Date();
  lastSheetsSyncTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  renderSheetsSyncIndicator('synced', `Tersimpan di Google Spreadsheet (pk ${lastSheetsSyncTime})`);

  setTimeout(() => {
    if (!isProcessingSheetsQueue && sheetsSyncQueue.length === 0) {
      renderSheetsSyncIndicator('idle', 'Google Spreadsheet Terhubung');
    }
  }, 4500);
}

// Panggil fungsi ini setiap kali ada perubahan data
function kirimDataKeSheets(action, payload) {
  saveLocalStorageData();
  sheetsSyncQueue.push({ action, data: payload });
  processSheetsSyncQueue();
}

// Toast Notifikasi Modern
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  toast.className = `p-3.5 rounded-2xl shadow-xl flex items-center space-x-3 text-xs font-bold text-white transition-all transform duration-300 pointer-events-auto border backdrop-blur-md ${
    isSuccess 
      ? 'bg-brand-700/95 border-brand-500/80 shadow-brand-900/30' 
      : 'bg-rose-600/95 border-rose-500/80 shadow-rose-900/30'
  }`;
  toast.innerHTML = `
    <i class="ph-bold ${isSuccess ? 'ph-check-circle' : 'ph-warning-circle'} text-lg flex-shrink-0"></i>
    <span class="flex-1 leading-snug">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Reusable Modal Handler
function openModal(contentHtml) {
  const modal = document.getElementById('modalContainer');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  content.innerHTML = contentHtml;
  modal.classList.remove('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-95');
}

function closeModal() {
  const modal = document.getElementById('modalContainer');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;
  modal.classList.add('opacity-0', 'pointer-events-none');
  content.classList.add('scale-95');
}

// Hak Akses & Role Pengurus
function isAdmin() {
  return currentUser && (currentUser.role === 'Administrator' || currentUser.username === 'admin');
}

function isBendahara() {
  return currentUser && (currentUser.role === 'Bendahara RT' || currentUser.username === 'bendahara' || isAdmin());
}

function isSekretaris() {
  return currentUser && (currentUser.role === 'Sekretaris RT' || currentUser.username === 'sekretaris' || isAdmin());
}

function isKetua() {
  return currentUser && (currentUser.role === 'Ketua RT' || currentUser.username === 'ketua' || isAdmin());
}

function isPengurus() {
  if (!currentUser) return false;
  const pengurusRoles = ['Administrator', 'Ketua RT', 'Bendahara RT', 'Sekretaris RT', 'Pengurus RT'];
  return pengurusRoles.includes(currentUser.role) || isAdmin();
}

function canManageKeuangan() {
  return isBendahara() || isAdmin();
}

function canManageIuran() {
  return isBendahara() || isSekretaris() || isAdmin();
}

function canManageWarga() {
  return isSekretaris() || isKetua() || isAdmin();
}

function canManageSurat() {
  return isKetua() || isSekretaris() || isAdmin();
}

function canManageAgenda() {
  return isSekretaris() || isKetua() || isAdmin();
}

function canLaporanKas() {
  return isKetua() || isBendahara() || isAdmin();
}

function switchTab(tab) {
  activeTab = tab;
  renderApp();
}

// Pengaturan Mode Tampilan (Desktop vs Mobile)
function applyViewMode() {
  const container = document.getElementById('appContainer');
  const desktopNav = document.getElementById('desktopNavBar');
  const bottomNav = document.getElementById('bottomNav');
  if (!container) return;

  if (currentViewMode === 'desktop') {
    // Mode Desktop: Tampilan Widescreen Dashboard Modern hingga 1400px
    container.className = 'w-full max-w-[1400px] mx-auto min-h-screen md:min-h-[96vh] md:my-2 rounded-none md:rounded-3xl app-mesh-bg flex flex-col overflow-hidden relative shadow-2xl border-x md:border border-slate-700/30 z-10 transition-all duration-300';
    if (desktopNav) {
      desktopNav.classList.remove('hidden');
      desktopNav.classList.add('flex');
    }
    if (bottomNav) {
      bottomNav.classList.add('hidden');
    }
  } else {
    // Mode Ponsel: Tampilan Ramping Frame HP (620px) dengan Bottom Nav
    container.className = 'w-full max-w-[620px] mx-auto h-[100dvh] app-mesh-bg flex flex-col overflow-hidden relative shadow-2xl border-x border-slate-700/30 z-10 transition-all duration-300';
    if (desktopNav) {
      desktopNav.classList.remove('flex');
      desktopNav.classList.add('hidden');
    }
    if (bottomNav) {
      bottomNav.classList.remove('hidden');
    }
  }
}

function toggleViewMode() {
  currentViewMode = currentViewMode === 'desktop' ? 'mobile' : 'desktop';
  localStorage.setItem(VIEW_MODE_KEY, currentViewMode);
  applyViewMode();
  renderViewModeToggle();
  renderDesktopNav();
  renderBottomNav();
  
  showToast(
    currentViewMode === 'desktop'
      ? '🖥️ Mode Desktop Diaktifkan (Tampilan Layar Lebar)'
      : '📱 Mode Ponsel Diaktifkan (Tampilan Ringkas)',
    'info'
  );

  // Resize & re-inisialisasi grafik aktif agar presisi dengan ukuran kanvas baru
  if (activeTab === 'beranda') {
    setTimeout(() => {
      initBerandaChart();
      initBerandaKependudukanCharts();
    }, 120);
  } else if (activeTab === 'kas') {
    setTimeout(initKasChart, 120);
  } else if (activeTab === 'iuran') {
    setTimeout(initIuranChart, 120);
  } else if (activeTab === 'warga' && subTabWarga === 'statistik') {
    setTimeout(() => {
      initDemografiChart();
      initBlokChart();
    }, 120);
  }
}

// Navigasi Atas Khusus Mode Desktop
function renderDesktopNav() {
  const container = document.getElementById('desktopNavBar');
  if (!container) return;

  const navItems = [
    { tab: 'beranda', label: 'Beranda', icon: 'ph-house' },
    { tab: 'kas', label: 'Buku Kas', icon: 'ph-wallet' },
    { tab: 'iuran', label: 'Iuran Warga', icon: 'ph-receipt' },
    { tab: 'warga', label: 'Warga RT', icon: 'ph-users' },
    { tab: 'layanan', label: 'Layanan', icon: 'ph-chat-circle-dots' }
  ];

  if (isAdmin()) {
    navItems.push({ tab: 'admin', label: 'Sistem', icon: 'ph-gear-six' });
  }

  container.innerHTML = navItems.map(item => {
    const isActive = activeTab === item.tab;
    return `
      <button onclick="switchTab('${item.tab}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1.5 flex-shrink-0 ${
        isActive 
          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 scale-[1.02] font-black' 
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-bold'
      }">
        <i class="ph-bold ${item.icon} text-sm ${isActive ? 'text-white' : 'text-slate-500'}"></i>
        <span>${item.label}</span>
      </button>
    `;
  }).join('');
}

// Tombol Switcher Mode Tampilan (Desktop / Ponsel) di Header
function renderViewModeToggle() {
  const container = document.getElementById('viewModeToggleContainer');
  if (!container) return;

  const isDesktop = currentViewMode === 'desktop';
  container.innerHTML = `
    <button onclick="toggleViewMode()" 
      title="${isDesktop ? 'Klik untuk beralih ke Mode Ponsel / HP' : 'Klik untuk beralih ke Mode Desktop Layar Lebar'}" 
      class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center space-x-1.5 active:scale-95 shadow-xs border ${
        isDesktop 
          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' 
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
      }">
      <i class="ph-bold ${isDesktop ? 'ph-monitor text-emerald-600' : 'ph-device-mobile text-slate-500'} text-base"></i>
      <span class="hidden md:inline font-bold">${isDesktop ? 'Mode Desktop' : 'Mode Ponsel'}</span>
      <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
        isDesktop ? 'bg-emerald-200/90 text-emerald-900' : 'bg-slate-200 text-slate-700'
      } uppercase tracking-wider">
        ${isDesktop ? 'Aktif' : 'HP'}
      </span>
    </button>
  `;
}

// Render Utama
function renderApp() {
  applyViewMode();
  renderHeaderAuth();
  renderViewModeToggle();
  renderDesktopNav();
  renderBottomNav();
  renderMainContent();
  
  if (activeTab === 'beranda') {
    setTimeout(() => {
      initBerandaChart();
      initBerandaKependudukanCharts();
    }, 120);
  }
  if (activeTab === 'kas') setTimeout(initKasChart, 120);
  if (activeTab === 'iuran') setTimeout(initIuranChart, 120);
  if (activeTab === 'warga' && subTabWarga === 'statistik') {
    setTimeout(() => {
      initDemografiChart();
      initBlokChart();
    }, 120);
  }
}

// Header & Status Login Pengurus
function renderHeaderAuth() {
  const container = document.getElementById('headerAuthContainer');
  const subtext = document.getElementById('headerSubtext');
  if (!container) return;
  
  if (!currentUser) {
    if (subtext) subtext.textContent = 'Portal Transparansi Kas & Layanan Warga';
    container.innerHTML = `
      <button onclick="openModalLoginPengurus()" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center space-x-1.5 transition active:scale-95 border border-slate-700/50">
        <i class="ph-bold ph-lock-key text-brand-300"></i>
        <span>Login Pengurus</span>
      </button>
    `;
    return;
  }

  const roleBadgeColor = isAdmin() 
    ? 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold' 
    : (currentUser.role === 'Ketua RT' 
        ? 'bg-indigo-100 text-indigo-800 border-indigo-200' 
        : (currentUser.role === 'Bendahara RT' 
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
            : 'bg-cyan-100 text-cyan-800 border-cyan-200'));

  if (subtext) subtext.textContent = `${currentUser.namaWarga || currentUser.username} • ${currentUser.role}`;
  container.innerHTML = `
    <div class="flex items-center space-x-1.5">
      <button onclick="openModalGantiPassword()" title="Ganti Password Saya" class="p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1 shadow-xs border border-slate-200">
        <i class="ph-bold ph-key"></i>
        <span class="hidden sm:inline">Ganti Sandi</span>
      </button>

      ${isAdmin() ? `
        <button onclick="switchTab('admin')" title="Buka Panel Pengaturan Super User" class="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white transition flex items-center gap-1 shadow-sm">
          <i class="ph-bold ph-gear-six"></i>
          <span class="hidden sm:inline">Sistem</span>
        </button>
      ` : `
        <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${roleBadgeColor} border">
          ${currentUser.role}
        </span>
      `}

      <button onclick="logout()" title="Keluar Mode Pengurus" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition flex items-center gap-1 text-xs font-bold border border-rose-100">
        <i class="ph-bold ph-sign-out text-base"></i>
        <span class="hidden sm:inline">Keluar</span>
      </button>
    </div>
  `;
}

// Navigasi Bawah
function renderBottomNav() {
  const navWrapper = document.getElementById('navItemWrapper');
  if (!navWrapper) return;
  const navItems = [
    { tab: 'beranda', label: 'Beranda', icon: 'ph-house' },
    { tab: 'kas', label: 'Buku Kas', icon: 'ph-wallet' },
    { tab: 'iuran', label: 'Iuran', icon: 'ph-receipt' },
    { tab: 'warga', label: 'Warga', icon: 'ph-users' },
    { tab: 'layanan', label: 'Layanan', icon: 'ph-chat-circle-dots' }
  ];

  navWrapper.innerHTML = navItems.map(item => {
    const isActive = activeTab === item.tab;
    return `
      <button onclick="switchTab('${item.tab}')" class="flex flex-col items-center justify-center py-1 rounded-2xl transition-all duration-200 ${
        isActive 
          ? 'text-brand-700 font-black scale-105 bg-brand-50/80 shadow-xs' 
          : 'text-slate-500 hover:text-slate-800 font-semibold'
      }">
        <i class="ph-bold ${item.icon} text-xl ${isActive ? 'text-brand-600' : ''}"></i>
        <span class="text-[10px] mt-0.5 tracking-tight">${item.label}</span>
      </button>
    `;
  }).join('');
}

// Router Konten Utama
function renderMainContent() {
  const main = document.getElementById('mainContainer');
  if (!main) return;
  
  if (activeTab === 'beranda') {
    main.innerHTML = renderBeranda();
  } else if (activeTab === 'kas') {
    main.innerHTML = renderKas();
  } else if (activeTab === 'iuran') {
    main.innerHTML = renderIuran();
  } else if (activeTab === 'warga') {
    main.innerHTML = renderWarga();
  } else if (activeTab === 'layanan') {
    main.innerHTML = renderLayanan();
  } else if (activeTab === 'admin') {
    main.innerHTML = renderAdminConfig();
  } else {
    main.innerHTML = renderBeranda();
  }
}

// ==========================================
// 1. HALAMAN BERANDA / DASHBOARD
// ==========================================
function renderBeranda() {
  const totalKasMasuk = db.kas.filter(k => k.tipe === 'masuk').reduce((a, b) => a + (Number(b.nominal) || 0), 0);
  const totalKasKeluar = db.kas.filter(k => k.tipe === 'keluar').reduce((a, b) => a + (Number(b.nominal) || 0), 0);
  const saldoKas = totalKasMasuk - totalKasKeluar;
  const totalKK = db.warga.length;
  const totalJiwa = db.warga.reduce((a, b) => a + (Number(b.anggota) || 1), 0);

  // Perhitungan % Iuran Bulan Ini
  const targetBulanIni = `${CURRENT_MONTH_NAME} ${CURRENT_YEAR}`;
  const kkLunasBulanIni = db.iuran.filter(i => i.bulan.toLowerCase() === targetBulanIni.toLowerCase() && i.status === 'Lunas').length;
  const persentaseIuran = totalKK > 0 ? Math.min(100, Math.round((kkLunasBulanIni / totalKK) * 100)) : 0;

  return `
    <div class="p-4 lg:p-6 space-y-4">
      
      <!-- Hero Welcome Banner -->
      <div class="bg-gradient-to-br from-brand-800 via-brand-700 to-teal-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden border border-brand-600/30">
        <div class="relative z-10 space-y-2">
          <div class="flex items-center justify-between">
            <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black bg-white/20 backdrop-blur-md uppercase tracking-wide border border-white/20">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
              Sistem Informasi Warga Digital
            </span>
            <span class="text-[10px] font-bold text-emerald-200">Arcamanik • Bandung</span>
          </div>
          <h2 class="text-xl font-black font-display leading-tight tracking-tight">Keterbukaan & Kerukunan Warga RT 04</h2>
          <p class="text-xs text-emerald-100/90 font-medium leading-relaxed">
            Akses transparan kas lingkungan, status iuran KK periode 2026–2036, dan layanan surat pengantar instan.
          </p>

          <!-- Quick Action Buttons -->
          <div class="pt-2 flex items-center gap-2 flex-wrap">
            <button onclick="switchTab('iuran')" class="px-3 py-1.5 rounded-xl bg-white text-brand-900 text-xs font-black shadow-md hover:bg-emerald-50 transition active:scale-95 flex items-center gap-1.5">
              <i class="ph-bold ph-receipt text-brand-600"></i>
              <span>Cek Iuran</span>
            </button>
            <button onclick="openModalTambahLaporanBeranda()" class="px-3 py-1.5 rounded-xl bg-brand-950/40 hover:bg-brand-950/60 text-white text-xs font-bold transition active:scale-95 flex items-center gap-1.5 border border-white/20">
              <i class="ph-bold ph-megaphone text-emerald-300"></i>
              <span>Lapor Masalah</span>
            </button>
            <button onclick="switchTab('layanan')" class="px-3 py-1.5 rounded-xl bg-brand-950/40 hover:bg-brand-950/60 text-white text-xs font-bold transition active:scale-95 flex items-center gap-1.5 border border-white/20">
              <i class="ph-bold ph-file-text text-teal-300"></i>
              <span>Surat Pengantar</span>
            </button>
          </div>
        </div>
        <i class="ph-duotone ph-buildings absolute -right-6 -bottom-8 text-9xl text-white/10 pointer-events-none"></i>
      </div>

      <!-- Bento Grid: Saldo Kas & Statistik Lingkungan -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- Main Balance Bento Card -->
        <div class="sm:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 text-white p-5 rounded-3xl shadow-xl space-y-4 border border-slate-800 relative overflow-hidden">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-[11px] font-black text-slate-300 uppercase tracking-wider">Saldo Kas Bersih RT 04</span>
            </div>
            <button onclick="switchTab('kas')" class="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center space-x-1 group">
              <span>Buku Kas</span>
              <i class="ph-bold ph-arrow-right transition transform group-hover:translate-x-1"></i>
            </button>
          </div>

          <div>
            <p class="text-3xl font-black font-display tracking-tight text-white">Rp ${saldoKas.toLocaleString('id-ID')}</p>
            <p class="text-[11px] text-slate-400 mt-1">Saldo mutasi kas riil terupdate termasuk iuran dan belanja fasilitas.</p>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
            <div class="p-2.5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div class="flex items-center gap-1 text-[10.5px] text-slate-400">
                <i class="ph-bold ph-arrow-down-left text-emerald-400"></i>
                <span>Total Pemasukan</span>
              </div>
              <p class="text-sm font-black text-emerald-400 mt-0.5">Rp ${totalKasMasuk.toLocaleString('id-ID')}</p>
            </div>
            <div class="p-2.5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div class="flex items-center gap-1 text-[10.5px] text-slate-400">
                <i class="ph-bold ph-arrow-up-right text-rose-400"></i>
                <span>Total Pengeluaran</span>
              </div>
              <p class="text-sm font-black text-rose-400 mt-0.5">Rp ${totalKasKeluar.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        <!-- Metric Mini Bento Card: Statistik Warga & Iuran -->
        <div class="bg-white p-4.5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase text-slate-400">Kependudukan</span>
              <i class="ph-bold ph-users-three text-brand-600 text-lg"></i>
            </div>
            <p class="text-2xl font-black text-slate-900 mt-1">${totalKK} <span class="text-xs font-semibold text-slate-500">KK</span></p>
            <p class="text-[11px] text-slate-500">${totalJiwa} Jiwa Terdata</p>
          </div>

          <div class="pt-3 border-t border-slate-100">
            <div class="flex items-center justify-between text-[11px] font-bold mb-1">
              <span class="text-slate-600">Realisasi ${CURRENT_MONTH_NAME}</span>
              <span class="text-brand-600">${persentaseIuran}%</span>
            </div>
            <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-brand-500 to-teal-500 rounded-full transition-all duration-500" style="width: ${persentaseIuran}%"></div>
            </div>
            <p class="text-[10px] text-slate-400 mt-1.5">${kkLunasBulanIni} dari ${totalKK} KK telah lunas</p>
          </div>
        </div>
      </div>

      <!-- Super Admin Quick Alert Bar -->
      ${isAdmin() ? `
        <div class="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white p-4 rounded-3xl shadow-md flex items-center justify-between border border-rose-800/40">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-2xl bg-rose-600/30 flex items-center justify-center text-rose-400 border border-rose-500/30">
              <i class="ph-bold ph-shield-star text-xl"></i>
            </div>
            <div>
              <h4 class="text-xs font-black">Mode Super Administrator Aktif</h4>
              <p class="text-[11px] text-rose-200/80">Kelola akun pengurus, tarif iuran, dan pengaturan sistem RT</p>
            </div>
          </div>
          <button onclick="switchTab('admin')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow active:scale-95">
            Pengaturan
          </button>
        </div>
      ` : ''}

      <!-- Grafik Arus Kas Ringkasan di Beranda -->
      <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <i class="ph-bold ph-chart-line-up text-brand-600 text-base"></i>
              Grafik Arus Kas RT 04 (${CURRENT_YEAR})
            </h3>
            <p class="text-[11px] text-slate-400">Pergerakan pemasukan dan pengeluaran kas bulanan</p>
          </div>
          <div class="flex items-center space-x-2 text-[10.5px] font-bold">
            <span class="flex items-center space-x-1 text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200/60">
              <span class="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
              <span>Masuk</span>
            </span>
            <span class="flex items-center space-x-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
              <span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
              <span>Keluar</span>
            </span>
          </div>
        </div>
        <div class="relative w-full h-52">
          <canvas id="chartBerandaKasIuran"></canvas>
        </div>
      </div>

      <!-- Seksi Khusus Demografi & Kependudukan RT 04 -->
      ${renderDashboardKependudukanSection()}

      <!-- Layout Responsif Desktop: Radar Tunggakan Berdampingan dengan Agenda & Aspirasi -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div class="space-y-4">
          <!-- Radar Tunggakan Iuran Warga -->
          ${renderDashboardTunggakanSection()}
        </div>

        <div class="space-y-4">
          <!-- Agenda Kegiatan Warga RT 04 -->
          <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3.5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i class="ph-bold ph-calendar-check text-brand-600 text-base"></i>
                  Agenda Kegiatan Warga
                </h3>
                <p class="text-[11px] text-slate-400 mt-0.5">Jadwal kegiatan dan musyawarah lingkungan RT 04</p>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">${db.agenda.length} Agenda</span>
                ${canManageAgenda() ? `
                  <button onclick="openModalTambahAgenda()" class="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-xs active:scale-95">
                    <i class="ph-bold ph-plus"></i>
                    <span>Tambah</span>
                  </button>
                ` : ''}
              </div>
            </div>

            <div class="space-y-2.5">
              ${db.agenda.length === 0 ? `
                <div class="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <i class="ph-bold ph-calendar-blank text-2xl text-slate-400 mb-1 inline-block"></i>
                  <p class="text-xs font-bold text-slate-500">Belum ada agenda kegiatan yang dijadwalkan.</p>
                </div>
              ` : db.agenda.map(a => `
                <div class="p-3.5 bg-slate-50 hover:bg-brand-50/40 rounded-2xl border border-slate-200/70 flex items-start space-x-3 transition">
                  <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-500 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                    <i class="ph-bold ph-calendar-star text-lg"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <h4 class="text-xs font-black text-slate-900">${a.judul}</h4>
                      ${canManageAgenda() ? `
                        <button onclick="hapusAgenda('${a.id}', '${a.judul.replace(/'/g, "\\'")}')" title="Hapus Agenda" class="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition flex-shrink-0">
                          <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                      ` : ''}
                    </div>
                    <div class="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      <span class="flex items-center gap-1"><i class="ph-bold ph-clock text-brand-600"></i> ${a.tanggal} • ${a.jam}</span>
                      <span>•</span>
                      <span class="flex items-center gap-1"><i class="ph-bold ph-map-pin text-rose-500"></i> ${a.lokasi}</span>
                    </div>
                    <p class="text-[11px] text-slate-600 mt-1.5 bg-white p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">${a.info}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Laporan & Aspirasi Masalah Lingkungan Warga di Dashboard Depan -->
          ${renderDashboardLaporanSection()}
        </div>
      </div>

    </div>
  `;
}

// ------------------------------------------
// Sub-Komponen Dashboard: Demografi & Kependudukan RT 04
// ------------------------------------------
function renderDashboardKependudukanSection() {
  const totalKK = db.warga.length;
  const totalJiwa = db.warga.reduce((a, b) => a + (Number(b.anggota) || 1), 0);
  const tetapCount = db.warga.filter(w => w.status === 'Tetap').length;
  const kontrakCount = db.warga.filter(w => w.status === 'Kontrak').length;
  const pctTetap = totalKK > 0 ? Math.round((tetapCount / totalKK) * 100) : 0;
  const pctKontrak = totalKK > 0 ? Math.round((kontrakCount / totalKK) * 100) : 0;
  const avgJiwa = totalKK > 0 ? (totalJiwa / totalKK).toFixed(1) : '0.0';

  const blokNames = ['Ciskul I', 'Ciskul 6', 'Ciskul 7', 'Ciskul 8', 'Ciskul 9', 'Ciskul 10'];
  const blokData = blokNames.map(b => ({
    nama: b,
    count: db.warga.filter(w => w.noRumah && (w.noRumah.includes(b) || (b === 'Ciskul I' && /\bCiskul 1\b/i.test(w.noRumah)))).length
  }));

  const blokSorted = [...blokData].sort((a, b) => b.count - a.count);
  const blokTerbanyak = blokSorted[0] && blokSorted[0].count > 0 ? blokSorted[0] : { nama: 'Ciskul 9', count: 0 };

  return `
    <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
      
      <!-- Header Demografi Beranda -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-display">
              <i class="ph-duotone ph-users-three text-brand-600 text-lg"></i>
              Demografi & Kependudukan RT 04
            </h3>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">Statistik warga, komposisi hunian & persebaran blok jalan</p>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <button onclick="subTabWarga = 'sensus'; switchTab('warga');" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 rounded-xl text-[10.5px] font-bold transition flex items-center gap-1 active:scale-95 shadow-2xs">
            <i class="ph-bold ph-user-plus text-amber-600"></i>
            <span>+ e-Sensus</span>
          </button>
          <button onclick="subTabWarga = 'direktori'; switchTab('warga');" class="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/60 rounded-xl text-[10.5px] font-bold transition flex items-center gap-1 active:scale-95 shadow-2xs">
            <span>Direktori KK</span>
            <i class="ph-bold ph-arrow-right text-xs"></i>
          </button>
        </div>
      </div>

      <!-- 4 Bento Cards dengan Warna-Warni Menarik & Gradien Modern -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        
        <!-- Card 1: Total KK (Emerald-Teal) -->
        <div class="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-3.5 rounded-2xl shadow-md shadow-emerald-600/20 group hover:shadow-lg transition">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-100/90">Kepala Keluarga</span>
            <div class="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <i class="ph-bold ph-house-line text-sm"></i>
            </div>
          </div>
          <p class="text-xl sm:text-2xl font-black font-display tracking-tight text-white">${totalKK} <span class="text-xs font-semibold text-emerald-200">KK</span></p>
          <p class="text-[10px] text-emerald-100/80 mt-1 font-medium truncate">${tetapCount} Tetap • ${kontrakCount} Kontrak</p>
          <i class="ph-duotone ph-house absolute -right-3 -bottom-3 text-5xl text-white/10 pointer-events-none group-hover:scale-110 transition"></i>
        </div>

        <!-- Card 2: Total Jiwa (Indigo-Blue) -->
        <div class="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-700 text-white p-3.5 rounded-2xl shadow-md shadow-blue-600/20 group hover:shadow-lg transition">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider text-blue-100/90">Total Populasi</span>
            <div class="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <i class="ph-bold ph-users text-sm"></i>
            </div>
          </div>
          <p class="text-xl sm:text-2xl font-black font-display tracking-tight text-white">${totalJiwa} <span class="text-xs font-semibold text-blue-200">Jiwa</span></p>
          <p class="text-[10px] text-blue-100/80 mt-1 font-medium truncate">Rata-rata ${avgJiwa} Jiwa / KK</p>
          <i class="ph-duotone ph-users-three absolute -right-3 -bottom-3 text-5xl text-white/10 pointer-events-none group-hover:scale-110 transition"></i>
        </div>

        <!-- Card 3: Warga Tetap (Violet-Purple) -->
        <div class="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-fuchsia-800 text-white p-3.5 rounded-2xl shadow-md shadow-purple-600/20 group hover:shadow-lg transition">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider text-purple-100/90">Warga Tetap</span>
            <div class="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <i class="ph-bold ph-shield-check text-sm"></i>
            </div>
          </div>
          <p class="text-xl sm:text-2xl font-black font-display tracking-tight text-white">${pctTetap}% <span class="text-xs font-semibold text-purple-200">Pemilik</span></p>
          <p class="text-[10px] text-purple-100/80 mt-1 font-medium truncate">${tetapCount} dari ${totalKK} KK Tetap</p>
          <i class="ph-duotone ph-certificate absolute -right-3 -bottom-3 text-5xl text-white/10 pointer-events-none group-hover:scale-110 transition"></i>
        </div>

        <!-- Card 4: Blok Terpadat (Amber-Orange) -->
        <div class="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white p-3.5 rounded-2xl shadow-md shadow-amber-600/20 group hover:shadow-lg transition">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-black uppercase tracking-wider text-amber-100/90">Blok Terbanyak</span>
            <div class="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <i class="ph-bold ph-map-pin text-sm"></i>
            </div>
          </div>
          <p class="text-lg sm:text-xl font-black font-display tracking-tight text-white truncate">${blokTerbanyak.nama}</p>
          <p class="text-[10px] text-amber-100/80 mt-1 font-medium truncate">${blokTerbanyak.count} KK terdaftar</p>
          <i class="ph-duotone ph-map-pin-line absolute -right-3 -bottom-3 text-5xl text-white/10 pointer-events-none group-hover:scale-110 transition"></i>
        </div>

      </div>

      <!-- Dua Visualisasi Grafik Berdampingan -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        
        <!-- Grafik 1: Sebaran KK per Blok Jalan -->
        <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <i class="ph-bold ph-chart-bar text-sky-600"></i>
                Sebaran KK per Blok Jalan
              </h4>
              <p class="text-[10px] text-slate-400">Distribusi wilayah Ciskul I s.d. Ciskul 10</p>
            </div>
            <span class="text-[9px] font-black px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
              6 Blok
            </span>
          </div>
          <div class="relative w-full h-44">
            <canvas id="chartBerandaDistribusiBlok"></canvas>
          </div>
        </div>

        <!-- Grafik 2: Komposisi Status Hunian -->
        <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <i class="ph-bold ph-chart-pie-slice text-emerald-600"></i>
                Komposisi Status Hunian
              </h4>
              <p class="text-[10px] text-slate-400">Rasio warga tetap vs warga kontrak/sewa</p>
            </div>
            <span class="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              ${pctTetap}% Tetap
            </span>
          </div>
          <div class="relative w-full h-44 flex items-center justify-center">
            <canvas id="chartBerandaDemografi"></canvas>
          </div>
        </div>

      </div>

      <!-- Quick Blok Navigation Pills (Klik untuk filter langsung ke tab warga) -->
      <div class="pt-2 border-t border-slate-100 space-y-2">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-extrabold text-slate-700 flex items-center gap-1">
            <i class="ph-bold ph-compass text-brand-600"></i>
            Persebaran per Blok Jalan (Klik untuk filter warga):
          </span>
          <span class="text-[10px] text-slate-400 font-bold">RT 04 / RW 14</span>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${blokData.map(b => `
            <button onclick="wargaFilterBlok = '${b.nama}'; subTabWarga = 'direktori'; switchTab('warga');" class="px-2.5 py-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-800 border border-slate-200/80 hover:border-brand-300 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs group active:scale-95">
              <span class="w-2 h-2 rounded-full bg-brand-500 group-hover:scale-125 transition"></span>
              <span>${b.nama}</span>
              <span class="px-1.5 py-0.5 rounded-md bg-white text-slate-900 text-[10px] font-black border border-slate-200">${b.count} KK</span>
            </button>
          `).join('')}
          <button onclick="wargaFilterBlok = 'semua'; subTabWarga = 'direktori'; switchTab('warga');" class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95">
            <i class="ph-bold ph-list-magnifying-glass"></i>
            <span>Semua KK (${totalKK})</span>
          </button>
        </div>
      </div>

    </div>
  `;
}

// ------------------------------------------
// Sub-Komponen Dashboard: Tunggakan Iuran
// ------------------------------------------
function renderDashboardTunggakanSection() {
  const tarif = Number(appConfig.tarifIuran) || 75000;
  
  const bulanLaluList = [];
  for (let m = 0; m < CURRENT_MONTH_IDX; m++) {
    bulanLaluList.push(`${NAMA_BULAN_ID[m]} ${CURRENT_YEAR}`);
  }

  const bulanBerjalanList = [];
  for (let m = 0; m <= CURRENT_MONTH_IDX; m++) {
    bulanBerjalanList.push(`${NAMA_BULAN_ID[m]} ${CURRENT_YEAR}`);
  }

  const targetBulan = berandaTunggakanBulan || `${CURRENT_MONTH_NAME} ${CURRENT_YEAR}`;

  const daftarPenunggak = [];
  let totalUangTunggakan = 0;

  db.warga.forEach(w => {
    const lunasBulanWarga = new Set(
      db.iuran
        .filter(i => i.nama.toLowerCase().trim() === w.nama.toLowerCase().trim() && i.status === 'Lunas')
        .map(i => i.bulan)
    );

    if (filterTunggakanMode === 'bulan_lalu') {
      const nunggakLalu = bulanLaluList.filter(b => !lunasBulanWarga.has(b));
      if (nunggakLalu.length > 0) {
        const nom = nunggakLalu.length * tarif;
        daftarPenunggak.push({ ...w, bulanNunggak: nunggakLalu, nominalTunggak: nom, tipeTunggak: 'lampau' });
        totalUangTunggakan += nom;
      }
    } else if (filterTunggakanMode === 'perbulan') {
      if (!lunasBulanWarga.has(targetBulan)) {
        daftarPenunggak.push({ ...w, bulanNunggak: [targetBulan], nominalTunggak: tarif, tipeTunggak: 'spesifik' });
        totalUangTunggakan += tarif;
      }
    } else {
      const nunggakList = bulanBerjalanList.filter(b => !lunasBulanWarga.has(b));
      if (nunggakList.length > 0) {
        const nom = nunggakList.length * tarif;
        const adaBulanLalu = nunggakList.some(b => bulanLaluList.includes(b));
        daftarPenunggak.push({ ...w, bulanNunggak: nunggakList, nominalTunggak: nom, tipeTunggak: adaBulanLalu ? 'lampau' : 'berjalan' });
        totalUangTunggakan += nom;
      }
    }
  });

  return `
    <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3.5">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <i class="ph-bold ph-warning-circle text-rose-500 text-base"></i>
            Radar Iuran Warga Belum Lunas
          </h3>
          <p class="text-[11px] text-slate-400 mt-0.5">
            ${daftarPenunggak.length} KK Belum Lunas (Total Rp ${totalUangTunggakan.toLocaleString('id-ID')})
            ${canManageIuran() ? '<span class="text-brand-600 font-black ml-1">• Akses Kelola Aktif</span>' : ''}
          </p>
        </div>
        <div class="flex items-center space-x-1 flex-wrap gap-1">
          <button onclick="setFilterTunggakanMode('bulan_lalu')" class="px-2.5 py-1 rounded-xl text-[10px] font-black transition ${filterTunggakanMode === 'bulan_lalu' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            Bulan-Bulan Lalu
          </button>
          <button onclick="setFilterTunggakanMode('akumulasi')" class="px-2.5 py-1 rounded-xl text-[10px] font-black transition ${filterTunggakanMode === 'akumulasi' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            s/d ${CURRENT_MONTH_NAME}
          </button>
          <button onclick="setFilterTunggakanMode('perbulan')" class="px-2.5 py-1 rounded-xl text-[10px] font-black transition ${filterTunggakanMode === 'perbulan' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            Pilih Bulan
          </button>
        </div>
      </div>

      ${filterTunggakanMode === 'bulan_lalu' ? `
        <div class="bg-rose-50 border border-rose-100 p-2.5 rounded-2xl flex items-center justify-between text-[11px] text-rose-800 font-medium">
          <span>Menampilkan rekapitulasi tunggakan warga sebelum bulan berjalan (${CURRENT_MONTH_NAME} ${CURRENT_YEAR}).</span>
          <span class="font-black">${bulanLaluList.length} Bulan Lampau</span>
        </div>
      ` : ''}

      ${filterTunggakanMode === 'perbulan' ? `
        <div class="flex items-center space-x-2 pt-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
          <label class="text-[11px] font-bold text-slate-600">Pilih Bulan Target:</label>
          <select onchange="changeBerandaTunggakanBulan(this.value)" class="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none">
            ${bulanBerjalanList.map(b => `<option value="${b}" ${targetBulan === b ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>
      ` : ''}

      ${daftarPenunggak.length === 0 ? `
        <div class="p-6 text-center bg-brand-50/70 rounded-2xl border border-brand-100">
          <i class="ph-bold ph-seal-check text-3xl text-brand-600 mb-1 inline-block"></i>
          <p class="text-xs font-black text-brand-900">Alhamdulillah, Tidak Ada Tunggakan!</p>
          <p class="text-[11px] text-brand-700 mt-0.5">Semua warga telah melunasi iuran untuk filter periode yang dipilih.</p>
        </div>
      ` : `
        <div class="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          ${daftarPenunggak.map((w) => {
            const pesanWa = `Halo Bpk/Ibu ${w.nama} (${w.noRumah}), salam hangat dari Pengurus RT 04 / RW 14 Cisaranten Kulon. Mengingatkan informasi iuran kas RT untuk periode ${w.bulanNunggak.join(', ')} sebesar Rp ${w.nominalTunggak.toLocaleString('id-ID')}. Pembayaran dapat melalui Bendahara RT (${appConfig.namaBendahara}). Hatur nuhun.`;
            return `
            <div class="p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200/80 flex items-center justify-between flex-wrap gap-2 transition">
              <div class="min-w-0 flex-1">
                <div class="flex items-center space-x-2">
                  <h4 class="text-xs font-black text-slate-900 truncate">${w.nama}</h4>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-black ${w.bulanNunggak.length > 1 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
                    ${w.bulanNunggak.length} Bulan Menunggak
                  </span>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5">${w.noRumah} • Total: <span class="text-rose-600 font-black">Rp ${w.nominalTunggak.toLocaleString('id-ID')}</span></p>
                <p class="text-[10px] text-rose-600 font-semibold mt-0.5 leading-tight">
                  <b>Bulan:</b> ${w.bulanNunggak.join(', ')}
                </p>
              </div>
              <div class="flex items-center space-x-1.5 flex-wrap">
                <button onclick="openModalKartuIuran('${w.nama.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition shadow-2xs">
                  Kartu Iuran
                </button>
                ${isPengurus() && w.telp ? `
                  <a href="https://wa.me/${w.telp.replace(/^0/, '62')}?text=${encodeURIComponent(pesanWa)}" target="_blank" class="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-xs" title="Kirim Pengingat WhatsApp">
                    <i class="ph-bold ph-whatsapp-logo text-sm"></i>
                    <span class="hidden sm:inline">WA</span>
                  </a>
                ` : ''}
                ${canManageIuran() ? `
                  <button onclick="lunaskanCepat('${w.nama.replace(/'/g, "\\'")}', '${w.bulanNunggak[0]}', ${tarif})" class="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[11px] font-bold transition shadow-xs active:scale-95" title="Lunaskan bulan tertua (${w.bulanNunggak[0]})">
                    + Lunas 1 Bln
                  </button>
                  ${w.bulanNunggak.length > 1 ? `
                    <button onclick="lunaskanSemuaTunggakan('${w.nama.replace(/'/g, "\\'")}', ${JSON.stringify(w.bulanNunggak).replace(/"/g, '&quot;')}, ${tarif})" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition shadow-xs active:scale-95" title="Lunaskan semua bulan sekaligus">
                      Lunas Semua
                    </button>
                  ` : ''}
                ` : ''}
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function setFilterTunggakanMode(mode) {
  filterTunggakanMode = mode;
  renderApp();
}

function changeBerandaTunggakanBulan(val) {
  berandaTunggakanBulan = val;
  renderApp();
}

// ------------------------------------------
// Sub-Komponen Dashboard: Aspirasi / Laporan
// ------------------------------------------
function renderDashboardLaporanSection() {
  const totalLaporan = db.aspirasi.length;
  const selesaiCount = db.aspirasi.filter(l => l.status === 'Selesai').length;
  const prosesCount = db.aspirasi.filter(l => l.status === 'Diproses').length;
  const pendingCount = db.aspirasi.filter(l => l.status === 'Menunggu' || !l.status).length;

  return `
    <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3.5">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <i class="ph-bold ph-chat-circle-dots text-brand-600 text-base"></i>
            Laporan & Aspirasi Warga RT 04
          </h3>
          <p class="text-[11px] text-slate-400 mt-0.5">Pengaduan sarpras, kebersihan, & saran kemajuan lingkungan</p>
        </div>
        <button onclick="openModalTambahLaporanBeranda()" class="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[11px] font-black transition shadow-sm flex items-center gap-1.5 active:scale-95">
          <i class="ph-bold ph-plus-circle text-sm"></i>
          <span>+ Buat Laporan</span>
        </button>
      </div>

      <!-- Status Metric Pills -->
      <div class="grid grid-cols-3 gap-2 pt-0.5">
        <div class="p-2.5 rounded-2xl bg-amber-50 border border-amber-100 text-center">
          <span class="text-[10px] font-bold text-amber-700 uppercase">Menunggu</span>
          <p class="text-sm font-black text-amber-900">${pendingCount}</p>
        </div>
        <div class="p-2.5 rounded-2xl bg-blue-50 border border-blue-100 text-center">
          <span class="text-[10px] font-bold text-blue-700 uppercase">Diproses</span>
          <p class="text-sm font-black text-blue-900">${prosesCount}</p>
        </div>
        <div class="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
          <span class="text-[10px] font-bold text-emerald-700 uppercase">Selesai</span>
          <p class="text-sm font-black text-emerald-900">${selesaiCount}</p>
        </div>
      </div>

      <!-- Daftar Kartu Laporan Warga -->
      <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
        ${totalLaporan === 0 ? `
          <div class="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <i class="ph-bold ph-chats-teardrop text-2xl text-slate-400 mb-1 inline-block"></i>
            <p class="text-xs font-bold text-slate-500">Belum ada laporan dari warga saat ini.</p>
          </div>
        ` : db.aspirasi.map(l => {
          const status = l.status || 'Menunggu';
          const statusColor = status === 'Selesai' 
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
            : (status === 'Diproses' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200');

          return `
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 transition hover:bg-slate-100/70">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center space-x-2">
                  <div class="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-black shadow-2xs">
                    ${l.pelapor ? l.pelapor.charAt(0).toUpperCase() : 'W'}
                  </div>
                  <div>
                    <h4 class="text-xs font-black text-slate-900">${l.pelapor || 'Warga RT 04'}</h4>
                    <p class="text-[10px] text-slate-400">${l.tgl || '-'}</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${statusColor}">
                  ${status}
                </span>
              </div>

              <p class="text-xs text-slate-700 leading-relaxed font-medium bg-white p-2.5 rounded-xl border border-slate-200/60">
                "${l.pesan}"
              </p>

              ${l.respon ? `
                <div class="p-2.5 rounded-xl bg-brand-50/80 border border-brand-100 text-[11px] text-brand-950 flex items-start space-x-2">
                  <i class="ph-bold ph-arrow-bend-down-right text-brand-600 text-sm mt-0.5 flex-shrink-0"></i>
                  <div class="flex-1">
                    <span class="font-black block text-[10px] uppercase text-brand-800">Tindak Lanjut Pengurus RT:</span>
                    <p class="mt-0.5 text-slate-800 font-medium">${l.respon}</p>
                  </div>
                </div>
              ` : ''}

              ${isPengurus() ? `
                <div class="flex items-center justify-end space-x-2 pt-1 border-t border-slate-200/60">
                  <button onclick="openModalTanggapiLaporan('${l.id}')" class="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition flex items-center gap-1">
                    <i class="ph-bold ph-note-pencil"></i>
                    <span>Tanggapi / Update</span>
                  </button>
                  <button onclick="hapusLaporanWarga('${l.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition" title="Hapus Laporan">
                    <i class="ph-bold ph-trash text-xs"></i>
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        }).reverse().join('')}
      </div>
    </div>
  `;
}

// ==========================================
// 2. HALAMAN BUKU KAS KEUANGAN
// ==========================================
function renderKas() {
  const totalMasuk = db.kas.filter(k => k.tipe === 'masuk').reduce((a, b) => a + (Number(b.nominal) || 0), 0);
  const totalKeluar = db.kas.filter(k => k.tipe === 'keluar').reduce((a, b) => a + (Number(b.nominal) || 0), 0);
  const saldo = totalMasuk - totalKeluar;

  return `
    <div class="p-4 lg:p-6 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-base font-black text-slate-900 font-display">Buku Kas Keuangan RT 04</h2>
          <p class="text-[11px] text-slate-500">Transparansi arus kas, pencatatan transaksi, dan audit lingkungan</p>
        </div>
        <div class="flex items-center space-x-2">
          ${canManageKeuangan() ? `
            <button onclick="bukaModalResetKas()" class="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1 active:scale-95">
              <i class="ph-bold ph-arrow-counter-clockwise text-sm"></i>
              <span class="hidden sm:inline">Reset Kas</span>
            </button>
          ` : ''}
          ${canLaporanKas() ? `
            <button onclick="openModalLaporanKas()" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center space-x-1.5 active:scale-95">
              <i class="ph-bold ph-file-pdf text-base"></i>
              <span>Laporan PDF</span>
            </button>
          ` : ''}
          ${canManageKeuangan() ? `
            <button onclick="openModalCatatKas()" class="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center space-x-1.5 active:scale-95">
              <i class="ph-bold ph-plus-circle text-base"></i>
              <span>Catat Transaksi</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- 3 Bento Cards Keuangan -->
      <div class="grid grid-cols-3 gap-2.5">
        <div class="bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-3.5 rounded-3xl shadow-lg shadow-blue-500/20 border border-blue-500/30">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black text-blue-100 uppercase tracking-wider">Saldo Kas</span>
            <i class="ph-bold ph-wallet text-blue-200 text-base"></i>
          </div>
          <p class="text-xs sm:text-base font-black tracking-tight leading-tight">Rp ${saldo.toLocaleString('id-ID')}</p>
        </div>
        <div class="bg-gradient-to-br from-brand-600 to-teal-800 text-white p-3.5 rounded-3xl shadow-lg shadow-brand-500/20 border border-brand-500/30">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black text-emerald-100 uppercase tracking-wider">Pemasukan</span>
            <i class="ph-bold ph-arrow-circle-down text-emerald-200 text-base"></i>
          </div>
          <p class="text-xs sm:text-base font-black tracking-tight leading-tight">+Rp ${totalMasuk.toLocaleString('id-ID')}</p>
        </div>
        <div class="bg-gradient-to-br from-rose-600 to-red-800 text-white p-3.5 rounded-3xl shadow-lg shadow-rose-500/20 border border-rose-500/30">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-black text-rose-100 uppercase tracking-wider">Pengeluaran</span>
            <i class="ph-bold ph-arrow-circle-up text-rose-200 text-base"></i>
          </div>
          <p class="text-xs sm:text-base font-black tracking-tight leading-tight">-Rp ${totalKeluar.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <!-- Layout Responsif Desktop: Grafik Komparasi Berdampingan dengan Riwayat Mutasi -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <!-- Kolom Kiri: Grafik Arus Kas -->
        <div class="lg:col-span-5 space-y-4">
          <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Tren Arus Kas Bulanan</h3>
                <p class="text-[11px] text-slate-400">Komparasi mutasi kas masuk dan keluar RT 04</p>
              </div>
              <div class="flex items-center space-x-2 text-[10.5px] font-bold">
                <span class="flex items-center space-x-1 text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200/60">
                  <span class="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                  <span>Masuk</span>
                </span>
                <span class="flex items-center space-x-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                  <span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                  <span>Keluar</span>
                </span>
              </div>
            </div>
            <div class="relative w-full h-56 lg:h-72">
              <canvas id="chartKasKomparasi"></canvas>
            </div>
          </div>
        </div>

        <!-- Kolom Kanan: Riwayat Transaksi Buku Kas -->
        <div class="lg:col-span-7 space-y-4">
          <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Riwayat Mutasi Transaksi</h3>
              <span class="text-[11px] text-slate-400 font-bold">${db.kas.length} Catatan</span>
            </div>
            <div class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              ${db.kas.map(k => `
                <div class="p-3.5 ${k.tipe === 'masuk' ? 'bg-emerald-50/50 border-emerald-100/90' : 'bg-rose-50/40 border-rose-100/90'} rounded-2xl border flex items-center justify-between transition hover:shadow-2xs">
                  <div class="min-w-0 flex-1 pr-2">
                    <p class="text-xs font-bold text-slate-900 truncate">${k.keterangan}</p>
                    <p class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span>${k.tanggal}</span>
                      <span>•</span>
                      <span class="font-extrabold uppercase ${k.tipe === 'masuk' ? 'text-emerald-700' : 'text-rose-700'}">${k.tipe}</span>
                    </p>
                  </div>
                  <div class="flex items-center space-x-2 flex-shrink-0">
                    <p class="text-xs font-black ${k.tipe === 'masuk' ? 'text-emerald-600' : 'text-rose-600'}">
                      ${k.tipe === 'masuk' ? '+' : '-'}Rp ${(Number(k.nominal) || 0).toLocaleString('id-ID')}
                    </p>
                    ${canManageKeuangan() ? `
                      <button onclick="hapusKas('${k.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition" title="Hapus Transaksi">
                        <i class="ph-bold ph-trash text-sm"></i>
                      </button>
                    ` : ''}
                  </div>
                </div>
              `).reverse().join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Modal Catat Transaksi Kas
function openModalCatatKas() {
  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">Keuangan RT 04</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">Catat Mutasi Kas Baru</h3>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><i class="ph-bold ph-x text-lg"></i></button>
      </div>
      <form onsubmit="handleCatatKasSubmit(event)" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tipe Transaksi</label>
          <select id="kasTipe" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="masuk">Pemasukan Kas (+)</option>
            <option value="keluar">Pengeluaran Kas (-)</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal Transaksi</label>
          <input type="date" id="kasTanggal" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nominal (Rupiah)</label>
          <input type="number" id="kasNominal" required min="1000" placeholder="Contoh: 150000" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Keterangan / Keperluan</label>
          <input type="text" id="kasKeterangan" required placeholder="Contoh: Pembelian lampu penerangan jalan Ciskul 9" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div class="pt-1">
          <button type="submit" class="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center space-x-2 active:scale-95">
            <i class="ph-bold ph-floppy-disk text-base"></i>
            <span>Simpan Transaksi Kas</span>
          </button>
        </div>
      </form>
    </div>
  `;
  openModal(html);
}

function handleCatatKasSubmit(e) {
  e.preventDefault();
  const tipe = document.getElementById('kasTipe').value;
  const tanggal = document.getElementById('kasTanggal').value;
  const nominal = Number(document.getElementById('kasNominal').value);
  const keterangan = document.getElementById('kasKeterangan').value.trim();

  const itemKas = {
    id: 'K' + Date.now().toString().slice(-4),
    tanggal, tipe, nominal, keterangan
  };
  db.kas.push(itemKas);
  kirimDataKeSheets('ADD_KAS', itemKas);
  logEvent('KAS', `Input mutasi kas ${tipe}: Rp ${nominal.toLocaleString('id-ID')} (${keterangan})`, tipe === 'keluar' ? 'warning' : 'success');

  closeModal();
  showToast('Transaksi kas berhasil dicatat!');
  triggerConfetti();
  renderApp();
}

function hapusKas(id) {
  const k = db.kas.find(x => x.id === id);
  const infoHapus = k ? `${k.keterangan || 'Mutasi Kas'} (Rp ${Number(k.nominal || 0).toLocaleString('id-ID')})` : id;
  db.kas = db.kas.filter(k => k.id !== id);
  kirimDataKeSheets('DELETE_KAS', { id });
  logEvent('KAS', `Hapus mutasi kas: ${infoHapus}`, 'danger');
  showToast('Transaksi kas berhasil dihapus.');
  renderApp();
}

function bukaModalResetKas() {
  if (!canManageKeuangan()) {
    showToast('Hanya Bendahara RT dan Admin yang berhak mereset buku kas!', 'error');
    return;
  }
  const html = `
    <div class="space-y-4 text-center p-2">
      <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
        <i class="ph-bold ph-arrow-counter-clockwise"></i>
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-900">Reset Buku Kas ke Saldo Nol?</h3>
        <p class="text-xs text-slate-500 mt-1">Seluruh riwayat mutasi kas akan dikembalikan ke saldo awal sistem (Rp 0). Tindakan ini tidak dapat dibatalkan.</p>
      </div>
      <div class="flex space-x-2 pt-2">
        <button onclick="closeModal()" class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
        <button onclick="eksekusiResetKas()" class="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow">Ya, Reset Kas</button>
      </div>
    </div>
  `;
  openModal(html);
}

function eksekusiResetKas() {
  db.kas = JSON.parse(JSON.stringify(defaultKasData));
  kirimDataKeSheets('RESET_KAS', {});
  closeModal();
  showToast('Buku kas berhasil direset ke saldo awal (Rp 0).');
  renderApp();
}

// Cetak Laporan PDF Resmi RT 04
function openModalLaporanKas() {
  const tahunSet = new Set();
  db.kas.forEach(k => {
    if (k.tanggal) tahunSet.add(k.tanggal.substring(0, 4));
  });
  const tahunList = Array.from(tahunSet).sort().reverse();
  if (!tahunList.includes(String(CURRENT_YEAR))) tahunList.unshift(String(CURRENT_YEAR));

  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">Dokumen Resmi RT</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">Unduh Laporan Rekapitulasi Kas</h3>
          <p class="text-[11px] text-slate-500">Format Resmi Bersama Ketua RT & Bendahara RT</p>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
          <i class="ph-bold ph-x text-lg"></i>
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Periode Laporan</label>
          <select id="laporanPeriodeType" onchange="toggleFilterBulanLaporan(this.value)" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="semua">Keseluruhan Transaksi Pembukuan</option>
            <option value="tahun" selected>Per Tahun Anggaran</option>
            <option value="bulan">Per Bulan Spesifik</option>
          </select>
        </div>

        <div id="wrapperFilterTahun" class="space-y-1">
          <label class="block text-[11px] font-bold text-slate-600 uppercase">Tahun Anggaran</label>
          <select id="laporanFilterTahun" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
            ${tahunList.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>

        <div id="wrapperFilterBulan" class="space-y-1 hidden">
          <label class="block text-[11px] font-bold text-slate-600 uppercase">Pilih Bulan</label>
          <select id="laporanFilterBulan" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>

        <div class="bg-indigo-50/80 border border-indigo-100 p-3.5 rounded-2xl text-[11px] text-indigo-900 space-y-1.5">
          <p class="font-black flex items-center gap-1">
            <i class="ph-bold ph-check-circle text-indigo-600"></i>
            Struktur Dokumen Laporan:
          </p>
          <ul class="list-disc list-inside space-y-0.5 text-indigo-800">
            <li>Kop Surat Resmi RT 04 / RW 14</li>
            <li>Tabel Ringkasan Saldo (Pemasukan, Pengeluaran, Saldo Sisa)</li>
            <li>Rincian Transaksi Masuk & Keluar</li>
            <li>Pengesahan Berdampingan: Bendahara RT & Ketua RT</li>
          </ul>
        </div>

        <div class="pt-2">
          <button onclick="prosesCetakLaporanKas()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition shadow-lg flex items-center justify-center space-x-2 active:scale-95">
            <i class="ph-bold ph-printer text-base"></i>
            <span>Buka & Cetak Laporan PDF</span>
          </button>
        </div>
      </div>
    </div>
  `;
  openModal(html);
}

function toggleFilterBulanLaporan(type) {
  const wrapTahun = document.getElementById('wrapperFilterTahun');
  const wrapBulan = document.getElementById('wrapperFilterBulan');
  if (!wrapTahun || !wrapBulan) return;
  if (type === 'semua') {
    wrapTahun.classList.add('hidden');
    wrapBulan.classList.add('hidden');
  } else if (type === 'tahun') {
    wrapTahun.classList.remove('hidden');
    wrapBulan.classList.add('hidden');
  } else if (type === 'bulan') {
    wrapTahun.classList.remove('hidden');
    wrapBulan.classList.remove('hidden');
  }
}

function prosesCetakLaporanKas() {
  const type = document.getElementById('laporanPeriodeType').value;
  const tahun = document.getElementById('laporanFilterTahun')?.value || String(CURRENT_YEAR);
  const bulan = document.getElementById('laporanFilterBulan')?.value || '01';

  const namaBulanMap = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
  };

  let filteredKas = [...db.kas];
  let judulPeriode = 'KESELURUHAN TRANSAKSI PEMBUKUAN';

  if (type === 'tahun') {
    filteredKas = filteredKas.filter(k => k.tanggal && k.tanggal.startsWith(tahun));
    judulPeriode = `TAHUN ANGGARAN ${tahun}`;
  } else if (type === 'bulan') {
    const prefix = `${tahun}-${bulan}`;
    filteredKas = filteredKas.filter(k => k.tanggal && k.tanggal.startsWith(prefix));
    judulPeriode = `BULAN ${namaBulanMap[bulan].toUpperCase()} ${tahun}`;
  }

  const listMasuk = filteredKas.filter(k => k.tipe === 'masuk');
  const listKeluar = filteredKas.filter(k => k.tipe === 'keluar');

  const totalMasuk = listMasuk.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const totalKeluar = listKeluar.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const saldoSisa = totalMasuk - totalKeluar;

  closeModal();

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Rekapitulasi Kas RT 04 - ${judulPeriode}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; padding: 30px 40px; color: #111; line-height: 1.4; font-size: 13px; }
        .header-kop { text-align: center; border-bottom: 3px double #111; padding-bottom: 12px; margin-bottom: 20px; }
        .header-kop h3 { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 1px; }
        .header-kop h2 { margin: 4px 0; font-size: 18px; font-weight: 900; letter-spacing: 0.5px; }
        .header-kop p { margin: 0; font-size: 12px; }
        .doc-title { text-align: center; margin: 18px 0; }
        .doc-title h3 { margin: 0; font-size: 15px; text-decoration: underline; font-weight: 900; }
        .doc-title p { margin: 4px 0 0 0; font-size: 12px; font-weight: bold; }
        .table-rekap { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table-rekap th, .table-rekap td { border: 1px solid #333; padding: 7px 10px; text-align: left; }
        .table-rekap th { background-color: #f1f5f9; font-weight: bold; }
        .section-title { font-weight: bold; font-size: 13px; margin: 16px 0 6px 0; text-transform: uppercase; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge-masuk { color: #047857; font-weight: bold; }
        .badge-keluar { color: #b91c1c; font-weight: bold; }
        .ttd-container { width: 100%; margin-top: 40px; page-break-inside: avoid; }
        .ttd-table { width: 100%; border: none; }
        .ttd-table td { width: 50%; text-align: center; vertical-align: top; border: none; padding: 0; }
        @media print {
          body { padding: 15mm; }
          @page { size: portrait; margin: 10mm; }
        }
      </style>
    </head>
    <body>
      <div class="header-kop">
        <h3>${appConfig.kopBaris1 || 'RUKUN TETANGGA 04 / RUKUN WARGA 14'}</h3>
        <h2>${appConfig.kopBaris2 || 'KELURAHAN CISARANTEN KULON KECAMATAN ARCAMANIK - KOTA BANDUNG'}</h2>
        <p>${appConfig.kopAlamat || 'Sekretariat: Jl. Ciskul Raya No. 9, RT 04 / RW 14, Kota Bandung'} | Telp/WA: ${appConfig.kontakRt || '-'}</p>
      </div>

      <div class="doc-title">
        <h3>LAPORAN REKAPITULASI & ARUS KAS KEUANGAN</h3>
        <p>PERIODE: ${judulPeriode}</p>
      </div>

      <!-- Tabel Ringkasan Saldo -->
      <div class="section-title">I. Ringkasan Rekapitulasi Saldo Kas</div>
      <table class="table-rekap">
        <thead>
          <tr>
            <th style="width: 50px;" class="text-center">No</th>
            <th>Kategori Arus Kas</th>
            <th style="width: 180px;" class="text-right">Nominal (Rupiah)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">1</td>
            <td>Total Pemasukan Kas (Iuran Warga & Kas Awal)</td>
            <td class="text-right badge-masuk">Rp ${totalMasuk.toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td class="text-center">2</td>
            <td>Total Pengeluaran Kas Operasional & Sarpras</td>
            <td class="text-right badge-keluar">Rp ${totalKeluar.toLocaleString('id-ID')}</td>
          </tr>
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td class="text-center" colspan="2">SISA SALDO KAS RT 04</td>
            <td class="text-right" style="font-size: 14px; color: #047857;">Rp ${saldoSisa.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      <!-- Tabel Rincian Pemasukan Kas -->
      <div class="section-title">II. Rincian Pemasukan Kas (${listMasuk.length} Transaksi)</div>
      <table class="table-rekap">
        <thead>
          <tr>
            <th style="width: 40px;" class="text-center">No</th>
            <th style="width: 90px;">Tanggal</th>
            <th>Uraian / Keterangan Pemasukan</th>
            <th style="width: 150px;" class="text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${listMasuk.length === 0 ? `
            <tr><td colspan="4" class="text-center" style="color: #666; font-style: italic;">Tidak ada catatan pemasukan pada periode ini.</td></tr>
          ` : listMasuk.map((k, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td>${k.tanggal}</td>
              <td>${k.keterangan}</td>
              <td class="text-right badge-masuk">Rp ${(Number(k.nominal) || 0).toLocaleString('id-ID')}</td>
            </tr>
          `).join('')}
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <td colspan="3" class="text-right">TOTAL PEMASUKAN:</td>
            <td class="text-right badge-masuk">Rp ${totalMasuk.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      <!-- Tabel Rincian Pengeluaran Kas -->
      <div class="section-title">III. Rincian Pengeluaran Kas (${listKeluar.length} Transaksi)</div>
      <table class="table-rekap">
        <thead>
          <tr>
            <th style="width: 40px;" class="text-center">No</th>
            <th style="width: 90px;">Tanggal</th>
            <th>Uraian / Keterangan Pengeluaran</th>
            <th style="width: 150px;" class="text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${listKeluar.length === 0 ? `
            <tr><td colspan="4" class="text-center" style="color: #666; font-style: italic;">Tidak ada catatan pengeluaran pada periode ini.</td></tr>
          ` : listKeluar.map((k, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td>${k.tanggal}</td>
              <td>${k.keterangan}</td>
              <td class="text-right badge-keluar">Rp ${(Number(k.nominal) || 0).toLocaleString('id-ID')}</td>
            </tr>
          `).join('')}
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <td colspan="3" class="text-right">TOTAL PENGELUARAN:</td>
            <td class="text-right badge-keluar">Rp ${totalKeluar.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top: 15px; font-style: italic; font-size: 11px; color: #444;">
        Catatan: Laporan ini diterbitkan secara otomatis melalui Sistem SatuWarga 04 sebagai bentuk pertanggungjawaban terbuka kepada warga RT 04.
      </p>

      <!-- TTD Pengesahan Resmi -->
      <div class="ttd-container">
        <table class="ttd-table">
          <tr>
            <td>
              <p>Mengetahui & Memverifikasi,</p>
              <p style="font-weight: bold; margin-top: -8px;">${appConfig.jabatanBendahara || 'Bendahara RT 04 / RW 14'}</p>
              <div style="height: 60px;"></div>
              <p style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">${appConfig.namaBendahara || 'H. Ahmad Sobari'}</p>
              <p style="font-size: 11px; color: #555; margin: 0;">Pengurus Keuangan Lingkungan</p>
            </td>
            <td>
              <p>${appConfig.kotaSurat || 'Bandung'}, ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
              <p style="font-weight: bold; margin-top: -8px;">${appConfig.jabatanTtd || 'Ketua RT 04 / RW 14'}</p>
              <div style="height: 60px;"></div>
              <p style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">${appConfig.namaTtd || 'Bambang Sudarsono'}</p>
              <p style="font-size: 11px; color: #555; margin: 0;">Penanggung Jawab Wilayah</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}

// ==========================================
// 3. HALAMAN IURAN WARGA (2026 - 2036)
// ==========================================
function renderIuran() {
  const tarif = Number(appConfig.tarifIuran) || 75000;
  return `
    <div class="p-4 lg:p-6 space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-base font-black text-slate-900 font-display">Rekap Iuran Warga (2026-2036)</h2>
          <p class="text-[11px] text-slate-500">Kartu kendali iuran bulanan dan catatan pembayaran 11 tahun</p>
        </div>
        <div class="flex items-center space-x-2">
          ${canManageIuran() ? `
            <button onclick="bukaModalResetIuran()" class="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1 active:scale-95">
              <i class="ph-bold ph-arrow-counter-clockwise text-sm"></i>
              <span class="hidden sm:inline">Reset Iuran</span>
            </button>
          ` : ''}
          ${canManageIuran() ? `
            <button onclick="openModalCatatIuranBatch()" class="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center space-x-1.5 active:scale-95">
              <i class="ph-bold ph-receipt text-base"></i>
              <span>+ Catat Pelunasan</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Kartu Tarif Aktif Lingkungan -->
      <div class="bg-gradient-to-r from-brand-700 to-teal-800 text-white p-4 rounded-3xl shadow-md flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-emerald-200">
            <i class="ph-bold ph-coins text-xl"></i>
          </div>
          <div>
            <span class="text-[10px] font-black uppercase text-emerald-200 tracking-wider">Tarif Iuran Wajib Warga</span>
            <p class="text-base font-black">Rp ${tarif.toLocaleString('id-ID')} <span class="text-xs font-normal text-emerald-100">/ KK / Bulan</span></p>
          </div>
        </div>
        <span class="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/20 border border-white/20">
          Periode 2026–2036
        </span>
      </div>

      <!-- Layout Responsif Desktop: Grafik Realisasi Berdampingan dengan Kartu Kendali -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <!-- Kolom Kiri: Grafik Realisasi Iuran -->
        <div class="lg:col-span-5 space-y-4">
          <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Grafik Realisasi Iuran Bulanan (${CURRENT_YEAR})</h3>
                <p class="text-[11px] text-slate-400">Realisasi pembayaran dihitung per Kepala Keluarga (KK)</p>
              </div>
              <div class="flex items-center space-x-2 text-[10.5px] font-bold">
                <span class="flex items-center space-x-1 text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200/60">
                  <span class="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                  <span>Lunas</span>
                </span>
                <span class="flex items-center space-x-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                  <span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                  <span>Belum Lunas</span>
                </span>
              </div>
            </div>
            <div class="relative w-full h-56 lg:h-72">
              <canvas id="chartIuranRealisasi"></canvas>
            </div>
          </div>
        </div>

        <!-- Kolom Kanan: Daftar Kartu Kendali Seluruh Kepala Keluarga -->
        <div class="lg:col-span-7 space-y-4">
          <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Kartu Kendali Seluruh Kepala Keluarga</h3>
              <span class="text-[11px] text-slate-400 font-bold">${db.warga.length} Warga</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              ${db.warga.length === 0 ? `
                <div class="col-span-full p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <i class="ph-bold ph-users text-2xl text-slate-400 mb-1 inline-block"></i>
                  <p class="text-xs font-bold text-slate-500">Belum ada data warga / KK terdaftar.</p>
                </div>
              ` : db.warga.map(w => {
                const lunasCount = db.iuran.filter(i => i.nama.toLowerCase().trim() === w.nama.toLowerCase().trim() && i.status === 'Lunas').length;
                return `
                <div class="p-3.5 bg-slate-50 hover:bg-brand-50/40 rounded-2xl border border-slate-200/70 flex items-center justify-between transition">
                  <div class="min-w-0 flex-1 pr-2">
                    <div class="flex items-center space-x-2">
                      <p class="text-xs font-black text-slate-900 truncate">${w.nama}</p>
                      <span class="px-2 py-0.5 rounded-full text-[9px] font-black ${w.status === 'Tetap' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                        ${w.status}
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-0.5">${w.noRumah} • <span class="text-brand-700 font-bold">${lunasCount} Bln</span></p>
                  </div>
                  <button onclick="openModalKartuIuran('${w.nama.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition active:scale-95 flex items-center gap-1 flex-shrink-0">
                    <i class="ph-bold ph-credit-card text-brand-600"></i>
                    <span>Kartu</span>
                  </button>
                </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Modal Catat Iuran Cepat
function openModalCatatIuranBatch() {
  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">Catat Iuran</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">Pelunasan Iuran Kas Warga</h3>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><i class="ph-bold ph-x text-lg"></i></button>
      </div>
      <form onsubmit="handleCatatIuranSubmit(event)" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pilih Kepala Keluarga</label>
          <select id="iuranNamaWarga" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500" ${db.warga.length === 0 ? 'disabled' : ''}>
            ${db.warga.length === 0 ? '<option value="">(Belum ada data warga terdaftar)</option>' : db.warga.map(w => `<option value="${w.nama}">${w.nama} (${w.noRumah})</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Bulan & Tahun Iuran</label>
          <select id="iuranBulan" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
            ${DAFTAR_TAHUN_IURAN.map(t => 
              NAMA_BULAN_ID.map(b => `<option value="${b} ${t}" ${t === CURRENT_YEAR && b === CURRENT_MONTH_NAME ? 'selected' : ''}>${b} ${t}</option>`).join('')
            ).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nominal (Rupiah)</label>
          <input type="number" id="iuranNominal" required value="${appConfig.tarifIuran}" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div class="pt-1">
          <button type="submit" class="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center space-x-2 active:scale-95">
            <i class="ph-bold ph-check-circle text-base"></i>
            <span>Simpan & Masukkan ke Buku Kas</span>
          </button>
        </div>
      </form>
    </div>
  `;
  openModal(html);
}

function handleCatatIuranSubmit(e) {
  e.preventDefault();
  const nama = document.getElementById('iuranNamaWarga').value;
  const bulan = document.getElementById('iuranBulan').value;
  const nominal = Number(document.getElementById('iuranNominal').value) || 75000;
  const tglSekarang = new Date().toISOString().split('T')[0];

  const existing = db.iuran.find(i => i.nama.toLowerCase().trim() === nama.toLowerCase().trim() && i.bulan.toLowerCase().trim() === bulan.toLowerCase().trim());
  if (existing) {
    existing.status = 'Lunas';
    existing.tglBayar = tglSekarang;
  } else {
    const itemIuran = {
      id: 'I' + Date.now().toString().slice(-4),
      wargaId: 'W99',
      nama: nama,
      bulan: bulan,
      nominal: nominal,
      status: 'Lunas',
      tglBayar: tglSekarang
    };
    db.iuran.push(itemIuran);
    kirimDataKeSheets('PAY_IURAN', itemIuran);
  }

  const itemKas = {
    id: 'K' + Date.now().toString().slice(-4),
    tanggal: tglSekarang,
    tipe: 'masuk',
    nominal: nominal,
    keterangan: `Iuran Warga ${nama} (${bulan})`
  };
  db.kas.push(itemKas);
  kirimDataKeSheets('ADD_KAS', itemKas);
  logEvent('IURAN', `Penerimaan iuran warga KK ${nama} (${bulan}) Rp ${nominal.toLocaleString('id-ID')}`, 'success');

  closeModal();
  triggerConfetti();
  showToast(`Iuran ${nama} (${bulan}) berhasil dicatat lunas & masuk kas RT!`);
  renderApp();
}

// Modal Kartu Kendali Iuran Warga (11 Tahun: 2026 - 2036)
function openModalKartuIuran(namaWarga) {
  const wargaObj = db.warga.find(w => w.nama.toLowerCase().trim() === namaWarga.toLowerCase().trim()) || { nama: namaWarga, noRumah: '-' };
  const tahunDipilih = modalKartuTahun || CURRENT_YEAR;
  const daftarBulan = NAMA_BULAN_ID.map(b => `${b} ${tahunDipilih}`);

  const lunasSet = new Set(
    db.iuran
      .filter(i => i.nama.toLowerCase().trim() === namaWarga.toLowerCase().trim() && i.status === 'Lunas')
      .map(i => i.bulan)
  );

  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">Kartu Kendali Iuran RT 04</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">${wargaObj.nama}</h3>
          <p class="text-[11px] text-slate-500">${wargaObj.noRumah}</p>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
          <i class="ph-bold ph-x text-lg"></i>
        </button>
      </div>

      <!-- Selector Tahun Iuran (2026 - 2036) -->
      <div class="flex items-center justify-between bg-slate-100/80 p-2 rounded-2xl border border-slate-200/60">
        <button onclick="gantiTahunKartu(-1, '${namaWarga.replace(/'/g, "\\'")}')" class="w-8 h-8 flex items-center justify-center bg-white rounded-xl text-slate-700 hover:bg-slate-200 transition shadow-xs ${tahunDipilih <= 2026 ? 'opacity-30 pointer-events-none' : ''}">
          <i class="ph-bold ph-caret-left"></i>
        </button>
        <div class="text-center">
          <span class="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Tahun Anggaran</span>
          <span class="text-sm font-black text-slate-900">${tahunDipilih}</span>
        </div>
        <button onclick="gantiTahunKartu(1, '${namaWarga.replace(/'/g, "\\'")}')" class="w-8 h-8 flex items-center justify-center bg-white rounded-xl text-slate-700 hover:bg-slate-200 transition shadow-xs ${tahunDipilih >= 2036 ? 'opacity-30 pointer-events-none' : ''}">
          <i class="ph-bold ph-caret-right"></i>
        </button>
      </div>

      <!-- Grid Bulan Iuran -->
      <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
        ${daftarBulan.map(b => {
          const isLunas = lunasSet.has(b);
          return `
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <p class="text-xs font-black text-slate-900">${b}</p>
                <p class="text-[10px] text-slate-500">Tarif: Rp ${(Number(appConfig.tarifIuran) || 75000).toLocaleString('id-ID')}</p>
              </div>
              <div class="flex items-center space-x-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black ${isLunas ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}">
                  ${isLunas ? 'Lunas' : 'Belum Lunas'}
                </span>
                ${canManageIuran() ? `
                  <button onclick="toggleStatusIuranWarga('${namaWarga.replace(/'/g, "\\'")}', '${b}', ${isLunas ? 0 : 1})" class="px-2.5 py-1 text-[11px] font-bold rounded-xl transition ${isLunas ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-brand-600 text-white hover:bg-brand-700'}">
                    ${isLunas ? 'Batal' : 'Lunaskan'}
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="pt-2 flex gap-2">
        <button onclick="cetakKwitansiIuran('${namaWarga.replace(/'/g, "\\'")}', ${tahunDipilih})" class="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1">
          <i class="ph-bold ph-printer"></i>
          <span>Kwitansi</span>
        </button>
        <button onclick="closeModal()" class="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition">Tutup</button>
      </div>
    </div>
  `;
  openModal(html);
}

function gantiTahunKartu(delta, namaWarga) {
  modalKartuTahun = Math.max(2026, Math.min(2036, (modalKartuTahun || CURRENT_YEAR) + delta));
  openModalKartuIuran(namaWarga);
}

function toggleStatusIuranWarga(nama, bulan, statusVal) {
  if (!canManageIuran()) {
    showToast('Hanya Bendahara RT, Sekretaris, dan Admin yang berhak mengubah status iuran!', 'error');
    return;
  }
  const targetStatus = statusVal === 1 ? 'Lunas' : 'Belum Lunas';
  const existing = db.iuran.find(i => i.nama.toLowerCase().trim() === nama.toLowerCase().trim() && i.bulan.toLowerCase().trim() === bulan.toLowerCase().trim());
  const tglSekarang = new Date().toISOString().split('T')[0];
  
  if (existing) {
    existing.status = targetStatus;
    existing.tglBayar = targetStatus === 'Lunas' ? tglSekarang : '-';
    kirimDataKeSheets('TOGGLE_IURAN', { nama, bulan, status: targetStatus, tglBayar: existing.tglBayar });
  } else if (targetStatus === 'Lunas') {
    const itemIuran = {
      id: 'I' + Date.now().toString().slice(-4),
      wargaId: 'W99',
      nama: nama,
      bulan: bulan,
      nominal: Number(appConfig.tarifIuran) || 75000,
      status: 'Lunas',
      tglBayar: tglSekarang
    };
    db.iuran.push(itemIuran);
    kirimDataKeSheets('TOGGLE_IURAN', itemIuran);
  }

  if (targetStatus === 'Lunas') {
    const itemKas = {
      id: 'K' + Date.now().toString().slice(-4),
      tanggal: tglSekarang,
      tipe: 'masuk',
      nominal: Number(appConfig.tarifIuran) || 75000,
      keterangan: `Iuran Warga ${nama} (${bulan})`
    };
    db.kas.push(itemKas);
    kirimDataKeSheets('ADD_KAS', itemKas);
    triggerConfetti();
  }

  showToast(`Status iuran ${nama} (${bulan}) diperbarui: ${targetStatus}!`);
  openModalKartuIuran(nama);
}

function lunaskanCepat(nama, bulan, nominal) {
  if (!canManageIuran()) {
    showToast('Hanya Bendahara RT, Sekretaris, dan Admin yang dapat mencatat pelunasan!', 'error');
    return;
  }
  const tglSekarang = new Date().toISOString().split('T')[0];
  const existing = db.iuran.find(i => i.nama.toLowerCase().trim() === nama.toLowerCase().trim() && i.bulan.toLowerCase().trim() === bulan.toLowerCase().trim());
  if (existing) {
    existing.status = 'Lunas';
    existing.tglBayar = tglSekarang;
  } else {
    const itemIuran = {
      id: 'I' + Date.now().toString().slice(-4),
      wargaId: 'W99',
      nama: nama,
      bulan: bulan,
      nominal: nominal,
      status: 'Lunas',
      tglBayar: tglSekarang
    };
    db.iuran.push(itemIuran);
    kirimDataKeSheets('PAY_IURAN', itemIuran);
  }
  const itemKas = {
    id: 'K' + Date.now().toString().slice(-4),
    tanggal: tglSekarang,
    tipe: 'masuk',
    nominal: nominal,
    keterangan: `Iuran Warga ${nama} (${bulan})`
  };
  db.kas.push(itemKas);
  kirimDataKeSheets('ADD_KAS', itemKas);

  triggerConfetti();
  showToast(`Iuran ${nama} (${bulan}) berhasil dilunaskan!`);
  renderApp();
}

function lunaskanSemuaTunggakan(nama, bulanList, nominalPerBulan) {
  if (!canManageIuran()) {
    showToast('Hanya Bendahara RT, Sekretaris, dan Admin yang dapat mencatat pelunasan!', 'error');
    return;
  }
  const tglSekarang = new Date().toISOString().split('T')[0];
  let totalNominal = 0;

  bulanList.forEach(bulan => {
    const existing = db.iuran.find(i => i.nama.toLowerCase().trim() === nama.toLowerCase().trim() && i.bulan.toLowerCase().trim() === bulan.toLowerCase().trim());
    if (existing) {
      existing.status = 'Lunas';
      existing.tglBayar = tglSekarang;
    } else {
      const itemIuran = {
        id: 'I' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        wargaId: 'W99',
        nama: nama,
        bulan: bulan,
        nominal: nominalPerBulan,
        status: 'Lunas',
        tglBayar: tglSekarang
      };
      db.iuran.push(itemIuran);
      kirimDataKeSheets('PAY_IURAN', itemIuran);
    }
    totalNominal += nominalPerBulan;
  });

  const itemKas = {
    id: 'K' + Date.now().toString().slice(-4),
    tanggal: tglSekarang,
    tipe: 'masuk',
    nominal: totalNominal,
    keterangan: `Pelunasan Tunggakan Iuran ${nama} (${bulanList.length} Bulan: ${bulanList.join(', ')})`
  };
  db.kas.push(itemKas);
  kirimDataKeSheets('ADD_KAS', itemKas);

  triggerConfetti();
  showToast(`Semua tunggakan iuran ${nama} (${bulanList.length} bulan) berhasil dilunaskan!`);
  renderApp();
}

function cetakKwitansiIuran(namaWarga, tahun) {
  const w = db.warga.find(x => x.nama.toLowerCase().trim() === namaWarga.toLowerCase().trim()) || { nama: namaWarga, noRumah: '-' };
  const lunasList = db.iuran.filter(i => i.nama.toLowerCase().trim() === namaWarga.toLowerCase().trim() && i.bulan.includes(String(tahun)) && i.status === 'Lunas');
  const totalBayar = lunasList.reduce((acc, curr) => acc + (Number(curr.nominal) || 75000), 0);

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Kwitansi Pembayaran Iuran RT 04 - ${w.nama}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; padding: 25px; color: #111; max-width: 650px; margin: auto; border: 2px dashed #444; }
        .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 15px; }
        .header h3 { margin: 0; font-size: 16px; font-weight: bold; }
        .header p { margin: 2px 0 0 0; font-size: 11px; }
        .kw-title { text-align: center; font-size: 14px; font-weight: bold; margin: 10px 0; text-decoration: underline; }
        .row { display: flex; margin: 5px 0; font-size: 12px; }
        .row .label { width: 160px; font-weight: bold; }
        .row .value { flex: 1; }
        .table-lunas { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        .table-lunas th, .table-lunas td { border: 1px solid #888; padding: 5px; text-align: left; }
        .table-lunas th { background: #eee; }
        .ttd { margin-top: 25px; display: flex; justify-content: space-between; font-size: 12px; text-align: center; }
        @media print { body { border: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h3>KWITANSI RESMI IURAN LINGKUNGAN</h3>
        <p>RUKUN TETANGGA 04 / RUKUN WARGA 14 - CISARANTEN KULON</p>
        <p>Kota Bandung</p>
      </div>
      <div class="kw-title">BUKTI PELUNASAN IURAN TAHUN ${tahun}</div>
      <div class="row"><div class="label">Nama Kepala Keluarga</div><div class="value">: <b>${w.nama}</b></div></div>
      <div class="row"><div class="label">Alamat / No. Rumah</div><div class="value">: ${w.noRumah}</div></div>
      <div class="row"><div class="label">Tanggal Cetak</div><div class="value">: ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</div></div>

      <table class="table-lunas">
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th>Bulan Iuran</th>
            <th>Nominal</th>
            <th>Tanggal Pembayaran</th>
          </tr>
        </thead>
        <tbody>
          ${lunasList.length === 0 ? `
            <tr><td colspan="4" style="text-align: center; font-style: italic;">Belum ada catatan bulan yang lunas untuk tahun ${tahun}.</td></tr>
          ` : lunasList.map((i, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${i.bulan}</td>
              <td>Rp ${(Number(i.nominal) || 75000).toLocaleString('id-ID')}</td>
              <td>${i.tglBayar || '-'}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold; background: #fafafa;">
            <td colspan="2" style="text-align: right;">TOTAL DILUNASI:</td>
            <td colspan="2">Rp ${totalBayar.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      <div class="ttd">
        <div>
          <p>Warga Pembayar,</p>
          <br><br>
          <p><b>(${w.nama})</b></p>
        </div>
        <div>
          <p>Bendahara RT 04,</p>
          <br><br>
          <p><b>(${appConfig.namaBendahara || 'H. Ahmad Sobari'})</b></p>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 300);
}

function bukaModalResetIuran() {
  if (!canManageIuran()) {
    showToast('Hanya Bendahara RT, Sekretaris, dan Admin yang berhak mereset data iuran!', 'error');
    return;
  }
  const html = `
    <div class="space-y-4 text-center p-2">
      <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
        <i class="ph-bold ph-arrow-counter-clockwise"></i>
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-900">Reset Seluruh Status Iuran?</h3>
        <p class="text-xs text-slate-500 mt-1">Data riwayat pembayaran iuran seluruh warga akan dikosongkan. Harap pastikan telah membuat salinan cadangan.</p>
      </div>
      <div class="flex space-x-2 pt-2">
        <button onclick="closeModal()" class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
        <button onclick="eksekusiResetIuran()" class="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow">Ya, Reset Iuran</button>
      </div>
    </div>
  `;
  openModal(html);
}

function eksekusiResetIuran() {
  db.iuran = JSON.parse(JSON.stringify(defaultIuranData));
  kirimDataKeSheets('RESET_IURAN', {});
  closeModal();
  showToast('Seluruh status iuran warga berhasil direset.');
  renderApp();
}

// ==========================================
// 4. HALAMAN WARGA & e-SENSUS
// ==========================================
function getFilteredWargaList() {
  const q = wargaSearchQuery.toLowerCase().trim();
  const terms = q ? q.split(/\s+/).filter(Boolean) : [];

  return db.warga.filter(w => {
    const combined = `${w.nama || ''} ${w.noRumah || ''} ${w.pekerjaan || ''} ${w.status || ''} ${w.agama || ''}`.toLowerCase();
    const matchQuery = terms.length === 0 || terms.every(term => combined.includes(term));
    const matchStatus = wargaFilterStatus === 'semua' || w.status === wargaFilterStatus;
    const matchBlok = wargaFilterBlok === 'semua' || (w.noRumah && (w.noRumah.includes(wargaFilterBlok) || (wargaFilterBlok === 'Ciskul I' && /\bCiskul 1\b/i.test(w.noRumah))));
    return matchQuery && matchStatus && matchBlok;
  });
}

function renderWargaCardsHtml(filteredList) {
  if (!filteredList || filteredList.length === 0) {
    return `
      <div class="col-span-full p-8 text-center bg-white rounded-3xl border border-slate-200">
        <i class="ph-bold ph-users-three text-3xl text-slate-300 mb-1 inline-block"></i>
        <p class="text-xs font-bold text-slate-500">Tidak ada data warga yang sesuai dengan filter atau kata kunci.</p>
      </div>
    `;
  }

  return filteredList.map(w => `
    <div class="bg-white p-4.5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3 transition hover:shadow-md flex flex-col justify-between">
      <div>
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center space-x-2">
              <h4 class="text-xs font-black text-slate-900">${w.nama}</h4>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-black ${w.status === 'Tetap' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
                ${w.status}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span class="flex items-center gap-1"><i class="ph-bold ph-house-line text-brand-600"></i> ${w.noRumah}</span>
              <span>•</span>
              <span class="flex items-center gap-1"><i class="ph-bold ph-briefcase text-slate-500"></i> ${w.pekerjaan || 'Karyawan'}</span>
            </p>
          </div>
          <div class="flex items-center space-x-1 flex-shrink-0">
            <button onclick="openModalKartuDigital('${w.id}')" title="Kartu Identitas Digital" class="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition shadow-2xs">
              <i class="ph-bold ph-identification-card text-base"></i>
            </button>
            <button onclick="openModalKartuIuran('${w.nama.replace(/'/g, "\\'")}')" title="Kartu Iuran" class="p-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl transition shadow-2xs">
              <i class="ph-bold ph-receipt text-base"></i>
            </button>
            ${isPengurus() ? `
              <button onclick="openModalEditWarga('${w.id}')" title="Edit Data Warga" class="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition shadow-2xs">
                <i class="ph-bold ph-pencil-simple text-base"></i>
              </button>
            ` : ''}
            ${canManageWarga() ? `
              <button onclick="hapusWarga('${w.id}', '${w.nama.replace(/'/g, "\\'")}')" title="Hapus Warga" class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition shadow-2xs">
                <i class="ph-bold ph-trash text-base"></i>
              </button>
            ` : ''}
          </div>
        </div>
        
        <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 bg-slate-50/70 px-3 py-2 rounded-2xl border border-slate-100">
          <div><span class="text-slate-400 font-bold">Agama:</span> <b>${w.agama || 'Islam'}</b></div>
          <div><span class="text-slate-400 font-bold">Pekerjaan:</span> <b>${w.pekerjaan || 'Karyawan'}</b></div>
        </div>
      </div>

      ${isPengurus() && w.telp ? `
        <div class="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span class="text-slate-600 font-semibold truncate"><i class="ph-bold ph-whatsapp-logo text-emerald-600"></i> No. WA: <b>${w.telp}</b></span>
          <a href="https://wa.me/${w.telp.replace(/^0/, '62')}" target="_blank" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold flex items-center gap-1 transition border border-emerald-200/60 flex-shrink-0">
            <i class="ph-bold ph-whatsapp-logo"></i><span>Chat WA</span>
          </a>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function handleWargaSearch(val) {
  wargaSearchQuery = val;
  const container = document.getElementById('wargaListContainer');
  if (container) {
    container.innerHTML = renderWargaCardsHtml(getFilteredWargaList());
  } else {
    renderApp();
  }
  const clearBtn = document.getElementById('wargaSearchClearBtn');
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !val);
  }
}

function handleWargaSearchClear() {
  wargaSearchQuery = '';
  const input = document.getElementById('wargaSearchInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  handleWargaSearch('');
}

function handleWargaFilterChange() {
  const container = document.getElementById('wargaListContainer');
  if (container) {
    container.innerHTML = renderWargaCardsHtml(getFilteredWargaList());
  } else {
    renderApp();
  }
}

function renderWarga() {
  const filteredWarga = getFilteredWargaList();
  const totalJiwa = db.warga.reduce((a, b) => a + (Number(b.anggota) || 1), 0);
  const tetapCount = db.warga.filter(w => w.status === 'Tetap').length;
  const kontrakCount = db.warga.filter(w => w.status === 'Kontrak').length;

  return `
    <div class="p-4 lg:p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-black text-slate-900 font-display">Data Kependudukan RT 04</h2>
          <p class="text-[11px] text-slate-500">Direktori KK, e-KTP Digital Warga, Statistik Demografi, & e-Sensus</p>
        </div>
        ${canManageWarga() ? `
          <button onclick="openModalTambahWarga()" class="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center space-x-1.5 active:scale-95">
            <i class="ph-bold ph-user-plus text-base"></i>
            <span>Tambah Warga</span>
          </button>
        ` : ''}
      </div>

      <!-- Sub-Tab Switcher -->
      <div class="grid grid-cols-3 gap-2">
        <button onclick="subTabWarga = 'direktori'; renderApp();" class="p-3.5 rounded-2xl flex flex-col items-center justify-center transition shadow-md ${
          subTabWarga === 'direktori' 
            ? 'bg-gradient-to-br from-brand-600 to-teal-700 text-white shadow-brand-500/25 scale-[1.02]' 
            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-brand-50/50'
        }">
          <i class="ph-bold ph-address-book text-2xl mb-1"></i>
          <span class="text-xs font-black">Direktori KK</span>
        </button>
        
        <button onclick="subTabWarga = 'statistik'; renderApp();" class="p-3.5 rounded-2xl flex flex-col items-center justify-center transition shadow-md ${
          subTabWarga === 'statistik' 
            ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-700 text-white shadow-blue-500/25 scale-[1.02]' 
            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-blue-50/50'
        }">
          <i class="ph-bold ph-chart-pie-slice text-2xl mb-1"></i>
          <span class="text-xs font-black">Statistik & Grafik</span>
        </button>

        <button onclick="subTabWarga = 'sensus'; renderApp();" class="p-3.5 rounded-2xl flex flex-col items-center justify-center transition shadow-md ${
          subTabWarga === 'sensus' 
            ? 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-slate-900 shadow-amber-500/25 scale-[1.02]' 
            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-amber-50/50'
        }">
          <i class="ph-bold ph-clipboard-text text-2xl mb-1"></i>
          <span class="text-xs font-black">e-Sensus Mandiri</span>
        </button>
      </div>

      ${subTabWarga === 'direktori' ? `
        <div class="space-y-3">
          <!-- 2 Metrik Cepat -->
          <div class="grid grid-cols-2 gap-2.5">
            <div class="bg-gradient-to-br from-brand-600 to-teal-700 text-white p-3 rounded-2xl shadow-xs">
              <span class="text-[9.5px] font-black uppercase text-emerald-100">Total KK</span>
              <p class="text-base font-black mt-0.5">${db.warga.length} KK</p>
            </div>
            <div class="bg-gradient-to-br from-purple-600 to-pink-700 text-white p-3 rounded-2xl shadow-xs">
              <span class="text-[9.5px] font-black uppercase text-purple-100">Tetap / Kontrak</span>
              <p class="text-base font-black mt-0.5">${tetapCount} / ${kontrakCount}</p>
            </div>
          </div>

          <!-- Search & Filter Bar -->
          <div class="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
            <div class="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <i class="ph-bold ph-magnifying-glass text-slate-400 text-base"></i>
              <input type="text" id="wargaSearchInput" value="${wargaSearchQuery}" oninput="handleWargaSearch(this.value)" placeholder="Cari nama warga atau nomor rumah..." class="w-full text-xs font-semibold focus:outline-none bg-transparent">
              <button id="wargaSearchClearBtn" onclick="handleWargaSearchClear()" class="${wargaSearchQuery ? '' : 'hidden'} text-slate-400 hover:text-slate-600 p-0.5 transition" title="Hapus pencarian">
                <i class="ph-bold ph-x-circle text-base"></i>
              </button>
            </div>
            <div class="flex items-center space-x-2">
              <select onchange="wargaFilterStatus = this.value; handleWargaFilterChange();" class="w-1/2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none">
                <option value="semua" ${wargaFilterStatus === 'semua' ? 'selected' : ''}>Semua Status</option>
                <option value="Tetap" ${wargaFilterStatus === 'Tetap' ? 'selected' : ''}>Warga Tetap</option>
                <option value="Kontrak" ${wargaFilterStatus === 'Kontrak' ? 'selected' : ''}>Warga Kontrak</option>
              </select>
              <select onchange="wargaFilterBlok = this.value; handleWargaFilterChange();" class="w-1/2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none">
                <option value="semua" ${wargaFilterBlok === 'semua' ? 'selected' : ''}>Semua Blok</option>
                <option value="Ciskul I" ${wargaFilterBlok === 'Ciskul I' ? 'selected' : ''}>Blok Ciskul I</option>
                <option value="Ciskul 6" ${wargaFilterBlok === 'Ciskul 6' ? 'selected' : ''}>Blok Ciskul 6</option>
                <option value="Ciskul 7" ${wargaFilterBlok === 'Ciskul 7' ? 'selected' : ''}>Blok Ciskul 7</option>
                <option value="Ciskul 8" ${wargaFilterBlok === 'Ciskul 8' ? 'selected' : ''}>Blok Ciskul 8</option>
                <option value="Ciskul 9" ${wargaFilterBlok === 'Ciskul 9' ? 'selected' : ''}>Blok Ciskul 9</option>
                <option value="Ciskul 10" ${wargaFilterBlok === 'Ciskul 10' ? 'selected' : ''}>Blok Ciskul 10</option>
              </select>
            </div>
          </div>

          <!-- List Warga Cards (Responsive Grid 1 to 3 Kolom) -->
          <div id="wargaListContainer" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            ${renderWargaCardsHtml(filteredWarga)}
          </div>
        </div>
      ` : subTabWarga === 'statistik' ? `
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-gradient-to-br from-blue-600 to-cyan-700 text-white p-4 rounded-3xl shadow">
              <span class="text-[10px] font-black uppercase text-blue-100">Rasio Hunian Tetap</span>
              <p class="text-xl font-black mt-1">${db.warga.length > 0 ? ((tetapCount / db.warga.length) * 100).toFixed(0) : 0}% Warga Tetap</p>
            </div>
            <div class="bg-gradient-to-br from-indigo-600 to-blue-800 text-white p-4 rounded-3xl shadow">
              <span class="text-[10px] font-black uppercase text-indigo-100">Rata-rata Jiwa / KK</span>
              <p class="text-xl font-black mt-1">${db.warga.length > 0 ? (totalJiwa / db.warga.length).toFixed(1) : '0.0'} Jiwa</p>
            </div>
          </div>

          <!-- Grafik Komposisi dan Distribusi Berdampingan di Layar Desktop -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Komposisi Status Hunian Warga</h3>
              <div class="relative w-full h-56 flex items-center justify-center">
                <canvas id="chartDemografiWarga"></canvas>
              </div>
            </div>

            <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Distribusi Warga Per Blok Jalan</h3>
              <div class="relative w-full h-56 flex items-center justify-center">
                <canvas id="chartDistribusiBlok"></canvas>
              </div>
            </div>
          </div>
        </div>
      ` : `
        <!-- Formulir e-Sensus Mandiri dengan Validasi Anti-Duplikasi -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div>
            <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">Pemutakhiran Data Warga</span>
            <h3 class="text-sm font-black text-slate-900 mt-1">e-Sensus Mandiri & Data KK RT 04</h3>
            <p class="text-[11px] text-slate-500 mt-0.5">Isi formulir berikut untuk mendaftarkan Kepala Keluarga baru atau memperbarui data KK Anda.</p>
          </div>

          <form onsubmit="handleSensusSubmit(event)" class="space-y-3.5 text-left">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Kepala Keluarga (KK)</label>
                <input type="text" id="sensusNama" required placeholder="Nama lengkap KK" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pilihan Blok / Jalan</label>
                <select id="sensusBlok" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="Ciskul I">Ciskul I</option>
                  <option value="Ciskul 6">Ciskul 6</option>
                  <option value="Ciskul 7">Ciskul 7</option>
                  <option value="Ciskul 8">Ciskul 8</option>
                  <option value="Ciskul 9" selected>Ciskul 9</option>
                  <option value="Ciskul 10">Ciskul 10</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor Rumah (1-70)</label>
                <select id="sensusNoRumah" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500">
                  ${Array.from({length: 70}, (_, i) => `<option value="No. ${i+1}" ${i === 13 ? 'selected' : ''}>No. ${i+1}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Hunian</label>
                <select id="sensusStatus" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none">
                  <option value="Tetap">Tetap (Pemilik)</option>
                  <option value="Kontrak">Kontrak / Sewa</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Agama KK</label>
                <select id="sensusAgama" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none">
                  <option value="Islam">Islam</option>
                  <option value="Kristen Protestan">Kristen Protestan</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pekerjaan KK</label>
                <select id="sensusPekerjaan" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none">
                  <option value="Karyawan Swasta">Karyawan Swasta</option>
                  <option value="ASN / PNS">ASN / PNS</option>
                  <option value="TNI / POLRI">TNI / POLRI</option>
                  <option value="Wiraswasta / Bisnis">Wiraswasta / Bisnis</option>
                  <option value="Ibu Rumah Tangga">Ibu Rumah Tangga</option>
                  <option value="Mahasiswa / Pelajar">Mahasiswa / Pelajar</option>
                  <option value="Pensiunan">Pensiunan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor WhatsApp Aktif</label>
              <input type="text" id="sensusTelp" required placeholder="08123456xxx" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500">
            </div>

            <div class="pt-2">
              <button type="submit" class="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black rounded-xl text-xs transition shadow-lg active:scale-95 flex items-center justify-center space-x-2">
                <i class="ph-bold ph-paper-plane-tilt text-base"></i>
                <span>Kirim & Simpan Data e-Sensus</span>
              </button>
            </div>
          </form>
        </div>
      `}
    </div>
  `;
}



function handleSensusSubmit(e) {
  e.preventDefault();
  const nama = document.getElementById('sensusNama').value.trim();
  const blok = document.getElementById('sensusBlok').value;
  const no = document.getElementById('sensusNoRumah').value;
  const noRumah = `${blok} ${no}`;
  const status = document.getElementById('sensusStatus').value;
  const agama = document.getElementById('sensusAgama').value;
  const pekerjaan = document.getElementById('sensusPekerjaan').value;
  const telp = document.getElementById('sensusTelp').value.trim();
  const jiwaEl = document.getElementById('sensusJiwa');
  const jiwa = jiwaEl ? (Number(jiwaEl.value) || 1) : 1;

  // Validasi Anti Duplikasi
  const namaSudahAda = db.warga.some(w => w.nama.toLowerCase().trim() === nama.toLowerCase());
  if (namaSudahAda) {
    showToast(`Input Ditolak: Nama KK "${nama}" sudah terdaftar di sistem RT 04!`, 'error');
    return;
  }

  const rumahSudahAda = db.warga.find(w => w.noRumah.toLowerCase().trim() === noRumah.toLowerCase());
  if (rumahSudahAda) {
    showToast(`Input Ditolak: Alamat "${noRumah}" sudah terdaftar atas nama KK ${rumahSudahAda.nama}!`, 'error');
    return;
  }

  const hubList = document.querySelectorAll('select[name="hubAnggota[]"]');
  const namaList = document.querySelectorAll('input[name="namaAnggota[]"]');
  const pekList = document.querySelectorAll('select[name="pekerjaanAnggota[]"]');
  
  const anggotaList = [];
  let istriStr = '-';
  let anakArr = [];
  let ortuStr = '-';

  for (let i = 0; i < namaList.length; i++) {
    const h = hubList[i].value;
    const n = namaList[i].value;
    const p = pekList[i].value;
    anggotaList.push({ hubungan: h, nama: n, agama: agama, pekerjaan: p });
    if (h === 'Istri' || h === 'Suami') istriStr = n;
    if (h === 'Anak') anakArr.push(n);
    if (h === 'Orang Tua' || h === 'Mertua') ortuStr = n;
  }

  const newWarga = {
    id: 'W' + (db.warga.length + 1).toString().padStart(2, '0'),
    nama: nama,
    noRumah: noRumah,
    anggota: jiwa,
    telp: telp,
    status: status,
    istri: istriStr,
    anak: anakArr.length > 0 ? anakArr.join(', ') : '-',
    ortu: ortuStr,
    agama: agama,
    pekerjaan: pekerjaan,
    anggotaList: anggotaList
  };

  db.warga.push(newWarga);
  kirimDataKeSheets('ADD_WARGA', {
    id: newWarga.id,
    nama: newWarga.nama,
    noRumah: newWarga.noRumah,
    jiwa: newWarga.anggota,
    telp: newWarga.telp,
    status: newWarga.status,
    istri: newWarga.istri,
    anak: newWarga.anak,
    ortu: newWarga.ortu,
    agama: newWarga.agama,
    pekerjaan: newWarga.pekerjaan
  });

  triggerConfetti();
  showToast(`Data e-Sensus & KK ${nama} berhasil disimpan!`);
  logEvent('WARGA', `Pendaftaran e-Sensus KK baru: ${newWarga.nama} (${newWarga.noRumah}) - ${newWarga.anggota} Jiwa`, 'success');
  subTabWarga = 'direktori';
  renderApp();
}

function openModalTambahWarga() {
  subTabWarga = 'sensus';
  renderApp();
}

function hapusWarga(id, nama) {
  if (!canManageWarga()) {
    showToast('Hanya Sekretaris, Ketua RT, dan Admin yang dapat mengelola data warga!', 'error');
    return;
  }
  const html = `
    <div class="space-y-4 text-center p-2">
      <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
        <i class="ph-bold ph-warning"></i>
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-900">Hapus Data Warga?</h3>
        <p class="text-xs text-slate-500 mt-1">Anda yakin ingin menghapus data warga <b>"${nama}"</b> dari sistem RT 04?</p>
      </div>
      <div class="flex space-x-2 pt-2">
        <button onclick="closeModal()" class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
        <button onclick="konfirmasiHapusWarga('${id}')" class="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow">Ya, Hapus</button>
      </div>
    </div>
  `;
  openModal(html);
}

function konfirmasiHapusWarga(id) {
  const target = db.warga.find(w => w.id === id);
  const targetName = target ? `${target.nama} (${target.noRumah})` : id;
  db.warga = db.warga.filter(w => w.id !== id);
  kirimDataKeSheets('DELETE_WARGA', { id });
  logEvent('WARGA', `Hapus data KK: ${targetName}`, 'danger');
  closeModal();
  showToast('Data warga berhasil dihapus.');
  renderApp();
}

// Modal Edit Data Warga
function openModalEditWarga(id) {
  if (!isPengurus()) {
    showToast('Hanya Pengurus RT dan Admin yang dapat mengedit data warga!', 'error');
    return;
  }
  const w = db.warga.find(x => x.id === id);
  if (!w) return;

  const splitAlamat = (w.noRumah || '').split(' ');
  let currentBlok = splitAlamat[0] && splitAlamat[1] ? `${splitAlamat[0]} ${splitAlamat[1]}` : 'Ciskul 9';
  if (currentBlok === 'Ciskul 1') currentBlok = 'Ciskul I';
  const currentNo = splitAlamat.slice(2).join(' ') || 'No. 1';

  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Akses Pengurus RT</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">Edit / Koreksi Data Warga</h3>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
          <i class="ph-bold ph-x text-lg"></i>
        </button>
      </div>

      <form onsubmit="handleEditWargaSubmit(event, '${w.id}')" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Kepala Keluarga (KK)</label>
          <input type="text" id="editWargaNama" required value="${w.nama}" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pilihan Blok / Jalan</label>
            <select id="editWargaBlok" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="Ciskul I" ${currentBlok === 'Ciskul I' ? 'selected' : ''}>Ciskul I</option>
              <option value="Ciskul 6" ${currentBlok === 'Ciskul 6' ? 'selected' : ''}>Ciskul 6</option>
              <option value="Ciskul 7" ${currentBlok === 'Ciskul 7' ? 'selected' : ''}>Ciskul 7</option>
              <option value="Ciskul 8" ${currentBlok === 'Ciskul 8' ? 'selected' : ''}>Ciskul 8</option>
              <option value="Ciskul 9" ${currentBlok === 'Ciskul 9' ? 'selected' : ''}>Ciskul 9</option>
              <option value="Ciskul 10" ${currentBlok === 'Ciskul 10' ? 'selected' : ''}>Ciskul 10</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor Rumah (1-70)</label>
            <select id="editWargaNo" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500">
              ${Array.from({length: 70}, (_, i) => {
                const numStr = `No. ${i+1}`;
                const isSel = currentNo === numStr || parseInt(currentNo.replace(/\D/g, '')) === (i+1);
                return `<option value="${numStr}" ${isSel ? 'selected' : ''}>${numStr}</option>`;
              }).join('')}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Hunian</label>
            <select id="editWargaStatus" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none">
              <option value="Tetap" ${w.status === 'Tetap' ? 'selected' : ''}>Tetap</option>
              <option value="Kontrak" ${w.status === 'Kontrak' ? 'selected' : ''}>Kontrak</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Agama</label>
            <select id="editWargaAgama" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none">
              <option value="Islam" ${w.agama === 'Islam' ? 'selected' : ''}>Islam</option>
              <option value="Kristen Protestan" ${w.agama === 'Kristen Protestan' ? 'selected' : ''}>Kristen Protestan</option>
              <option value="Katolik" ${w.agama === 'Katolik' ? 'selected' : ''}>Katolik</option>
              <option value="Hindu" ${w.agama === 'Hindu' ? 'selected' : ''}>Hindu</option>
              <option value="Buddha" ${w.agama === 'Buddha' ? 'selected' : ''}>Buddha</option>
              <option value="Konghucu" ${w.agama === 'Konghucu' ? 'selected' : ''}>Konghucu</option>
              <option value="Lainnya" ${w.agama === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pekerjaan</label>
            <select id="editWargaPekerjaan" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none">
              <option value="Karyawan Swasta" ${w.pekerjaan === 'Karyawan Swasta' ? 'selected' : ''}>Karyawan</option>
              <option value="ASN / PNS" ${w.pekerjaan === 'ASN / PNS' ? 'selected' : ''}>ASN / PNS</option>
              <option value="TNI / POLRI" ${w.pekerjaan === 'TNI / POLRI' ? 'selected' : ''}>TNI / POLRI</option>
              <option value="Wiraswasta / Bisnis" ${w.pekerjaan === 'Wiraswasta / Bisnis' ? 'selected' : ''}>Wiraswasta</option>
              <option value="Ibu Rumah Tangga" ${w.pekerjaan === 'Ibu Rumah Tangga' ? 'selected' : ''}>Ibu Rumah Tangga</option>
              <option value="Lainnya" ${w.pekerjaan === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor WhatsApp</label>
          <input type="text" id="editWargaTelp" required value="${w.telp || ''}" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500">
        </div>

        <div class="pt-1">
          <button type="submit" class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center space-x-2 active:scale-95">
            <i class="ph-bold ph-floppy-disk text-base"></i>
            <span>Simpan Perubahan Data Warga</span>
          </button>
        </div>
      </form>
    </div>
  `;
  openModal(html);
}

function handleEditWargaSubmit(e, id) {
  e.preventDefault();
  const w = db.warga.find(x => x.id === id);
  if (!w) return;

  const namaLama = w.nama;
  const namaBaru = document.getElementById('editWargaNama').value.trim();
  const blok = document.getElementById('editWargaBlok').value;
  const no = document.getElementById('editWargaNo').value;
  const noRumahBaru = `${blok} ${no}`;
  const status = document.getElementById('editWargaStatus').value;
  const agama = document.getElementById('editWargaAgama').value;
  const pekerjaan = document.getElementById('editWargaPekerjaan').value;
  const telp = document.getElementById('editWargaTelp').value.trim();
  const jiwa = (document.getElementById('editWargaJiwa') && Number(document.getElementById('editWargaJiwa').value)) || w.anggota || 1;
  const istri = w.istri || '-';
  const anak = w.anak || '-';
  const ortu = w.ortu || '-';

  // Validasi bentrok
  const namaSudahAda = db.warga.some(x => x.id !== id && x.nama.toLowerCase().trim() === namaBaru.toLowerCase());
  if (namaSudahAda) {
    showToast(`Koreksi Ditolak: Nama KK "${namaBaru}" sudah digunakan warga lain!`, 'error');
    return;
  }

  const rumahSudahAda = db.warga.find(x => x.id !== id && x.noRumah.toLowerCase().trim() === noRumahBaru.toLowerCase());
  if (rumahSudahAda) {
    showToast(`Koreksi Ditolak: Alamat "${noRumahBaru}" sudah terdaftar atas nama KK ${rumahSudahAda.nama}!`, 'error');
    return;
  }

  w.nama = namaBaru;
  w.noRumah = noRumahBaru;
  w.status = status;
  w.agama = agama;
  w.pekerjaan = pekerjaan;
  w.telp = telp;
  w.anggota = jiwa;
  w.istri = istri;
  w.anak = anak;
  w.ortu = ortu;

  if (namaLama !== namaBaru) {
    db.iuran.forEach(i => {
      if (i.nama.toLowerCase().trim() === namaLama.toLowerCase().trim()) {
        i.nama = namaBaru;
      }
    });
  }

  kirimDataKeSheets('UPDATE_WARGA', {
    id: w.id,
    nama: w.nama,
    noRumah: w.noRumah,
    jiwa: w.anggota,
    telp: w.telp,
    status: w.status,
    istri: w.istri,
    anak: w.anak,
    ortu: w.ortu,
    agama: w.agama,
    pekerjaan: w.pekerjaan
  });

  logEvent('WARGA', `Koreksi data warga KK: ${w.nama} (${w.noRumah})`, 'info');
  closeModal();
  showToast(`Data warga ${namaBaru} berhasil diperbarui!`);
  renderApp();
}

// e-KTP Digital Lingkungan Card
function openModalKartuDigital(id) {
  const w = db.warga.find(x => x.id === id);
  if (!w) return;

  const html = `
    <div class="space-y-4 text-left">
      <!-- Digital ID Card Luxury Mockup -->
      <div class="bg-gradient-to-br from-brand-900 via-brand-800 to-teal-950 text-white p-5 rounded-3xl shadow-2xl relative overflow-hidden space-y-3.5 border border-brand-500/40">
        <div class="flex items-center justify-between border-b border-brand-500/40 pb-2.5">
          <div>
            <span class="text-[9px] font-black uppercase bg-white/20 px-2 py-0.5 rounded tracking-wider">KARTU TANDA WARGA DIGITAL</span>
            <h4 class="text-xs font-black mt-1 text-emerald-100">RT 04 / RW 14 KEL. CISARANTEN KULON</h4>
          </div>
          <div class="w-10 h-10 rounded-2xl overflow-hidden border border-white/30 bg-[#5b9dc9] p-0.5 flex items-center justify-center shadow-sm">
            <img src="logo.png" alt="Logo RT 04" class="w-full h-full object-contain rounded-xl" />
          </div>
        </div>

        <div>
          <span class="text-[9.5px] text-emerald-300 uppercase font-black tracking-wider">Nama Kepala Keluarga</span>
          <h3 class="text-lg font-black font-display tracking-tight text-white">${w.nama}</h3>
          <p class="text-[11px] text-emerald-100 mt-0.5 flex items-center gap-1.5">
            <i class="ph-bold ph-house"></i> ${w.noRumah} • Status: <b class="text-white">${w.status}</b>
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-2.5 border-t border-brand-500/40 text-[11px] text-emerald-100/90">
          <div><b>Agama:</b> ${w.agama || 'Islam'}</div>
          <div><b>Pekerjaan:</b> ${w.pekerjaan || 'Karyawan'}</div>
          ${isPengurus() ? `<div class="col-span-2"><b>No. WA:</b> ${w.telp || '-'}</div>` : ''}
        </div>

        <div class="pt-1 flex items-center justify-between text-[10px] text-emerald-300/80">
          <span>ID: ${w.id}</span>
          <span>Arcamanik, Kota Bandung</span>
        </div>
      </div>

      <button onclick="closeModal()" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition">Tutup Kartu</button>
    </div>
  `;
  openModal(html);
}

// ==========================================
// 5. HALAMAN LAYANAN SURAT & ASPIRASI
// ==========================================
function renderLayanan() {
  return `
    <div class="p-4 lg:p-6 space-y-4">
      <div>
        <h2 class="text-base font-black text-slate-900 font-display">Layanan Surat & Aspirasi Warga</h2>
        <p class="text-[11px] text-slate-500">Permohonan surat pengantar pengurus RT & pengaduan lingkungan</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <!-- Formulir Permohonan Surat -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-900 uppercase">Permohonan Surat Pengantar</h3>
            <span class="px-2 py-0.5 rounded bg-brand-100 text-brand-800 text-[10px] font-black border border-brand-200">Online 24/7</span>
          </div>
          <p class="text-[11px] text-slate-500">Penerbitan surat keterangan domisili, pengantar nikah, SKTM, dll.</p>
          <form onsubmit="handleSuratSubmit(event)" class="space-y-2.5 pt-1 text-left">
            <input type="text" id="suratNama" required placeholder="Nama Lengkap Pemohon" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
            <input type="text" id="suratNik" required placeholder="Nomor NIK (16 digit)" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
            <input type="text" id="suratAlamat" required placeholder="Alamat Lengkap / No. Rumah" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
            <select id="suratJenis" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="Pengantar Surat Keterangan Domisili">Surat Keterangan Domisili</option>
              <option value="Pengantar Nikah / Keterangan Belum Menikah">Pengantar Nikah (Model N1-N4)</option>
              <option value="Surat Keterangan Tidak Mampu (SKTM)">Surat Keterangan Tidak Mampu (SKTM)</option>
              <option value="Pengantar Pembuatan KTP / KK Baru">Pengantar Pembuatan KTP / KK Baru</option>
              <option value="Pengantar Surat Keterangan Usaha (SKU)">Surat Keterangan Usaha (SKU)</option>
              <option value="Pengantar Keterangan Kematian">Surat Keterangan Kematian</option>
            </select>
            <textarea id="suratKeperluan" required placeholder="Keperluan / Keterangan Tambahan..." rows="2" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
            <button type="submit" class="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95 flex items-center justify-center gap-1.5">
              <i class="ph-bold ph-paper-plane-tilt"></i>
              <span>Kirim Permohonan Surat</span>
            </button>
          </form>
        </div>

        <!-- Aspirasi Warga Form -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-black text-slate-900 uppercase">Pengaduan Masalah Lingkungan</h3>
            <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black border border-blue-200">Suara Warga</span>
          </div>
          <p class="text-[11px] text-slate-500">Lapor PJU padam, saluran mampet, atau usul kegiatan warga RT 04.</p>
          <form onsubmit="handleAspirasiSubmit(event)" class="space-y-2.5 pt-1 text-left">
            <input type="text" id="aspirasiPelapor" required placeholder="Nama Anda / Alamat Rumah" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
            <textarea id="aspirasiPesan" required placeholder="Uraikan detail kendala atau saran Anda..." rows="4" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            <button type="submit" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95 flex items-center justify-center gap-1.5">
              <i class="ph-bold ph-megaphone"></i>
              <span>Kirim Laporan ke Pengurus</span>
            </button>
          </form>
        </div>

      </div>

      <!-- Riwayat Permohonan Surat -->
      <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-black text-slate-900 uppercase">Daftar Pengajuan Surat Warga</h3>
          <span class="text-[11px] text-slate-400 font-bold">${db.surat.length} Surat</span>
        </div>
        <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
          ${db.surat.length === 0 ? `
            <div class="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500">
              Belum ada permohonan surat pengantar.
            </div>
          ` : db.surat.map(s => `
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between flex-wrap gap-2 transition hover:bg-slate-100/70">
              <div class="min-w-0 flex-1">
                <h4 class="text-xs font-black text-slate-900">${s.nama} - <span class="text-brand-700">${s.jenis}</span></h4>
                <p class="text-[11px] text-slate-500 mt-0.5">${s.keperluan} • ${s.tgl}</p>
              </div>
              <div class="flex items-center space-x-1.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-black ${s.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                  ${s.status}
                </span>
                <button onclick="cetakSuratPengantarLangsung('${s.id}')" class="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-xl transition hover:bg-slate-800">
                  Cetak PDF
                </button>
                ${canManageSurat() ? `
                  <button onclick="openModalEditSurat('${s.id}')" class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-xl transition flex items-center gap-1 shadow-xs" title="Edit Surat Pengantar">
                    <i class="ph-bold ph-pencil-simple"></i>
                    <span>Edit</span>
                  </button>
                ` : ''}
                ${canManageSurat() ? `
                  <button onclick="hapusSurat('${s.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-xl transition flex items-center gap-1 border border-rose-200" title="Hapus Surat Permohonan">
                    <i class="ph-bold ph-trash"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          `).reverse().join('')}
        </div>
      </div>
    </div>
  `;
}

// Handler Cetak Surat Pengantar
function cetakSuratPengantarLangsung(id) {
  const s = db.surat.find(x => x.id === id);
  if (!s) return;

  const noSurat = (appConfig.formatNoSurat || '04 / SK / [TAHUN] / RT 04').replace('[TAHUN]', CURRENT_YEAR);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Surat Pengantar RT 04 - ${s.nama}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; line-height: 1.6; font-size: 14px; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 22px; }
          .header h3 { margin: 0; font-size: 15px; font-weight: 800; }
          .header h2 { margin: 4px 0; font-size: 17px; font-weight: 900; }
          .header p { margin: 0; font-size: 12px; color: #333; }
          .doc-title { text-align: center; margin: 26px 0 20px 0; }
          .doc-title h3 { text-decoration: underline; margin: 0 0 5px 0; font-size: 16px; font-weight: 900; }
          .doc-title p { margin: 0; font-size: 13px; font-weight: bold; }
          .data-table { margin: 15px 0 15px 25px; border-collapse: collapse; }
          .data-table td { padding: 4px 8px; vertical-align: top; }
          .ttd { float: right; margin-top: 40px; text-align: center; width: 250px; }
          @media print {
            body { padding: 15mm; }
            @page { size: portrait; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>${appConfig.kopBaris1 || 'RUKUN TETANGGA 04 / RUKUN WARGA 14'}</h3>
          <h2>${appConfig.kopBaris2 || 'KELURAHAN CISARANTEN KULON KECAMATAN ARCAMANIK - KOTA BANDUNG'}</h2>
          <p>${appConfig.kopAlamat || 'Sekretariat: Jl. Ciskul Raya No. 9, RT 04 / RW 14, Kota Bandung'}</p>
        </div>
        <div class="doc-title">
          <h3>${s.jenis.toUpperCase()}</h3>
          <p>Nomor: ${noSurat}</p>
        </div>
        <div class="content">
          <p style="text-align: justify;">${appConfig.kalimatPembuka || 'Yang bertandatangan di bawah ini Pengurus RT 04 / RW 14 menerangkan bahwa:'}</p>
          <table class="data-table">
            <tr><td style="width: 160px;"><b>Nama Lengkap</b></td><td>:</td><td><b>${s.nama}</b></td></tr>
            <tr><td><b>NIK</b></td><td>:</td><td>${s.nik}</td></tr>
            <tr><td><b>Alamat Domisili</b></td><td>:</td><td>${s.alamat}</td></tr>
            <tr><td><b>Maksud / Keperluan</b></td><td>:</td><td>${s.keperluan}</td></tr>
          </table>
          <p style="text-align: justify;">${appConfig.kalimatPenutup || 'Demikian surat pengantar ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.'}</p>
        </div>
        <div class="ttd">
          <p>${appConfig.kotaSurat || 'Bandung'}, ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
          <p><b>${appConfig.jabatanTtd || 'Ketua RT 04 / RW 14'}</b></p>
          <br><br><br>
          <p style="text-decoration: underline; font-weight: bold; margin-bottom: 2px;">${appConfig.namaTtd || 'Bambang Sudarsono'}</p>
          <p style="font-size: 12px; margin: 0; color: #444;">Pengurus Lingkungan RT 04</p>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 300);
}

function handleSuratSubmit(e) {
  e.preventDefault();
  const nama = document.getElementById('suratNama').value.trim();
  const nik = document.getElementById('suratNik').value.trim();
  const alamat = document.getElementById('suratAlamat').value.trim();
  const jenis = document.getElementById('suratJenis').value;
  const keperluan = document.getElementById('suratKeperluan').value.trim();

  const itemSurat = {
    id: 'S' + Date.now().toString().slice(-4),
    nama, nik, alamat, jenis, keperluan,
    status: 'Diproses',
    tgl: new Date().toISOString().split('T')[0]
  };
  db.surat.push(itemSurat);
  kirimDataKeSheets('ADD_SURAT', itemSurat);
  showToast('Permohonan surat pengantar berhasil dikirim!');
  renderApp();
}

function setujuiSurat(id) {
  const s = db.surat.find(x => x.id === id);
  if (s) {
    s.status = 'Selesai';
    kirimDataKeSheets('UPDATE_SURAT', s);
    showToast('Surat pengantar telah disetujui & siap dicetak!');
    renderApp();
  }
}

function handleAspirasiSubmit(e) {
  e.preventDefault();
  const pelapor = document.getElementById('aspirasiPelapor').value.trim();
  const pesan = document.getElementById('aspirasiPesan').value.trim();

  const itemAspirasi = {
    id: 'L' + Date.now().toString().slice(-4),
    pelapor, pesan,
    status: 'Menunggu',
    tgl: new Date().toISOString().split('T')[0],
    respon: ''
  };
  db.aspirasi.push(itemAspirasi);
  kirimDataKeSheets('ADD_ASPIRASI', itemAspirasi);
  showToast('Laporan/aspirasi Anda berhasil dikirim ke pengurus RT!');
  renderApp();
}

function openModalTambahLaporanBeranda() {
  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">Suara Warga</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">Sampaikan Laporan & Aspirasi</h3>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
          <i class="ph-bold ph-x text-lg"></i>
        </button>
      </div>
      <form onsubmit="handleTambahLaporanBerandaSubmit(event)" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Pelapor / Warga</label>
          <input type="text" id="laporanModalPelapor" required placeholder="Contoh: Pak Joko (Ciskul 9 No. 12)" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Isi Laporan / Kendala Lingkungan</label>
          <textarea id="laporanModalPesan" required rows="3" placeholder="Ceritakan detail kendala (lampu padam, selokan mampet, usulan ronda malam, dll)..." class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
        </div>
        <div class="pt-1">
          <button type="submit" class="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center space-x-2 active:scale-95">
            <i class="ph-bold ph-paper-plane-tilt text-base"></i>
            <span>Kirim Laporan ke Pengurus RT</span>
          </button>
        </div>
      </form>
    </div>
  `;
  openModal(html);
}

function handleTambahLaporanBerandaSubmit(e) {
  e.preventDefault();
  const pelapor = document.getElementById('laporanModalPelapor').value.trim();
  const pesan = document.getElementById('laporanModalPesan').value.trim();

  const newAspirasi = {
    id: 'L' + Date.now().toString().slice(-4),
    pelapor: pelapor,
    pesan: pesan,
    status: 'Menunggu',
    tgl: new Date().toISOString().split('T')[0],
    respon: ''
  };

  db.aspirasi.push(newAspirasi);
  kirimDataKeSheets('ADD_ASPIRASI', newAspirasi);

  closeModal();
  showToast('Laporan Anda berhasil dikirim ke pengurus RT!');
  renderApp();
}

function openModalTanggapiLaporan(id) {
  const item = db.aspirasi.find(l => l.id === id);
  if (!item) return;

  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Tindak Lanjut RT</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">Tanggapi Laporan Warga</h3>
          <p class="text-[11px] text-slate-500">Pelapor: <b>${item.pelapor}</b></p>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
          <i class="ph-bold ph-x text-lg"></i>
        </button>
      </div>
      <form onsubmit="handleTanggapiLaporanSubmit(event, '${item.id}')" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Penanganan</label>
          <select id="tanggapiStatus" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="Menunggu" ${item.status === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
            <option value="Diproses" ${item.status === 'Diproses' ? 'selected' : ''}>Diproses (Dalam Pengerjaan)</option>
            <option value="Selesai" ${item.status === 'Selesai' ? 'selected' : ''}>Selesai (Dituntaskan)</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggapan / Solusi Pengurus</label>
          <textarea id="tanggapiRespon" required rows="3" placeholder="Tuliskan tindakan yang telah atau akan diambil pengurus RT..." class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">${item.respon || ''}</textarea>
        </div>
        <div class="pt-1">
          <button type="submit" class="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center space-x-2 active:scale-95">
            <i class="ph-bold ph-floppy-disk text-base"></i>
            <span>Simpan Tanggapan</span>
          </button>
        </div>
      </form>
    </div>
  `;
  openModal(html);
}

function handleTanggapiLaporanSubmit(e, id) {
  e.preventDefault();
  const status = document.getElementById('tanggapiStatus').value;
  const respon = document.getElementById('tanggapiRespon').value.trim();

  const item = db.aspirasi.find(l => l.id === id);
  if (item) {
    item.status = status;
    item.respon = respon;
    kirimDataKeSheets('UPDATE_ASPIRASI', { id, status, respon });
    closeModal();
    showToast('Tanggapan laporan warga berhasil diperbarui!');
    renderApp();
  }
}

function hapusLaporanWarga(id) {
  db.aspirasi = db.aspirasi.filter(l => l.id !== id);
  kirimDataKeSheets('DELETE_ASPIRASI', { id });
  showToast('Laporan warga berhasil dihapus.');
  renderApp();
}

function openModalEditSurat(id) {
  const s = db.surat.find(x => x.id === id);
  if (!s) return;

  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Akses Pengurus RT</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">Edit Surat Pengantar Warga</h3>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><i class="ph-bold ph-x text-lg"></i></button>
      </div>

      <form onsubmit="handleEditSuratSubmit(event, '${s.id}')" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Lengkap Pemohon</label>
          <input type="text" id="editSuratNama" required value="${s.nama}" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">NIK (16 Digit)</label>
            <input type="text" id="editSuratNik" required value="${s.nik}" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status</label>
            <select id="editSuratStatus" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
              <option value="Diproses" ${s.status === 'Diproses' ? 'selected' : ''}>Diproses</option>
              <option value="Selesai" ${s.status === 'Selesai' ? 'selected' : ''}>Selesai (Disetujui)</option>
              <option value="Ditolak" ${s.status === 'Ditolak' ? 'selected' : ''}>Ditolak</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Alamat Domisili</label>
          <input type="text" id="editSuratAlamat" required value="${s.alamat}" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jenis Surat</label>
          <select id="editSuratJenis" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
            <option value="Pengantar Surat Keterangan Domisili" ${s.jenis === 'Pengantar Surat Keterangan Domisili' ? 'selected' : ''}>Surat Keterangan Domisili</option>
            <option value="Pengantar Nikah / Keterangan Belum Menikah" ${s.jenis === 'Pengantar Nikah / Keterangan Belum Menikah' ? 'selected' : ''}>Pengantar Nikah (Model N1-N4)</option>
            <option value="Surat Keterangan Tidak Mampu (SKTM)" ${s.jenis === 'Surat Keterangan Tidak Mampu (SKTM)' ? 'selected' : ''}>Surat Keterangan Tidak Mampu (SKTM)</option>
            <option value="Pengantar Pembuatan KTP / KK Baru" ${s.jenis === 'Pengantar Pembuatan KTP / KK Baru' ? 'selected' : ''}>Pengantar Pembuatan KTP / KK Baru</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Keperluan</label>
          <textarea id="editSuratKeperluan" required rows="2" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">${s.keperluan}</textarea>
        </div>
        <div class="pt-1">
          <button type="submit" class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center space-x-2">
            <i class="ph-bold ph-floppy-disk text-base"></i>
            <span>Simpan Perubahan Surat</span>
          </button>
        </div>
      </form>
    </div>
  `;
  openModal(html);
}

function handleEditSuratSubmit(e, id) {
  e.preventDefault();
  const s = db.surat.find(x => x.id === id);
  if (!s) return;

  s.nama = document.getElementById('editSuratNama').value.trim();
  s.nik = document.getElementById('editSuratNik').value.trim();
  s.status = document.getElementById('editSuratStatus').value;
  s.alamat = document.getElementById('editSuratAlamat').value.trim();
  s.jenis = document.getElementById('editSuratJenis').value;
  s.keperluan = document.getElementById('editSuratKeperluan').value.trim();

  kirimDataKeSheets('UPDATE_SURAT', s);
  closeModal();
  showToast('Surat pengantar warga berhasil diperbarui & tersimpan di Google Spreadsheet!');
  renderApp();
}

function hapusSurat(id) {
  if (!canManageSurat()) {
    showToast('Hanya Sekretaris, Ketua RT, dan Admin yang dapat mengelola surat!', 'error');
    return;
  }
  const s = db.surat.find(x => x.id === id);
  if (!s) return;

  const html = `
    <div class="space-y-4 text-center p-2">
      <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
        <i class="ph-bold ph-trash"></i>
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-900">Hapus Surat Pengantar?</h3>
        <p class="text-xs text-slate-500 mt-1">Anda yakin ingin menghapus permohonan surat dari <b>"${s.nama}"</b>?</p>
      </div>
      <div class="flex space-x-2 pt-2">
        <button onclick="closeModal()" class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
        <button onclick="konfirmasiHapusSurat('${id}')" class="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow">Ya, Hapus</button>
      </div>
    </div>
  `;
  openModal(html);
}

function konfirmasiHapusSurat(id) {
  db.surat = db.surat.filter(s => s.id !== id);
  kirimDataKeSheets('DELETE_SURAT', { id });
  closeModal();
  showToast('Surat permohonan berhasil dihapus.');
  renderApp();
}

function openModalTambahAgenda() {
  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="text-sm font-black text-slate-900">Tambah Agenda Kegiatan Baru</h3>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><i class="ph-bold ph-x text-lg"></i></button>
      </div>
      <form onsubmit="handleTambahAgendaSubmit(event)" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul Kegiatan</label>
          <input type="text" id="agendaJudul" required placeholder="Contoh: Kerja Bakti Lingkungan" class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal</label>
            <input type="date" id="agendaTanggal" required class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jam</label>
            <input type="text" id="agendaJam" required placeholder="07:30 WIB" class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold">
          </div>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Lokasi</label>
          <input type="text" id="agendaLokasi" required placeholder="Fasum Lapangan RT 04" class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Keterangan / Info</label>
          <textarea id="agendaInfo" required rows="2" placeholder="Informasi detail kegiatan..." class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold"></textarea>
        </div>
        <button type="submit" class="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow">
          Simpan Agenda Baru
        </button>
      </form>
    </div>
  `;
  openModal(html);
}

function handleTambahAgendaSubmit(e) {
  e.preventDefault();
  const judul = document.getElementById('agendaJudul').value.trim();
  const tanggal = document.getElementById('agendaTanggal').value;
  const jam = document.getElementById('agendaJam').value.trim();
  const lokasi = document.getElementById('agendaLokasi').value.trim();
  const info = document.getElementById('agendaInfo').value.trim();

  const itemAgenda = {
    id: 'A' + Date.now().toString().slice(-4),
    judul, tanggal, jam, lokasi, info
  };
  db.agenda.push(itemAgenda);
  kirimDataKeSheets('ADD_AGENDA', itemAgenda);
  closeModal();
  showToast('Agenda kegiatan baru berhasil ditambahkan!');
  renderApp();
}

function hapusAgenda(id, judul) {
  if (!canManageAgenda()) {
    showToast('Hanya Sekretaris, Ketua RT, dan Admin yang dapat menghapus agenda!', 'error');
    return;
  }
  db.agenda = db.agenda.filter(a => a.id !== id);
  kirimDataKeSheets('DELETE_AGENDA', { id });
  showToast(`Agenda "${judul}" berhasil dihapus.`);
  renderApp();
}

// ==========================================
// 6. PANEL ADMIN & SISTEM
// ==========================================
function renderAdminConfig() {
  if (!isAdmin()) {
    return `
      <div class="p-8 text-center space-y-3">
        <i class="ph-bold ph-lock-key text-4xl text-rose-500"></i>
        <h3 class="text-base font-black text-slate-900">Akses Terbatas (Khusus Administrator)</h3>
        <p class="text-xs text-slate-500">Anda harus masuk sebagai Administrator untuk mengakses panel konfigurasi sistem.</p>
      </div>
    `;
  }

  return `
    <div class="p-4 lg:p-6 space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 uppercase">Panel Super User</span>
          <h2 class="text-base font-black text-slate-900 mt-1 font-display">Pengaturan & Otoritas Sistem RT 04</h2>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl">
        <button onclick="adminSubTab = 'pengurus'; renderApp();" class="py-2 px-1.5 rounded-xl text-xs font-bold transition ${adminSubTab === 'pengurus' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
          👥 Pengurus
        </button>
        <button onclick="adminSubTab = 'keuangan'; renderApp();" class="py-2 px-1.5 rounded-xl text-xs font-bold transition ${adminSubTab === 'keuangan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
          💰 Iuran & Kas
        </button>
        <button onclick="adminSubTab = 'surat'; renderApp();" class="py-2 px-1.5 rounded-xl text-xs font-bold transition ${adminSubTab === 'surat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
          📜 Surat & TTD
        </button>
        <button onclick="adminSubTab = 'sistem'; renderApp();" class="py-2 px-1.5 rounded-xl text-xs font-bold transition ${adminSubTab === 'sistem' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
          💾 Cadangan
        </button>
        <button onclick="adminSubTab = 'log'; renderApp();" class="py-2 px-1.5 rounded-xl text-xs font-bold transition col-span-2 sm:col-span-1 ${adminSubTab === 'log' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-900 font-extrabold'}">
          📋 Event Log
        </button>
      </div>

      ${adminSubTab === 'pengurus' ? `
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-black text-slate-900 uppercase">Manajemen Akun Pengurus RT</h3>
              <p class="text-[11px] text-slate-500">Kelola kredensial pengurus lingkungan</p>
            </div>
            <button onclick="openModalTambahPengurus()" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1">
              <i class="ph-bold ph-plus"></i> Buat Akun
            </button>
          </div>

          <div class="space-y-2.5">
            ${db.users.map(u => `
              <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                <div>
                  <div class="flex items-center space-x-2">
                    <h4 class="text-xs font-black text-slate-900">${u.namaWarga || u.username}</h4>
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">${u.role}</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Username: <b>${u.username}</b> • Status: <span class="text-emerald-700 font-bold">Aktif</span></p>
                </div>
                ${u.username !== 'admin' ? `
                  <button onclick="hapusAkunPengurus('${u.username}')" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition" title="Hapus Akun">
                    <i class="ph-bold ph-trash text-base"></i>
                  </button>
                ` : '<span class="text-[10px] text-slate-400 font-bold">Super Admin</span>'}
              </div>
            `).join('')}
          </div>
        </div>
      ` : adminSubTab === 'keuangan' ? `
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <h3 class="text-xs font-black text-slate-900 uppercase">Konfigurasi Tarif Iuran Warga</h3>
          <form onsubmit="handleSimpanConfigKeuangan(event)" class="space-y-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tarif Iuran Warga Per Bulan (Rupiah)</label>
              <input type="number" id="configTarif" required value="${appConfig.tarifIuran}" min="1000" class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <button type="submit" class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow">
              Simpan Tarif Iuran
            </button>
          </form>
        </div>
      ` : adminSubTab === 'surat' ? `
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-black text-slate-900 uppercase">Format Cetak Surat & Penandatangan</h3>
              <p class="text-[11px] text-slate-500">Kop resmi, nomor surat, narasi, dan data penandatangan</p>
            </div>
            <button type="button" onclick="previewFormatSuratAdmin()" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs">
              <i class="ph-bold ph-eye"></i>
              <span>Pratinjau Cetak</span>
            </button>
          </div>

          <form onsubmit="handleSimpanConfigSurat(event)" class="space-y-3.5">
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <span class="text-[10px] font-black uppercase text-slate-500 block">Kop Surat Resmi RT</span>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Baris 1 Kop (Nama Wilayah)</label>
                <input type="text" id="configKop1" required value="${appConfig.kopBaris1 || 'RUKUN TETANGGA 04 / RUKUN WARGA 14'}" class="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Baris 2 Kop (Kelurahan / Kecamatan / Kota)</label>
                <input type="text" id="configKop2" required value="${appConfig.kopBaris2 || 'KELURAHAN CISARANTEN KULON KECAMATAN ARCAMANIK - KOTA BANDUNG'}" class="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Baris 3 Kop (Alamat & Kontak)</label>
                <input type="text" id="configKopAlamat" required value="${appConfig.kopAlamat || 'Sekretariat: Jl. Ciskul Raya No. 9, RT 04 / RW 14, Kota Bandung'}" class="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold">
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Format Nomor Surat (Gunakan [TAHUN])</label>
                <input type="text" id="configFormatNoSurat" required value="${appConfig.formatNoSurat || '04 / SK / [TAHUN] / RT 04'}" class="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kota Penerbitan</label>
                <input type="text" id="configKotaSurat" required value="${appConfig.kotaSurat || 'Bandung'}" class="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold">
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kalimat Pembuka</label>
              <textarea id="configKalimatPembuka" required rows="2" class="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold">${appConfig.kalimatPembuka || ''}</textarea>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kalimat Penutup</label>
              <textarea id="configKalimatPenutup" required rows="2" class="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold">${appConfig.kalimatPenutup || ''}</textarea>
            </div>

            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <span class="text-[10px] font-black uppercase text-slate-500 block">Pejabat Penandatangan</span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Ketua RT</label>
                  <input type="text" id="configNamaTtd" required value="${appConfig.namaTtd}" class="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jabatan Ketua RT</label>
                  <input type="text" id="configJabatanTtd" required value="${appConfig.jabatanTtd}" class="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold">
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Bendahara RT</label>
                  <input type="text" id="configNamaBendahara" required value="${appConfig.namaBendahara || 'H. Ahmad Sobari'}" class="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jabatan Bendahara RT</label>
                  <input type="text" id="configJabatanBendahara" required value="${appConfig.jabatanBendahara || 'Bendahara RT 04 / RW 14'}" class="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold">
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor WhatsApp Resmi RT</label>
                <input type="text" id="configKontakRt" required value="${appConfig.kontakRt}" class="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold">
              </div>
            </div>

            <div class="pt-1">
              <button type="submit" class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition shadow-lg flex items-center justify-center space-x-2 active:scale-95">
                <i class="ph-bold ph-floppy-disk text-base"></i>
                <span>Simpan Format Surat & Pejabat</span>
              </button>
            </div>
          </form>
        </div>
      ` : adminSubTab === 'sistem' ? `
        <!-- Kartu 1: Integrasi Google Spreadsheet Real-Time -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 text-left">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider font-display">
                  Integrasi Google Spreadsheet & Cloud Database
                </h3>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Setiap ada perubahan data di web, data otomatis terkirim dan tersimpan di Google Spreadsheet Anda.</p>
            </div>
            <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <i class="ph-bold ph-check-circle text-xs"></i>
              <span>Sinkronisasi Otomatis Aktif</span>
            </span>
          </div>

          <form onsubmit="handleSimpanUrlSpreadsheet(event)" class="space-y-3 pt-1">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">URL Web App Google Apps Script (/exec)</label>
              <div class="flex gap-2">
                <input type="url" id="configGasUrl" required value="${APP_URL}" placeholder="https://script.google.com/macros/s/.../exec" class="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
                <button type="submit" class="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95 flex-shrink-0">
                  <i class="ph-bold ph-floppy-disk"></i>
                  <span>Simpan URL</span>
                </button>
              </div>
              <p class="text-[10.5px] text-slate-400 mt-1">Dihasilkan dari menu Apps Script > Terapkan (Deploy) > Aplikasi Web (Web App) dengan akses Siapa Saja (Anyone).</p>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <button type="button" onclick="muatDataDariSheets(true)" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95">
                <i class="ph-bold ph-arrows-clockwise text-xs"></i>
                <span>Tarik Data Terbaru dari Spreadsheet</span>
              </button>
              <button type="button" onclick="handleResetUrlSpreadsheet()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition">
                Reset ke URL Bawaan
              </button>
            </div>
          </form>
        </div>

        <!-- Kartu 2: Cadangan Data & Sinkronisasi Sistem Lokal -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 text-left">
          <h3 class="text-xs font-black text-slate-900 uppercase">Cadangan Cadangan File JSON Lokal</h3>
          <p class="text-xs text-slate-500 leading-relaxed">Unduh seluruh salinan database (warga, kas, iuran, surat, agenda) ke file JSON lokal sebagai perlindungan data ganda.</p>
          <div class="flex flex-wrap gap-2.5">
            <button onclick="downloadBackupJson()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95">
              <i class="ph-bold ph-download-simple"></i>
              <span>Unduh Backup JSON</span>
            </button>
            <label class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200">
              <i class="ph-bold ph-upload-simple"></i>
              <span>Pulihkan dari File Backup</span>
              <input type="file" accept=".json" onchange="restoreBackupJson(event)" class="hidden">
            </label>
          </div>
        </div>
      ` : `
        <!-- Event Log Audit Trail View -->
        ${renderAdminLogView()}
      `}
    </div>
  `;
}

// ==========================================
// 6B. AUDIT TRAIL & EVENT LOG SYSTEM (SUPER USER)
// ==========================================
function logEvent(kategori, pesan, tipe = 'info', userCustom = null) {
  if (!Array.isArray(db.logs)) db.logs = [];
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const waktuStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const user = userCustom || (currentUser ? (currentUser.namaWarga || currentUser.username) : 'Warga / Tamu');
  const role = currentUser ? (currentUser.role || 'Pengurus RT') : (userCustom ? 'Pengurus' : 'Publik');

  const newLog = {
    id: 'LOG-' + Date.now().toString().slice(-5) + Math.floor(Math.random() * 90 + 10),
    waktu: waktuStr,
    user: user,
    role: role,
    kategori: String(kategori || 'SISTEM').toUpperCase(),
    pesan: pesan,
    tipe: tipe || 'info'
  };

  db.logs.unshift(newLog);
  if (db.logs.length > 300) {
    db.logs = db.logs.slice(0, 300);
  }
  saveLocalStorageData();
}

function getFilteredLogs() {
  if (!Array.isArray(db.logs)) db.logs = [];
  const q = logSearchQuery.toLowerCase().trim();
  const terms = q ? q.split(/\s+/).filter(Boolean) : [];

  return db.logs.filter(l => {
    const combined = `${l.id || ''} ${l.waktu || ''} ${l.user || ''} ${l.role || ''} ${l.kategori || ''} ${l.pesan || ''}`.toLowerCase();
    const matchQuery = terms.length === 0 || terms.every(t => combined.includes(t));
    const matchKat = logFilterKategori === 'semua' || l.kategori === logFilterKategori;
    const matchTipe = logFilterTipe === 'semua' || l.tipe === logFilterTipe;
    return matchQuery && matchKat && matchTipe;
  });
}

function renderLogListHtml(logs) {
  if (!logs || logs.length === 0) {
    return `
      <div class="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <i class="ph-bold ph-clipboard-text text-3xl text-slate-300 mb-1 inline-block"></i>
        <p class="text-xs font-bold text-slate-500">Tidak ada catatan event log yang sesuai dengan filter atau kata kunci.</p>
      </div>
    `;
  }

  const katMeta = {
    AUTH: { icon: 'ph-shield-check', bg: 'bg-indigo-50', color: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    WARGA: { icon: 'ph-users-three', bg: 'bg-amber-50', color: 'text-amber-600', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
    KAS: { icon: 'ph-wallet', bg: 'bg-emerald-50', color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    IURAN: { icon: 'ph-receipt', bg: 'bg-blue-50', color: 'text-blue-600', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
    SURAT: { icon: 'ph-file-text', bg: 'bg-purple-50', color: 'text-purple-600', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
    AGENDA: { icon: 'ph-calendar-check', bg: 'bg-teal-50', color: 'text-teal-600', badge: 'bg-teal-100 text-teal-800 border-teal-200' },
    SISTEM: { icon: 'ph-gear-six', bg: 'bg-rose-50', color: 'text-rose-600', badge: 'bg-rose-100 text-rose-800 border-rose-200' }
  };

  const tipeMeta = {
    info: { label: 'Info', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
    success: { label: 'Sukses', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    warning: { label: 'Peringatan', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
    danger: { label: 'Kritis', badge: 'bg-rose-100 text-rose-800 border-rose-200' }
  };

  return logs.map(l => {
    const km = katMeta[l.kategori] || { icon: 'ph-activity', bg: 'bg-slate-100', color: 'text-slate-600', badge: 'bg-slate-100 text-slate-800 border-slate-200' };
    const tm = tipeMeta[l.tipe] || tipeMeta.info;

    return `
      <div class="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
        <div class="flex items-start space-x-3 min-w-0 flex-1">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${km.bg} ${km.color}">
            <i class="ph-bold ${km.icon}"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${km.badge}">${l.kategori}</span>
              <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border ${tm.badge}">${tm.label}</span>
              <span class="text-[10px] font-mono text-slate-400">${l.id}</span>
            </div>
            <p class="text-xs font-bold text-slate-800 mt-1 break-words">${l.pesan}</p>
            <div class="flex items-center gap-2 text-[10.5px] text-slate-500 mt-1 flex-wrap">
              <span class="flex items-center gap-1 font-semibold text-slate-700">
                <i class="ph-bold ph-user text-slate-400"></i> ${l.user}
              </span>
              <span>•</span>
              <span class="px-1.5 py-0.5 rounded text-[9.5px] bg-slate-100 text-slate-600 font-semibold">${l.role || 'Pengurus'}</span>
              <span>•</span>
              <span class="flex items-center gap-1 text-slate-400">
                <i class="ph-bold ph-clock"></i> ${l.waktu} WIB
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleLogSearch(val) {
  logSearchQuery = val;
  const container = document.getElementById('logListContainer');
  if (container) {
    container.innerHTML = renderLogListHtml(getFilteredLogs());
  } else {
    renderApp();
  }
  const clearBtn = document.getElementById('logSearchClearBtn');
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !val);
  }
}

function handleLogSearchClear() {
  logSearchQuery = '';
  const input = document.getElementById('logSearchInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  handleLogSearch('');
}

function handleLogFilterChange() {
  const container = document.getElementById('logListContainer');
  if (container) {
    container.innerHTML = renderLogListHtml(getFilteredLogs());
  } else {
    renderApp();
  }
}

function downloadLogCsv() {
  if (!db.logs || db.logs.length === 0) {
    showToast('Belum ada data log untuk diekspor.', 'error');
    return;
  }
  const headers = ['ID Log', 'Waktu (WIB)', 'User Pelaksana', 'Role / Jabatan', 'Kategori Modul', 'Tingkat Event', 'Deskripsi Aktivitas'];
  const rows = db.logs.map(l => [
    `"${l.id}"`,
    `"${l.waktu}"`,
    `"${(l.user || '').replace(/"/g, '""')}"`,
    `"${(l.role || '').replace(/"/g, '""')}"`,
    `"${l.kategori}"`,
    `"${l.tipe}"`,
    `"${(l.pesan || '').replace(/"/g, '""')}"`
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SatuWarga04_EventLog_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Event log berhasil diekspor ke file CSV!');
}

function confirmClearLogs() {
  const html = `
    <div class="space-y-4 text-center p-2">
      <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
        <i class="ph-bold ph-trash"></i>
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-900">Bersihkan Riwayat Event Log?</h3>
        <p class="text-xs text-slate-500 mt-1">Seluruh riwayat aktivitas event log saat ini akan dihapus dari cache lokal. Aksi ini tidak dapat dibatalkan.</p>
      </div>
      <div class="flex space-x-2 pt-2">
        <button onclick="closeModal()" class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
        <button onclick="executeClearLogs()" class="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow">Ya, Bersihkan</button>
      </div>
    </div>
  `;
  openModal(html);
}

function executeClearLogs() {
  db.logs = [];
  logEvent('SISTEM', 'Riwayat event log sebelumnya telah dibersihkan oleh Administrator', 'warning');
  closeModal();
  showToast('Riwayat event log berhasil dibersihkan.');
  renderApp();
}

function renderAdminLogView() {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogsCount = (db.logs || []).filter(l => l.waktu && l.waktu.startsWith(todayStr)).length;
  const filtered = getFilteredLogs();

  return `
    <div class="space-y-4">
      <!-- Header Info & Quick Metrics -->
      <div class="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-rose-900/40 relative overflow-hidden">
        <div class="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center space-x-2">
              <span class="px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider border border-rose-500/40">Audit Trail & Security</span>
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <h3 class="text-base font-black mt-1 font-display">System Event & Activity Log</h3>
            <p class="text-xs text-rose-200/80 mt-0.5">Pencatatan riwayat setiap aksi krusial pengurus, mutasi kas, e-sensus, iuran, hingga keamanan sistem.</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="downloadLogCsv()" class="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm">
              <i class="ph-bold ph-file-csv text-base text-emerald-300"></i>
              <span>Ekspor CSV</span>
            </button>
            <button onclick="confirmClearLogs()" class="px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm">
              <i class="ph-bold ph-trash text-base"></i>
              <span>Bersihkan Riwayat</span>
            </button>
          </div>
        </div>

        <!-- 3 Quick Metrics -->
        <div class="grid grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-white/10">
          <div class="bg-white/5 backdrop-blur p-2.5 rounded-2xl border border-white/10">
            <span class="text-[10px] text-slate-300 font-semibold uppercase">Total Event</span>
            <p class="text-lg font-black mt-0.5 text-white">${db.logs ? db.logs.length : 0}</p>
          </div>
          <div class="bg-white/5 backdrop-blur p-2.5 rounded-2xl border border-white/10">
            <span class="text-[10px] text-slate-300 font-semibold uppercase">Aktivitas Hari Ini</span>
            <p class="text-lg font-black mt-0.5 text-amber-300">${todayLogsCount}</p>
          </div>
          <div class="bg-white/5 backdrop-blur p-2.5 rounded-2xl border border-white/10">
            <span class="text-[10px] text-slate-300 font-semibold uppercase">Status Keamanan</span>
            <p class="text-lg font-black mt-0.5 text-emerald-400">Normal</p>
          </div>
        </div>
      </div>

      <!-- Search & Filter Card -->
      <div class="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5">
        <div class="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <i class="ph-bold ph-magnifying-glass text-slate-400 text-base"></i>
          <input type="text" id="logSearchInput" value="${logSearchQuery}" oninput="handleLogSearch(this.value)" placeholder="Cari aktivitas, nama user, waktu, atau kata kunci..." class="w-full text-xs font-semibold focus:outline-none bg-transparent">
          <button id="logSearchClearBtn" onclick="handleLogSearchClear()" class="${logSearchQuery ? '' : 'hidden'} text-slate-400 hover:text-slate-600 p-0.5" title="Hapus pencarian">
            <i class="ph-bold ph-x-circle text-base"></i>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Kategori Modul</label>
            <select id="logFilterKategori" onchange="logFilterKategori = this.value; handleLogFilterChange();" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none">
              <option value="semua" ${logFilterKategori === 'semua' ? 'selected' : ''}>Semua Kategori</option>
              <option value="AUTH" ${logFilterKategori === 'AUTH' ? 'selected' : ''}>🔐 AUTH (Login / Akses)</option>
              <option value="WARGA" ${logFilterKategori === 'WARGA' ? 'selected' : ''}>👥 WARGA (e-Sensus & Data KK)</option>
              <option value="KAS" ${logFilterKategori === 'KAS' ? 'selected' : ''}>💰 KAS (Pemasukan / Pengeluaran)</option>
              <option value="IURAN" ${logFilterKategori === 'IURAN' ? 'selected' : ''}>💳 IURAN (Pembayaran / Batal)</option>
              <option value="SURAT" ${logFilterKategori === 'SURAT' ? 'selected' : ''}>📜 SURAT (Pengantar & Format)</option>
              <option value="SISTEM" ${logFilterKategori === 'SISTEM' ? 'selected' : ''}>⚙️ SISTEM (Config & Cadangan)</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Tingkat Event (Severity)</label>
            <select id="logFilterTipe" onchange="logFilterTipe = this.value; handleLogFilterChange();" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none">
              <option value="semua" ${logFilterTipe === 'semua' ? 'selected' : ''}>Semua Tingkat</option>
              <option value="info" ${logFilterTipe === 'info' ? 'selected' : ''}>ℹ️ Info / Normal</option>
              <option value="success" ${logFilterTipe === 'success' ? 'selected' : ''}>✅ Berhasil (Success)</option>
              <option value="warning" ${logFilterTipe === 'warning' ? 'selected' : ''}>⚠️ Peringatan (Warning)</option>
              <option value="danger" ${logFilterTipe === 'danger' ? 'selected' : ''}>🛑 Kritis / Hapus (Danger)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Log Items Container -->
      <div id="logListContainer" class="space-y-2">
        ${renderLogListHtml(filtered)}
      </div>
    </div>
  `;
}

// Backup & Restore System
function downloadBackupJson() {
  const payload = { db, appConfig, exportedAt: new Date().toISOString() };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `SatuWarga04_Backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Cadangan data JSON berhasil diunduh!');
}

function restoreBackupJson(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.db && data.appConfig) {
        db = data.db;
        appConfig = data.appConfig;
        saveLocalStorageData();
        showToast('Data sistem berhasil dipulihkan dari cadangan JSON!');
        renderApp();
      } else {
        showToast('Format file cadangan tidak valid!', 'error');
      }
    } catch (err) {
      showToast('Gagal memproses file JSON!', 'error');
    }
  };
  reader.readAsText(file);
}

function openModalTambahPengurus() {
  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 class="text-sm font-black text-slate-900">Buat Akun Pengurus Baru</h3>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><i class="ph-bold ph-x text-lg"></i></button>
      </div>
      <form onsubmit="handleTambahPengurusSubmit(event)" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Username Login</label>
          <input type="text" id="newPengurusUser" required placeholder="Contoh: bendahara2" class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password (Min. 3 Karakter)</label>
          <input type="password" id="newPengurusPass" required minlength="3" placeholder="Minimal 3 karakter" class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nama Lengkap Pejabat</label>
          <input type="text" id="newPengurusNama" required placeholder="Nama pejabat" class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jabatan / Peran</label>
          <select id="newPengurusRole" class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold">
            <option value="Ketua RT">Ketua RT</option>
            <option value="Bendahara RT">Bendahara RT</option>
            <option value="Sekretaris RT">Sekretaris RT</option>
            <option value="Pengurus RT">Pengurus RT</option>
          </select>
        </div>
        <button type="submit" class="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow">
          Simpan & Daftarkan Akun
        </button>
      </form>
    </div>
  `;
  openModal(html);
}

function handleTambahPengurusSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('newPengurusUser').value.trim().toLowerCase();
  const password = document.getElementById('newPengurusPass').value;
  const namaWarga = document.getElementById('newPengurusNama').value.trim();
  const role = document.getElementById('newPengurusRole').value;

  if (db.users.some(u => u.username.toLowerCase() === username)) {
    showToast('Username sudah terdaftar!', 'error');
    return;
  }

  const newUser = { username, password, role, namaWarga };
  db.users.push(newUser);
  kirimDataKeSheets('ADD_USER', newUser);
  closeModal();
  showToast(`Akun pengurus ${username} (${role}) berhasil dibuat!`);
  renderApp();
}

function hapusAkunPengurus(username) {
  db.users = db.users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  kirimDataKeSheets('DELETE_USER', { username });
  showToast(`Akun pengurus ${username} berhasil dihapus.`);
  renderApp();
}

function handleSimpanConfigKeuangan(e) {
  e.preventDefault();
  appConfig.tarifIuran = Number(document.getElementById('configTarif').value) || 75000;
  kirimDataKeSheets('SAVE_CONFIG', appConfig);
  showToast('Konfigurasi tarif iuran berhasil disimpan!');
}

function handleSimpanConfigSurat(e) {
  e.preventDefault();
  appConfig.kopBaris1 = document.getElementById('configKop1').value.trim();
  appConfig.kopBaris2 = document.getElementById('configKop2').value.trim();
  appConfig.kopAlamat = document.getElementById('configKopAlamat').value.trim();
  appConfig.formatNoSurat = document.getElementById('configFormatNoSurat').value.trim();
  appConfig.kotaSurat = document.getElementById('configKotaSurat').value.trim();
  appConfig.kalimatPembuka = document.getElementById('configKalimatPembuka').value.trim();
  appConfig.kalimatPenutup = document.getElementById('configKalimatPenutup').value.trim();
  appConfig.namaTtd = document.getElementById('configNamaTtd').value.trim();
  appConfig.jabatanTtd = document.getElementById('configJabatanTtd').value.trim();
  appConfig.namaBendahara = document.getElementById('configNamaBendahara').value.trim();
  appConfig.jabatanBendahara = document.getElementById('configJabatanBendahara').value.trim();
  appConfig.kontakRt = document.getElementById('configKontakRt').value.trim();
  kirimDataKeSheets('SAVE_CONFIG', appConfig);
  showToast('Konfigurasi surat & data penandatangan berhasil disimpan!');
}

function handleSimpanUrlSpreadsheet(e) {
  e.preventDefault();
  const inputUrl = document.getElementById('configGasUrl').value.trim();
  if (!inputUrl) return;
  APP_URL = inputUrl;
  localStorage.setItem(APP_URL_STORAGE_KEY, inputUrl);
  showToast('URL Google Apps Script berhasil disimpan!');
  muatDataDariSheets(true);
}

function handleResetUrlSpreadsheet() {
  APP_URL = DEFAULT_APP_URL;
  localStorage.removeItem(APP_URL_STORAGE_KEY);
  const inputEl = document.getElementById('configGasUrl');
  if (inputEl) inputEl.value = DEFAULT_APP_URL;
  showToast('URL Google Apps Script dikembalikan ke bawaan.');
  muatDataDariSheets(true);
}

function previewFormatSuratAdmin() {
  const dummy = { id: 'DUMMY', nama: 'Bpk. Herman Suherman', nik: '3273010101010001', alamat: 'Ciskul 9 No. 12', jenis: 'Pengantar Surat Keterangan Domisili', keperluan: 'Kelengkapan administrasi perbankan' };
  db.surat.push(dummy);
  cetakSuratPengantarLangsung('DUMMY');
  db.surat = db.surat.filter(s => s.id !== 'DUMMY');
}

// Otentikasi Login & Ganti Sandi
function openModalLoginPengurus() {
  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Khusus Pengurus & Admin</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">Masuk Panel Pengurus RT</h3>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><i class="ph-bold ph-x text-lg"></i></button>
      </div>
      <p class="text-xs text-slate-500 leading-relaxed">
        Warga umum dapat melihat transparansi kas & iuran tanpa login. Akses login khusus untuk Pengurus RT.
      </p>
      <form onsubmit="handleLoginSubmit(event)" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Username Pengurus</label>
          <input type="text" id="loginUsername" required placeholder="Contoh: admin / ketua / bendahara / sekretaris" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password</label>
          <input type="password" id="loginPassword" required minlength="3" placeholder="Masukkan password Anda" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div class="pt-1">
          <button type="submit" class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center space-x-2 active:scale-95">
            <i class="ph-bold ph-sign-in text-base"></i>
            <span>Masuk Akun Pengurus</span>
          </button>
        </div>
        <div class="text-center pt-1">
          <p class="text-[11px] text-slate-400">Akun default: Username: <b>admin</b> | Password: <b>123</b></p>
        </div>
      </form>
    </div>
  `;
  openModal(html);
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  const match = db.users.find(u => u.username.toLowerCase() === username);
  if (!match) {
    showToast('Username tidak terdaftar sebagai pengurus!', 'error');
    return;
  }

  const validPassword = match.password ? String(match.password) : '123';
  if (password === validPassword) {
    currentUser = {
      username: match.username,
      role: match.role || 'Pengurus RT',
      namaWarga: match.namaWarga || match.username
    };
    logEvent('AUTH', `Login berhasil sebagai ${currentUser.namaWarga} (${currentUser.role})`, 'success', currentUser.namaWarga);
    closeModal();
    showToast(`Berhasil masuk sebagai ${currentUser.role}!`);
    renderApp();
    return;
  }

  showToast('Password pengurus salah! Silakan coba lagi.', 'error');
}

function openModalGantiPassword() {
  if (!currentUser) return;
  const html = `
    <div class="space-y-4 text-left">
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">Keamanan Akun</span>
          <h3 class="text-sm font-black text-slate-900 mt-1">Ganti Password Pengurus</h3>
          <p class="text-[11px] text-slate-500">Akun: <b>${currentUser.username}</b> (${currentUser.role})</p>
        </div>
        <button onclick="closeModal()" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><i class="ph-bold ph-x text-lg"></i></button>
      </div>
      <form onsubmit="handleGantiPasswordSubmit(event)" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password Lama</label>
          <input type="password" id="passLama" required placeholder="Masukkan password lama" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Password Baru (Min. 3 Karakter)</label>
          <input type="password" id="passBaru" required minlength="3" placeholder="Minimal 3 karakter" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ulangi Password Baru</label>
          <input type="password" id="passKonfirmasi" required minlength="3" placeholder="Ketik ulang password baru" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div class="pt-1">
          <button type="submit" class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center space-x-2 active:scale-95">
            <i class="ph-bold ph-floppy-disk text-base"></i>
            <span>Simpan Password Baru</span>
          </button>
        </div>
      </form>
    </div>
  `;
  openModal(html);
}

function handleGantiPasswordSubmit(e) {
  e.preventDefault();
  const lama = document.getElementById('passLama').value;
  const baru = document.getElementById('passBaru').value;
  const konfirmasi = document.getElementById('passKonfirmasi').value;

  const userObj = db.users.find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
  if (!userObj) {
    showToast('Akun tidak ditemukan!', 'error');
    return;
  }

  if (String(userObj.password || '123') !== lama) {
    showToast('Password lama Anda salah!', 'error');
    return;
  }

  if (baru.length < 3) {
    showToast('Password baru harus minimal 3 karakter!', 'error');
    return;
  }

  if (baru !== konfirmasi) {
    showToast('Konfirmasi password baru tidak cocok!', 'error');
    return;
  }

  userObj.password = baru;
  kirimDataKeSheets('CHANGE_PASSWORD', { username: currentUser.username, oldPassword: lama, newPassword: baru });
  closeModal();
  showToast('Password akun Anda berhasil diperbarui!');
}

function logout() {
  if (currentUser) {
    logEvent('AUTH', `User ${currentUser.namaWarga || currentUser.username} (${currentUser.role}) logout dari sistem`, 'info');
  }
  currentUser = null;
  showToast('Anda telah keluar dari mode Pengurus.');
  renderApp();
}

// ------------------------------------------
// Chart.js Handlers
// ------------------------------------------
function hitungTotalKasPerBulan(tahun = String(CURRENT_YEAR)) {
  const masuk = Array(12).fill(0);
  const keluar = Array(12).fill(0);
  db.kas.forEach(k => {
    if (k.tanggal && k.tanggal.startsWith(tahun)) {
      const parts = k.tanggal.split('-');
      if (parts.length >= 2) {
        const bulanIdx = parseInt(parts[1], 10) - 1;
        if (bulanIdx >= 0 && bulanIdx < 12) {
          const nom = Number(k.nominal) || 0;
          if (k.tipe === 'masuk') masuk[bulanIdx] += nom;
          else if (k.tipe === 'keluar') keluar[bulanIdx] += nom;
        }
      }
    }
  });
  return { masuk, keluar };
}

function initBerandaChart() {
  const canvas = document.getElementById('chartBerandaKasIuran');
  if (!canvas || typeof Chart === 'undefined') return;
  if (berandaChartInstance) berandaChartInstance.destroy();
  const dataBulanan = hitungTotalKasPerBulan(String(CURRENT_YEAR));
  berandaChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
      datasets: [
        { 
          label: 'Pemasukan Kas', 
          data: dataBulanan.masuk, 
          borderColor: '#0284c7', 
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          fill: true
        },
        { 
          label: 'Pengeluaran Kas', 
          data: dataBulanan.keluar, 
          borderColor: '#e11d48', 
          backgroundColor: 'rgba(225, 29, 72, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          fill: true
        }
      ]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(val) {
              return 'Rp ' + Number(val).toLocaleString('id-ID');
            }
          }
        }
      }
    }
  });
}

function initBerandaKependudukanCharts() {
  const canvasBlok = document.getElementById('chartBerandaDistribusiBlok');
  const canvasDemografi = document.getElementById('chartBerandaDemografi');

  const blokNames = ['Ciskul I', 'Ciskul 6', 'Ciskul 7', 'Ciskul 8', 'Ciskul 9', 'Ciskul 10'];
  const blokCounts = blokNames.map(b => db.warga.filter(w => w.noRumah && (w.noRumah.includes(b) || (b === 'Ciskul I' && /\bCiskul 1\b/i.test(w.noRumah)))).length);
  const tetap = db.warga.filter(w => w.status === 'Tetap').length;
  const kontrak = db.warga.filter(w => w.status === 'Kontrak').length;

  if (canvasBlok && typeof Chart !== 'undefined') {
    if (berandaDistribusiBlokChartInstance) berandaDistribusiBlokChartInstance.destroy();
    berandaDistribusiBlokChartInstance = new Chart(canvasBlok, {
      type: 'bar',
      data: {
        labels: ['Ciskul I', 'Ciskul 6', 'Ciskul 7', 'Ciskul 8', 'Ciskul 9', 'Ciskul 10'],
        datasets: [{
          label: 'Jumlah KK',
          data: blokCounts,
          backgroundColor: [
            '#06b6d4', // Ciskul I: Cyan
            '#0ea5e9', // Ciskul 6: Sky Blue
            '#6366f1', // Ciskul 7: Indigo
            '#8b5cf6', // Ciskul 8: Purple
            '#10b981', // Ciskul 9: Emerald
            '#f59e0b'  // Ciskul 10: Amber
          ],
          hoverBackgroundColor: [
            '#0891b2',
            '#0284c7',
            '#4f46e5',
            '#7c3aed',
            '#059669',
            '#d97706'
          ],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return ` ${ctx.parsed.y} KK Terdaftar`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10, weight: 'bold' },
              color: '#64748b'
            }
          },
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(...blokCounts, 3),
            ticks: {
              stepSize: 1,
              precision: 0,
              font: { size: 10 },
              color: '#94a3b8',
              callback: function(val) {
                return val + ' KK';
              }
            },
            grid: {
              color: 'rgba(226, 232, 240, 0.6)'
            }
          }
        }
      }
    });
  }

  if (canvasDemografi && typeof Chart !== 'undefined') {
    if (berandaDemografiChartInstance) berandaDemografiChartInstance.destroy();
    berandaDemografiChartInstance = new Chart(canvasDemografi, {
      type: 'doughnut',
      data: {
        labels: ['Warga Tetap (Pemilik)', 'Warga Kontrak / Sewa'],
        datasets: [{
          data: [tetap, kontrak],
          backgroundColor: ['#059669', '#3b82f6'],
          hoverBackgroundColor: ['#047857', '#2563eb'],
          borderWidth: 3,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 10, weight: 'bold' },
              padding: 10,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const total = tetap + kontrak;
                const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return ` ${ctx.label}: ${ctx.parsed} KK (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
}

function initKasChart() {
  const canvas = document.getElementById('chartKasKomparasi');
  if (!canvas || typeof Chart === 'undefined') return;
  if (kasChartInstance) kasChartInstance.destroy();
  const dataBulanan = hitungTotalKasPerBulan(String(CURRENT_YEAR));
  kasChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
      datasets: [
        {
          label: 'Pemasukan',
          data: dataBulanan.masuk,
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          fill: true
        },
        { 
          label: 'Pengeluaran', 
          data: dataBulanan.keluar, 
          borderColor: '#e11d48', 
          backgroundColor: 'rgba(225, 29, 72, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          fill: true
        }
      ]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(val) {
              return 'Rp ' + Number(val).toLocaleString('id-ID');
            }
          }
        }
      }
    }
  });
}

function initIuranChart() {
  const canvas = document.getElementById('chartIuranRealisasi');
  if (!canvas || typeof Chart === 'undefined') return;
  if (iuranChartInstance) iuranChartInstance.destroy();

  const totalKK = db.warga.length;
  const dataLunas = [];
  const dataBelumLunas = [];

  NAMA_BULAN_ID.forEach(b => {
    const fullBulan = `${b} ${CURRENT_YEAR}`;
    if (db.iuran.length === 0 || totalKK === 0) {
      dataLunas.push(0);
      dataBelumLunas.push(0);
    } else {
      const lunasKkSet = new Set(
        db.iuran
          .filter(i => i.bulan.toLowerCase().trim() === fullBulan.toLowerCase().trim() && i.status === 'Lunas')
          .map(i => i.nama.toLowerCase().trim())
      );

      const lunasCount = db.warga.filter(w => lunasKkSet.has(w.nama.toLowerCase().trim())).length;
      const adaTransaksi = db.iuran.some(i => i.bulan.toLowerCase().trim() === fullBulan.toLowerCase().trim());
      const belumCount = adaTransaksi ? Math.max(0, totalKK - lunasCount) : 0;

      dataLunas.push(lunasCount);
      dataBelumLunas.push(belumCount);
    }
  });

  iuranChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
      datasets: [
        {
          label: 'Lunas',
          data: dataLunas,
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          fill: true
        },
        {
          label: 'Belum Lunas',
          data: dataBelumLunas,
          borderColor: '#e11d48',
          backgroundColor: 'rgba(225, 29, 72, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.parsed.y} KK`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: totalKK > 0 ? Math.max(totalKK, 4) : 4,
          ticks: {
            stepSize: 1,
            precision: 0,
            callback: function(val) {
              return val + ' KK';
            }
          }
        }
      }
    }
  });
}

function initDemografiChart() {
  const canvas = document.getElementById('chartDemografiWarga');
  if (!canvas || typeof Chart === 'undefined') return;
  const tetap = db.warga.filter(w => w.status === 'Tetap').length;
  const kontrak = db.warga.filter(w => w.status === 'Kontrak').length;
  if (demografiChartInstance) demografiChartInstance.destroy();
  demografiChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Warga Tetap (Pemilik)', 'Warga Kontrak / Sewa'],
      datasets: [{
        data: [tetap, kontrak],
        backgroundColor: ['#059669', '#3b82f6'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function initBlokChart() {
  const canvas = document.getElementById('chartDistribusiBlok');
  if (!canvas || typeof Chart === 'undefined') return;
  if (blokChartInstance) blokChartInstance.destroy();

  const blokNames = ['Ciskul I', 'Ciskul 6', 'Ciskul 7', 'Ciskul 8', 'Ciskul 9', 'Ciskul 10'];
  const blokCounts = blokNames.map(b => db.warga.filter(w => w.noRumah && (w.noRumah.includes(b) || (b === 'Ciskul I' && /\bCiskul 1\b/i.test(w.noRumah)))).length);

  blokChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: blokNames,
      datasets: [{
        label: 'Jumlah KK',
        data: blokCounts,
        backgroundColor: '#0d9488',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 }
        }
      }
    }
  });
}

// Inisialisasi Saat Dokumen Siap
window.addEventListener('DOMContentLoaded', () => {
  loadLocalStorageData();
  startLiveClock();
  muatDataDariSheets();
  renderApp();
});

// Otomatis Adaptasi Ukuran Layar jika Belum Dipilih Secara Manual
window.addEventListener('resize', () => {
  if (!localStorage.getItem(VIEW_MODE_KEY)) {
    const shouldBeDesktop = window.innerWidth >= 1024;
    const newMode = shouldBeDesktop ? 'desktop' : 'mobile';
    if (newMode !== currentViewMode) {
      currentViewMode = newMode;
      applyViewMode();
      renderViewModeToggle();
      renderDesktopNav();
      renderBottomNav();
    }
  }
});
