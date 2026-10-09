import * as XLSX from 'xlsx';
import { SystemSession, TelemetryPoint } from '@/types';
import { calculateLMTD } from '@/lib/calculations';

/**
 * Format durasi detik menjadi string mudah dibaca
 */
export function formatDurationText(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0 Detik';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs} Jam ${mins} Menit ${secs} Detik`;
  }
  if (mins > 0) {
    return `${mins} Menit ${secs} Detik`;
  }
  return `${secs} Detik`;
}

/**
 * Otomatis menghitung lebar kolom optimal agar tidak ada teks terpotong di Excel
 */
export function applyAutoColumnWidths(
  ws: XLSX.WorkSheet,
  rows: any[][],
  minWidths: { [colIndex: number]: number } = {},
  defaultMin: number = 14
): void {
  const colWidths: { [colIndex: number]: number } = {};

  rows.forEach((row, rowIndex) => {
    // Lewati baris judul utama (row 0) dari perhitungan lebar kolom agar kolom A tidak terlalu lebar
    if (rowIndex === 0) return;

    row.forEach((cellValue, colIndex) => {
      let cellLen = 0;
      if (cellValue !== null && cellValue !== undefined) {
        cellLen = String(cellValue).length;
      }
      const currentMax = colWidths[colIndex] || 0;
      if (cellLen > currentMax) {
        colWidths[colIndex] = cellLen;
      }
    });
  });

  // Tentukan jumlah kolom maksimum
  const maxCols = Math.max(...rows.map((r) => r.length), 0);
  const colsConfig: { wch: number }[] = [];

  for (let c = 0; c < maxCols; c++) {
    const calculated = (colWidths[c] || 0) + 4; // Beri margin 4 karakter
    const minW = minWidths[c] !== undefined ? minWidths[c] : defaultMin;
    colsConfig.push({ wch: Math.max(calculated, minW) });
  }

  ws['!cols'] = colsConfig;
}

/**
 * Download workbook safely in browser using Blob and <a> tag with fallback to XLSX.writeFile
 */
function downloadWorkbook(wb: XLSX.WorkBook, fileName: string): void {
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      }, 200);
      return;
    }
  } catch (err) {
    console.warn('Blob download failed, trying XLSX.writeFile:', err);
  }

  // Fallback
  XLSX.writeFile(wb, fileName);
}

/**
 * ─── 1. EKSPOR SESI TUNGGAL DENGAN FORMAT PROFESIONAL & RAPI ───
 */
