const SECRET_TOKEN = "vario110_8f92a4c7e1b04d39";

function doGet(e) {
  try {
    const token = e && e.parameter ? e.parameter.token : "";
    if (token !== SECRET_TOKEN) {
      return jsonResponse({ status: "error", message: "Unauthorized token" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tz = Session.getScriptTimeZone();

    // 1. Baca tab Motors
    const motorSheet = ss.getSheetByName("Motors");
    let motors = [];
    if (motorSheet) {
      const motorRows = motorSheet.getDataRange().getValues();
      for (let i = 1; i < motorRows.length; i++) {
        if (!motorRows[i][0]) continue;
        motors.push({
          motor_id: String(motorRows[i][0]),
          nama_motor: String(motorRows[i][1]),
          jenis_motor: String(motorRows[i][2] || "Matic"),
          plat_nomor: String(motorRows[i][3] || ""),
          aktif: motorRows[i][4] === true || String(motorRows[i][4]).toUpperCase() === "TRUE"
        });
      }
    }

    // 2. Baca tab Master_Komponen
    const masterSheet = ss.getSheetByName("Master_Komponen");
    let master = [];
    if (masterSheet) {
      const masterRows = masterSheet.getDataRange().getValues();
      for (let i = 1; i < masterRows.length; i++) {
        if (!masterRows[i][1]) continue;
        master.push({
          motor_id: String(masterRows[i][0] || "MTR-01"),
          nama_komponen: String(masterRows[i][1]),
          interval_km: Number(masterRows[i][2]) || 0,
          interval_bulan: Number(masterRows[i][3]) || 0
        });
      }
    }

    // 3. Baca tab Logs
    const logSheet = ss.getSheetByName("Logs");
    let logs = [];
    if (logSheet) {
      const logRows = logSheet.getDataRange().getValues();
      for (let i = 1; i < logRows.length; i++) {
        if (!logRows[i][0]) continue;
        let tgl = logRows[i][1];
        if (tgl instanceof Date) {
          tgl = Utilities.formatDate(tgl, tz, "yyyy-MM-dd");
        }
        logs.push({
          id: String(logRows[i][0]),
          tanggal: String(tgl),
          odometer: Number(logRows[i][2]) || 0,
          kategori: String(logRows[i][3]),
          item: String(logRows[i][4]),
          liter: logRows[i][5] === "" ? "" : Number(logRows[i][5]),
          full_tank: logRows[i][6] === true || String(logRows[i][6]).toUpperCase() === "TRUE",
          biaya: Number(logRows[i][7]) || 0,
          catatan: String(logRows[i][8] || ""),
          motor_id: String(logRows[i][9] || "MTR-01")
        });
      }
    }

    return jsonResponse({
      status: "success",
      data: { motors, master, logs }
    });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.token !== SECRET_TOKEN) {
      return jsonResponse({ status: "error", message: "Unauthorized token" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = payload.action || "create";

    if (action === "create") {
      const logSheet = ss.getSheetByName("Logs");
      logSheet.appendRow([
        String(payload.id || Date.now()),
        payload.tanggal,
        Number(payload.odometer),
        payload.kategori,
        payload.item,
        payload.liter !== "" && payload.liter !== null ? Number(payload.liter) : "",
        Boolean(payload.full_tank),
        Number(payload.biaya),
        payload.catatan || "",
        payload.motor_id || "MTR-01"
      ]);
      return jsonResponse({ status: "success", message: "Log berhasil disimpan" });
    }

    if (action === "delete") {
      const logSheet = ss.getSheetByName("Logs");
      const rows = logSheet.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][0]) === String(payload.id)) {
          logSheet.deleteRow(i + 1);
          break;
        }
      }
      return jsonResponse({ status: "success", message: "Log dihapus" });
    }

    if (action === "add_motor") {
      const motorSheet = ss.getSheetByName("Motors");
      const mRows = motorSheet.getDataRange().getValues();
      if (payload.aktif) {
        for (let i = 1; i < mRows.length; i++) {
          motorSheet.getRange(i + 1, 5).setValue(false);
        }
      }
      motorSheet.appendRow([
        payload.motor_id,
        payload.nama_motor,
        payload.jenis_motor,
        payload.plat_nomor || "",
        Boolean(payload.aktif)
      ]);

      const masterSheet = ss.getSheetByName("Master_Komponen");
      const comps = payload.components || [];
      comps.forEach(c => {
        masterSheet.appendRow([
          payload.motor_id,
          c.nama_komponen,
          Number(c.interval_km),
          Number(c.interval_bulan)
        ]);
      });
      return jsonResponse({ status: "success", message: "Motor ditambahkan" });
    }

    if (action === "set_active_motor") {
      const motorSheet = ss.getSheetByName("Motors");
      const mRows = motorSheet.getDataRange().getValues();
      for (let i = 1; i < mRows.length; i++) {
        const isTarget = String(mRows[i][0]) === String(payload.motor_id);
        motorSheet.getRange(i + 1, 5).setValue(isTarget);
      }
      return jsonResponse({ status: "success", message: "Motor aktif diperbarui" });
    }

    if (action === "delete_motor") {
      const motorSheet = ss.getSheetByName("Motors");
      const mRows = motorSheet.getDataRange().getValues();
      for (let i = mRows.length - 1; i >= 1; i--) {
        if (String(mRows[i][0]) === String(payload.motor_id)) {
          motorSheet.deleteRow(i + 1);
        }
      }
      const masterSheet = ss.getSheetByName("Master_Komponen");
      const cRows = masterSheet.getDataRange().getValues();
      for (let i = cRows.length - 1; i >= 1; i--) {
        if (String(cRows[i][0]) === String(payload.motor_id)) {
          masterSheet.deleteRow(i + 1);
        }
      }
      return jsonResponse({ status: "success", message: "Motor dihapus" });
    }

    if (action === "save_component") {
      const masterSheet = ss.getSheetByName("Master_Komponen");
      const cRows = masterSheet.getDataRange().getValues();
      let updated = false;

      if (payload.old_nama) {
        for (let i = 1; i < cRows.length; i++) {
          if (String(cRows[i][0]) === String(payload.motor_id) && String(cRows[i][1]) === String(payload.old_nama)) {
            masterSheet.getRange(i + 1, 2, 1, 3).setValues([[
              payload.nama_komponen,
              Number(payload.interval_km),
              Number(payload.interval_bulan)
            ]]);
            updated = true;
            break;
          }
        }
      }

      if (!updated) {
        masterSheet.appendRow([
          payload.motor_id,
          payload.nama_komponen,
          Number(payload.interval_km),
          Number(payload.interval_bulan)
        ]);
      }
      return jsonResponse({ status: "success", message: "Komponen disimpan" });
    }

    if (action === "delete_component") {
      const masterSheet = ss.getSheetByName("Master_Komponen");
      const cRows = masterSheet.getDataRange().getValues();
      for (let i = cRows.length - 1; i >= 1; i--) {
        if (String(cRows[i][0]) === String(payload.motor_id) && String(cRows[i][1]) === String(payload.nama_komponen)) {
          masterSheet.deleteRow(i + 1);
          break;
        }
      }
      return jsonResponse({ status: "success", message: "Komponen dihapus" });
    }

    return jsonResponse({ status: "error", message: "Unknown action" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
