/**
 * =========================================================================
 * BACKEND PELAPORAN PENANAMAN KELAPA SAWIT - PT. ENERGI MAJU JAYA (PT. EMJ)
 * Google Apps Script Web App Endpoint
 * =========================================================================
 */

// Konstanta Nama Sheet & Folder
const SHEET_NAMES = {
  MASTER: 'master_blok',
  TRX: 'trx_laporan_tanam',
  REKAP: 'rekap_progress',
  GIS: 'gis_layers',
  SETTINGS: 'company_settings'
};

const ROOT_FOLDER_NAME = 'Sistem_Pelaporan_Sawit_Workspace_PT_EMJ';
const FOLDER_FOTO = '01_Foto_Dokumentasi_Tanam';
const FOLDER_GIS = '02_Dokumen_Dan_GIS';
const SPREADSHEET_NAME = 'DB_Pelaporan_Kegiatan_Tanam_PT_EMJ';

/**
 * Inisialisasi Otomatis Direktori Drive & Spreadsheet
 */
function getEnvironment() {
  try {
    const props = PropertiesService.getScriptProperties();
    let rootFolderId = props.getProperty('ROOT_FOLDER_ID');
    let rootFolder;

    if (rootFolderId) {
      try { rootFolder = DriveApp.getFolderById(rootFolderId); } catch (e) { rootFolder = null; }
    }

    if (!rootFolder) {
      const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
      if (folders.hasNext()) {
        rootFolder = folders.next();
      } else {
        rootFolder = DriveApp.createFolder(ROOT_FOLDER_NAME);
      }
      props.setProperty('ROOT_FOLDER_ID', rootFolder.getId());
    }

    // Sub-folder Foto & GIS
    let fotoFolderId = props.getProperty('FOTO_FOLDER_ID');
    if (!fotoFolderId || !folderExists(fotoFolderId)) {
      const folder = getOrCreateFolder(rootFolder, FOLDER_FOTO);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      props.setProperty('FOTO_FOLDER_ID', folder.getId());
    }

    let gisFolderId = props.getProperty('GIS_FOLDER_ID');
    if (!gisFolderId || !folderExists(gisFolderId)) {
      const folder = getOrCreateFolder(rootFolder, FOLDER_GIS);
      props.setProperty('GIS_FOLDER_ID', folder.getId());
    }

    // Spreadsheet Database
    let ssId = props.getProperty('SPREADSHEET_ID');
    let ss;
    if (ssId) {
      try { ss = SpreadsheetApp.openById(ssId); } catch (e) { ss = null; }
    }

    if (!ss) {
      const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
      if (files.hasNext()) {
        ss = SpreadsheetApp.open(files.next());
      } else {
        ss = SpreadsheetApp.create(SPREADSHEET_NAME);
        const file = DriveApp.getFileById(ss.getId());
        file.moveTo(rootFolder);
      }
      props.setProperty('SPREADSHEET_ID', ss.getId());
    }

    // Inisialisasi Sheet sesuai format baku PT. EMJ
    setupSheet(ss, SHEET_NAMES.MASTER, [
      'id_blok', 'afdeling', 'luas_ha', 'target_sph', 'target_pokok', 'varietas_bibit', 'tahun_tanam'
    ]);

    // Kolom transaksi persis sesuai Excel PT. EMJ
    setupSheet(ss, SHEET_NAMES.TRX, [
      'id_laporan', 'tanggal', 'jml_tenaga_kerja', 'nama_tenaga_kerja', 'kegiatan',
      'id_blok', 'luas_ha', 'uom', 'realisasi_jml', 'todate', 'sisa_ha',
      'keterangan', 'lat_gps', 'lng_gps', 'foto_url', 'created_at'
    ]);

    setupSheet(ss, SHEET_NAMES.REKAP, [
      'id_blok', 'luas_ha', 'target_pokok', 'total_tanam_ha', 'total_tanam_pkk',
      'todate_pancang_ha', 'todate_ajir_pcs', 'todate_lubang_ha', 'todate_langsir_ha',
      'sisa_ha_tanam', 'persentase_selesai', 'status'
    ]);

    setupSheet(ss, SHEET_NAMES.GIS, [
      'id_layer', 'nama_layer', 'tipe_file', 'geojson_data', 'uploaded_at', 'uploaded_by'
    ]);

    setupSheet(ss, SHEET_NAMES.SETTINGS, [
      'key', 'value', 'updated_at'
    ]);

    // Populate Master Blok PT. EMJ jika kosong
    const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER);
    if (masterSheet.getLastRow() <= 1) {
      const masterData = [
        ['OPD A', 'Afdeling 1', 6.68, 138, 922, 'Dami Mas', 2026],
        ['OPD C', 'Afdeling 1', 6.66, 138, 919, 'Marihat', 2026],
        ['OPD B', 'Afdeling 1', 6.70, 138, 925, 'Dami Mas', 2026],
        ['OPD D', 'Afdeling 1', 6.65, 138, 918, 'PPKS 239', 2026]
      ];
      masterSheet.getRange(2, 1, masterData.length, masterData[0].length).setValues(masterData);
    }

    // Default Company Settings
    const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
    if (settingsSheet.getLastRow() <= 1) {
      const defaultSettings = [
        ['company_name', 'PT. ENERGI MAJU JAYA', new Date()],
        ['company_abbr', 'PT. EMJ', new Date()],
        ['estate_name', 'Estate Sei Semujur', new Date()],
        ['standard_sph', '138', new Date()],
        ['address', 'Jl. Poros Perkebunan Kelapa Sawit Km 18, Kalimantan Barat', new Date()],
        ['contact', 'info@pt-emj.co.id | Telp: (0561) 789012', new Date()],
        ['sign_mandor', 'Joko Susanto', new Date()],
        ['sign_asisten', 'Ir. Bambang Wijaya', new Date()],
        ['sign_manager', 'Drs. Hendrawan, M.Si.', new Date()]
      ];
      settingsSheet.getRange(2, 1, defaultSettings.length, defaultSettings[0].length).setValues(defaultSettings);
    }

    return jsonResponse({
      status: 'success',
      message: 'Environment PT. EMJ berhasil diinisialisasi.',
      data: {
        rootFolderId: rootFolder.getId(),
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl()
      }
    });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

/**
 * Web App Routing: GET
 */
function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : null;

  try {
    switch (action) {
      case 'setupEnvironment': return getEnvironment();
      case 'getBlocksSummary': return handleGetBlocksSummary();
      case 'getReports':       return handleGetReports(e.parameter);
      case 'getCompanySettings': return handleGetCompanySettings();
      case 'getGisLayers':     return handleGetGisLayers();
      default:
        return jsonResponse({
          status: 'success',
          message: 'Server Backend Google Apps Script PT. ENERGI MAJU JAYA aktif dan siap menerima data.',
          version: '2.0.0',
          serverTime: new Date().toISOString(),
          endpoints: ['getBlocksSummary', 'getReports', 'getCompanySettings', 'getGisLayers', 'submitReport', 'saveCompanySettings', 'saveBlock', 'deleteBlock']
        });
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

/**
 * Web App Routing: POST
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: 'error', message: 'Request body kosong' }, 400);
    }
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    switch (action) {
      case 'submitReport':         return handleSubmitReport(payload);
      case 'saveCompanySettings':  return handleSaveCompanySettings(payload);
      case 'saveBlock':            return handleSaveBlock(payload);
      case 'deleteBlock':          return handleDeleteBlock(payload);
      case 'syncMasterBlocks':     return handleSyncMasterBlocks(payload);
      case 'uploadGisFile':        return handleUploadGisFile(payload);
      default:
        return jsonResponse({ status: 'error', message: 'Aksi POST tidak valid: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

/**
 * Handler: Rekap Blok dan Progress Penanaman
 */
function handleGetBlocksSummary() {
  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!ssId) return getEnvironment();

  const ss = SpreadsheetApp.openById(ssId);
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER);
  const trxSheet = ss.getSheetByName(SHEET_NAMES.TRX);

  const masterRows = getSheetDataAsObj(masterSheet);
  const trxRows = getSheetDataAsObj(trxSheet);

  const summary = masterRows.map(m => {
    const idBlok = m.id_blok;
    const luasHa = Number(m.luas_ha) || 0;
    const targetPokok = Number(m.target_pokok) || (luasHa * 138);

    // Filter transaksi untuk blok ini
    const blkTrx = trxRows.filter(t => t.id_blok === idBlok);

    // Hitung akumulasi realisasi tanam
    let totalTanamHa = 0;
    let todateLubangHa = 0;
    let todateLangsirHa = 0;
    let todatePancangHa = 0;
    let todateAjirPcs = 0;

    blkTrx.forEach(t => {
      const keg = String(t.kegiatan || '').toLowerCase();
      const val = Number(t.realisasi_jml) || 0;
      if (keg.includes('tanam') && !keg.includes('lubang') && !keg.includes('pancang') && !keg.includes('titik tanam')) {
        totalTanamHa += (t.uom === 'Ha' ? val : (val / 138));
      } else if (keg.includes('lubang')) {
        todateLubangHa += val;
      } else if (keg.includes('langsir')) {
        todateLangsirHa += val;
      } else if (keg.includes('pancang')) {
        todatePancangHa += val;
      } else if (keg.includes('ajir')) {
        todateAjirPcs += val;
      }
    });

    const sisaHa = Math.max(0, parseFloat((luasHa - totalTanamHa).toFixed(2)));
    const persentase = luasHa > 0 ? Math.min(100, parseFloat(((totalTanamHa / luasHa) * 100).toFixed(2))) : 0;
    const totalPokokTertanam = Math.round(totalTanamHa * (Number(m.target_sph) || 138));

    let status = 'Belum Mulai';
    if (persentase >= 100) status = 'Selesai';
    else if (persentase > 0 || blkTrx.length > 0) status = 'Sedang Berjalan';

    return {
      id_blok: idBlok,
      afdeling: m.afdeling,
      luas_ha: luasHa,
      target_sph: Number(m.target_sph) || 138,
      target_pokok: targetPokok,
      total_tertanam_ha: parseFloat(totalTanamHa.toFixed(2)),
      total_tertanam: totalPokokTertanam,
      todate_lubang_ha: parseFloat(todateLubangHa.toFixed(2)),
      todate_langsir_ha: parseFloat(todateLangsirHa.toFixed(2)),
      todate_pancang_ha: parseFloat(todatePancangHa.toFixed(2)),
      todate_ajir_pcs: todateAjirPcs,
      sisa_ha: sisaHa,
      persentase: persentase,
      status: status,
      varietas_bibit: m.varietas_bibit
    };
  });

  return jsonResponse({ status: 'success', data: summary });
}

/**
 * Handler: Ambil Seluruh Data Laporan Kegiatan (Support Filter Periode)
 */
function handleGetReports(params) {
  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!ssId) return jsonResponse({ status: 'success', data: [] });

  const ss = SpreadsheetApp.openById(ssId);
  const trxSheet = ss.getSheetByName(SHEET_NAMES.TRX);
  let rows = getSheetDataAsObj(trxSheet);

  // Filter tanggal jika ada
  if (params && params.startDate) {
    rows = rows.filter(r => new Date(r.tanggal) >= new Date(params.startDate));
  }
  if (params && params.endDate) {
    rows = rows.filter(r => new Date(r.tanggal) <= new Date(params.endDate));
  }
  if (params && params.id_blok) {
    rows = rows.filter(r => r.id_blok === params.id_blok);
  }

  // Sort descending by tanggal/created_at
  rows.sort((a, b) => new Date(b.tanggal || b.created_at) - new Date(a.tanggal || a.created_at));

  return jsonResponse({ status: 'success', data: rows });
}

