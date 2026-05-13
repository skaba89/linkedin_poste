import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import jsPDF from 'jspdf';

// ============================================================
// Types
// ============================================================

interface Slide {
  heading: string;
  body: string;
  type?: 'title' | 'content' | 'quote' | 'stat' | 'cta';
}

interface Branding {
  primaryColor: string;
  fontName: string;
  logoUrl?: string;
  authorName: string;
  authorTitle: string;
}

// ============================================================
// Color utilities
// ============================================================

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16) || 30;
  const g = parseInt(cleaned.substring(2, 4), 16) || 58;
  const b = parseInt(cleaned.substring(4, 6), 16) || 138;
  return [r, g, b];
}

function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function darkenColor(hex: string, factor: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  ];
}

function lightenColor(hex: string, factor: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [
    Math.min(255, Math.round(r + (255 - r) * factor)),
    Math.min(255, Math.round(g + (255 - g) * factor)),
    Math.min(255, Math.round(b + (255 - b) * factor)),
  ];
}

// ============================================================
// Safe text for jsPDF (strip non-latin1)
// ============================================================

function safeText(value: string): string {
  return value
    .replace(/[^\x00-\xFF]/g, function (ch) {
      const map: Record<string, string> = {
        '\u2019': "'",
        '\u2018': "'",
        '\u201c': '"',
        '\u201d': '"',
        '\u2013': '-',
        '\u2014': '--',
        '\u2026': '...',
        '\u2022': '*',
        '\u00e0': 'a',
        '\u00e1': 'a',
        '\u00e2': 'a',
        '\u00e3': 'a',
        '\u00e4': 'a',
        '\u00e7': 'c',
        '\u00e8': 'e',
        '\u00e9': 'e',
        '\u00ea': 'e',
        '\u00eb': 'e',
        '\u00ec': 'i',
        '\u00ed': 'i',
        '\u00ee': 'i',
        '\u00ef': 'i',
        '\u00f1': 'n',
        '\u00f2': 'o',
        '\u00f3': 'o',
        '\u00f4': 'o',
        '\u00f6': 'o',
        '\u00f9': 'u',
        '\u00fa': 'u',
        '\u00fb': 'u',
        '\u00fc': 'u',
        '\u00c0': 'A',
        '\u00c1': 'A',
        '\u00c2': 'A',
        '\u00c3': 'A',
        '\u00c4': 'A',
        '\u00c7': 'C',
        '\u00c8': 'E',
        '\u00c9': 'E',
        '\u00ca': 'E',
        '\u00cb': 'E',
        '\u00cc': 'I',
        '\u00cd': 'I',
        '\u00ce': 'I',
        '\u00cf': 'I',
        '\u00d1': 'N',
        '\u00d2': 'O',
        '\u00d3': 'O',
        '\u00d4': 'O',
        '\u00d6': 'O',
        '\u00d9': 'U',
        '\u00da': 'U',
        '\u00db': 'U',
        '\u00dc': 'U',
        '\u0153': 'oe',
        '\u0152': 'OE',
        '\u00e6': 'ae',
        '\u00c6': 'AE',
      };
      return map[ch] || ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// Text wrapping helper
// ============================================================

function wrapText(text: string, maxWidth: number, doc: jsPDF, fontSize: number): string[] {
  doc.setFontSize(fontSize);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = doc.getTextWidth(testLine);

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// ============================================================
// Font map for jsPDF
// ============================================================

const FONT_MAP: Record<string, { normal: string; bold: string; italic: string }> = {
  'Inter': { normal: 'helvetica', bold: 'helvetica', italic: 'helvetica' },
  'Playfair Display': { normal: 'times', bold: 'times', italic: 'times' },
  'Roboto Mono': { normal: 'courier', bold: 'courier', italic: 'courier' },
  'DM Sans': { normal: 'helvetica', bold: 'helvetica', italic: 'helvetica' },
};

function getFont(fontName: string) {
  return FONT_MAP[fontName] || FONT_MAP['Inter'];
}

// ============================================================
// Slide renderers
// ============================================================

const SLIDE_W = 1200;
const SLIDE_H = 1200;
const PADDING = 80;

function drawBackground(doc: jsPDF, primaryColor: string, slideIndex: number, totalSlides: number) {
  const rgb = hexToRgb(primaryColor);
  const dark = darkenColor(primaryColor, 0.7);
  const light = lightenColor(primaryColor, 0.85);

  // Gradient effect - alternating light/dark for visual variety
  if (slideIndex % 2 === 0) {
    // Dark gradient background
    doc.setFillColor(dark[0], dark[1], dark[2]);
    doc.rect(0, 0, SLIDE_W, SLIDE_H, 'F');

    // Subtle lighter overlay at bottom
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.rect(0, SLIDE_H * 0.6, SLIDE_W, SLIDE_H * 0.4, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } else {
    // Light gradient background
    doc.setFillColor(light[0], light[1], light[2]);
    doc.rect(0, 0, SLIDE_W, SLIDE_H, 'F');

    // Darker accent at top
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
    doc.rect(0, 0, SLIDE_W, SLIDE_H * 0.4, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  }

  // Decorative circle in corner
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
  doc.circle(SLIDE_W - 100, 100, 200, 'F');
  doc.circle(100, SLIDE_H - 100, 150, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Thin accent line at top
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(0, 0, SLIDE_W, 8, 'F');
}

function drawFooter(doc: jsPDF, branding: Branding, slideIndex: number, totalSlides: number) {
  const rgb = hexToRgb(branding.primaryColor);
  const isLight = slideIndex % 2 !== 0;
  const textColor = isLight ? [60, 60, 60] : [220, 220, 220];

  // Footer line
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(2);
  doc.line(PADDING, SLIDE_H - 100, SLIDE_W - PADDING, SLIDE_H - 100);

  // Author name
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(safeText(branding.authorName), PADDING, SLIDE_H - 65);

  // Author title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2], 0.7);
  doc.text(safeText(branding.authorTitle), PADDING, SLIDE_H - 38);

  // Slide number
  doc.setFontSize(18);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.text(
    `${slideIndex + 1} / ${totalSlides}`,
    SLIDE_W - PADDING,
    SLIDE_H - 50,
    { align: 'right' }
  );
}

function drawTitleSlide(doc: jsPDF, slide: Slide, branding: Branding, slideIndex: number, totalSlides: number) {
  drawBackground(doc, branding.primaryColor, slideIndex, totalSlides);

  const isLight = slideIndex % 2 !== 0;
  const textMain = isLight ? [30, 30, 30] : [255, 255, 255];
  const textSub = isLight ? [80, 80, 80] : [200, 200, 200];
  const rgb = hexToRgb(branding.primaryColor);

  const font = getFont(branding.fontName);

  // Decorative accent bar
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(PADDING, SLIDE_H * 0.35, 8, 80, 'F');

  // Main heading - large, centered
  const headingLines = wrapText(safeText(slide.heading), SLIDE_W - PADDING * 2 - 30, doc, 56);
  doc.setFontSize(56);
  doc.setFont(font.bold, 'bold');
  doc.setTextColor(textMain[0], textMain[1], textMain[2]);

  let yPos = SLIDE_H * 0.35 + 50;
  for (const line of headingLines.slice(0, 4)) {
    doc.text(line, PADDING + 30, yPos);
    yPos += 70;
  }

  // Body text (subtitle for title slide)
  if (slide.body) {
    yPos += 30;
    const bodyLines = wrapText(safeText(slide.body), SLIDE_W - PADDING * 2 - 30, doc, 26);
    doc.setFontSize(26);
    doc.setFont(font.normal, 'normal');
    doc.setTextColor(textSub[0], textSub[1], textSub[2]);
    for (const line of bodyLines.slice(0, 3)) {
      doc.text(line, PADDING + 30, yPos);
      yPos += 38;
    }
  }

  drawFooter(doc, branding, slideIndex, totalSlides);
}

function drawContentSlide(doc: jsPDF, slide: Slide, branding: Branding, slideIndex: number, totalSlides: number) {
  drawBackground(doc, branding.primaryColor, slideIndex, totalSlides);

  const isLight = slideIndex % 2 !== 0;
  const textMain = isLight ? [30, 30, 30] : [255, 255, 255];
  const textSub = isLight ? [70, 70, 70] : [210, 210, 210];
  const rgb = hexToRgb(branding.primaryColor);
  const font = getFont(branding.fontName);

  // Section number indicator
  const num = String(slideIndex + 1).padStart(2, '0');
  doc.setFontSize(100);
  doc.setFont(font.bold, 'bold');
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
  doc.text(num, SLIDE_W - PADDING - 20, 180, { align: 'right' });
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Heading
  const headingLines = wrapText(safeText(slide.heading), SLIDE_W - PADDING * 2, doc, 40);
  doc.setFontSize(40);
  doc.setFont(font.bold, 'bold');
  doc.setTextColor(textMain[0], textMain[1], textMain[2]);
  let yPos = 200;
  for (const line of headingLines.slice(0, 3)) {
    doc.text(line, PADDING, yPos);
    yPos += 52;
  }

  // Accent underline
  yPos += 10;
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(PADDING, yPos, 100, 5, 'F');
  yPos += 50;

  // Body content - as bullet points
  if (slide.body) {
    const sentences = slide.body.split(/[.\n]+/).filter((s) => s.trim());
    doc.setFontSize(24);
    doc.setFont(font.normal, 'normal');
    doc.setTextColor(textSub[0], textSub[1], textSub[2]);

    for (const sentence of sentences.slice(0, 6)) {
      if (yPos > SLIDE_H - 180) break;
      const trimmed = safeText(sentence.trim());
      if (!trimmed) continue;

      // Bullet dot
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.circle(PADDING + 10, yPos - 8, 5, 'F');

      // Text
      const bodyLines = wrapText(trimmed, SLIDE_W - PADDING * 2 - 40, doc, 24);
      for (const line of bodyLines.slice(0, 2)) {
        doc.text(line, PADDING + 35, yPos);
        yPos += 36;
      }
      yPos += 16;
    }
  }

  drawFooter(doc, branding, slideIndex, totalSlides);
}

function drawQuoteSlide(doc: jsPDF, slide: Slide, branding: Branding, slideIndex: number, totalSlides: number) {
  drawBackground(doc, branding.primaryColor, slideIndex, totalSlides);

  const isLight = slideIndex % 2 !== 0;
  const textMain = isLight ? [30, 30, 30] : [255, 255, 255];
  const textSub = isLight ? [100, 100, 100] : [180, 180, 180];
  const rgb = hexToRgb(branding.primaryColor);
  const font = getFont(branding.fontName);

  // Large decorative quote mark
  doc.setFontSize(300);
  doc.setFont('times', 'bold');
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.text('"', PADDING + 40, 320);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Heading (attribution)
  if (slide.heading) {
    doc.setFontSize(28);
    doc.setFont(font.bold, 'bold');
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(safeText(slide.heading), SLIDE_W - PADDING, 200, { align: 'right' });
  }

  // Quote text - centered, italic-style
  const quoteLines = wrapText(safeText(slide.body), SLIDE_W - PADDING * 2 - 60, doc, 34);
  doc.setFontSize(34);
  doc.setFont(font.italic, 'italic');
  doc.setTextColor(textMain[0], textMain[1], textMain[2]);

  let yPos = SLIDE_H * 0.45;
  for (const line of quoteLines.slice(0, 6)) {
    doc.text(line, PADDING + 60, yPos);
    yPos += 52;
  }

  // Bottom decorative line
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(PADDING + 60, yPos + 20, 200, 4, 'F');

  drawFooter(doc, branding, slideIndex, totalSlides);
}

function drawStatSlide(doc: jsPDF, slide: Slide, branding: Branding, slideIndex: number, totalSlides: number) {
  drawBackground(doc, branding.primaryColor, slideIndex, totalSlides);

  const isLight = slideIndex % 2 !== 0;
  const textMain = isLight ? [30, 30, 30] : [255, 255, 255];
  const textSub = isLight ? [80, 80, 80] : [200, 200, 200];
  const rgb = hexToRgb(branding.primaryColor);
  const font = getFont(branding.fontName);

  // Big number / stat in heading
  doc.setFontSize(140);
  doc.setFont(font.bold, 'bold');
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.text(safeText(slide.heading), SLIDE_W / 2, SLIDE_H * 0.38, { align: 'center' });

  // Underline
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(SLIDE_W / 2 - 100, SLIDE_H * 0.42, 200, 5, 'F');

  // Body text
  if (slide.body) {
    const bodyLines = wrapText(safeText(slide.body), SLIDE_W - PADDING * 2, doc, 28);
    doc.setFontSize(28);
    doc.setFont(font.normal, 'normal');
    doc.setTextColor(textSub[0], textSub[1], textSub[2]);

    let yPos = SLIDE_H * 0.48;
    for (const line of bodyLines.slice(0, 4)) {
      doc.text(line, SLIDE_W / 2, yPos, { align: 'center' });
      yPos += 42;
    }
  }

  drawFooter(doc, branding, slideIndex, totalSlides);
}

function drawCtaSlide(doc: jsPDF, slide: Slide, branding: Branding, slideIndex: number, totalSlides: number) {
  drawBackground(doc, branding.primaryColor, slideIndex, totalSlides);

  const isLight = slideIndex % 2 !== 0;
  const textMain = isLight ? [30, 30, 30] : [255, 255, 255];
  const white = [255, 255, 255];
  const rgb = hexToRgb(branding.primaryColor);
  const font = getFont(branding.fontName);

  // Heading
  const headingLines = wrapText(safeText(slide.heading), SLIDE_W - PADDING * 2, doc, 44);
  doc.setFontSize(44);
  doc.setFont(font.bold, 'bold');
  doc.setTextColor(textMain[0], textMain[1], textMain[2]);

  let yPos = SLIDE_H * 0.3;
  for (const line of headingLines.slice(0, 3)) {
    doc.text(line, SLIDE_W / 2, yPos, { align: 'center' });
    yPos += 60;
  }

  // CTA button-like element
  yPos += 50;
  const ctaText = slide.body || 'En savoir plus';
  const ctaLines = wrapText(safeText(ctaText), SLIDE_W - PADDING * 2 - 100, doc, 28);
  const btnText = ctaLines[0] || 'En savoir plus';
  const btnWidth = doc.getTextWidth(btnText) * 2.2 + 80;

  // Button background
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.roundedRect(
    (SLIDE_W - btnWidth) / 2,
    yPos - 30,
    btnWidth,
    70,
    15,
    15,
    'F'
  );

  // Button text
  doc.setFontSize(28);
  doc.setFont(font.bold, 'bold');
  doc.setTextColor(white[0], white[1], white[2]);
  doc.text(btnText, SLIDE_W / 2, yPos + 15, { align: 'center' });

  // Subtext below button
  if (ctaLines.length > 1) {
    doc.setFontSize(22);
    doc.setFont(font.normal, 'normal');
    doc.setTextColor(textMain[0], textMain[1], textMain[2], 0.6);
    for (let i = 1; i < ctaLines.length && i < 3; i++) {
      doc.text(ctaLines[i], SLIDE_W / 2, yPos + 60 + (i - 1) * 36, { align: 'center' });
    }
  }

  drawFooter(doc, branding, slideIndex, totalSlides);
}

// ============================================================
// Main slide dispatcher
// ============================================================

function renderSlide(
  doc: jsPDF,
  slide: Slide,
  branding: Branding,
  slideIndex: number,
  totalSlides: number
) {
  const type = slide.type || 'content';

  switch (type) {
    case 'title':
      drawTitleSlide(doc, slide, branding, slideIndex, totalSlides);
      break;
    case 'quote':
      drawQuoteSlide(doc, slide, branding, slideIndex, totalSlides);
      break;
    case 'stat':
      drawStatSlide(doc, slide, branding, slideIndex, totalSlides);
      break;
    case 'cta':
      drawCtaSlide(doc, slide, branding, slideIndex, totalSlides);
      break;
    case 'content':
    default:
      drawContentSlide(doc, slide, branding, slideIndex, totalSlides);
      break;
  }
}

// ============================================================
// POST handler
// ============================================================

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { slides, style, branding } = body as {
      slides: Slide[];
      style?: string;
      branding: Branding;
    };

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json({ error: 'Au moins une diapositive est requise' }, { status: 400 });
    }

    if (!branding || !branding.primaryColor || !branding.authorName) {
      return NextResponse.json({ error: 'Informations de branding requises' }, { status: 400 });
    }

    // Create PDF with custom page size (1200x1200 points ≈ square)
    const doc = new jsPDF({
      orientation: 'portrait' as const,
      unit: 'pt',
      format: [SLIDE_W, SLIDE_H],
      compress: true,
    });

    // Render each slide as a separate page
    for (let i = 0; i < slides.length; i++) {
      if (i > 0) {
        doc.addPage([SLIDE_W, SLIDE_H]);
      }
      renderSlide(doc, slides[i], branding, i, slides.length);
    }

    // Generate base64
    const base64 = doc.output('datauristring').split(',')[1];

    return NextResponse.json({
      success: true,
      base64,
      slideCount: slides.length,
      filename: `carousel-linkedin-${Date.now()}.pdf`,
    });
  } catch (error) {
    console.error('Carousel PDF generation error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
