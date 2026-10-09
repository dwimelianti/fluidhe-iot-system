import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UserItem } from '@/types';
import { SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '@/lib/supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const todayStr = new Date().toISOString().slice(0, 10);

const DEFAULT_DATA: { users: UserItem[]; passwords: Record<string, string> } = {
  users: [
    {
      id: 'USR-01',
      name: 'Admin Lab (Anugrah)',
      email: 'anugrahtriplecycle@gmail.com',
      role: 'admin',
      status: 'Active',
      lastLogin: 'Belum Pernah',
      isScheduleRestricted: false
    },
    {
      id: 'USR-06',
      name: 'Admin A',
      email: 'admin.a@uad.ac.id',
      role: 'admin',
      status: 'Active',
      lastLogin: 'Belum Pernah',
      isScheduleRestricted: false
    }
  ],
  passwords: {
    'anugrahtriplecycle@gmail.com': 'admin123',
    'admin@uad.ac.id': 'admin123',
    'admin.a@uad.ac.id': '1234.Admin',
    'Admin A': '1234.Admin'
  }
};

function readDatabase(): { users: UserItem[]; passwords: Record<string, string> } {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
      return DEFAULT_DATA;
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.users || !Array.isArray(parsed.users)) {
      parsed.users = DEFAULT_DATA.users;
    }
    if (!parsed.passwords) {
      parsed.passwords = DEFAULT_DATA.passwords;
    }

    // Auto-fix duplicate IDs
    const seenIds = new Set<string>();
    let counter = 1;
    parsed.users = parsed.users.map((u: UserItem) => {
      if (!u.id || seenIds.has(u.id)) {
        u.id = `USR-${String(counter).padStart(2, '0')}`;
      }
      seenIds.add(u.id);
      counter++;
      return u;
    });

    return parsed;
  } catch (err) {
    console.error('[Users API] Error reading database:', err);
    return DEFAULT_DATA;
  }
}

function writeDatabase(data: { users: UserItem[]; passwords: Record<string, string> }) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Users API] Error writing database:', err);
  }
}

// ─── SUPABASE CLOUD USER SYNCHRONIZATION ───
// Allows user accounts created via UI on Vercel or localhost to sync seamlessly
async function fetchSupabaseUserSync(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/telemetry_data?warning_status=like.USER_SYNC:*&order=id.asc`, {
      headers: {
        'apikey': DEFAULT_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${DEFAULT_SUPABASE_ANON_KEY}`
      },
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const rows = await res.json();
    const payloads: any[] = [];
    for (const r of rows) {
      if (typeof r.warning_status === 'string' && r.warning_status.startsWith('USER_SYNC:')) {
        try {
          const payload = JSON.parse(r.warning_status.slice('USER_SYNC:'.length));
          payloads.push(payload);
        } catch (e) {}
      }
    }
    return payloads;
  } catch (err) {
    console.warn('[Users API] Failed to fetch Supabase user sync:', err);
    return [];
  }
}