/**
 * Handler: Simpan Laporan Kegiatan Sesuai Format PT. EMJ
 */
function handleSubmitReport(payload) {
  if (!payload.id_blok || !payload.kegiatan || payload.realisasi_jml === undefined) {
    return jsonResponse({ status: 'error', message: 'Data wajib belum lengkap (id_blok, kegiatan, realisasi_jml)' }, 400);
  }

  const props = PropertiesService.getScriptProperties();
  const ssId = props.getProperty('SPREADSHEET_ID');
  const fotoFolderId = props.getProperty('FOTO_FOLDER_ID');

  const ss = SpreadsheetApp.openById(ssId);
  const trxSheet = ss.getSheetByName(SHEET_NAMES.TRX);

  // Simpan foto ke Google Drive jika ada
  let fileUrl = '';
  if (payload.foto_base64 && fotoFolderId) {
    fileUrl = saveImageToFolder(payload.foto_base64, payload.foto_filename || `FOTO_${new Date().getTime()}`, fotoFolderId);
  }

  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyyMMdd');
  const uniqueId = `LPR-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Hitung Todate & Sisa jika tidak dikirim dari client
  const realVal = Number(payload.realisasi_jml) || 0;
  const todateVal = Number(payload.todate) || realVal;
  const luasHa = Number(payload.luas_ha) || 6.66;
  const sisaHa = Number(payload.sisa_ha) || Math.max(0, parseFloat((luasHa - (payload.uom === 'Ha' ? todateVal : todateVal / 138)).toFixed(2)));

  const row = [
    uniqueId,
    payload.tanggal || Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd'),
    Number(payload.jml_tenaga_kerja) || 1,
    payload.nama_tenaga_kerja || payload.nama_mandor || '-',
    payload.kegiatan,
    payload.id_blok,
    luasHa,
    payload.uom || 'Ha',
    realVal,
    todateVal,
    sisaHa,
    payload.keterangan || payload.catatan || '',
    payload.lat_gps || '',
    payload.lng_gps || '',
    fileUrl,
    now
  ];

  trxSheet.appendRow(row);

  return jsonResponse({
    status: 'success',
    message: 'Laporan kegiatan penanaman berhasil disimpan.',
    id_laporan: uniqueId,
    foto_url: fileUrl
  });
}

/**
 * Handler: Pengaturan Identitas Perusahaan
 */
function handleGetCompanySettings() {
  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!ssId) return jsonResponse({ status: 'error', message: 'Spreadsheet belum siap' });

  const ss = SpreadsheetApp.openById(ssId);
  const sSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  const rows = getSheetDataAsObj(sSheet);

  const settingsObj = {};
  rows.forEach(r => { settingsObj[r.key] = r.value; });

  return jsonResponse({ status: 'success', data: settingsObj });
}

function handleSaveCompanySettings(payload) {
  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(ssId);
  const sSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);

  const rawSettings = payload.settings || payload.data || payload;

  if (sSheet.getLastRow() > 1) {
    sSheet.getRange(2, 1, sSheet.getLastRow() - 1, 3).clearContent();
  }

  const rows = [];
  const now = new Date();
  for (const k in rawSettings) {
    if (k === 'action') continue;
    rows.push([k, String(rawSettings[k] !== undefined ? rawSettings[k] : ''), now]);
  }

  if (rows.length > 0) {
    sSheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }

  return jsonResponse({ status: 'success', message: 'Identitas perusahaan berhasil disimpan ke cloud Google Sheets.' });
}

/**
 * Handler: Simpan / Perbarui Blok Kebun Master (POST)
 */
function handleSaveBlock(payload) {
  const b = payload.block || payload;
  if (!b.id_blok) {
    return jsonResponse({ status: 'error', message: 'Parameter id_blok wajib diisi' }, 400);
  }

  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(ssId);
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER);
  const data = masterSheet.getDataRange().getValues();

  const idBlok = String(b.id_blok).trim();
  const afdeling = b.afdeling || 'Afdeling 1';
  const luasHa = Number(b.luas_ha) || 0;
  const targetSph = Number(b.target_sph) || 138;
  const targetPokok = Number(b.target_pokok) || Math.round(luasHa * targetSph);
  const varietas = b.varietas_bibit || 'Dami Mas';
  const tahun = Number(b.tahun_tanam) || 2026;

  const rowValues = [idBlok, afdeling, luasHa, targetSph, targetPokok, varietas, tahun];

  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === idBlok) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow > 0) {
    masterSheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    masterSheet.appendRow(rowValues);
  }

  return jsonResponse({
    status: 'success',
    message: `Blok ${idBlok} berhasil disimpan ke Google Sheets (Cloud).`,
    data: { id_blok: idBlok, luas_ha: luasHa, target_pokok: targetPokok }
  });
}

/**
 * Handler: Hapus Blok Kebun Master (POST)
 */
function handleDeleteBlock(payload) {
  const idBlok = payload.id_blok ? String(payload.id_blok).trim() : '';
  if (!idBlok) {
    return jsonResponse({ status: 'error', message: 'id_blok tidak disertakan' }, 400);
  }

  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(ssId);
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER);
  const data = masterSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === idBlok) {
      masterSheet.deleteRow(i + 1);
      return jsonResponse({ status: 'success', message: `Blok ${idBlok} berhasil dihapus dari Google Sheets.` });
    }
  }

  return jsonResponse({ status: 'error', message: `Blok ${idBlok} tidak ditemukan di Google Sheets.` }, 404);
}

/**
 * Handler: Sinkronisasi Massal Semua Blok Kebun (POST)
 */
function handleSyncMasterBlocks(payload) {
  const blocks = payload.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return jsonResponse({ status: 'error', message: 'Array blocks tidak valid atau kosong' }, 400);
  }

  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(ssId);
  const masterSheet = ss.getSheetByName(SHEET_NAMES.MASTER);

  if (masterSheet.getLastRow() > 1) {
    masterSheet.getRange(2, 1, masterSheet.getLastRow() - 1, 7).clearContent();
  }

  const rows = blocks.map(b => [
    String(b.id_blok || '').trim(),
    b.afdeling || 'Afdeling 1',
    Number(b.luas_ha) || 0,
    Number(b.target_sph) || 138,
    Number(b.target_pokok) || Math.round((Number(b.luas_ha) || 0) * (Number(b.target_sph) || 138)),
    b.varietas_bibit || 'Dami Mas',
    Number(b.tahun_tanam) || 2026
  ]);

  masterSheet.getRange(2, 1, rows.length, 7).setValues(rows);
  return jsonResponse({ status: 'success', message: `${rows.length} blok master berhasil disinkronkan ke Google Sheets.` });
}

/**
 * Handler: Upload Berkas Spasial GIS ke Drive
 */
function handleUploadGisFile(payload) {
  const folderId = PropertiesService.getScriptProperties().getProperty('GIS_FOLDER_ID');
  const folder = DriveApp.getFolderById(folderId);

  const decoded = Utilities.base64Decode(payload.file_base64);
  const blob = Utilities.newBlob(decoded, 'application/octet-stream', payload.file_name || `GIS_${new Date().getTime()}`);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(ssId);
  const gisSheet = ss.getSheetByName(SHEET_NAMES.GIS);

  const idLayer = `GIS-${new Date().getTime()}`;
  gisSheet.appendRow([
    idLayer,
    payload.nama_layer,
    payload.tipe_file,
    payload.geojson_data || '{}',
    new Date(),
    payload.uploaded_by || 'Admin'
  ]);

  return jsonResponse({
    status: 'success',
    message: 'File GIS berhasil diunggah.',
    fileUrl: file.getUrl(),
    id_layer: idLayer
  });
}

function handleGetGisLayers() {
  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(ssId);
  const gisSheet = ss.getSheetByName(SHEET_NAMES.GIS);
  return jsonResponse({ status: 'success', data: getSheetDataAsObj(gisSheet) });
}

// Helpers
function saveImageToFolder(base64Data, filename, folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    let data = base64Data;
    let mimeType = 'image/jpeg';
    if (data.indexOf('base64,') !== -1) {
      const parts = data.split('base64,');
      mimeType = parts[0].replace('data:', '').replace(';', '');
      data = parts[1];
    }
    const blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, `${filename}.jpg`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return '';
  }
}

function jsonResponse(obj, statusCode = 200) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSheetDataAsObj(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = data[i][j];
    }
    rows.push(rowObj);
  }
  return rows;
}

function folderExists(folderId) {
  try { DriveApp.getFolderById(folderId); return true; } catch (e) { return false; }
}

function getOrCreateFolder(parent, folderName) {
  const folders = parent.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(folderName);
}
