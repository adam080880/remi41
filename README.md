# Remi 41

Game kartu Remi 41 di browser, buat 4 pemain. Bisa main bareng gantian di satu layar, dan kursi yang kosong diisi AI.

Ide game ini dari [muktidj](https://github.com/muktidj).

## Cara main

Tiap pemain pegang 4 kartu. Di giliranmu, ambil satu kartu dari dek atau kartu buangan terakhir pemain sebelummu, lalu buang satu. Kartu yang baru diambil dari buangan nggak boleh langsung dibuang lagi.

Nilai kartu: As 11, K/Q/J 10, sisanya sesuai angka.

Ronde langsung dimenangkan begitu skor tangan pas 41 setelah buang kartu. Skor nggak boleh lebih dari 41, jadi kartu yang bikin skor lewat 41 kalau dibuang nggak bisa dipilih. Kalau dek habis, skor tertinggi yang menang. Kalau skor tertingginya sama, semuanya menang. Skor tiap ronde dijumlahkan ke papan skor.

## Mode

| Mode | Syarat kartu | Skor tangan |
| --- | --- | --- |
| Ketat | Satu jenis: sekop, hati, wajik, atau keriting | Total jenis terbaik, dikurangi total kartu lain |
| Medium | Satu warna: merah atau hitam, jenisnya boleh campur | Total warna terbaik, dikurangi total kartu lain |
| Mudah | Warna dan jenis bebas campur | Total semua kartu |

Di mode Medium dan Mudah kartunya bisa saja berjumlah lewat dari 41, misalnya A + A + K + Q = 42. Tangan seperti itu nggak boleh dipegang, dan kalau kebagian waktu kartu dibagikan, kartunya dikocok ulang.

## Jumlah pemain

Sebelum mulai, pilih berapa orang yang main (1 sampai 4). Sisanya diisi AI. Kalau lebih dari satu orang, kartu tertutup setiap ganti giliran dan baru kebuka setelah pemain berikutnya menekan tombol.

## Log dan animasi

Kalau ada pemain atau AI yang ambil kartu buangan, kartunya terbang ke tangan pengambilnya dan kedua pemain dapat penanda "ngambil" dan "diambil". Semua langkah tercatat di log pojok kanan. Di layar kecil, log dibuka dan ditutup lewat tombol Log. Kartu yang diambil dari dek tetap rahasia, jadi nggak ditulis di log.

## Menjalankan

```sh
npm install
npm run dev
```

Perintah lain:

```sh
npm test        # jalanin tes
npm run lint    # cek kode
npm run build   # build produksi ke dist/
```

Dibuat dengan React, TypeScript, dan Vite. Aturan game ada di `src/game/engine.ts`, logika AI di `src/game/bot.ts`.
