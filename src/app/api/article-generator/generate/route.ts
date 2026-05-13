import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI, type AIMessage } from '@/lib/ai-providers';

// ============================================================
// Format-specific system prompts
// ============================================================

function getSystemPrompt(
  format: string,
  language: string,
  focusAreas: string[]
): string {
  const lang = language === 'en' ? 'en anglais' : 'en français';
  const focusInstruction =
    focusAreas.length > 0
      ? `\n\nDomaines de focus spécifiques : ${focusAreas.join(', ')}. Assure-toi de couvrir ces aspects en profondeur.`
      : '';

  const baseIntro = `Tu es un expert en analyse et synthèse de contenu professionnel pour LinkedIn. Tu génères des documents structurés de haute qualité à partir d'articles et de posts LinkedIn.

Règles :
- Tout le contenu doit être rédigé ${lang}
- Utilise le format Markdown pour structurer le document (titres ##, sous-titres ###, listes, **gras**, etc.)
- Sois précis, factuel et actionnable
- Inclus des exemples concrets quand c'est pertinent
- Le document doit être auto-suffisant et compréhensible sans l'article source
- Ajoute un titre principal (# ) au début du document`;

  switch (format) {
    case 'summary':
      return `${baseIntro}

Tu dois produire un **Résumé structuré** avec les sections suivantes :

## 📌 Résumé exécutif
Un paragraphe synthétique (3-4 phrases) capturant l'essence du contenu.

## 🔑 Points clés
5-8 points clés numérotés, chacun avec une courte explication (1-2 phrases).

## 💡 Citations marquantes
Extrais 2-3 phrases ou citations notables du contenu source.

## 🎯 Takeaways pour l'action
3-5 recommandations concrètes tirées du contenu.

## 📊 Contexte et chiffres clés
Résume les données chiffrées, statistiques ou tendances mentionnées.
${focusInstruction}`;

    case 'analysis':
      return `${baseIntro}

Tu dois produire une **Analyse critique** avec les sections suivantes :

## 📋 Vue d'ensemble
Résumé du contenu et de son contexte (2-3 paragraphes).

## ✅ Forces et atouts
4-6 points forts identifiés dans l'approche ou le contenu, avec explications.

## ⚠️ Faiblesses et limites
3-5 points faibles, lacunes ou biais potentiels identifiés.

## 🚀 Opportunités
3-5 opportunités d'application ou d'amélioration identifiées à partir du contenu.

## 🎭 Perspectives critiques
Une analyse nuancée avec des contre-arguments ou des points de vue alternatifs.

## 📈 Score de pertinence
Donne un score de 1 à 10 avec justification pour : Pertinence professionnelle, Qualité des arguments, Applicabilité pratique.
${focusInstruction}`;

    case 'fiche_technique':
      return `${baseIntro}

Tu dois produire une **Fiche Technique** structurée avec les sections suivantes :

## 🏷️ Identification
Titre, auteur/porteur, contexte de publication, domaine.

## 🧠 Concepts clés
Liste et définition des concepts principaux abordés (4-8 concepts).

## 🛠️ Technologies et outils
Liste des technologies, plateformes, outils ou méthodes mentionnés avec descriptions.

## 🏗️ Architecture / Structure
Description de l'architecture technique, processus ou framework présenté. Utilise des diagrammes textuels si pertinent.

## 📐 Méthodologie
Approches, frameworks ou méthodologies recommandées.

## 🔗 Ressources associées
Liens, références ou ressources complémentaires mentionnées ou suggérées.

## 📝 Glossaire
Définitions des termes techniques spécifiques utilisés.
${focusInstruction}`;

    case 'synthese':
      return `${baseIntro}

Tu dois produire une **Synthèse exécutive** avec les sections suivantes :

## 📊 Vue d'ensemble stratégique
Synthèse en 2-3 paragraphes positionnant le contenu dans son marché/contexte.

## 🎯 Messages centraux
Les 3-5 messages principaux du contenu, formulés clairement.

## 📈 Implications business
Impact sur le business, l'industrie ou la pratique professionnelle.

## 💼 Recommandations stratégiques
4-6 recommandations actionnables pour les décideurs, classées par priorité.

## ⏡ Feuille de route suggérée
Plan d'action en 3 phases (court, moyen, long terme) basé sur les insights du contenu.

## 🏁 Conclusion
Une conclusion percutante avec une perspective d'avenir.
${focusInstruction}`;

    case 'guide_action':
      return `${baseIntro}

Tu dois produire un **Guide d'Action** avec les sections suivantes :

## 🎯 Objectif du guide
Ce que le lecteur sera capable de faire après avoir suivi ce guide.

## ✅ Prérequis
Connaissances, outils ou ressources nécessaires avant de commencer.

## 📋 Étapes détaillées
Un plan d'action étape par étape (8-15 étapes), chaque étape avec :
- Un titre clair
- La description de l'action
- Les outils/méthodes à utiliser
- Les pièges à éviter
- Un exemple concret si pertinent

## ⚡ Quick Wins
3-5 actions rapides avec impact immédiat identifiées dans le contenu.

## 🧰 Boîte à outils
Liste des outils, templates ou ressources mentionnés ou recommandés.

## 📊 Indicateurs de succès
Comment mesurer le succès de chaque étape / de l'ensemble.

## ❓ FAQ
3-5 questions fréquentes avec réponses basées sur le contenu.
${focusInstruction}`;

    default:
      return `${baseIntro}

Produis un document structuré et informatif en Markdown à partir du contenu fourni.
${focusInstruction}`;
  }
}

function getFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    summary: 'Résumé',
    analysis: 'Analyse critique',
    fiche_technique: 'Fiche technique',
    synthese: 'Synthèse exécutive',
    guide_action: "Guide d'action",
  };
  return labels[format] || format;
}

// ============================================================
// POST — Generate document from article content
// ============================================================

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { source, url, content, format, language = 'fr', focusAreas = [] } = body;

    // Validate source
    if (!source || !['url', 'text'].includes(source)) {
      return NextResponse.json(
        { error: 'Source invalide : "url" ou "text" requis' },
        { status: 400 }
      );
    }

    // Validate format
    if (
      !format ||
      !['summary', 'analysis', 'fiche_technique', 'synthese', 'guide_action'].includes(format)
    ) {
      return NextResponse.json(
        { error: 'Format invalide : summary, analysis, fiche_technique, synthese ou guide_action' },
        { status: 400 }
      );
    }

    // Get article content
    let articleContent = '';

    if (source === 'url') {
      if (!url) {
        return NextResponse.json({ error: 'URL requise quand source est "url"' }, { status: 400 });
      }

      try {
        // Try direct fetch first
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; DataSphereBot/1.0; +https://datasphere.app)',
            Accept: 'text/html,application/xhtml+xml,text/plain',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          return NextResponse.json(
            { error: `Impossible de récupérer l'URL (HTTP ${response.status})` },
            { status: 400 }
          );
        }

        const html = await response.text();

        // Basic HTML to text extraction
        articleContent = htmlToText(html);

        if (articleContent.length < 100) {
          return NextResponse.json(
            { error: "Le contenu de l'URL est trop court ou vide" },
            { status: 400 }
          );
        }
      } catch (fetchError) {
        console.error('URL fetch error:', fetchError);
        return NextResponse.json(
          { error: "Impossible d'accéder à l'URL. Vérifiez qu'elle est accessible publiquement." },
          { status: 400 }
        );
      }
    } else {
      if (!content || typeof content !== 'string' || content.trim().length < 50) {
        return NextResponse.json(
          { error: 'Contenu texte requis (minimum 50 caractères)' },
          { status: 400 }
        );
      }
      articleContent = content.trim();
    }

    // Truncate very long content to avoid token limits
    const maxContentLength = 12000;
    if (articleContent.length > maxContentLength) {
      articleContent =
        articleContent.slice(0, maxContentLength) +
        '\n\n[... contenu tronqué pour respecter les limites de traitement ...]';
    }

    // Build AI prompt
    const systemPrompt = getSystemPrompt(format, language, focusAreas);

    const userPrompt = `Voici le contenu de l'article/post LinkedIn à analyser :

---
${articleContent}
---

Génère un document structuré de type "${getFormatLabel(format)}" à partir de ce contenu.`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Generate the document
    const startTime = Date.now();
    const document = await callAI(messages, {
      temperature: 0.5,
      maxTokens: 3000,
    });
    const generationTimeMs = Date.now() - startTime;

    // Extract title from document (first # heading)
    const titleMatch = document.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Document — ${getFormatLabel(format)}`;

    // Word count
    const wordCount = document.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({
      document,
      title,
      format,
      wordCount,
      generationTimeMs,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Article generator error:', error);
    const message =
      error instanceof Error ? error.message : 'Erreur lors de la génération du document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// HTML to Text extraction (basic but functional)
// ============================================================

function htmlToText(html: string): string {
  let text = html;

  // Remove script and style tags with content
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Convert common block elements to newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|pre|hr)[^>]*>/gi, '\n');

  // Convert list items to bullet points
  text = text.replace(/<li[^>]*>/gi, '• ');

  // Convert links: keep text content
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#039;/g, "'");
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&lsquo;/g, "'");
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&ldquo;/g, '"');
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&ndash;/g, '–');
  text = text.replace(/&hellip;/g, '…');

  // Clean up whitespace
  text = text.replace(/\t/g, ' ');
  text = text.replace(/[ ]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  // Remove LinkedIn-specific noise
  text = text.replace(/Reactiver le JavaScript.*$/gis, '');
  text = text.replace(/LinkedIn.*$/gim, '');
  text = text.replace(/Vous utilisez LinkedIn.*$/gim, '');

  return text.trim();
}