export function exportSessionToExcel(
  session: SystemSession,
  options?: { fileName?: string; returnBlob?: boolean }
): { blob?: Blob; fileName: string } {
  const wb = XLSX.utils.book_new();
  const data = session.data || [];
  const now = new Date();
  const exportTimeStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')} WIB`;

  // Struktur Metadata yang Rapi (2 Kolom Informasi Bersebelahan dengan Spasi)
  const rows: any[][] = [
    // Row 1: Judul Utama
    ['LAPORAN MONITORING SESI PRAKTIKUM HEAT EXCHANGER (IoT FLUID-HE)'],
    [], // Row 2: Kosong
    // Row 3: Header Section
    ['INFORMASI PRAKTIKUM', '', '', 'PARAMETER OPERASIONAL', ''],
    // Row 4
    ['ID Sesi', session.id, '', 'Mode Aliran', session.flowMode || 'Counter-Current'],
    // Row 5
    ['Judul Modul', session.title || 'Praktikum Heat Exchanger', '', 'Target Suhu (TC1)', data[0]?.tc1Setpoint ? `${data[0].tc1Setpoint} °C` : 'Manual'],
    // Row 6
    ['Nama Operator', session.operatorName || 'Operator Lab', '', 'Tanggal Sesi', session.date],
    // Row 7
    ['Email Operator', session.operatorEmail || '-', '', 'Waktu Mulai - Selesai', `${session.startTime || '-'} s/d ${session.endTime || 'Sedang Berjalan'} WIB`],
    // Row 8
    ['Kelompok / Kelas', session.classGroup || session.operatorName || '-', '', 'Durasi Praktikum', formatDurationText(session.durationSeconds)],
    // Row 9
    ['Total Baris Data', `${data.length} baris telemetri`, '', 'Waktu Ekspor', exportTimeStr],
    [], // Row 10: Kosong
    // Row 11: Header Kolom Data Telemetri
    [
      'No',
      'Waktu',
      'TI1 - Hot In (°C)',
      'TI2 - Hot Out (°C)',
      'TI3 - Cold In (°C)',
      'TI4 - Cold Out (°C)',
      'ΔT Hot (°C)',
      'ΔT Cold (°C)',
      'LMTD (°C)',
      'FC1 - Hot Flow (L/min)',
      'FC2 - Cold Flow (L/min)',
      'PI1 - Hot In (Bar)',
      'PI2 - Hot Out (Bar)',
      'PI3 - Cold In (Bar)',
      'PI4 - Cold Out (Bar)',
      'ΔP Hot (Bar)',
      'ΔP Cold (Bar)',
      'Q Hot (Watt)',
      'Q Cold (Watt)',
      'Target Temp (°C)',
      'Heater 1',
      'Heater 2',
      'Mode Aliran'
    ]
  ];

  // Baris Data Telemetri
  data.forEach((d, i) => {
    const isCounter = (d.mode || session.flowMode) === 'Counter-Current';
    const dtHot = Math.abs((d.ti1 || 0) - (d.ti2 || 0));
    const dtCold = Math.abs((d.ti4 || 0) - (d.ti3 || 0));
    const lmtd = calculateLMTD(d.ti1 || 0, d.ti2 || 0, d.ti3 || 0, d.ti4 || 0, isCounter);
    const dpHot = Math.abs((d.pi1 || 0) - (d.pi2 || 0));
    const dpCold = Math.abs((d.pi3 || 0) - (d.pi4 || 0));
    const qHot = ((Math.max(0, d.fc1 || 0)) / 60) * 4184 * dtHot;
    const qCold = ((Math.max(0, d.fc2 || 0)) / 60) * 4184 * dtCold;

    rows.push([
      i + 1,
      d.timestamp || '-',
      parseFloat((d.ti1 || 0).toFixed(2)),
      parseFloat((d.ti2 || 0).toFixed(2)),
      parseFloat((d.ti3 || 0).toFixed(2)),
      parseFloat((d.ti4 || 0).toFixed(2)),
      parseFloat(dtHot.toFixed(2)),
      parseFloat(dtCold.toFixed(2)),
      parseFloat(lmtd.toFixed(2)),
      parseFloat((d.fc1 || 0).toFixed(2)),
      parseFloat((d.fc2 || 0).toFixed(2)),
      parseFloat((d.pi1 || 0).toFixed(2)),
      parseFloat((d.pi2 || 0).toFixed(2)),
      parseFloat((d.pi3 || 0).toFixed(2)),
      parseFloat((d.pi4 || 0).toFixed(2)),
      parseFloat(dpHot.toFixed(2)),
      parseFloat(dpCold.toFixed(2)),
      parseFloat(qHot.toFixed(1)),
      parseFloat(qCold.toFixed(1)),
      d.tc1Setpoint ? parseFloat(d.tc1Setpoint.toFixed(1)) : '-',
      d.heater1Active ? 'ON' : 'OFF',
      d.heater2Active ? 'ON' : 'OFF',
      d.mode || session.flowMode || 'Counter-Current'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set Penggabungan Sel (Merges) untuk Tampilan Judul
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 22 } }, // Judul utama A1:W1
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // Subheader A3:B3
    { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } }  // Subheader D3:E3
  ];

  // Set Lebar Kolom Minimum Khusus Setiap Kolom
  const minWidths: { [key: number]: number } = {
    0: 8,   // No / Label Kolom A
    1: 28,  // Waktu / Value Kolom B
    2: 18,  // TI1 - Hot In (°C)
    3: 20,  // TI2 - Hot Out / Label Kolom D
    4: 26,  // TI3 - Cold In / Value Kolom E
    5: 18,  // TI4 - Cold Out (°C)
    6: 16,  // ΔT Hot (°C)
    7: 16,  // ΔT Cold (°C)
    8: 16,  // LMTD (°C)
    9: 24,  // FC1 - Hot Flow (L/min)
    10: 24, // FC2 - Cold Flow (L/min)
    11: 18, // PI1 - Hot In (Bar)
    12: 18, // PI2 - Hot Out (Bar)
    13: 18, // PI3 - Cold In (Bar)
    14: 18, // PI4 - Cold Out (Bar)
    15: 16, // ΔP Hot (Bar)
    16: 16, // ΔP Cold (Bar)
    17: 16, // Q Hot (Watt)
    18: 16, // Q Cold (Watt)
    19: 18, // Target Temp (°C)
    20: 12, // Heater 1
    21: 12, // Heater 2
    22: 20  // Mode Aliran
  };

  applyAutoColumnWidths(ws, rows, minWidths, 16);
  XLSX.utils.book_append_sheet(wb, ws, 'Data_Praktikum');

  const safeName = (session.operatorName || 'Session').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = options?.fileName || `HE_${safeName}_${session.id}.xlsx`;

  if (options?.returnBlob) {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    return { blob, fileName };
  }

  downloadWorkbook(wb, fileName);
  return { fileName };
}

