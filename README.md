# KELIR HOME APPS — PWA

Frontend statis (GitHub Pages) + Google Apps Script sebagai API JSON.
Data tetap di Google Sheets Anda, login/izin/role tidak berubah.

```
HP / Browser ──► GitHub Pages (index.html, PWA)
                      │  fetch POST {fn, args}
                      ▼
              Google Apps Script (Code.gs: doPost) ──► Google Sheets
```

## Isi folder

| Berkas | Fungsi |
|---|---|
| `index.html` | Aplikasi (sudah responsif HP) |
| `pwa.css`, `pwa.js` | Tampilan HP, bottom nav, tombol pasang, banner offline |
| `api.js` | Pengganti `google.script.run` → `fetch` ke Apps Script |
| `config.js` | **Isi URL Web App Apps Script di sini** |
| `sw.js`, `manifest.webmanifest`, `icons/` | Service worker, manifest, ikon |
| `Code.gs` | Backend (ditambah `doPost` + daftar fungsi yang diizinkan) |
| `.nojekyll` | Agar GitHub Pages menyajikan berkas apa adanya |

## Langkah 1 — Perbarui backend (Apps Script)

1. Buka proyek Apps Script lama Anda, **ganti seluruh isi `Code.gs`** dengan `Code.gs` di folder ini.
2. Biarkan berkas `Index.html` lama di Apps Script (tidak dipakai PWA, tapi tidak mengganggu).
3. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
   Pastikan: *Execute as* = **Me**, *Who has access* = **Anyone**.
   (Edit kode saja tidak cukup; wajib "New version".)
4. Salin **Web app URL** (berakhiran `/exec`).
5. Tes: buka `URL/exec?api=ping` di browser → harus muncul `{"ok":true,...}`.

## Langkah 2 — Isi `config.js`

```js
window.KELIR_API_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

## Langkah 3 — Upload ke GitHub

1. Buat repo baru (mis. `kelir-pwa`), upload **seluruh isi folder ini** (kecuali `Code.gs` bila tidak mau ikut publik — `Code.gs` tidak dipakai di GitHub).
2. **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save.**
3. Tunggu ±1 menit, buka `https://USERNAME.github.io/kelir-pwa/`.

> Link formulir pendaftaran jemaat (tombol **🔗 Share Link**) otomatis menjadi
> `https://USERNAME.github.io/kelir-pwa/?page=daftar`.

## Langkah 4 — Pasang di HP

- **Android (Chrome):** buka link → tombol **📲 Pasang aplikasi** di halaman login / menu samping, atau menu ⋮ → *Instal aplikasi*.
- **iPhone (Safari):** tombol Bagikan → *Tambah ke Layar Utama*.

## Yang berubah di tampilan HP (≤ 768 px)

- Bottom navigation: Beranda · Jemaat · Check-in/Kehadiran · Menu
- Tabel data tampil sebagai **kartu** (≤ 640 px), form tampil sebagai *bottom sheet*
- Menu samping dengan latar gelap, input 16 px (tidak zoom di iOS), area aman notch
- Banner "Tidak ada koneksi" saat offline

## Catatan penting

- **Offline:** tampilan aplikasi bisa dibuka offline, tetapi data tetap butuh internet (data ada di Google Sheets).
- **Sesi login** kini disimpan di `localStorage` (bertahan walau aplikasi ditutup) dan tetap kedaluwarsa otomatis oleh server setelah 6 jam.
- **Update aplikasi:** cukup push ke GitHub; service worker memakai *network-first* sehingga versi baru langsung terpakai. Bila Anda menambah berkas ke daftar `SHELL` di `sw.js`, naikkan `VERSION`.
- **Tombol "Reset Database"** di Pengaturan tidak dibuka lewat API (sengaja, demi keamanan). `setupDatabase()` dijalankan manual dari editor Apps Script bila perlu.
- Setiap kali menambah fungsi server baru yang dipanggil dari frontend, daftarkan namanya di `apiRegistry_()` pada `Code.gs`, lalu deploy **New version**.
- Respons pertama Apps Script bisa 2–5 detik (cold start) — wajar.
