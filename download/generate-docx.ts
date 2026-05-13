import {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, TableOfContents, SectionType,
  Tab, TabStopPosition, TabStopType,
} from "docx";
import * as fs from "fs";

// ── Palette: DM-1 Deep Cyan (Tech / AI) ──
const P = {
  primary: "0A1628", body: "1A2B40", secondary: "6878A0",
  accent: "1B6B7A", surface: "EDF3F5",
  coverBg: "162235", coverTitle: "FFFFFF", coverSub: "B0B8C0",
  coverMeta: "90989F", coverFooter: "687078", coverAccent: "37DCF2",
  tableHeader: "1B6B7A", tableHeaderText: "FFFFFF",
  tableInner: "C8DDE2", tableSurface: "EDF3F5",
};
const c = (hex: string) => hex.replace("#", "");

// ── Borders ──
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ── Helper: calcTitleLayout ──
function calcTitleLayout(title: string, maxWidthTwips: number, preferredPt = 38, minPt = 24) {
  const charWidth = (pt: number) => pt * 20;
  const charsPerLine = (pt: number) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines: string[];
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title: string, charsPerLine: number): string[] {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([" ", "-", "/", ":", ";", ",", ".", "!", "?"]);
  const lines: string[] = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  return lines;
}

// ── Component builders ──
function heading1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, color: c(P.primary), font: { ascii: "Calibri" }, size: 32 })],
  });
}

function heading2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, color: c(P.accent), font: { ascii: "Calibri" }, size: 28 })],
  });
}

function heading3(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: c(P.body), font: { ascii: "Calibri" }, size: 24 })],
  });
}

function body(text: string) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 312 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri" } })],
  });
}

function bodyBold(label: string, text: string) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 312 },
    children: [
      new TextRun({ text: label, bold: true, size: 24, color: c(P.primary), font: { ascii: "Calibri" } }),
      new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri" } }),
    ],
  });
}

function spacer(h = 200) {
  return new Paragraph({ spacing: { before: h } });
}

function postContent(text: string) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 80, line: 300 },
    indent: { left: 360 },
    children: [new TextRun({ text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, italics: true })],
  });
}

function tableHeaderCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: P.tableHeader },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    borders: allNoBorders,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, color: P.tableHeaderText, font: { ascii: "Calibri" } })] })],
  });
}

function tableCell(text: string, width: number, shaded = false) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: shaded ? { type: ShadingType.CLEAR, fill: P.tableSurface } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    borders: {
      top: NB, left: NB, right: NB,
      bottom: { style: BorderStyle.SINGLE, size: 1, color: P.tableInner },
    },
    children: [new Paragraph({ children: [new TextRun({ text, size: 20, color: c(P.body), font: { ascii: "Calibri" } })] })],
  });
}

function tableCellBold(text: string, width: number, shaded = false) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: shaded ? { type: ShadingType.CLEAR, fill: P.tableSurface } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    borders: {
      top: NB, left: NB, right: NB,
      bottom: { style: BorderStyle.SINGLE, size: 1, color: P.tableInner },
    },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, color: c(P.primary), font: { ascii: "Calibri" } })] })],
  });
}

