import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Post, AnalyticsOverview, FormatPerformance } from '@/types';

// ============================================================
// Shared constants
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idée',
  draft: 'Brouillon',
  pending_approval: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  scheduled: 'Planifié',
  posted: 'Publié',
  failed: 'Échoué',
};

const STATUS_COLORS: Record<string, [number, number, number]> = {
  idea: [100, 116, 139],       // slate
  draft: [217, 119, 6],        // amber
  pending_approval: [37, 99, 235], // blue
  approved: [5, 150, 105],     // emerald
  rejected: [220, 38, 38],     // red
  scheduled: [139, 92, 246],   // violet
  posted: [22, 163, 74],       // green
  failed: [225, 29, 72],       // rose
};

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: 'OpenRouter',
  groq: 'Groq',
  glm: 'GLM-5',
};

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ============================================================
// Helper: add header + footer to every page
// ============================================================

function addHeaderFooter(doc: jsPDF, title: string, subtitle?: string) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // Header background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LinkedInPost', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 60, 16);

  // Subtitle on the right
  if (subtitle) {
    doc.setFontSize(8);
    doc.text(subtitle, pageWidth - 14, 16, { align: 'right' });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const y = pageHeight - 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y - 2, pageWidth - 14, y - 2);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, y);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 14, y, { align: 'right' });
  }
}

// ============================================================
// Helper: truncate text safely for PDF
// ============================================================

function safeStr(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value);
  // Strip non-latin1 characters for jsPDF compatibility
  return s.replace(/[^\x00-\xFF]/g, ' ').trim() || fallback;
}

