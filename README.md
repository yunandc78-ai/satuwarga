# SatuWarga 04 - Sistem Informasi & Kas RT 04 RW 14

**SatuWarga 04** adalah aplikasi web modern terpadu untuk transparansi kas, kartu kendali iuran bulanan warga (2026–2036), layanan surat pengantar resmi, serta pendataan kependudukan & e-Sensus mandiri untuk **RT 04 / RW 14 Kelurahan Cisaranten Kulon, Kecamatan Arcamanik, Kota Bandung**.

---

## ✨ Fitur Unggulan (Hasil Revamp & Redesain)

1. **Desain Mewah & Responsif (Mode Desktop & Mode Ponsel)**:
   - **Dual View Mode (Desktop & Ponsel)**: Tombol peralihan instan di header untuk berganti antara **Mode Desktop** (widescreen dashboard 1400px dengan top navigation pills) dan **Mode Ponsel** (frame ramping 620px dengan bottom navigation bar).
   - Preferensi tampilan tersimpan otomatis di *LocalStorage* browser dan auto-detect resolusi layar monitor.
   - Tampilan Glassmorphism modern dengan palet warna emerald/teal & slate premium.
   - Jam digital & kalender Indonesia real-time.
   - Layout multi-kolom yang optimal di monitor PC/Laptop:
     - **Beranda**: Radar Tunggakan Iuran berdampingan dengan Agenda & Aspirasi.
     - **Buku Kas**: Grafik Arus Kas bulanan berdampingan dengan tabel riwayat transaksi mutasi.
     - **Iuran Warga**: Grafik Realisasi bulanan berdampingan dengan grid kartu kendali KK.
     - **Kependudukan**: Kartu warga tersusun rapi dalam 3 kolom grid & grafik demografi berdampingan.
   - Animasi micro-interactions dan efek confetti saat pelunasan iuran atau pencatatan transaksi.

2. **Dashboard & Transparansi Beranda**:
   - Bento Grid Saldo Kas RT 04 (Saldo Bersih, Total Pemasukan, Total Pengeluaran).
   - Grafik interaktif tren arus kas bulanan berbasis Chart.js.
   - **Seksi Demografi & Kependudukan RT 04**:
     - 4 Bento Cards dengan warna-warni menarik (Total KK, Total Jiwa, Rasio Warga Tetap, Blok Terpadat).
     - **Grafik Sebaran Blok Jalan**: Bar Chart interaktif sebaran KK di wilayah Ciskul I, Ciskul 6 s.d. Ciskul 10.
     - **Grafik Komposisi Status Hunian**: Doughnut Chart perbandingan warga tetap vs warga kontrak/sewa.
     - **Tombol Pintas Navigasi Blok**: Akses 1-klik untuk menyaring direktori warga langsung berdasarkan blok jalan yang dipilih.
   - **Radar Tunggakan Iuran**:
     - Deteksi otomatis warga yang belum lunas.
     - Filter: *Bulan-Bulan Lampau*, *Akumulasi s/d Bulan Berjalan*, atau *Pilih Bulan Spesifik*.
     - Tombol 1-klik kirim pengingat WhatsApp dengan draf pesan otomatis.
     - Tombol 1-klik pelunasan instan (*+ Lunas 1 Bulan* / *Lunas Semua*).
   - **Agenda Kegiatan Lingkungan** (Kerja bakti, pertemuan warga, jadwal ronda).
   - **Laporan & Aspirasi Masalah Warga** dengan status penanganan (*Menunggu*, *Diproses*, *Selesai*).

3. **Buku Kas Keuangan RT 04**:
   - Kartu metrik 3 warna (Biru: Saldo, Hijau: Masuk, Merah: Keluar).
   - Grafik perbandingan arus kas bulanan.
   - Pencatatan transaksi masuk & keluar.
   - **Cetak Laporan PDF Resmi RT 04**:
     - Dilengkapi Kop Surat Resmi RT 04 / RW 14 Cisaranten Kulon.
     - Tabel ringkasan saldo dan rincian transaksi lengkap.
     - Format tanda tangan berdampingan: **Bendahara RT** & **Ketua RT**.

4. **Kartu Kendali Iuran Warga (11 Tahun: 2026 – 2036)**:
   - Pencatatan iuran per Kepala Keluarga (KK).
   - Navigasi tahun iuran ringkas dari 2026 hingga 2036.
   - **Cetak Kwitansi Iuran Digital** bukti pelunasan warga.
   - Grafik realisasi iuran bulanan KK.