// ── Cover (R4 Top Color Block with DM-1) ──
function buildCover() {
  const { titlePt, titleLines } = calcTitleLayout("Planning de Contenu LinkedIn", 12000, 38, 24);
  const subtitlePt = 20;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    height: { value: 16838, rule: "exact" },
    borders: allNoBorders,
    rows: [
      new TableRow({
        height: { value: 16838, rule: "exact" },
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: P.coverBg },
            verticalAlign: "top",
            borders: allNoBorders,
            children: [
              new Paragraph({ spacing: { before: 3600 }, children: [] }),
              ...titleLines.map(line => new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 100, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
                indent: { left: 1200 },
                children: [new TextRun({ text: line, bold: true, size: titlePt * 2, color: P.coverTitle, font: { ascii: "Calibri" } })],
              })),
              new Paragraph({
                spacing: { before: 200, after: 200 },
                indent: { left: 1200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: P.coverAccent, space: 0 } },
                children: [new TextRun({ text: " ", size: 4 })],
              }),
              new Paragraph({
                spacing: { after: 100 },
                indent: { left: 1200 },
                children: [new TextRun({ text: "DataSphere Innovation", size: subtitlePt * 2, color: P.coverSub, font: { ascii: "Calibri" } })],
              }),
              new Paragraph({
                spacing: { after: 100 },
                indent: { left: 1200 },
                children: [new TextRun({ text: "Strat\u00e9gie \u00e9ditoriale mensuelle pour LinkedIn", size: subtitlePt * 2 - 4, color: P.coverMeta, font: { ascii: "Calibri" } })],
              }),
              new Paragraph({ spacing: { before: 600 }, children: [] }),
              new Paragraph({
                indent: { left: 1200 },
                children: [new TextRun({ text: "Mai 2026  |  8 posts  |  4 semaines", size: 18 * 2, color: P.coverMeta, font: { ascii: "Calibri" } })],
              }),
              new Paragraph({
                indent: { left: 1200 },
                children: [new TextRun({ text: "Niche : SaaS & Infrastructure IA", size: 18 * 2, color: P.coverMeta, font: { ascii: "Calibri" } })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ── Build calendar table ──
function buildCalendarRow(week: string, date: string, format: string, theme: string, obj: string, shaded: boolean) {
  return new TableRow({
    children: [
      tableCellBold(week, 10, shaded),
      tableCell(date, 14, shaded),
      tableCell(format, 16, shaded),
      tableCell(theme, 25, shaded),
      tableCell(obj, 25, shaded),
    ],
  });
}

// ── Post section builder ──
function buildPostSection(weekLabel: string, postNumber: number, meta: { date: string; heure: string; format: string; objectif: string; hashtags: string }, content: string[]) {
  const elements: any[] = [];
  elements.push(heading2(`Post ${postNumber} — ${weekLabel}`));
  elements.push(bodyBold("Date & heure : ", meta.date + " " + meta.heure));
  elements.push(bodyBold("Format : ", meta.format));
  elements.push(bodyBold("Objectif : ", meta.objectif));
  elements.push(spacer(100));
  elements.push(heading3("Contenu du post"));
  content.forEach(line => {
    elements.push(postContent(line));
  });
  elements.push(spacer(80));
  elements.push(bodyBold("Hashtags : ", meta.hashtags));
  elements.push(spacer(100));
  elements.push(new Paragraph({
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: P.tableInner, space: 10 } },
    children: [new TextRun({ text: " ", size: 4 })],
  }));
  return elements;
}

// ── Main document ──
async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: c(P.body) },
          paragraph: { spacing: { line: 312 } },
        },
        heading1: {
          run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: c(P.primary) },
        },
        heading2: {
          run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: c(P.accent) },
        },
        heading3: {
          run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 24, bold: true, color: c(P.body) },
        },
      },
    },
    sections: [
      // ── Cover Section ──
      {
        properties: {
          page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } },
        },
        children: [buildCover()],
      },
      // ── TOC Section ──
      {
        properties: {
          page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "DataSphere Innovation | Planning LinkedIn", size: 16, color: c(P.secondary), font: { ascii: "Calibri" }, italics: true })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) })],
            })],
          }),
        },
        children: [
          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: "Table des mati\u00e8res", bold: true, size: 36, color: c(P.primary), font: { ascii: "Calibri" } })],
          }),
          new TableOfContents("Table des mati\u00e8res", {
            hyperlink: true,
            headingStyleRange: "1-3",
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 200 },
            children: [new TextRun({ text: "Conseil : Faites un clic droit sur la table ci-dessus, puis s\u00e9lectionnez \u00ab Mettre \u00e0 jour les champs \u00bb pour afficher les num\u00e9ros de page corrects.", size: 18, color: c(P.secondary), italics: true, font: { ascii: "Calibri" } })],
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      },
      // ── Body Section ──
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "DataSphere Innovation | Planning LinkedIn", size: 16, color: c(P.secondary), font: { ascii: "Calibri" }, italics: true })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) })],
            })],
          }),
        },
        children: [
          // ═══════════ SECTION 1: Introduction ═══════════
          heading1("Strat\u00e9gie \u00e9ditoriale mensuelle"),
          body("Ce document pr\u00e9sente le planning de contenu LinkedIn complet pour DataSphere Innovation sur un mois. Il a \u00e9t\u00e9 con\u00e7u pour maximiser la visibilit\u00e9, g\u00e9n\u00e9rer de l\u2019engagement qualifi\u00e9 et positionner DataSphere Innovation comme r\u00e9f\u00e9rence dans le domaine du SaaS et de l\u2019infrastructure IA."),
          body("Chaque post est pr\u00eat \u00e0 \u00eatre publi\u00e9 directement sur LinkedIn. Le contenu est adapt\u00e9 au public cible B2B (DSI, CDO, PDG, d\u00e9cideurs) et refl\u00e8te l\u2019expertise technique et strat\u00e9gique de l\u2019entreprise. Les formats vari\u00e9s (thought leadership, listicle, storytelling, controverse, guide pratique) permettent d\u2019entretenir l\u2019int\u00e9r\u00eat de l\u2019audience tout au long du mois."),

          heading2("R\u00e8gles de publication"),
          body("Fr\u00e9quence : 2 posts par semaine (mardi et jeudi). Heure optimale : entre 8h00 et 9h30. R\u00e9pondre \u00e0 tous les commentaires dans les 2 premi\u00e8res heures. Ajouter le lien du site en premier commentaire apr\u00e8s publication. Ne jamais publier le week-end. Accompagner chaque post d\u2019une image ou infographie DataSphere Innovation."),

          heading2("Vue d\u2019ensemble du calendrier"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: allNoBorders,
            rows: [
              new TableRow({
                children: [
                  tableHeaderCell("Semaine", 10),
                  tableHeaderCell("Date", 14),
                  tableHeaderCell("Format", 16),
                  tableHeaderCell("Th\u00e8me", 25),
                  tableHeaderCell("Objectif", 25),
                ],
              }),
              buildCalendarRow("S1", "Mar 6 / Jeu 8", "Hybride / Donn\u00e9e choc", "Architecture Data + 15M$", "Engagement + Autorit\u00e9", false),
              buildCalendarRow("S2", "Mar 13 / Jeu 15", "Listicle / Controverse", "7 erreurs / Cloud seul", "Viralit\u00e9 + D\u00e9bat", true),
              buildCalendarRow("S3", "Mar 20 / Jeu 22", "Guide / Storytelling", "Framework 90j / Cas client", "Sauvegarde + Conversion", false),
              buildCalendarRow("S4", "Mar 27 / Jeu 29", "Expertise IA / Recrutement", "Piliers IA / R\u00e9tention talents", "Positionnement + Brand", true),
            ],
          }),

          // ═══════════ SECTION 2: Semaine 1 ═══════════
          heading1("Semaine 1 — Positionnement & Cr\u00e9dibilit\u00e9"),
          body("La premi\u00e8re semaine \u00e9tablit l\u2019autorit\u00e9 de DataSphere Innovation en combinant une prise de position forte avec des donn\u00e9es percutantes. L\u2019objectif est de capter l\u2019attention des d\u00e9cideurs en identifiant des probl\u00e9matiques qu\u2019ils rencontrent au quotidien."),

          ...buildPostSection("Semaine 1", 1, {
            date: "Mardi 6 mai 2026", heure: "8h30",
            format: "Hybride (Thought Leadership + Listicle + Storytelling)",
            objectif: "Engagement massif et positionnement expert",
            hashtags: "#DataStrategy #IntelligenceArtificielle #SaaS #DataArchitecture #TransformationDigitale #DataSphereInnovation",
          }, [
            "90% des entreprises investissent dans la data. Peu savent r\u00e9ellement ce que \u00e7a leur co\u00fbte.",
            "",
            "Apr\u00e8s avoir auditer plus de 50 \u00e9cosyst\u00e8mes cette ann\u00e9e, on retrouve toujours les m\u00eames patterns.",
            "Et ils sont co\u00fbteux. Tr\u00e8s co\u00fbteux.",
            "",
            "1. Vos KPIs sont incoh\u00e9rents d\u2019un d\u00e9partement \u00e0 l\u2019autre",
            "Parce que personne n\u2019a d\u00e9fini une gouvernance unique.",
            "",
            "2. Vos data scientists passent 80% de leur temps \u00e0 nettoyer au lieu d\u2019analyser",
            "Le talent le plus cher, gaspill\u00e9 sur des probl\u00e8mes d\u2019infrastructure.",
            "",
            "3. Chaque \u00e9quipe a son propre outil, son pipeline, sa propre \u00ab v\u00e9rit\u00e9 \u00bb",
            "La fragmentation est votre ennemi silencieux.",
            "",
            "4. Vos rapports n\u00e9cessitent encore des ajustements manuels",
            "En 2026, le manuel dans la data = dette technique accumul\u00e9e.",
            "",
            "5. Personne ne peut expliquer votre architecture de bout en bout",
            "Si la connaissance r\u00e9side dans une seule t\u00eate, c\u2019est un risque business.",
            "",
            "6. Vous investissez dans l\u2019IA sans donn\u00e9es gouvern\u00e9es",
            "R\u00e9sultat : du garbage in, garbage out \u00e0 l\u2019\u00e9chelle.",
            "",
            "7. Personne ne sait combien co\u00fbte votre stack data r\u00e9ellement",
            "Si vous ne pouvez pas le mesurer, vous ne pouvez pas l\u2019optimiser.",
            "",
            "Un PDG nous a dit il y a quelques mois :",
            "\u00ab On a investit 2M\u20ac dans la data. On ne d\u00e9cide toujours pas plus vite qu\u2019avant. \u00bb",
            "",
            "Ce n\u2019est pas un cas isol\u00e9.",
            "Le probl\u00e8me n\u2019est jamais l\u2019outil. C\u2019est la fondation.",
            "",
            "Notre approche ? Simple et structur\u00e9e :",
            "1. Auditer \u2014 Cartographier vos flux et identifier les frictions",
            "2. Concevoir \u2014 B\u00e2tir une architecture robuste et align\u00e9e",
            "3. D\u00e9ployer \u2014 Centraliser et s\u00e9curiser votre Data Platform",
            "4. Valoriser \u2014 Transformer vos donn\u00e9es en d\u00e9cisions et en performance",
            "",
            "4 mois plus tard :",
            "Reporting : de 5 jours \u00e0 temps r\u00e9el",
            "Conformit\u00e9 des donn\u00e9es : de 67% \u00e0 99.2%",
            "\u00c9conomies sur les licences redondantes : 180K\u20ac/an",
            "",
            "Avant d\u2019acheter le prochain outil trendy, assurez-vous que votre maison data tient debout.",
            "",
            "Combien de ces 7 signes vous concernent ? Dites-le en commentaire.",
          ]),

          ...buildPostSection("Semaine 1", 2, {
            date: "Jeudi 8 mai 2026", heure: "8h00",
            format: "Donn\u00e9e choc (One-stat hook)",
            objectif: "Viralit\u00e9 et partages massifs",
            hashtags: "#DataQuality #DataStrategy #ROI #SaaS #DataSphereInnovation #TransformationDigitale",
          }, [
            "Un chiffre devrait vous emp\u00eacher de dormir cette nuit.",
            "",
            "Selon Gartner, les entreprises perdent en moyenne 15 millions de dollars par an \u00e0 cause de la mauvaise qualit\u00e9 de leurs donn\u00e9es.",
            "",
            "Pas \u00e0 cause d\u2019un manque d\u2019outils.",
            "Pas \u00e0 cause d\u2019un manque de talent.",
            "Mais \u00e0 cause d\u2019un manque de fondation.",
            "",
            "Chez DataSphere Innovation, on a cartographi\u00e9 le probl\u00e8me :",
            "",
            "\u2192 35% du temps des \u00e9quipes data perdu en nettoyage",
            "\u2192 60% des projets data abandonn\u00e9s avant la production",
            "\u2192 3x plus de co\u00fbts quand l\u2019architecture est repens\u00e9e \u00e0 posteriori",
            "",
            "La bonne nouvelle ? Ce sont des co\u00fbts \u00e9vitables.",
            "La solution existe, elle est structur\u00e9e et elle a un nom :",
            "L\u2019architecture data unifi\u00e9e.",
            "",
            "Ce que nous faisons :",
            "1. On audite votre \u00e9cosyst\u00e8me existant",
            "2. On identifie les redondances et les failles",
            "3. On con\u00e7oit une architecture align\u00e9e avec vos objectifs business",
            "4. On d\u00e9ploie une plateforme centralis\u00e9e et gouvern\u00e9e",
            "5. On forme vos \u00e9quipes \u00e0 l\u2019autonomie",
            "",
            "Le prix de l\u2019inaction est connu.",
            "Le prix de l\u2019action est un investissement.",
            "",
            "Lequel pr\u00e9f\u00e9rez-vous ?",
          ]),

          // ═══════════ SECTION 3: Semaine 2 ═══════════
          heading1("Semaine 2 — Viralit\u00e9 & D\u00e9bat"),
          body("La deuxi\u00e8me semaine vise \u00e0 d\u00e9clencher des r\u00e9actions et des d\u00e9bats. Le listicle \u00e9ducatif favorise les sauvegardes et partages, tandis que le post controverse stimule les commentaires et propulse l\u2019algorithme LinkedIn."),

          ...buildPostSection("Semaine 2", 3, {
            date: "Mardi 13 mai 2026", heure: "8h15",
            format: "Listicle \u00e9ducatif (7 points)",
            objectif: "Sauvegardes massives et partages",
            hashtags: "#DataManagement #IntelligenceArtificielle #SaaS #InfrastructureIA #DataSphereInnovation",
          }, [
            "7 signes que votre infrastructure IA est un gouffre financier.",
            "",
            "Apr\u00e8s avoir auditer plus de 50 \u00e9cosyst\u00e8mes data cette ann\u00e9e, voici les red flags les plus fr\u00e9quents :",
            "",
            "1. Vos mod\u00e8les IA tournent sur des donn\u00e9es non gouvern\u00e9es",
            "R\u00e9sultat : du garbage in, garbage out \u00e0 l\u2019\u00e9chelle industrielle.",
            "",
            "2. Chaque \u00e9quipe a son propre pipeline, son propre outil, sa propre v\u00e9rit\u00e9",
            "La fragmentation co\u00fbte cher. Tr\u00e8s cher.",
            "",
            "3. Votre DSI ne sait pas exactement combien vous co\u00fbte votre stack IA",
            "Si vous ne pouvez pas le mesurer, vous ne pouvez pas l\u2019optimiser.",
            "",
            "4. Vos data scientists passent plus de temps \u00e0 chercher les donn\u00e9es qu\u2019\u00e0 les exploiter",
            "Le talent le plus cher de votre entreprise, gaspill\u00e9 sur des probl\u00e8mes d\u2019infrastructure.",
            "",
            "5. Vos rapports mensuels n\u00e9cessitent encore des ajustements manuels",
            "En 2026, le manuel dans la data = dette technique accumul\u00e9e.",
            "",
            "6. Vos concurrents publient des insights que vous n\u2019avez m\u00eame pas encore extraits",
            "Le d\u00e9lai entre la donn\u00e9e et la d\u00e9cision est votre ennemi n\u00b01.",
            "",
            "7. Personne dans l\u2019entreprise ne peut expliquer l\u2019architecture de bout en bout",
            "Si la connaissance est dans la t\u00eate d\u2019une seule personne, c\u2019est un risque business.",
            "",
            "Combien de ces signes vous concernent ?",
            "",
            "Chez DataSphere Innovation, on transforme ces probl\u00e9matiques en solutions structur\u00e9es : Audit, Architecture, Data Platform, BI et IA.",
            "",
            "Laissez un commentaire ou contactez-nous en MP pour un diagnostic de votre \u00e9cosyst\u00e8me.",
          ]),

          ...buildPostSection("Semaine 2", 4, {
            date: "Jeudi 15 mai 2026", heure: "9h00",
            format: "Controverse (Prise de position provocatrice)",
            objectif: "D\u00e9bat et commentaires",
            hashtags: "#CloudComputing #DataArchitecture #SaaS #CloudStrategy #DataSphereInnovation #IA",
          }, [
            "Le cloud seul ne sauvera pas votre strat\u00e9gie data.",
            "",
            "Je sais, c\u2019est provocateur \u00e0 dire en 2026.",
            "",
            "Mais apr\u00e8s des ann\u00e9es \u00e0 d\u00e9ployer des infrastructures cloud pour nos clients, voici ce qu\u2019on observe :",
            "",
            "L\u2019erreur n\u00b01 : migrer vers le cloud sans repenser l\u2019architecture",
            "D\u00e9placer un probl\u00e8me du on-premise vers AWS ou Azure ne le r\u00e9sout pas. Le co\u00fbte davantage.",
            "",
            "L\u2019erreur n\u00b02 : croire que le SaaS remplace la strat\u00e9gie",
            "Acheter 8 outils SaaS data ne fait pas une plateforme unifi\u00e9e. \u00c7a fait un zoo technologique.",
            "",
            "L\u2019erreur n\u00b03 : sous-estimer la gouvernance",
            "Le cloud donne un acc\u00e8s facile aux donn\u00e9es. Mais facile pour tout le monde = incontr\u00f4lable.",
            "",
            "Ce qui fonctionne vraiment :",
            "Une vision claire avant la technologie",
            "Une architecture pens\u00e9e pour l\u2019\u00e9volutivit\u00e9, pas pour le POC",
            "Une gouvernance qui responsabilise sans bloquer",
            "Des \u00e9quipes form\u00e9es et autonomes",
            "",
            "Le cloud est un outil puissant. Mais c\u2019est un moyen, pas une fin.",
            "",
            "Avant de signer votre prochain contrat cloud, posez-vous la bonne question :",
            "\u00ab Est-ce que cette migration r\u00e9sout un probl\u00e8me d\u2019architecture, ou est-ce qu\u2019elle en cr\u00e9e un nouveau ? \u00bb",
            "",
            "Pas d\u2019accord ? Dites-le en commentaire, le d\u00e9bat est ouvert.",
          ]),

          // ═══════════ SECTION 4: Semaine 3 ═══════════
          heading1("Semaine 3 — Valeur & Conversion"),
          body("La troisi\u00e8me semaine d\u00e9livre du contenu actionnable. Le guide pratique encourage les sauvegardes et positionne DataSphere Innovation comme une ressource de r\u00e9f\u00e9rence. Le storytelling avec r\u00e9sultats chiffr\u00e9s d\u00e9clenche la confiance et la conversion."),

          ...buildPostSection("Semaine 3", 5, {
            date: "Mardi 20 mai 2026", heure: "8h30",
            format: "Guide pratique (Framework structur\u00e9)",
            objectif: "Sauvegarde et autorit\u00e9",
            hashtags: "#DataStrategy #DataEngineering #BI #SaaS #TransformationDigitale #DataSphereInnovation",
          }, [
            "Comment passer d\u2019une strat\u00e9gie data floue \u00e0 une infrastructure qui produit des r\u00e9sultats en 90 jours.",
            "",
            "Voici le framework que nous utilisons chez DataSphere Innovation avec nos clients.",
            "",
            "JOUR 1-15 : DIAGNOSTIC",
            "- Cartographier toutes les sources de donn\u00e9es",
            "- Identifier les KPI critiques pour le business",
            "- Quantifier le co\u00fbt des probl\u00e8mes existants",
            "- Livrable : rapport d\u2019audit avec recommandations prioritaires",
            "",
            "JOUR 16-45 : ARCHITECTURE",
            "- Concevoir la cible (data model, pipelines, gouvernance)",
            "- Choisir la stack technologique adapt\u00e9e (pas la plus trendy, la plus pertinente)",
            "- Valider avec les parties prenantes m\u00e9tiers ET IT",
            "- Livrable : blueprint technique valid\u00e9",
            "",
            "JOUR 46-75 : D\u00c9PLOIEMENT",
            "- Impl\u00e9menter la Data Platform",
            "- Connecter les sources et fiabiliser les flux",
            "- Mettre en place la gouvernance et les acc\u00e8s",
            "- Livrable : plateforme op\u00e9rationnelle en production",
            "",
            "JOUR 76-90 : VALEUR",
            "- D\u00e9ployer les premiers cas d\u2019usage BI",
            "- Mesurer les premiers gains (temps, qualit\u00e9, co\u00fbt)",
            "- Former les \u00e9quipes \u00e0 l\u2019autonomie",
            "- Livrable : ROI document\u00e9 et roadmap des prochains cas d\u2019usage",
            "",
            "Le secret ? Ce n\u2019est pas la technologie qui fait le succ\u00e8s. C\u2019est la m\u00e9thode.",
            "",
            "Sauvegardez ce post pour votre prochain comit\u00e9 de direction.",
            "Et si vous voulez qu\u2019on adapte ce framework \u00e0 votre contexte, les MPs sont ouverts.",
          ]),

          ...buildPostSection("Semaine 3", 6, {
            date: "Jeudi 22 mai 2026", heure: "8h00",
            format: "Storytelling (Cas client anonymis\u00e9)",
            objectif: "Confiance et conversion",
            hashtags: "#DataTransformation #SaaS #IA #Cloud #DataSphereInnovation #DataPlatform",
          }, [
            "Il y a 6 mois, un PDG nous a dit : \u00ab On a investi 2M\u20ac dans la data. On ne sait toujours pas prendre une d\u00e9cision plus vite qu\u2019avant. \u00bb",
            "",
            "Ce n\u2019est pas un cas isol\u00e9.",
            "C\u2019est le sc\u00e9nario que nous rencontrons le plus souvent.",
            "",
            "Des entreprises qui investissent massivement dans les outils, les licences, les \u00e9quipes... sans jamais s\u2019attaquer au vrai probl\u00e8me.",
            "",
            "Le probl\u00e8me n\u2019est jamais l\u2019outil.",
            "C\u2019est la fondation.",
            "",
            "Ce PDG avait 12 outils data, 0 architecture unifi\u00e9e, et 3 v\u00e9rit\u00e9s diff\u00e9rentes pour le m\u00eame KPI.",
            "",
            "En 4 mois, nous avons :",
            "- Auditer l\u2019existant et cartographi\u00e9 les flux de donn\u00e9es",
            "- Con\u00e7u une architecture data unifi\u00e9e et gouvern\u00e9e",
            "- D\u00e9ploy\u00e9 une Data Platform centralis\u00e9e et s\u00e9curis\u00e9e",
            "- Connect\u00e9 les dashboards BI \u00e0 une source de v\u00e9rit\u00e9 unique",
            "",
            "R\u00e9sultat aujourd\u2019hui ?",
            "- D\u00e9lai de reporting : de 5 jours \u00e0 temps r\u00e9el",
            "- Conformit\u00e9 des donn\u00e9es : de 67% \u00e0 99.2%",
            "- \u00c9conomies annuelles sur les licences redondantes : 180K\u20ac",
            "",
            "Avant d\u2019acheter le prochain outil trendy, assurez-vous que votre maison data tient debout.",
            "",
            "Votre \u00e9cosyst\u00e8me data m\u00e9rite mieux qu\u2019un patchwork.",
          ]),

          // ═══════════ SECTION 5: Semaine 4 ═══════════
          heading1("Semaine 4 — Innovation & Marque"),
          body("La derni\u00e8re semaine consolide le positionnement sur l\u2019IA et renforce la marque employeur. Ces deux formats visent \u00e0 attirer aussi bien des prospects que des talents, tout en renfor\u00e7ant la cr\u00e9dibilit\u00e9 technique de DataSphere Innovation."),

          ...buildPostSection("Semaine 4", 7, {
            date: "Mardi 27 mai 2026", heure: "8h45",
            format: "Expertise IA (Prise de position strat\u00e9gique)",
            objectif: "Positionnement thought leader IA",
            hashtags: "#IntelligenceArtificielle #InfrastructureIA #SaaS #DataPlatform #DataSphereInnovation #GenAI",
          }, [
            "L\u2019IA g\u00e9n\u00e9rative dans l\u2019entreprise, ce n\u2019est pas une question de technology.",
            "C\u2019est une question d\u2019infrastructure.",
            "",
            "La plupart des entreprises veulent int\u00e9grer le LLM, RAG, les agents IA dans leurs processus m\u00e9tiers.",
            "",
            "Mais elles oublient l\u2019essentiel : sans une Data Platform solide, l\u2019IA ne fait que reproduire vos erreurs \u00e0 grande \u00e9chelle.",
            "",
            "On a identifi\u00e9 3 piliers que chaque entreprise doit ma\u00eetriser avant de d\u00e9ployer l\u2019IA :",
            "",
            "1. La qualit\u00e9 des donn\u00e9es",
            "Un mod\u00e8le IA ne vaut que ce qu\u2019il consomme. Garbage in, garbage out.",
            "",
            "2. La gouvernance et la s\u00e9curit\u00e9",
            "Donn\u00e9es sensibles, conformit\u00e9 RGPD, tra\u00e7abilit\u00e9. L\u2019IA sans garde-fous = risque juridique.",
            "",
            "3. L\u2019architecture scalable",
            "Un POC qui fonctionne en lab, c\u2019est bien. Un syst\u00e8me qui tient la charge en production, c\u2019est autre chose.",
            "",
            "Chez DataSphere Innovation, on ne vous vend pas un chatbot.",
            "On construit les fondations qui permettent \u00e0 l\u2019IA de cr\u00e9er de la valeur r\u00e9elle, durable et mesurable.",
            "",
            "De l\u2019audit \u00e0 la mise en production, en passant par l\u2019architecture et le d\u00e9ploiement.",
            "",
            "Vous \u00eates en r\u00e9flexion sur l\u2019IA dans votre organisation ?",
            "Parlons de vos enjeux en commentaire ou en MP.",
          ]),

          ...buildPostSection("Semaine 4", 8, {
            date: "Jeudi 29 mai 2026", heure: "9h00",
            format: "Culture & Recrutement (Employer branding)",
            objectif: "Attractivit\u00e9 talent et image de marque",
            hashtags: "#DataEngineering #TalentRetention #TechCulture #SaaS #DataSphereInnovation #DataTalent",
          }, [
            "Pourquoi les meilleurs data engineers quittent votre entreprise en moins de 18 mois.",
            "",
            "Ce n\u2019est pas le salaire. Ce n\u2019est pas le t\u00e9l\u00e9travail.",
            "C\u2019est l\u2019infrastructure.",
            "",
            "Imaginez-vous : Vous \u00eates un data engineer talentueux. Vous arrivez dans une entreprise motiv\u00e9 \u00e0 construire.",
            "",
            "Et l\u00e0 vous d\u00e9couvrez :",
            "- 15 sources de donn\u00e9es non document\u00e9es",
            "- 0 pipeline automatis\u00e9",
            "- Des acc\u00e8s manuels via des exports Excel",
            "- Un data lake qui ressemble plut\u00f4t \u00e0 un data marais",
            "- Personne ne comprend le legacy",
            "",
            "R\u00e9sultat ?",
            "Apr\u00e8s 6 mois, vous passez votre temps \u00e0 d\u00e9bugger au lieu d\u2019innover.",
            "Apr\u00e8s 12 mois, vous \u00eates frustr\u00e9.",
            "Apr\u00e8s 18 mois, vous d\u00e9missionnez.",
            "",
            "Ce cycle co\u00fbte cher. Tr\u00e8s cher.",
            "R\u00e9cup\u00e9ration : 3 mois. Onboarding : 6 mois. Productivit\u00e9 : 12 mois.",
            "Co\u00fbt total par d\u00e9part : entre 80K\u20ac et 150K\u20ac.",
            "",
            "La solution n\u2019est pas de mieux recruter.",
            "Elle est de mieux \u00e9quiper.",
            "",
            "Chez DataSphere Innovation, nous concevons des environnements data o\u00f9 les talents veulent rester.",
            "Des architectures claires. Des outils modernes. De la documentation accessible. De l\u2019autonomie.",
            "",
            "Parce que le meilleur investissement data, c\u2019est celui qui retient vos meilleurs talents.",
            "",
            "Si ce post r\u00e9sonne, partagez-le avec votre CTO.",
          ]),

          // ═══════════ SECTION 6: Bonnes pratiques ═══════════
          heading1("Bonnes pratiques & KPI"),
          heading2("KPI de suivi mensuel"),
          body("Pour mesurer l\u2019efficacit\u00e9 de votre strat\u00e9gie LinkedIn, suivez ces indicateurs cl\u00e9s chaque semaine. Comparez les r\u00e9sultats d\u2019un mois sur l\u2019autre pour identifier les formats et th\u00e8mes qui performent le mieux, puis ajustez le planning en cons\u00e9quence."),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: allNoBorders,
            rows: [
              new TableRow({ children: [tableHeaderCell("Indicateur", 30), tableHeaderCell("Objectif mensuel", 30), tableHeaderCell("M\u00e9thode de mesure", 40)] }),
              new TableRow({ children: [tableCellBold("Impressions", 30, false), tableCell("50 000+", 30, false), tableCell("Statistiques LinkedIn de la page", 40, false)] }),
              new TableRow({ children: [tableCellBold("Engagement rate", 30, true), tableCell("> 3%", 30, true), tableCell("(Likes + Comments + Shares) / Impressions", 40, true)] }),
              new TableRow({ children: [tableCellBold("Commentaires / post", 30, false), tableCell("> 15", 30, false), tableCell("Nombre moyen de commentaires re\u00e7us", 40, false)] }),
              new TableRow({ children: [tableCellBold("Sauvegardes", 30, true), tableCell("> 50 / mois", 30, true), tableCell("Nombre de sauvegardes du post", 40, true)] }),
              new TableRow({ children: [tableCellBold("Partages", 30, false), tableCell("> 20 / mois", 30, false), tableCell("Nombre total de partages", 40, false)] }),
              new TableRow({ children: [tableCellBold("Abonn\u00e9s page", 30, true), tableCell("+100 / mois", 30, true), tableCell("\u00c9volution du nombre d\u2019abonn\u00e9s", 40, true)] }),
            ],
          }),

          heading2("R\u00e8gles d\u2019or pour maximiser le reach"),
          body("Publiez toujours entre 8h00 et 9h30, l\u2019audience B2B \u00e9tant la plus active \u00e0 ce moment. R\u00e9pondez syst\u00e9matiquement \u00e0 chaque commentaire dans les 2 heures suivant la publication, car cela envoie un signal positif \u00e0 l\u2019algorithme LinkedIn et maintient l\u2019engagement. N\u2019ajoutez jamais un lien URL directement dans le corps du post ; pr\u00e9f\u00e9rez le placer dans le premier commentaire pour \u00e9viter la p\u00e9nalit\u00e9 de reach impos\u00e9e par LinkedIn aux posts avec liens externes. Accompagnez chaque post d\u2019une image ou infographie de DataSphere Innovation pour augmenter le taux d\u2019arr\u00eat dans le fil d\u2019actualit\u00e9. Ne publiez jamais le week-end, l\u2019audience B2B \u00e9tant quasi inexistante. Enfin, variez r\u00e9guli\u00e8rement les formats pour \u00e9viter la lassitude de l\u2019audience et maintenir un taux d\u2019engagement \u00e9lev\u00e9."),

          heading2("Biblioth\u00e8que de hashtags recommand\u00e9s"),
          body("Utilisez 3 \u00e0 5 hashtags par post, en alternant entre hashtags g\u00e9n\u00e9raux pour la port\u00e9e et hashtags de niche pour la qualit\u00e9 de l\u2019audience. Voici les hashtags les plus performants pour le secteur de DataSphere Innovation, class\u00e9s par cat\u00e9gorie."),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: allNoBorders,
            rows: [
              new TableRow({ children: [tableHeaderCell("Cat\u00e9gorie", 25), tableHeaderCell("Hashtags", 75)] }),
              new TableRow({ children: [tableCellBold("Data & Analytics", 25, false), tableCell("#DataStrategy #DataQuality #DataEngineering #DataArchitecture #DataGovernance #DataPlatform #BI #Analytics #DataTransformation #DataDriven", 75, false)] }),
              new TableRow({ children: [tableCellBold("IA & Innovation", 25, true), tableCell("#IntelligenceArtificielle #IA #MachineLearning #GenAI #RAG #InfrastructureIA #SaaS #CloudComputing #TransformationDigitale #Innovation", 75, true)] }),
              new TableRow({ children: [tableCellBold("Business B2B", 25, false), tableCell("#Leadership #Management #ROI #Productivit\u00e9 #DigitalTransformation #TechTalent #B2B #DecisionMaking #GrowthStrategy", 75, false)] }),
              new TableRow({ children: [tableCellBold("Marque", 25, true), tableCell("#DataSphereInnovation #DataManagement #SaaS #Cloud #S\u00e9curit\u00e9Informatique #D\u00e9veloppementSurMesure #Automatisation", 75, true)] }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("/home/z/my-project/download/DataSphere_Planning_Linkedin_Mai2026.docx", buffer);
  console.log("Document generated successfully!");
}

main().catch(console.error);
