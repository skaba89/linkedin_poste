import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';

// ============================================================
// POST — Export generated document to downloadable format
// ============================================================

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, format } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }
    if (!format || !['markdown', 'text'].includes(format)) {
      return NextResponse.json(
        { error: 'Format invalide : "markdown" ou "text"' },
        { status: 400 }
      );
    }

    // Sanitize filename
    const safeFilename = title
      .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80);

    if (format === 'markdown') {
      const filename = `${safeFilename}.md`;
      return NextResponse.json({
        content,
        filename,
        contentType: 'text/markdown; charset=utf-8',
      });
    }

    // Plain text: strip markdown formatting
    let textContent = content;

    // Convert markdown headings to uppercase text
    textContent = textContent.replace(/^#{1,6}\s+(.+)$/gm, (_, text) =>
      text.toUpperCase()
    );

    // Remove bold/italic markers
    textContent = textContent.replace(/\*\*(.+?)\*\*/g, '$1');
    textContent = textContent.replace(/\*(.+?)\*/g, '$1');
    textContent = textContent.replace(/_(.+?)_/g, '$1');

    // Remove links, keep text
    textContent = textContent.replace(/\[(.+?)\]\(.+?\)/g, '$1');

    // Remove image references
    textContent = textContent.replace(/!\[.*?\]\(.+?\)/g, '');

    // Remove horizontal rules
    textContent = textContent.replace(/^---+$/gm, '————————————————');

    const filename = `${safeFilename}.txt`;
    return NextResponse.json({
      content: textContent,
      filename,
      contentType: 'text/plain; charset=utf-8',
    });
  } catch (error) {
    console.error('Article export error:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'export du document" },
      { status: 500 }
    );
  }
}
