/**
 * Google Apps Script Endpoint untuk Dental Clinic AI Booking Assistant
 * 
 * CARA MEMASANG:
 * 1. Buka Google Spreadsheet Klinik Gigi Anda.
 * 2. Klik menu 'Extensions' (Ekstensi) > 'Apps Script'.
 * 3. Hapus semua kode bawaan, lalu tempelkan (paste) seluruh kode ini.
 * 4. Klik tombol 'Deploy' (Terapkan) > 'New deployment' (Penerapan baru).
 * 5. Pilih jenis: 'Web app' (Aplikasi Web).
 * 6. Ubah pengaturan:
 *    - Description: Dental Clinic AI Endpoint
 *    - Execute as: Me (Email Anda)
 *    - Who has access: Anyone (Siapa Saja)
 * 7. Klik 'Deploy', lalu salin 'Web App URL' yang dihasilkan.
 * 8. Tempelkan URL tersebut di file .env Anda:
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
            dokter: row[3] ? row[3].toString().trim() : "Tim Dokter Gigi",
            kategori: row[4] ? row[4].toString().trim() : "Dental"
          });
        }
      }

      return responseJSON({ status: "success", catalog: catalog });
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