async function pushSupabaseUserSync(payload: any): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    await fetch(`${SUPABASE_URL}/rest/v1/telemetry_data`, {
      method: 'POST',
      headers: {
        'apikey': DEFAULT_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${DEFAULT_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        warning_status: `USER_SYNC:${JSON.stringify(payload)}`
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
  } catch (err) {
    console.warn('[Users API] Failed to push Supabase user sync:', err);
  }
}

async function purgeSupabaseUserSync(cleanEmail?: string | null, id?: string | null): Promise<void> {
  if (!cleanEmail && !id) return;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    // 1. Purge all records from Supabase containing this email
    if (cleanEmail) {
      await fetch(`${SUPABASE_URL}/rest/v1/telemetry_data?warning_status=like.*${encodeURIComponent(cleanEmail)}*`, {
        method: 'DELETE',
        headers: {
          'apikey': DEFAULT_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${DEFAULT_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        signal: controller.signal
      });
    }

    // 2. Also purge any lingering sync rows for this ID
    if (id) {
      await fetch(`${SUPABASE_URL}/rest/v1/telemetry_data?warning_status=like.*\"${encodeURIComponent(id)}\"*`, {
        method: 'DELETE',
        headers: {
          'apikey': DEFAULT_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${DEFAULT_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        signal: controller.signal
      });
    }

    clearTimeout(timeout);
  } catch (err) {
    console.warn('[Users API] Failed to purge Supabase user sync:', err);
  }
}

async function getMergedDatabase(): Promise<{ users: UserItem[]; passwords: Record<string, string> }> {
  const db = readDatabase();
  const syncItems = await fetchSupabaseUserSync();
  if (syncItems.length === 0) return db;

  const users: UserItem[] = [...db.users];
  const passwords: Record<string, string> = { ...db.passwords };

  for (const item of syncItems) {
    if (!item) continue;
    const action = item.action || 'create';

    if (action === 'create' || item.user) {
      const u = item.user;
      if (u && u.email) {
        const cleanEmail = u.email.toLowerCase().trim();
        const existingIdx = users.findIndex(x => x.email.toLowerCase() === cleanEmail || (u.id && x.id === u.id));
        if (existingIdx >= 0) {
          users[existingIdx] = { ...users[existingIdx], ...u };
        } else {
          users.push(u);
        }
        if (item.password) {
          passwords[cleanEmail] = item.password;
          if (u.name) {
            passwords[u.name] = item.password;
            passwords[u.name.toLowerCase()] = item.password;
          }
        }
      }
    } else if (action === 'update' && item.update) {
      const { email, id, newPassword, newRole, name, status, lastLogin, isScheduleRestricted, allowedStartDate, allowedEndDate, allowedStartTime, allowedEndTime, allowedDays } = item.update;
      const targetUser = users.find(x => {
        if (id && x.id === id) return true;
        if (email && x.email.toLowerCase() === email.toLowerCase().trim()) return true;
        return false;
      });
      if (targetUser) {
        if (name) targetUser.name = name.trim();
        if (newRole) targetUser.role = newRole;
        if (typeof isScheduleRestricted === 'boolean') targetUser.isScheduleRestricted = isScheduleRestricted;
        if (allowedStartDate !== undefined) targetUser.allowedStartDate = allowedStartDate;
        if (allowedEndDate !== undefined) targetUser.allowedEndDate = allowedEndDate;
        if (allowedStartTime !== undefined) targetUser.allowedStartTime = allowedStartTime;
        if (allowedEndTime !== undefined) targetUser.allowedEndTime = allowedEndTime;
        if (Array.isArray(allowedDays)) targetUser.allowedDays = allowedDays;
        if (status) targetUser.status = status;
        if (lastLogin) targetUser.lastLogin = lastLogin;
      }
      if (email && newPassword) {
        const cleanEmail = email.toLowerCase().trim();
        passwords[cleanEmail] = newPassword;
        if (targetUser?.name) {
          passwords[targetUser.name] = newPassword;
          passwords[targetUser.name.toLowerCase()] = newPassword;
        }
      }
    } else if (action === 'delete') {
      const { id, email } = item;
      const cleanEmail = email ? email.toLowerCase().trim() : null;
      const target = users.find(u => (cleanEmail && u.email.toLowerCase() === cleanEmail) || (id && u.id === id));
      const filtered = users.filter(u => {
        if (cleanEmail && u.email.toLowerCase() === cleanEmail) return false;
        if (!cleanEmail && id && u.id === id) return false;
        return true;
      });
      users.length = 0;
      users.push(...filtered);
      if (cleanEmail) {
        delete passwords[cleanEmail];
        delete passwords[cleanEmail.toLowerCase()];
      }
      if (target?.email) {
        delete passwords[target.email.toLowerCase().trim()];
      }
      if (target?.name) {
        delete passwords[target.name];
        delete passwords[target.name.toLowerCase()];
      }
    }
  }

  return { users, passwords };
}

// GET: Ambil daftar seluruh user & password publik sistem (dengan sinkronisasi Cloud Supabase)
export async function GET() {
  const db = await getMergedDatabase();
  const now = Date.now();
  const usersWithOnlineStatus = db.users.map((u: UserItem) => ({
    ...u,
    isOnline: !!(u.lastSeen && now - u.lastSeen < 15000)
  }));
  return NextResponse.json({
    success: true,
    users: usersWithOnlineStatus,
    passwords: db.passwords
  });
}

// POST: Tambah User Baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role, password, isScheduleRestricted, allowedStartDate, allowedEndDate, allowedStartTime, allowedEndTime } = body;

    if (!email || !name) {
      return NextResponse.json({ success: false, error: 'Nama dan Email wajib diisi' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = await getMergedDatabase();

    if (db.users.some((u: UserItem) => u.email.toLowerCase() === cleanEmail)) {
      return NextResponse.json({ success: false, error: `Email ${cleanEmail} sudah terdaftar!` }, { status: 400 });
    }

    // Generate guaranteed unique ID
    let maxNum = 0;
    db.users.forEach((u: UserItem) => {
      const match = u.id?.match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const nextId = `USR-${String(maxNum + 1).padStart(2, '0')}`;

    const newUser: UserItem = {
      id: nextId,
      name: name.trim(),
      email: cleanEmail,
      role: role || 'operator',
      status: 'Active',
      lastLogin: 'Belum Pernah',
      isScheduleRestricted: role === 'operator' ? (isScheduleRestricted ?? true) : false,
      allowedStartDate: allowedStartDate || todayStr,
      allowedEndDate: allowedEndDate || todayStr,
      allowedDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      allowedStartTime: allowedStartTime || '07:00',
      allowedEndTime: allowedEndTime || '18:00'
    };

    db.users.push(newUser);
    if (password) {
      db.passwords[cleanEmail] = password;
      db.passwords[newUser.name] = password;
      db.passwords[newUser.name.toLowerCase()] = password;
    }

    writeDatabase(db);
    // Push sync to Supabase so Vercel & localhost are always in sync!
    await pushSupabaseUserSync({ action: 'create', user: newUser, password: password || '' });

    return NextResponse.json({
      success: true,
      user: newUser,
      users: db.users,
      passwords: db.passwords
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

// PATCH: Update User (Ganti Password, Ubah Role, Jadwal Akses Tanggal/Hari/Jam, dll)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      id,
      name,
      newPassword,
      newRole,
      isScheduleRestricted,
      allowedStartDate,
      allowedEndDate,
      allowedStartTime,
      allowedEndTime,
      allowedDays,
      status,
      lastLogin,
      lastSeen
    } = body;

    const db = await getMergedDatabase();

    const targetUser = db.users.find((x: UserItem) => {
      if (id && x.id === id) return true;
      if (email && x.email.toLowerCase() === email.toLowerCase().trim()) return true;
      return false;
    });

    if (targetUser) {
      if (name) targetUser.name = name.trim();
      if (newRole) targetUser.role = newRole;
      if (typeof isScheduleRestricted === 'boolean') targetUser.isScheduleRestricted = isScheduleRestricted;
      if (allowedStartDate !== undefined) targetUser.allowedStartDate = allowedStartDate;
      if (allowedEndDate !== undefined) targetUser.allowedEndDate = allowedEndDate;
      if (allowedStartTime !== undefined) targetUser.allowedStartTime = allowedStartTime;
      if (allowedEndTime !== undefined) targetUser.allowedEndTime = allowedEndTime;
      if (Array.isArray(allowedDays)) targetUser.allowedDays = allowedDays;
      if (status) targetUser.status = status;
      if (lastLogin) targetUser.lastLogin = lastLogin;
      if (lastSeen !== undefined) targetUser.lastSeen = lastSeen;
    }

    if (email && newPassword) {
      const cleanEmail = email.toLowerCase().trim();
      db.passwords[cleanEmail] = newPassword;
      if (targetUser?.name) {
        db.passwords[targetUser.name] = newPassword;
        db.passwords[targetUser.name.toLowerCase()] = newPassword;
      }
    }

    writeDatabase(db);

    // Only push to Supabase if it's a persistent credential / profile / permission update (skip raw heartbeat lastSeen)
    if (newPassword || newRole || name || status || isScheduleRestricted !== undefined || allowedStartDate !== undefined || allowedEndDate !== undefined) {
      await pushSupabaseUserSync({ action: 'update', update: body });
    }

    const now = Date.now();
    const usersWithOnlineStatus = db.users.map((u: UserItem) => ({
      ...u,
      isOnline: !!(u.lastSeen && now - u.lastSeen < 15000)
    }));

    return NextResponse.json({
      success: true,
      users: usersWithOnlineStatus,
      passwords: db.passwords
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Hapus User
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    const db = await getMergedDatabase();

    if (id || email) {
      const cleanEmail = email ? email.toLowerCase().trim() : null;
      const target = db.users.find(u => (cleanEmail && u.email.toLowerCase() === cleanEmail) || (id && u.id === id));
      const targetEmail = target?.email ? target.email.toLowerCase().trim() : cleanEmail;
      const targetId = target?.id || id;

      db.users = db.users.filter((u: UserItem) => {
        if (targetEmail && u.email.toLowerCase().trim() === targetEmail) return false;
        if (cleanEmail && u.email.toLowerCase().trim() === cleanEmail) return false;
        if (!targetEmail && !cleanEmail && targetId && u.id === targetId) return false;
        return true;
      });

      // Thoroughly delete passwords for this user across all possible keys
      if (targetEmail) {
        delete db.passwords[targetEmail];
        delete db.passwords[targetEmail.toLowerCase()];
      }
      if (cleanEmail) {
        delete db.passwords[cleanEmail];
        delete db.passwords[cleanEmail.toLowerCase()];
      }
      if (target?.name) {
        delete db.passwords[target.name];
        delete db.passwords[target.name.toLowerCase()];
        delete db.passwords[target.name.trim()];
      }

      writeDatabase(db);

      // Permanently purge all historical rows for this email and user ID from Supabase
      await purgeSupabaseUserSync(targetEmail, targetId);
    }

    return NextResponse.json({
      success: true,
      users: db.users,
      passwords: db.passwords
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
