/**
 * Google Apps Script Endpoint untuk Beauty & Aesthetic Clinic AI Booking Assistant
 * 
 * CARA MEMASANG:
 * 1. Buka Google Spreadsheet Klinik Kecantikan Anda.
 * 2. Klik menu 'Extensions' (Ekstensi) > 'Apps Script'.
 * 3. Hapus semua kode bawaan, lalu tempelkan (paste) seluruh kode ini.
 * 4. Klik tombol 'Deploy' (Terapkan) > 'New deployment' (Penerapan baru).
 * 5. Pilih jenis: 'Web app' (Aplikasi Web).
 * 6. Ubah pengaturan:
 *    - Description: Beauty & Aesthetic Clinic AI Endpoint
 *    - Execute as: Me (Email Anda)
 *    - Who has access: Anyone (Siapa Saja)
 *    - Klik 'Deploy', lalu salin 'Web App URL' yang dihasilkan.
 * 7. Tempelkan URL tersebut di file .env Anda:
 *    GOOGLE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/xxxxxx/exec
 */

// Token Rahasia Opsional (Harus sama dengan GOOGLE_SHEETS_SECRET_TOKEN di .env jika diisi)
var SECRET_TOKEN = "";

function doGet(e) {
  try {
    var action = e.parameter.action;
    var secret = e.parameter.secret || "";

    if (SECRET_TOKEN && secret !== SECRET_TOKEN) {
      return responseJSON({ status: "error", message: "Unauthorized: Invalid Secret Token" }, 401);
    }

    if (action === "getCatalog") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Katalog");

      if (!sheet) {
        return responseJSON({ status: "error", message: "Tab 'Katalog' tidak ditemukan" }, 404);
      }

      var data = sheet.getDataRange().getValues();
      var catalog = [];

      // Lewati baris 1 (Header)
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[0] && row[0].toString().trim() !== "") {
          catalog.push({
            nama: row[0].toString().trim(),
            harga: parseInt(row[1].toString().replace(/[^0-9]/g, "") || "0", 10),
            durasi: row[2] ? row[2].toString().trim() : "45 menit",
            dokter: row[3] ? row[3].toString().trim() : "Tim Dokter Estetika",
            kategori: row[4] ? row[4].toString().trim() : "Aesthetic & Skincare"
          });
        }
      }

      return responseJSON({ status: "success", catalog: catalog });
    }

    if (action === "getDoctorSchedules") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("JadwalDokter");

      if (!sheet) {
        // Jika tab belum dibuat, kembalikan array kosong agar bot menggunakan fallback default
        return responseJSON({ status: "success", schedules: [] });
      }

      var data = sheet.getDataRange().getValues();
      var schedules = [];

      // Format: A: Dokter, B: Hari, C: Jam Mulai, D: Jam Selesai, E: Kuota Per Jam
      for (var j = 1; j < data.length; j++) {
        var sRow = data[j];
        if (sRow[0] && sRow[0].toString().trim() !== "") {
          schedules.push({
            dokter: sRow[0].toString().trim(),
            hari: sRow[1] ? sRow[1].toString().trim() : "Semua Hari",
            jamMulai: sRow[2] ? sRow[2].toString().trim() : "09:00",
            jamSelesai: sRow[3] ? sRow[3].toString().trim() : "20:00",
            kuotaPerJam: parseInt(sRow[4] ? sRow[4].toString().replace(/[^0-9]/g, "") : "1", 10) || 1
          });
        }
      }

      return responseJSON({ status: "success", schedules: schedules });
    }

    if (action === "getExistingBookings") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];

      if (!sheet) {
        return responseJSON({ status: "success", bookings: [] });
      }

      var data = sheet.getDataRange().getValues();
      var bookings = [];

      // Header: Nama Pasien, Nomor HP, Treatment, Tanggal Booking, Jam Slot, Dokter, Timestamp, Total
      for (var k = 1; k < data.length; k++) {
        var bRow = data[k];
        if (bRow[0] && bRow[0].toString().trim() !== "") {
          bookings.push({
            nama_pasien: bRow[0].toString().trim(),
            nomor_hp: bRow[1] ? bRow[1].toString().trim() : "-",
            treatment: bRow[2] ? bRow[2].toString().trim() : "-",
            tanggal_booking: bRow[3] ? bRow[3].toString().trim() : "-",
            jam_booking: bRow[4] ? bRow[4].toString().trim() : "-",
            dokter_pilihan: bRow[5] ? bRow[5].toString().trim() : "-"
          });
        }
      }

      return responseJSON({ status: "success", bookings: bookings });
    }

    return responseJSON({ status: "error", message: "Action tidak dikenal" }, 400);

  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() }, 500);
  }
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var secret = postData.secret || "";

    if (SECRET_TOKEN && secret !== SECRET_TOKEN) {
      return responseJSON({ status: "error", message: "Unauthorized: Invalid Secret Token" }, 401);
    }

    if (action === "appendBooking") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Sheet1");

      if (!sheet) {
        sheet = ss.getSheets()[0]; // Fallback ke sheet pertama jika Sheet1 diubah nama
      }

      var booking = postData.booking || {};
      var treatmentDetails = (booking.layanan_dipilih || []).map(function(item) {
        var hargaFormatted = Number(item.estimasi_harga || 0).toLocaleString("id-ID");
        return item.nama_layanan + " (Rp" + hargaFormatted + ")";
      }).join(", ");

      var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

      var newRow = [
        booking.nama_pasien || "-",
        booking.nomor_hp || "-",
        treatmentDetails || "-",
        booking.tanggal_booking || "-",
        booking.jam_booking || "-",
        booking.dokter_pilihan || "-",
        timestamp,
        booking.total_estimasi || 0
      ];

      sheet.appendRow(newRow);
      return responseJSON({ status: "success", message: "Reservasi berhasil ditulis ke Spreadsheet!" });
    }

    return responseJSON({ status: "error", message: "Action POST tidak dikenal" }, 400);

  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() }, 500);
  }
}

function responseJSON(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