/**
 * ─── 2. EKSPOR MASTER DATASET SELURUH KELAS (ADMIN) ───
 */
export function exportMasterAllClassesExcel(
  sessions: SystemSession[],
  currentUser: { name: string; email?: string; role: string }
): string {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const exportTimeStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')} WIB`;

  // ── Sheet 1: Master Dataset Konsolidasi ──
  const masterRows: any[][] = [
    ['MASTER DATASET TELEMETRI SELURUH KELAS PRAKTIKUM HEAT EXCHANGER (IoT FLUID-HE)'],
    [`Tanggal Ekspor: ${exportTimeStr}  |  Dikeluarkan oleh: Administrator Lab (${currentUser.name})`],
    [],
    [
      'No',
      'ID Sesi',
      'Operator / Nama',
      'Kelompok / Kelas',
      'Tanggal',
      'Waktu',
      'TI1 - Hot In (°C)',
      'TI2 - Hot Out (°C)',
      'TI3 - Cold In (°C)',
      'TI4 - Cold Out (°C)',
      'ΔT Hot (°C)',
      'ΔT Cold (°C)',
      'LMTD (°C)',
      'FC1 - Hot Flow (L/min)',
      'FC2 - Cold Flow (L/min)',
      'PI1 - Hot In (Bar)',
      'PI2 - Hot Out (Bar)',
      'PI3 - Cold In (Bar)',
      'PI4 - Cold Out (Bar)',
      'ΔP Hot (Bar)',
      'ΔP Cold (Bar)',
      'Q Hot (Watt)',
      'Q Cold (Watt)',
      'Heater 1',
      'Heater 2',
      'Mode Aliran'
    ]
  ];

  let pointIndex = 1;
  sessions.forEach((sess) => {
    (sess.data || []).forEach((d) => {
      const isCounter = (d.mode || sess.flowMode) === 'Counter-Current';
      const dtHot = Math.abs((d.ti1 || 0) - (d.ti2 || 0));
      const dtCold = Math.abs((d.ti4 || 0) - (d.ti3 || 0));
      const lmtd = calculateLMTD(d.ti1 || 0, d.ti2 || 0, d.ti3 || 0, d.ti4 || 0, isCounter);
      const dpHot = Math.abs((d.pi1 || 0) - (d.pi2 || 0));
      const dpCold = Math.abs((d.pi3 || 0) - (d.pi4 || 0));
      const qHot = ((Math.max(0, d.fc1 || 0)) / 60) * 4184 * dtHot;
      const qCold = ((Math.max(0, d.fc2 || 0)) / 60) * 4184 * dtCold;

      masterRows.push([
        pointIndex++,
        sess.id,
        sess.operatorName || '-',
        sess.classGroup || '-',
        sess.date,
        d.timestamp || '-',
        parseFloat((d.ti1 || 0).toFixed(2)),
        parseFloat((d.ti2 || 0).toFixed(2)),
        parseFloat((d.ti3 || 0).toFixed(2)),
        parseFloat((d.ti4 || 0).toFixed(2)),
        parseFloat(dtHot.toFixed(2)),
        parseFloat(dtCold.toFixed(2)),
        parseFloat(lmtd.toFixed(2)),
        parseFloat((d.fc1 || 0).toFixed(2)),
        parseFloat((d.fc2 || 0).toFixed(2)),
        parseFloat((d.pi1 || 0).toFixed(2)),
        parseFloat((d.pi2 || 0).toFixed(2)),
        parseFloat((d.pi3 || 0).toFixed(2)),
        parseFloat((d.pi4 || 0).toFixed(2)),
        parseFloat(dpHot.toFixed(2)),
        parseFloat(dpCold.toFixed(2)),
        parseFloat(qHot.toFixed(1)),
        parseFloat(qCold.toFixed(1)),
        d.heater1Active ? 'ON' : 'OFF',
        d.heater2Active ? 'ON' : 'OFF',
        d.mode || sess.flowMode || 'Counter-Current'
      ]);
    });
  });

  const masterWs = XLSX.utils.aoa_to_sheet(masterRows);
  masterWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 25 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 25 } }
  ];

  const masterMinWidths: { [key: number]: number } = {
    0: 8,   // No
    1: 26,  // ID Sesi
    2: 24,  // Operator
    3: 20,  // Kelas
    4: 14,  // Tanggal
    5: 14,  // Waktu
    6: 18,  // TI1
    7: 18,  // TI2
    8: 18,  // TI3
    9: 18,  // TI4
    10: 16, // ΔT Hot
    11: 16, // ΔT Cold
    12: 16, // LMTD
    13: 24, // FC1
    14: 24, // FC2
    15: 18, // PI1
    16: 18, // PI2
    17: 18, // PI3
    18: 18, // PI4
    19: 16, // ΔP Hot
    20: 16, // ΔP Cold
    21: 16, // Q Hot
    22: 16, // Q Cold
    23: 12, // Heater 1
    24: 12, // Heater 2
    25: 20  // Mode
  };

  applyAutoColumnWidths(masterWs, masterRows, masterMinWidths, 16);
  XLSX.utils.book_append_sheet(wb, masterWs, 'Master_All_Classes');

  // ── Sheet 2: Ringkasan Sesi per Kelas ──
  const summaryRows: any[][] = [
    ['RINGKASAN PERTEMUAN PRAKTIKUM SELURUH KELAS'],
    [`Tanggal Unduh: ${exportTimeStr}  |  Total Sesi: ${sessions.length}`],
    [],
    [
      'No',
      'ID Sesi',
      'Judul Sesi Praktikum',
      'Operator / Mahasiswa',
      'Kelompok / Kelas',
      'Tanggal',
      'Jam Mulai',
      'Jam Selesai',
      'Durasi Praktikum',
      'Mode Aliran',
      'Jumlah Data (Baris)'
    ]
  ];

  sessions.forEach((s, idx) => {
    summaryRows.push([
      idx + 1,
      s.id,
      s.title || 'Praktikum Heat Exchanger',
      s.operatorName || '-',
      s.classGroup || '-',
      s.date,
      s.startTime || '-',
      s.endTime || '-',
      formatDurationText(s.durationSeconds),
      s.flowMode || 'Counter-Current',
      s.pointsCount || (s.data ? s.data.length : 0)
    ]);
  });

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }
  ];

  const summaryMinWidths: { [key: number]: number } = {
    0: 8,   // No
    1: 26,  // ID Sesi
    2: 32,  // Judul Sesi
    3: 24,  // Operator
    4: 20,  // Kelas
    5: 14,  // Tanggal
    6: 14,  // Mulai
    7: 14,  // Selesai
    8: 20,  // Durasi
    9: 20,  // Mode
    10: 20  // Jumlah Data
  };

  applyAutoColumnWidths(summaryWs, summaryRows, summaryMinWidths, 16);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan_Sesi');

  const fileName = `HE_MASTER_SEMUA_KELAS_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadWorkbook(wb, fileName);
  return fileName;
}