5. **Kependudukan & e-Sensus Mandiri**:
   - **Direktori KK**: Pencarian cepat nama KK & nomor rumah, filter status (Tetap/Kontrak), filter per blok jalan (Ciskul I, Ciskul 6 s.d. Ciskul 10).
   - **e-KTP Digital Warga**: Kartu tanda identitas digital lingkungan resmi tingkat RT.
   - **e-Sensus Mandiri**: Formulir warga praktis dengan pencegahan data ganda (anti-duplikasi).
   - **Statistik Demografi**: Diagram komposisi status hunian dan distribusi warga per blok.

6. **Layanan Surat Pengantar & Aspirasi**:
   - Permohonan surat keterangan domisili, pengantar nikah, SKTM, SKU, pengantar KTP/KK.
   - Alur persetujuan pengurus dan tombol **Cetak Surat Pengantar Resmi (PDF)** dengan kop dan tanda tangan Ketua RT.
   - Form pengaduan sarana prasarana lingkungan.

7. **Panel Super Admin & Keamanan**:
   - Manajemen akun login pengurus.
   - Konfigurasi tarif iuran per bulan.
   - Kustomisasi kop surat, nomor surat, dan nama pejabat penandatangan.
   - **Audit Trail & Event Log**: Catatan riwayat aktivitas login, mutasi kas, iuran, e-sensus, dan perubahan sistem, dilengkapi pencarian real-time, filter kategori/tingkat, serta tombol **Ekspor CSV**.
   - **Cadangan Data JSON**: Ekspor dan impor cadangan data sistem.

---

## 🔑 Akun Login Bawaan Pengurus RT

Warga umum dapat mengakses informasi transparansi kas dan iuran **tanpa perlu login**. Akses login hanya diperlukan oleh Pengurus RT untuk mengelola data:

| Username | Password Default | Peran / Jabatan | Nama Pengurus |
| :--- | :--- | :--- | :--- |
| **admin** | `123` | Administrator | Super Admin RT 04 |
| **ketua** | `123` | Ketua RT | Bambang Sudarsono |
| **bendahara** | `123` | Bendahara RT | H. Ahmad Sobari |
| **sekretaris** | `123` | Sekretaris RT | Siti Rahmawati |
| **pengurus** | `123` | Pengurus RT | Dedi Kurniawan |

> **Catatan Keamanan:** Pengurus yang telah login dapat mengganti kata sandi kapan saja melalui tombol **"Ganti Sandi"** di header navigasi.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi ini bersifat *client-side portable*:
1. Cukup buka file `index.html` langsung di browser modern apa pun (Google Chrome, Microsoft Edge, Safari, Firefox).
2. Data secara otomatis tersimpan di memori peramban (*LocalStorage*), sehingga aplikasi tetap dapat berjalan secara offline.
3. Untuk menghubungkan ke Google Spreadsheet bersama, ikuti petunjuk konfigurasi backend di bawah.

---

## ☁️ Petunjuk Menghubungkan ke Google Sheets (Apps Script)

File backend telah disediakan pada `google_apps_script.js`:
1. Buka [Google Drive](https://drive.google.com/) Anda dan buat **Google Spreadsheet** baru dengan nama `Database SatuWarga 04`.
2. Klik menu **Ekstensi** > **Apps Script**.
3. Salin seluruh isi file `google_apps_script.js` dan tempelkan ke editor Apps Script.
4. Pilih fungsi `setupAwal` pada daftar dropdown fungsi, lalu klik tombol **Jalankan (Run)**. Berikan otorisasi izin akun Google.
5. Klik **Terapkan (Deploy)** > **Deployment Baru (New Deployment)**.
6. Pilih jenis **Aplikasi Web (Web App)**:
   - *Jalankan sebagai:* **Saya (Me)**
   - *Siapa yang memiliki akses:* **Siapa saja (Anyone)** *(Penting agar aplikasi web dapat berkomunikasi)*
7. Salin URL Aplikasi Web yang berakhiran `/exec`.
8. Anda dapat langsung memasukkan URL tersebut melalui **Panel Pengurus RT** > **Pengaturan Sistem** > **Integrasi Google Spreadsheet** (atau mengganti variabel `DEFAULT_APP_URL` di [app.js](file:///c:/Project%20WEBSITE%20AG/Project%20Satuwarga04/app.js)).
9. **Selesai!** Setiap ada perubahan data (warga, kas, iuran bulanan, surat, agenda, maupun aspirasi), data otomatis tersimpan langsung ke Google Spreadsheet Anda secara *real-time* dengan antrean sinkronisasi aman dan indikator status cloud di bagian atas layar.