function truncate(value: string, maxLen: number): string {
  if (!value) return '—';
  const safe = safeStr(value);
  if (safe.length <= maxLen) return safe;
  return safe.substring(0, maxLen) + '...';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================
// exportPostsToPdf
// ============================================================

export function exportPostsToPdf(posts: Post[], title?: string): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const subtitle = `Export du ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;

  // Data rows
  const body = posts.map((post) => {
    const statusLabel = STATUS_LABELS[post.status] || post.status;
    const statusRgb = STATUS_COLORS[post.status] || [120, 120, 120];
    return [
      truncate(post.subject, 50),
      statusLabel,
      PROVIDER_LABELS[post.aiProvider] || post.aiProvider,
      formatDate(post.scheduledDate),
      safeStr(post.author?.name),
      truncate(post.finalContent || '', 80),
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Sujet', 'Statut', 'Provider IA', 'Date planifiée', 'Auteur', 'Aperçu contenu']],
    body,
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 25 },
      5: { cellWidth: 100 },
    },
    // Color status cells
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const statusVal = body[data.row.index]?.[1];
        // Find matching status color
        const entry = Object.entries(STATUS_LABELS).find(([, label]) => label === statusVal);
        if (entry) {
          const rgb = STATUS_COLORS[entry[0]];
          if (rgb) {
            data.cell.styles.textColor = rgb;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, top: 34 },
  });

  // Summary text
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`${posts.length} post(s) exporté(s)`, 14, finalY + 6);

  addHeaderFooter(doc, title || 'Export Posts', subtitle);
  return doc;
}

// ============================================================
// exportAnalyticsToPdf
// ============================================================

export function exportAnalyticsToPdf(
  analyticsData: AnalyticsOverview,
  period?: string,
  formatPerformance?: FormatPerformance[],
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const subtitle = period || `Rapport du ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;

  let yPos = 38;

  // ---- KPIs Section ----
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Indicateurs cles (KPIs)', 14, yPos);
  yPos += 8;

  const kpis = [
    { label: 'Total Impressions', value: analyticsData.totalImpressions.toLocaleString('fr-FR') },
    { label: 'Engagement Moyen', value: `${analyticsData.avgEngagementRate}%` },
    { label: 'Posts avec metriques', value: `${analyticsData.postsWithMetrics} / ${analyticsData.totalPosts}` },
    { label: 'Meilleur Post', value: analyticsData.bestPost ? truncate(analyticsData.bestPost.subject, 40) : '—' },
  ];

  if (analyticsData.bestPost) {
    kpis.push({ label: 'Engagement meilleur post', value: `${analyticsData.bestPost.engagementRate}%` });
  }
  if (analyticsData.worstPost) {
    kpis.push({ label: 'Post le moins performant', value: truncate(analyticsData.worstPost.subject, 40) });
    kpis.push({ label: 'Engagement pire post', value: `${analyticsData.worstPost.engagementRate}%` });
  }

  autoTable(doc, {
    startY: yPos,
    body: kpis.map((k) => [k.label, k.value]),
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70, textColor: [100, 100, 100] },
      1: { fontStyle: 'bold', cellWidth: 100, textColor: [15, 23, 42] },
    },
    margin: { left: 14, right: 14 },
    theme: 'plain',
  });

  yPos = (doc as any).lastAutoTable?.finalY || yPos + 40;
  yPos += 10;

  // ---- Format Performance Section ----
  if (formatPerformance && formatPerformance.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Performance par Format', 14, yPos);
    yPos += 4;

    autoTable(doc, {
      startY: yPos,
      head: [['Format', 'Posts', 'Engagement moyen', 'Impressions moyennes']],
      body: formatPerformance.map((f) => [
        f.label || f.format,
        String(f.postCount),
        `${f.avgEngagement}%`,
        f.avgImpressions.toLocaleString('fr-FR'),
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable?.finalY || yPos + 40;
  }

  // ---- Trend Summary ----
  if (analyticsData.trendData && analyticsData.trendData.length > 0) {
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Tendances (30 derniers jours)', 14, yPos);
    yPos += 4;

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Impressions', 'Engagement']],
      body: analyticsData.trendData.map((t) => [
        formatDate(t.date),
        t.impressions.toLocaleString('fr-FR'),
        `${t.engagementRate}%`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { halign: 'right', cellWidth: 50 },
        2: { halign: 'right', cellWidth: 35 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
  }

  addHeaderFooter(doc, 'Rapport Analytique', subtitle);
  return doc;
}

// ============================================================
// exportCalendarToPdf
// ============================================================

export function exportCalendarToPdf(
  posts: Post[],
  month: number,
  year: number,
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const monthName = MOIS_NOMS[month - 1] || `Mois ${month}`;
  const subtitle = `${monthName} ${year}`;

  // Filter posts for the given month/year
  const filteredPosts = posts.filter((post) => {
    if (!post.scheduledDate) return false;
    const d = new Date(post.scheduledDate);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  // Group posts by day
  const postsByDay = new Map<number, Post[]>();
  for (const post of filteredPosts) {
    if (!post.scheduledDate) continue;
    const day = new Date(post.scheduledDate).getDate();
    const existing = postsByDay.get(day) || [];
    existing.push(post);
    postsByDay.set(day, existing);
  }

  let yPos = 38;

  // ---- Calendar Grid ----
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Calendrier - ${monthName} ${year}`, 14, yPos);
  yPos += 4;

  // Month summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${filteredPosts.length} post(s) planifié(s) pour ce mois`, 14, yPos);
  yPos += 8;

  // Day headers
  const cellW = (doc.internal.pageSize.width - 28) / 7;
  const startX = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(startX, yPos, cellW * 7, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  for (let i = 0; i < 7; i++) {
    doc.text(JOURS_SEMAINE[i], startX + i * cellW + cellW / 2, yPos + 5.5, { align: 'center' });
  }
  yPos += 8;

  // Calculate first day of month
  const firstDay = new Date(year, month - 1, 1);
  let dayOfWeek = firstDay.getDay(); // 0 = Sun
  dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0

  const daysInMonth = new Date(year, month, 0).getDate();
  const cellH = 22;

  let currentX = startX + dayOfWeek * cellW;
  let currentY = yPos;

  for (let day = 1; day <= daysInMonth; day++) {
    // Day number
    const dayPosts = postsByDay.get(day) || [];

    // Cell background
    if (dayPosts.length > 0) {
      // Light color based on first post status
      const statusColor = STATUS_COLORS[dayPosts[0].status] || [200, 200, 200];
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(currentX + 0.5, currentY + 0.5, cellW - 1, cellH - 1, 1.5, 1.5, 'FD');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setDrawColor(230, 230, 230);
      doc.roundedRect(currentX + 0.5, currentY + 0.5, cellW - 1, cellH - 1, 1.5, 1.5, 'S');
      doc.setTextColor(80, 80, 80);
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(String(day), currentX + 3, currentY + 5);

    if (dayPosts.length > 0) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      const preview = dayPosts.length === 1
        ? truncate(dayPosts[0].subject, 25)
        : `${dayPosts.length} post(s)`;
      doc.text(preview, currentX + 3, currentY + 11);

      if (dayPosts.length === 1) {
        const statusLabel = STATUS_LABELS[dayPosts[0].status] || dayPosts[0].status;
        doc.setFontSize(5.5);
        doc.text(statusLabel, currentX + 3, currentY + 16);
      }
    }

    currentX += cellW;
    dayOfWeek++;

    if (dayOfWeek >= 7) {
      dayOfWeek = 0;
      currentX = startX;
      currentY += cellH;

      // Check for page break
      if (currentY + cellH > doc.internal.pageSize.height - 20) {
        doc.addPage();
        currentY = 20;
      }
    }
  }

  // ---- Posts Detail Table ----
  if (filteredPosts.length > 0) {
    const detailY = currentY + cellH + 10;

    if (detailY < doc.internal.pageSize.height - 40) {
      doc.setPage(doc.getNumberOfPages());
      let tableY = Math.max(detailY, 40);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Detail des posts', 14, tableY);
      tableY += 4;

      autoTable(doc, {
        startY: tableY,
        head: [['Date', 'Sujet', 'Statut', 'Provider IA']],
        body: filteredPosts
          .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))
          .map((post) => [
            formatDate(post.scheduledDate),
            truncate(post.subject, 60),
            STATUS_LABELS[post.status] || post.status,
            PROVIDER_LABELS[post.aiProvider] || post.aiProvider,
          ]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 100 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const statusVal = filteredPosts[data.row.index];
            if (statusVal) {
              const rgb = STATUS_COLORS[statusVal.status];
              if (rgb) {
                data.cell.styles.textColor = rgb;
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });
    }
  }

  addHeaderFooter(doc, 'Calendrier', subtitle);
  return doc;
}
