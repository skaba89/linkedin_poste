import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

const VALID_PROVIDERS = ['openrouter', 'groq', 'glm'];
const VALID_STATUSES = ['idea', 'draft', 'pending_approval', 'approved', 'scheduled', 'posted'];
const MAX_ROWS = 100;

// Expected CSV columns (French names → DB fields)
const COL_SUBJECT = 'sujet';
const COL_ANGLE = 'angle';
const COL_AUDIENCE = 'audience';
const COL_CTA = 'cta';
const COL_HASHTAGS = 'hashtags';
const COL_PROVIDER = 'provider';
const COL_STATUS = 'statut';
const COL_SCHEDULED_DATE = 'date_planification';

/**
 * Simple RFC 4180 CSV parser that handles:
 * - Quoted fields containing commas, newlines, and escaped quotes ("")
 * - Empty rows (skipped)
 * - Trailing CRLF / LF
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote or end of quoted field
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
        i++;
      } else if (ch === '\r') {
        // CR – handle CRLF or standalone CR
        row.push(field.trim());
        field = '';
        i++;
        if (i < text.length && text[i] === '\n') i++;
        rows.push(row);
        row = [];
      } else if (ch === '\n') {
        row.push(field.trim());
        field = '';
        i++;
        rows.push(row);
        row = [];
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Handle last field / row (file may not end with newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  // Filter out completely empty rows (e.g. trailing newlines)
  return rows.filter((r) => r.some((cell) => cell.length > 0));
}

export async function POST(request: Request) {
  try {
    // ── Auth check ──────────────────────────────────────────────
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    // ── Read multipart form data ────────────────────────────────
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier CSV requis' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Le fichier doit être au format CSV' }, { status: 400 });
    }

    // ── Parse CSV ───────────────────────────────────────────────
    const raw = await file.text();
    const rows = parseCSV(raw);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Le fichier CSV est vide' }, { status: 400 });
    }

    // First row = header
    const header = rows[0].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    if (dataRows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ROWS} lignes autorisées par import (${dataRows.length} trouvées)` },
        { status: 400 },
      );
    }

    // Map column names to indices
    const colIndex: Record<string, number> = {};
    for (let i = 0; i < header.length; i++) {
      colIndex[header[i]] = i;
    }

    // Validate required column
    if (colIndex[COL_SUBJECT] === undefined) {
      return NextResponse.json(
        { error: `Colonne "${COL_SUBJECT}" manquante dans le fichier CSV` },
        { status: 400 },
      );
    }

    // ── Validate & transform rows ───────────────────────────────
    const errors: string[] = [];
    const createInputs: {
      subject: string;
      angle: string | null;
      audience: string | null;
      cta: string | null;
      hashtags: string | null;
      aiProvider: string;
      status: string;
      scheduledDate: Date | null;
      authorId: string;
    }[] = [];

    for (let r = 0; r < dataRows.length; r++) {
      const rowNum = r + 2; // 1-based for user display, +1 for header offset
      const cells = dataRows[r];

      const get = (col: string): string | undefined => {
        const idx = colIndex[col];
        if (idx === undefined || idx >= cells.length) return undefined;
        const val = cells[idx];
        return val && val.length > 0 ? val : undefined;
      };

      // Required field
      const subject = get(COL_SUBJECT);
      if (!subject) {
        errors.push(`Ligne ${rowNum} : sujet manquant`);
        continue;
      }

      // Optional fields with defaults
      const angle = get(COL_ANGLE) || null;
      const audience = get(COL_AUDIENCE) || null;
      const cta = get(COL_CTA) || null;
      const hashtags = get(COL_HASHTAGS) || null;

      // Validate provider
      let aiProvider = get(COL_PROVIDER) || 'openrouter';
      if (!VALID_PROVIDERS.includes(aiProvider)) {
        errors.push(`Ligne ${rowNum} : provider "${aiProvider}" invalide (valeurs acceptées : ${VALID_PROVIDERS.join(', ')})`);
        continue;
      }

      // Validate status
      let status = get(COL_STATUS) || 'idea';
      if (!VALID_STATUSES.includes(status)) {
        errors.push(`Ligne ${rowNum} : statut "${status}" invalide (valeurs acceptées : ${VALID_STATUSES.join(', ')})`);
        continue;
      }

      // Parse scheduled date (optional)
      let scheduledDate: Date | null = null;
      const rawDate = get(COL_SCHEDULED_DATE);
      if (rawDate) {
        const parsed = new Date(rawDate);
        if (isNaN(parsed.getTime())) {
          errors.push(`Ligne ${rowNum} : date_planification "${rawDate}" invalide (format ISO attendu)`);
          continue;
        }
        scheduledDate = parsed;
      }

      createInputs.push({
        subject,
        angle,
        audience,
        cta,
        hashtags,
        aiProvider,
        status,
        scheduledDate,
        authorId: authUser.id,
      });
    }

    // ── Create posts in DB ──────────────────────────────────────
    let imported = 0;

    if (createInputs.length > 0) {
      const result = await db.post.createMany({
        data: createInputs,
      });
      imported = result.count;
    }

    // ── Audit log ───────────────────────────────────────────────
    await createAuditLog({
      entityType: 'Post',
      action: 'csv_import',
      userId: authUser.id,
      metadata: {
        imported,
        totalRows: dataRows.length,
        errors: errors.length,
        fileName: file.name,
      },
    });

    // ── Response ────────────────────────────────────────────────
    return NextResponse.json({ imported, errors }, { status: 200 });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l\'import' }, { status: 500 });
  }
}
