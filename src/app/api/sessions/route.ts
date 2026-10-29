import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SystemSession } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function readSessionsDatabase(): { sessions: SystemSession[] } {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SESSIONS_FILE)) {
      const initial = { sessions: [] };
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const cleanRaw = raw.replace(/^\uFEFF/, '').trim();
    const parsed = JSON.parse(cleanRaw);
    if (!parsed || !Array.isArray(parsed.sessions)) {
      return { sessions: [] };
    }
    return parsed;
  } catch (err) {
    console.error('[Sessions API] Error reading sessions database:', err);
    return { sessions: [] };
  }
}

function writeSessionsDatabase(data: { sessions: SystemSession[] }): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Sessions API] Error writing sessions database:', err);
    return false;
  }
}

// ─── GET: Ambil Sesi dengan Role-Based Data Segregation ───
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = (searchParams.get('role') || 'operator').toLowerCase();
    const email = (searchParams.get('email') || '').toLowerCase().trim();
    const classFilter = searchParams.get('classFilter') || 'ALL';
    const sessionId = searchParams.get('sessionId');

    const db = readSessionsDatabase();

    // Sinkronkan nama pengguna secara dinamis dari master users.json
    const usersFilePath = path.join(DATA_DIR, 'users.json');
    const userMap = new Map<string, string>();
    try {
      if (fs.existsSync(usersFilePath)) {
        const uRaw = fs.readFileSync(usersFilePath, 'utf-8');
        const uParsed = JSON.parse(uRaw);
        if (uParsed && Array.isArray(uParsed.users)) {
          uParsed.users.forEach((u: any) => {
            if (u.email && u.name) {
              userMap.set(u.email.toLowerCase().trim(), u.name.trim());
            }
          });
        }
      }
    } catch (e) { }

    const allSessions = db.sessions.map((s) => {
      const emailKey = s.operatorEmail?.toLowerCase().trim();
      const mappedName = emailKey && userMap.has(emailKey) ? userMap.get(emailKey)! : '';
      return {
        ...s,
        operatorName: s.operatorName || mappedName || 'Operator',
        classGroup: s.classGroup || s.operatorName || mappedName || 'Kelas Praktikum'
      };
    });

    // Filter HANYA sesi yang benar-benar memiliki data pengukuran masuk (alat aktif)
    const validSessions = allSessions.filter((s) => (s.pointsCount && s.pointsCount > 0) || (s.data && s.data.length > 0));

    if (role === 'admin') {
      // ADMIN: Akses penuh ke seluruh data dari semua kelas & tanggal
      let filtered = [...validSessions];

      if (sessionId) {
        filtered = filtered.filter((s) => s.id === sessionId);
      } else if (classFilter && classFilter !== 'ALL') {
        filtered = filtered.filter(
          (s) =>
            (s.operatorEmail && s.operatorEmail.toLowerCase() === classFilter.toLowerCase()) ||
            (s.classGroup && s.classGroup.toLowerCase() === classFilter.toLowerCase()) ||
            (s.operatorName && s.operatorName.toLowerCase() === classFilter.toLowerCase())
        );
      }

      // Bangun daftar agregat kelas untuk opsi filter Admin (Dikelompokkan unik per Operator agar tidak duplikat)
      const classMap = new Map<string, { operatorEmail: string; operatorName: string; classGroup?: string; count: number }>();
      validSessions.forEach((s) => {
        const emailKey = s.operatorEmail?.toLowerCase().trim();
        const currentName = s.classGroup || s.operatorName || ((emailKey && userMap.has(emailKey)) ? userMap.get(emailKey)! : 'Operator');
        const groupKey = currentName.toLowerCase().trim();

        if (!classMap.has(groupKey)) {
          classMap.set(groupKey, {
            operatorEmail: s.operatorEmail || '',
            operatorName: currentName,
            classGroup: s.classGroup || currentName,
            count: 1
          });
        } else {
          const item = classMap.get(groupKey)!;
          item.count += 1;
          // Lengkapi email jika ada sesi yang menyimpan email valid
          if (!item.operatorEmail && s.operatorEmail) {
            item.operatorEmail = s.operatorEmail;
          }
        }
      });

      const totalDataPoints = validSessions.reduce((acc, s) => acc + (s.pointsCount || (s.data ? s.data.length : 0)), 0);

      return NextResponse.json({
        success: true,
        isAdmin: true,
        sessions: filtered,
        totalSessions: validSessions.length,
        filteredCount: filtered.length,
        totalDataPoints,
        classesList: Array.from(classMap.values())
      });
    } else {
      // OPERATOR: Segregasi Ketat! Hanya bisa mengakses data kelas mereka sendiri
      if (!email) {
        return NextResponse.json({
          success: true,
          isAdmin: false,
          sessions: [],
          totalSessions: 0,
          message: 'Email operator belum terdefinisi'
        });
      }

      let operatorSessions = validSessions.filter(
        (s) => s.operatorEmail && s.operatorEmail.toLowerCase() === email
      );

      if (sessionId) {
        operatorSessions = operatorSessions.filter((s) => s.id === sessionId);
      }

      return NextResponse.json({
        success: true,
        isAdmin: false,
        sessions: operatorSessions,
        totalSessions: operatorSessions.length
      });
    }
  } catch (err: any) {
    console.error('[Sessions API] GET handler error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat arsip sesi' },
      { status: 500 }
    );
  }
}

