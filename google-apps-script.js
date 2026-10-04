/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: SISTEM RSVP & BUKU TAMU UCAPAN
 * Undangan Pernikahan Putri & Bona
 * ==============================================================================
 * Spreadsheet URL: https://docs.google.com/spreadsheets/d/12rr2hQSxiNHgspYrnc9zxuS-a3fl5w7dyPz3Rc5R3TI/edit#gid=0
 * Spreadsheet ID : 12rr2hQSxiNHgspYrnc9zxuS-a3fl5w7dyPz3Rc5R3TI
 * Sheet Name     : Sheet1
 *
 * Kolom yang digunakan:
 * 1. timestamp
 * 2. nama tamu
 * 3. ucapan
 * 4. konfirmasi kehadiran
 * 5. jumlah tamu
 * ==============================================================================
 */

var SPREADSHEET_ID = "12rr2hQSxiNHgspYrnc9zxuS-a3fl5w7dyPz3Rc5R3TI";
var SHEET_NAME = "Sheet1";

/**
 * Mendapatkan referensi Sheet1 dan menginisialisasi baris header jika masih kosong.
 */
function getTargetSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Jika sheet belum ada data sama sekali, buat 5 kolom header yang diminta
  if (sheet.getLastRow() === 0) {
    var headers = ["timestamp", "nama tamu", "ucapan", "konfirmasi kehadiran", "jumlah tamu"];
    sheet.appendRow(headers);
    
    // Styling header agar rapi
    var headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#620404"); // Warna Maroon sesuai tema
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 5);
  }
  
  return sheet;
}

/**
 * Endpoint GET: Digunakan oleh website untuk mengambil daftar ucapan dari Spreadsheet
 */
function doGet(e) {
  try {
    var sheet = getTargetSheet();
    var lastRow = sheet.getLastRow();
    var listUcapan = [];

    // Jika ada data ucapan (baris ke-2 dst)
    if (lastRow > 1) {
      var rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
      
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var ts = row[0];
        
        // Format timestamp agar mudah dibaca
        if (ts instanceof Date) {
          ts = Utilities.formatDate(ts, "Asia/Jakarta", "dd MMM yyyy, HH:mm");
        } else if (ts) {
          ts = String(ts);
        } else {
          ts = "";
        }

        var nama = String(row[1] || "").trim();
        var ucapan = String(row[2] || "").trim();
        var kehadiran = String(row[3] || "").trim();
        var jumlah = String(row[4] || "").trim();

        // Hanya masukkan baris yang memiliki nama atau ucapan
        if (nama || ucapan) {
          listUcapan.push({
            timestamp: ts,
            nama: nama,
            ucapan: ucapan,
            kehadiran: kehadiran,
            jumlah: jumlah
          });
        }
      }
      
      // Urutkan ucapan terbaru di urutan paling atas
      listUcapan.reverse();
    }

    var output = {
      status: "success",
      total: listUcapan.length,
      data: listUcapan
    };

    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorOutput = {
      status: "error",
      message: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorOutput))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Endpoint POST: Digunakan oleh website untuk menyimpan data RSVP & Ucapan baru ke Spreadsheet
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Tunggu maksimal 30 detik untuk menghindari konflik antrian data
    lock.waitLock(30000);

    var params = {};
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else if (e.parameter) {
      params = e.parameter;
    }

    // Ambil nilai masing-masing kolom
    var now = new Date();
    var timestamp = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var namaTamu = params.nama || params["nama tamu"] || "";
    var ucapan = params.ucapan || "";
    var konfirmasiKehadiran = params.kehadiran || params["konfirmasi kehadiran"] || "Hadir";
    var jumlahTamu = params.jumlah || params["jumlah tamu"] || "1 Orang";

    // Jika konfirmasi Tidak Hadir, jumlah tamu diset ke 0
    if (konfirmasiKehadiran === "Tidak Hadir") {
      jumlahTamu = "0";
    }

    var sheet = getTargetSheet();
    sheet.appendRow([timestamp, namaTamu, ucapan, konfirmasiKehadiran, jumlahTamu]);

    var response = {
      status: "success",
      message: "Ucapan & konfirmasi kehadiran berhasil disimpan ke spreadsheet!"
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errResponse = {
      status: "error",
      message: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errResponse))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