// ─── POST: Simpan atau Perbarui Sesi Praktikum ───
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session: SystemSession = body.session;

    if (!session || !session.id) {
      return NextResponse.json(
        { success: false, error: 'Data sesi tidak valid atau ID sesi kosong' },
        { status: 400 }
      );
    }

    const points = session.pointsCount || (session.data ? session.data.length : 0);

    // KETENTUAN KHUSUS: Jika sistem OFF dan belum memperoleh data (0 baris),
    // jangan masukkan ke dalam fitur Data Praktikum.
    if (points === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Sesi kosong tanpa data masuk tidak diarsipkan ke Data Praktikum'
      });
    }

    const db = readSessionsDatabase();
    const existingIndex = db.sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      // Update existing session
      db.sessions[existingIndex] = {
        ...db.sessions[existingIndex],
        ...session,
        pointsCount: session.pointsCount || (session.data ? session.data.length : 0)
      };
    } else {
      // Insert new session (di posisi awal / terbaru)
      db.sessions.unshift({
        ...session,
        pointsCount: session.pointsCount || (session.data ? session.data.length : 0)
      });
    }

    const saved = writeSessionsDatabase(db);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Gagal menulis data sesi ke server' },
        { status: 500 }
      );
    }

    // Sinkronkan lastLogin operator ke users.json
    try {
      if (session.operatorEmail || session.operatorName) {
        const usersFilePath = path.join(DATA_DIR, 'users.json');
        if (fs.existsSync(usersFilePath)) {
          const uRaw = fs.readFileSync(usersFilePath, 'utf-8');
          const uParsed = JSON.parse(uRaw);
          if (uParsed && Array.isArray(uParsed.users)) {
            const emailKey = (session.operatorEmail || '').toLowerCase().trim();
            const nameKey = (session.operatorName || '').toLowerCase().trim();
            let updatedAny = false;
            const nowIso = session.startTimeMs ? new Date(session.startTimeMs).toISOString() : new Date().toISOString();

            uParsed.users = uParsed.users.map((u: any) => {
              const uEmail = (u.email || '').toLowerCase().trim();
              const uName = (u.name || '').toLowerCase().trim();
              if ((emailKey && uEmail === emailKey) || (nameKey && uName === nameKey)) {
                updatedAny = true;
                return { ...u, lastLogin: nowIso };
              }
              return u;
            });

            if (updatedAny) {
              fs.writeFileSync(usersFilePath, JSON.stringify(uParsed, null, 2), 'utf-8');
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Sessions API] Failed to update operator lastLogin in users.json:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Sesi praktikum berhasil diarsipkan di server',
      savedSessionId: session.id,
      totalSessionsNow: db.sessions.length
    });
  } catch (err: any) {
    console.error('[Sessions API] POST handler error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan sesi praktikum' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Edit Metadata Sesi Praktikum (Otorisasi Khusus Admin) ───
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, title, classGroup, operatorName, date, role } = body;

    if (role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Hanya Admin yang memiliki hak akses mengedit metadata sesi' },
        { status: 403 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'ID sesi wajib dicantumkan' },
        { status: 400 }
      );
    }

    const db = readSessionsDatabase();
    const idx = db.sessions.findIndex((s) => s.id === sessionId);

    if (idx < 0) {
      // Jika sesi belum tersimpan di sessions.json (misal sesi aktif), buatkan entri sesi di db
      const placeholder: SystemSession = {
        id: sessionId,
        title: title || 'Praktikum Heat Exchanger',
        date: date || new Date().toISOString().slice(0, 10),
        startTime: new Date().toLocaleTimeString('id-ID'),
        startTimeMs: Date.now(),
        operatorName: operatorName || 'Operator',
        classGroup: classGroup || operatorName || 'Kelas Praktikum',
        pointsCount: 1,
        flowMode: 'Counter-Current',
        data: []
      };
      db.sessions.unshift(placeholder);
      writeSessionsDatabase(db);
      return NextResponse.json({
        success: true,
        message: `Sesi ${sessionId} berhasil diperbarui`,
        updatedSession: placeholder
      });
    }

    // Update metadata
    if (title !== undefined) db.sessions[idx].title = title;
    if (classGroup !== undefined) db.sessions[idx].classGroup = classGroup;
    if (operatorName !== undefined) db.sessions[idx].operatorName = operatorName;
    if (date !== undefined) db.sessions[idx].date = date;

    writeSessionsDatabase(db);

    return NextResponse.json({
      success: true,
      message: `Sesi ${sessionId} berhasil diperbarui`,
      updatedSession: db.sessions[idx]
    });
  } catch (err: any) {
    console.error('[Sessions API] PATCH handler error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui sesi' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Hapus Sesi Tunggal / Massal (Otorisasi Khusus Admin) ───
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let role = searchParams.get('role');
    let sessionId = searchParams.get('sessionId');
    const sessionIdsParam = searchParams.get('sessionIds');
    let sessionIds: string[] = [];

    // Jika ada JSON body di DELETE request
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json();
        if (body.role) role = body.role;
        if (body.sessionId) sessionId = body.sessionId;
        if (Array.isArray(body.sessionIds)) {
          sessionIds = body.sessionIds;
        }
      }
    } catch (e) { }

    if (sessionIdsParam) {
      sessionIds = sessionIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
    } else if (sessionId && sessionIds.length === 0) {
      sessionIds = [sessionId];
    }

    if (role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Hanya Admin yang memiliki hak akses menghapus arsip praktikum' },
        { status: 403 }
      );
    }

    if (sessionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ID sesi atau daftar ID sesi wajib dicantumkan' },
        { status: 400 }
      );
    }

    const db = readSessionsDatabase();

    // Khusus pembersihan data contoh/dummy jika dipanggil
    if (sessionIds.includes('CLEAR_DUMMY')) {
      const beforeCount = db.sessions.length;
      db.sessions = db.sessions.filter(
        (s) =>
          !s.classGroup?.includes('Kelas Praktikum') &&
          s.id !== 'SES-20260907-091530' &&
          s.id !== 'SES-20260907-133000'
      );
      writeSessionsDatabase(db);
      return NextResponse.json({
        success: true,
        message: `Berhasil membersihkan ${beforeCount - db.sessions.length} sesi dummy`,
        remainingCount: db.sessions.length
      });
    }

    const targetSet = new Set(sessionIds);
    const initialLen = db.sessions.length;
    db.sessions = db.sessions.filter((s) => !targetSet.has(s.id));
    const deletedCount = initialLen - db.sessions.length;

    if (deletedCount > 0) {
      writeSessionsDatabase(db);
    }

    return NextResponse.json({
      success: true,
      message: sessionIds.length === 1
        ? `Sesi ${sessionIds[0]} berhasil dihapus`
        : `Berhasil menghapus ${sessionIds.length} sesi praktikum`,
      deletedCount: deletedCount || sessionIds.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error' }, { status: 500 });
  }
}


