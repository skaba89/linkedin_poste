#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LinkedInPost V2 - Architecture Document Generator
Comprehensive V2 design document for the Content Operations Platform
"""

import sys
import os
import hashlib

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, CondPageBreak, Image
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import SimpleDocTemplate

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FONT REGISTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSCBold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSCBold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSC')
registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# Font fallback for mixed language
sys.path.insert(0, '/home/z/my-project/skills/pdf/scripts')
try:
    from pdf import install_font_fallback
    install_font_fallback()
except:
    pass

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COLOR PALETTE (auto-generated)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCENT = colors.HexColor('#197999')
TEXT_PRIMARY = colors.HexColor('#1c1e20')
TEXT_MUTED = colors.HexColor('#7a7f86')
BG_SURFACE = colors.HexColor('#e0e4e9')
BG_PAGE = colors.HexColor('#f2f3f5')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = BG_SURFACE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOCUMENT SETTINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.8 * cm
RIGHT_MARGIN = 1.8 * cm
TOP_MARGIN = 2.0 * cm
BOTTOM_MARGIN = 2.0 * cm
CONTENT_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

OUTPUT_PATH = '/home/z/my-project/download/LinkedInPost_V2_Architecture.pdf'

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STYLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cover_title_style = ParagraphStyle(
    name='CoverTitle', fontName='Carlito', fontSize=36,
    leading=44, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    spaceAfter=12
)
cover_subtitle_style = ParagraphStyle(
    name='CoverSubtitle', fontName='Carlito', fontSize=16,
    leading=22, textColor=TEXT_MUTED, alignment=TA_LEFT,
    spaceAfter=6
)
cover_meta_style = ParagraphStyle(
    name='CoverMeta', fontName='Carlito', fontSize=11,
    leading=16, textColor=TEXT_MUTED, alignment=TA_LEFT,
)

h1_style = ParagraphStyle(
    name='H1', fontName='Carlito', fontSize=22,
    leading=28, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    spaceBefore=18, spaceAfter=10,
)
h2_style = ParagraphStyle(
    name='H2', fontName='Carlito', fontSize=16,
    leading=22, textColor=ACCENT, alignment=TA_LEFT,
    spaceBefore=14, spaceAfter=8,
)
h3_style = ParagraphStyle(
    name='H3', fontName='Carlito', fontSize=13,
    leading=18, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    spaceBefore=10, spaceAfter=6,
)
body_style = ParagraphStyle(
    name='Body', fontName='Carlito', fontSize=10.5,
    leading=17, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    spaceBefore=0, spaceAfter=6, wordWrap='CJK',
)
bullet_style = ParagraphStyle(
    name='Bullet', fontName='Carlito', fontSize=10.5,
    leading=17, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    leftIndent=20, bulletIndent=8, spaceBefore=2, spaceAfter=2,
)
code_style = ParagraphStyle(
    name='Code', fontName='DejaVuSans', fontSize=8.5,
    leading=13, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    backColor=colors.HexColor('#f5f5f5'),
    leftIndent=12, rightIndent=12,
    spaceBefore=6, spaceAfter=6,
    borderWidth=0.5, borderColor=TEXT_MUTED, borderPadding=6,
)
caption_style = ParagraphStyle(
    name='Caption', fontName='Carlito', fontSize=9,
    leading=13, textColor=TEXT_MUTED, alignment=TA_CENTER,
    spaceBefore=3, spaceAfter=6,
)
header_cell_style = ParagraphStyle(
    name='HeaderCell', fontName='Carlito', fontSize=9.5,
    leading=13, textColor=colors.white, alignment=TA_CENTER,
)
cell_style = ParagraphStyle(
    name='Cell', fontName='Carlito', fontSize=9,
    leading=13, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    wordWrap='CJK',
)
cell_center_style = ParagraphStyle(
    name='CellCenter', fontName='Carlito', fontSize=9,
    leading=13, textColor=TEXT_PRIMARY, alignment=TA_CENTER,
)

toc_h1_style = ParagraphStyle(
    name='TOCH1', fontName='Carlito', fontSize=13,
    leading=20, leftIndent=20, textColor=TEXT_PRIMARY,
)
toc_h2_style = ParagraphStyle(
    name='TOCH2', fontName='Carlito', fontSize=11,
    leading=18, leftIndent=40, textColor=TEXT_MUTED,
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPER FUNCTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def h1(text):
    return Paragraph(f'<b>{text}</b>', h1_style)

def h2(text):
    return Paragraph(f'<b>{text}</b>', h2_style)

def h3(text):
    return Paragraph(f'<b>{text}</b>', h3_style)

def p(text):
    return Paragraph(text, body_style)

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', bullet_style)

def code(text):
    return Paragraph(text, code_style)

def caption(text):
    return Paragraph(text, caption_style)

def spacer(h=12):
    return Spacer(1, h)

def make_table(headers, rows, col_widths=None):
    """Create a styled table with header and alternating rows."""
    data = []
    header_row = [Paragraph(f'<b>{h}</b>', header_cell_style) for h in headers]
    data.append(header_row)
    for row in rows:
        data.append([Paragraph(str(c), cell_style) for c in row])

    if col_widths is None:
        col_widths = [CONTENT_W / len(headers)] * len(headers)

    table = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    table.setStyle(TableStyle(style_cmds))
    return table

MAX_KEEP_HEIGHT = A4[1] * 0.4

def safe_keep(elements):
    total_h = 0
    for el in elements:
        w, h = el.wrap(CONTENT_W, A4[1])
        total_h += h
    if total_h <= MAX_KEEP_HEIGHT:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    else:
        return list(elements)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOC TEMPLATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    par = Paragraph(f'<a name="{key}"/>{text}', style)
    par.bookmark_name = text
    par.bookmark_level = level
    par.bookmark_text = text.replace('<b>', '').replace('</b>', '')
    par.bookmark_key = key
    return par

H1_ORPHAN_THRESHOLD = A4[1] * 0.15

def add_major_section(text):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(f'<b>{text}</b>', h1_style, level=0),
    ]

def add_subsection(text):
    return [
        spacer(10),
        add_heading(f'<b>{text}</b>', h2_style, level=1),
    ]

def add_sub3(text):
    return [
        spacer(6),
        add_heading(f'<b>{text}</b>', h3_style, level=1),
    ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOCUMENT CONTENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def build_document():
    story = []

    # ── COVER ──
    story.append(Spacer(1, 120))
    story.append(Paragraph('<b>LinkedInPost V2</b>', cover_title_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        'Plateforme de Content Operations<br/>et Social Publishing assiste par IA',
        cover_subtitle_style
    ))
    story.append(Spacer(1, 30))
    # Decorative line
    line_table = Table([['']], colWidths=[120], rowHeights=[3])
    line_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(line_table)
    story.append(Spacer(1, 30))
    story.append(Paragraph('Document d\'architecture technique - Version 2.0', cover_meta_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Stack : Next.js 16 + React 19 + Prisma + PostgreSQL', cover_meta_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Mai 2026', cover_meta_style))
    story.append(PageBreak())

    # ── TABLE OF CONTENTS ──
    story.append(Paragraph('<b>Table des matieres</b>', ParagraphStyle(
        name='TOCTitle', fontName='Carlito', fontSize=20,
        leading=26, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
        spaceAfter=18
    )))
    toc = TableOfContents()
    toc.levelStyles = [toc_h1_style, toc_h2_style]
    story.append(toc)
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════
    # 1. VISION V2
    # ════════════════════════════════════════════════════════════
    story.extend(add_major_section('1. Vision V2'))

    story.append(p(
        'La V1 de LinkedInPost a demontre la faisabilite d\'un mini SaaS interne de gestion de posts LinkedIn avec '
        'generation IA, validation humaine et publication directe. La V2 vise a transformer cet outil en une plateforme '
        'complete de <b>Content Operations</b> et de <b>Social Publishing</b> assistee par IA, capable de gerer l\'ensemble '
        'du cycle de vie editorial d\'une organisation, du brainstorming initial a la publication multi-reseaux, en passant '
        'par la creation de contenu enrichi (carrousels, scripts video, visuels) et le suivi analytique des performances.'
    ))
    story.append(p(
        'L\'objectif stratgique est de passer d\'un outil de publication simple a un veritable hub centralise de gestion '
        'editoriale. Les equipes marketing et communication pourront planifier, creer, valider, programmer et publier du '
        'contenu sur plusieurs reseaux sociaux depuis une interface unique, tout en beneficiannt de l\'assistance IA pour '
        'la creation, l\'optimisation et l\'analyse des performances. La plateforme integrera des concepts de gouvernance '
        'avancee avec des workflows multi-approbateurs, une gestion multi-marques et multi-pages, ainsi qu\'un systeme '
        'de monitoring et d\'industrialisation robuste pour garantir la fiabilite en production.'
    ))
    story.append(p(
        'Cette evolution s\'inscrit dans une logique de produit scalable, ou chaque module est concu pour fonctionner '
        'de maniere autonome tout en s\'integrant dans un ecosysteme coherent. L\'architecture doit permettre l\'ajout '
        'progressif de fonctionnalites sans remettre en cause l\'existant, et la migration depuis la V1 doit se faire '
        'de maniere transparente pour les utilisateurs existants.'
    ))

    story.extend(add_subsection('1.1 Objectifs strategiques'))
    story.append(bullet('Centraliser toute la gestion editorial dans une plateforme unique'))
    story.append(bullet('Automatiser la creation de contenu grace a une IA multi-fournisseur'))
    story.append(bullet('Industrialiser le processus de validation et de publication'))
    story.append(bullet('Permettre la gestion multi-marques et multi-pages LinkedIn'))
    story.append(bullet('Preparer l\'extension multi-reseaux (X/Twitter, Facebook, Instagram, Threads)'))
    story.append(bullet('Offrir une vision analytique complete des performances de publication'))
    story.append(bullet('Garantir la gouvernance, la securite et la tracabilite des actions'))

    story.extend(add_subsection('1.2 Principes directeurs'))
    story.append(p(
        '<b>Incrementalisme maitrise :</b> Chaque fonctionnalite V2 est un module autonome qui peut etre active '
        'independamment. L\'existant V1 ne doit jamais etre casse par un ajout. Les migrations de base de donnees '
        'sont reversibles et les anciennes donnees sont preservees integralement.'
    ))
    story.append(p(
        '<b>API-first :</b> Toute fonctionnalite est exposee via une API REST clairement documentee. Le frontend '
        'consomme exclusivement ces API, ce qui facilite les tests, le versioning et la future mise en place '
        'd\'applications mobiles ou d\'integrations tierces.'
    ))
    story.append(p(
        '<b>Experience utilisateur premium :</b> L\'interface doit etre intuitive, reactive et coherente. Le '
        'dark mode est supporte nativement. Les interactions sont fluides grace a des optimisations de '
        'performance (server components, streaming, optimistic updates).'
    ))
    story.append(p(
        '<b>Securite et conformite :</b> Les tokens OAuth sont chiffres en base de donnees, les acces sont '
        'journalises, les roles sont fins et les actions sensibles necessitent une re-authentification. La '
        'plateforme est prete pour un audit de securite externe.'
    ))

    # ════════════════════════════════════════════════════════════
    # 2. ARCHITECTURE TECHNIQUE V2
    # ════════════════════════════════════════════════════════════
    story.extend(add_major_section('2. Architecture technique V2'))

    story.append(p(
        'L\'architecture V2 conserve le monolithe modulaire de la V1 (Next.js App Router) mais introduit des '
        'couches de services dediees pour chaque domaine fonctionnel. Ce choix architectural privilegie la simplicite '
        'de deploiement tout en preparant une future extraction en microservices si le trafic l\'exige. Le schema '
        'suivant presente la vue d\'ensemble des couches techniques de la plateforme.'
    ))

    story.extend(add_subsection('2.1 Stack technique'))
    story.append(p(
        'Le choix technologique reste coherent avec la V1, avec des evolutions ciblees pour repondre aux besoins '
        'de scalabilite et de robustesse requis par la V2. Les principaux changements concernent la migration de '
        'SQLite vers PostgreSQL pour la production, l\'ajout d\'un scheduler pour les publications differees, et '
        'l\'introduction d\'un systeme de files de messages pour les notifications asynchrones.'
    ))

    stack_data = [
        ['Couche', 'Technologie V1', 'Technologie V2', 'Raison du changement'],
        ['Framework', 'Next.js 16 App Router', 'Next.js 16 App Router', 'Continuite, RSC matures'],
        ['Base de donnees', 'SQLite (Prisma)', 'PostgreSQL (Prisma)', 'Scalabilite, concurrency'],
        ['ORM', 'Prisma 6', 'Prisma 6+', 'Requetes complexes, migrations'],
        ['Authentification', 'JWT (jose)', 'JWT (jose) + refresh', 'Securite renforcee'],
        ['Etat frontend', 'Zustand', 'Zustand + TanStack Query', 'Cache serveur, optimistic UI'],
        ['UI', 'shadcn/ui + Tailwind 4', 'shadcn/ui + Tailwind 4', 'Continuite'],
        ['Scheduler', 'Aucun', 'BullMQ + Redis', 'Publications differees, cron'],
        ['Stockage fichiers', 'Aucun', 'S3-compatible (MinIO)', 'Medias, exports'],
        ['Notifications', 'Aucun', 'Email (Resend) + Slack Webhook', 'Alertes, rappels'],
        ['Drag and Drop', 'dnd-kit', 'dnd-kit + calendar lib', 'Calendrier editorial'],
        ['Charts', 'Recharts', 'Recharts + Visx', 'Analytics avances'],
    ]
    cw = [CONTENT_W * r for r in [0.18, 0.22, 0.26, 0.34]]
    story.append(spacer(12))
    story.append(make_table(stack_data[0], stack_data[1:], cw))
    story.append(caption('Tableau 1 - Comparaison des stacks techniques V1 vs V2'))

    story.extend(add_subsection('2.2 Architecture en couches'))

    story.append(p(
        'L\'architecture V2 s\'organise en quatre couches principales, chacune responsable d\'un domaine fonctionnel '
        'distinct. Cette separation permet une evolution independante des modules et facilite les tests unitaires et '
        'd\'integration. La couche de presentation gere l\'interface utilisateur et les interactions. La couche API '
        'expose les endpoints REST et gere l\'authentification. La couche service encapsule la logique metier. La couche '
        'donnees gere l\'acces aux donnees via Prisma et le systeme de fichiers.'
    ))

    layers_data = [
        ['Couche', 'Composants', 'Responsabilites'],
        ['Presentation', 'React Components, Zustand, TanStack Query',
         'Rendu UI, gestion d\'etat client, cache, drag and drop, calendrier'],
        ['API Routes', 'Next.js App Router API handlers',
         'Authentification, validation entrees, orchestration services'],
        ['Services', 'AI Service, Publishing Service, Analytics Service, Notification Service',
         'Logique metier, appels IA, publication reseaux, calculs analytics'],
        ['Donnees', 'Prisma Client, PostgreSQL, S3/MinIO, Redis',
         'Persistance, requetes, stockage fichiers, file de messages'],
    ]
    cw2 = [CONTENT_W * r for r in [0.15, 0.40, 0.45]]
    story.append(spacer(12))
    story.append(make_table(layers_data[0], layers_data[1:], cw2))
    story.append(caption('Tableau 2 - Architecture en couches de la V2'))

    story.extend(add_subsection('2.3 Diagramme d\'architecture globale'))

    story.append(p(
        'Le schema ci-dessous presente le flux de donnees principal de la plateforme, depuis la creation d\'un post '
        'jusqu\'a sa publication sur les reseaux sociaux. Chaque bloc represente un module fonctionnel qui communique '
        'avec les autres via des appels de fonction internes (dans le cadre du monolithe) ou via des API REST. '
        'Les flux asyncrones (notifications, publications differees) passent par le scheduler BullMQ.'
    ))

    # Architecture diagram as a table-based visual
    arch_flow = [
        ['Utilisateur', 'Interface Web', 'API Routes', 'Services Metier', 'Base de donnees + S3'],
        ['Createur', 'Formulaire post', 'POST /api/posts', 'PostService.create()', 'Post, AIVariant'],
        ['Editeur', 'Calendrier drag/drop', 'PUT /api/posts/:id/schedule', 'SchedulerService.schedule()', 'Redis (BullMQ)'],
        ['IA', 'Onglet generation', 'POST /api/posts/:id/generate', 'AIService.generate()', 'AIVariant, PromptTemplate'],
        ['Validateur', 'Workflow approbation', 'POST /api/posts/:id/validate', 'ValidationService.validate()', 'ValidationStep, AuditLog'],
        ['Admin', 'Dashboard analytics', 'GET /api/analytics', 'AnalyticsService.compute()', 'Post, PublicationLog agr.'],
        ['Systeme', 'Publication auto', 'BullMQ worker', 'PublishingService.publish()', 'SocialAccount, PubLog'],
        ['Systeme', 'Notification', 'BullMQ worker', 'NotificationService.send()', 'Notification, EmailLog'],
    ]
    cw3 = [CONTENT_W * r for r in [0.14, 0.18, 0.22, 0.24, 0.22]]
    story.append(spacer(12))
    story.append(make_table(arch_flow[0], arch_flow[1:], cw3))
    story.append(caption('Tableau 3 - Flux de donnees principal de la plateforme V2'))

    story.extend(add_subsection('2.4 Gestion des environnements'))
    story.append(p(
        'La V2 introduit une gestion fine des environnements avec configuration par variable d\'environnement. '
        'Trois environnements sont supportes : development (local), staging (pre-production) et production. Chaque '
        'environnement dispose de sa propre base de donnees PostgreSQL, de son bucket S3 et de ses tokens OAuth. '
        'Les variables sensibles (JWT_SECRET, API_KEYS, DB_URL) sont gerees via un vault ou un service de secrets '
        'et ne sont jamais commitees dans le depot de code.'
    ))
    env_data = [
        ['Variable', 'Description', 'Exemple'],
        ['DATABASE_URL', 'URL de connexion PostgreSQL', 'postgresql://user:pass@host:5432/db'],
        ['REDIS_URL', 'URL de connexion Redis', 'redis://host:6379'],
        ['S3_ENDPOINT', 'Endpoint S3-compatible', 'https://s3.amazonaws.com'],
        ['JWT_SECRET', 'Cle de signature JWT', '256-bit random key'],
        ['LINKEDIN_CLIENT_ID', 'Client ID OAuth LinkedIn', 'li_xxx'],
        ['SLACK_WEBHOOK_URL', 'Webhook Slack pour notifications', 'https://hooks.slack.com/...'],
        ['SMTP_URL', 'Configuration email (Resend)', 'smtp://resend:xxx'],
        ['NODE_ENV', 'Environnement courant', 'development | staging | production'],
    ]
    cw4 = [CONTENT_W * r for r in [0.25, 0.42, 0.33]]
    story.append(spacer(12))
    story.append(make_table(env_data[0], env_data[1:], cw4))
    story.append(caption('Tableau 4 - Variables d\'environnement de la V2'))

    # ════════════════════════════════════════════════════════════
    # 3. SCHEMA BDD V2
    # ════════════════════════════════════════════════════════════
    story.extend(add_major_section('3. Schema de base de donnees V2'))

    story.append(p(
        'Le schema de donnees V2 etend significativement celui de la V1 pour supporter les nouvelles fonctionnalites '
        'de calendrier editorial, de branding, de bibliothque de prompts, de gestion multi-marques, de media library, '
        'd\'analytics et de gouvernance avancee. La migration de SQLite vers PostgreSQL permet d\'exploiter les types '
        'avances (JSONB, arrays), les contraintes d\'integrite referentielle et les performances superieures en '
        'environnement multi-utilisateurs.'
    ))
    story.append(p(
        'Le schema V2 comporte 24 modeles au total, contre 7 en V1. Chaque nouveau modele est concu pour repondre '
        'a un besoin fonctionnel specifique tout en s\'integrant dans un ecosysteme relationnel coherent. Les relations '
        'sont materialisees par des foreign keys avec cascades appropriees pour garantir l\'integrite referentielle.'
    ))

    story.extend(add_subsection('3.1 Nouveaux modeles'))

    # ── Workspace ──
    story.extend(add_sub3('3.1.1 Workspace (Espace de travail)'))
    story.append(p(
        'Le modele Workspace est le coeur de la gestion multi-marques. Chaque workspace represente un espace de '
        'travail isole contenant ses propres posts, parametres de branding, pages sociales et membres. Cela permet '
        'a une agence ou une grande entreprise de gerer plusieurs marques ou departments depuis la meme instance '
        'de l\'application, avec une separation complete des donnees et des configurations.'
    ))
    workspace_fields = [
        ['Champ', 'Type', 'Contraintes', 'Description'],
        ['id', 'String (cuid)', 'PK', 'Identifiant unique'],
        ['name', 'String', 'NOT NULL', 'Nom de l\'espace (ex: "DataSphere Innovation")'],
        ['slug', 'String', 'UNIQUE', 'Slug URL-friendly'],
        ['description', 'String?', 'NULLABLE', 'Description de l\'espace'],
        ['logoUrl', 'String?', 'NULLABLE', 'URL du logo'],
        ['isActive', 'Boolean', 'default: true', 'Espace actif'],
        ['createdAt / updatedAt', 'DateTime', 'auto', 'Timestamps'],
    ]
    cw5 = [CONTENT_W * r for r in [0.18, 0.18, 0.18, 0.46]]
    story.append(spacer(8))
    story.append(make_table(workspace_fields[0], workspace_fields[1:], cw5))
    story.append(caption('Tableau 5 - Schema du modele Workspace'))

    # ── BrandProfile ──
    story.extend(add_sub3('3.1.2 BrandProfile (Branding editorial)'))
    story.append(p(
        'Le BrandProfile encapsule l\'identite editoriale d\'une marque au sein d\'un workspace. Il definit le ton '
        'de la communication, les mots a utiliser et a eviter, les CTA preferes, les hashtags de marque et les '
        'templates de structure des posts. Ces informations sont injectees automatiquement dans les prompts IA pour '
        'garantir une coherence de ton dans l\'ensemble des publications generees.'
    ))
    brand_fields = [
        ['Champ', 'Type', 'Description'],
        ['id / workspaceId', 'String / FK', 'Identifiant + lien vers Workspace'],
        ['brandTone', 'String', 'Ton de marque (ex: "expert", "decontracte")'],
        ['brandVoice', 'String', 'Voix de la marque (ex: "professionnel mais accessible")'],
        ['targetAudience', 'String', 'Audience cible par defaut'],
        ['preferredLanguage', 'String', 'Langue principale (ex: "fr")'],
        ['wordsToUse', 'Json', 'Liste de mots a valoriser'],
        ['wordsToAvoid', 'Json', 'Liste de mots a proscrire'],
        ['favoriteCtas', 'Json', 'CTA favoris avec intitules'],
        ['brandHashtags', 'Json', 'Hashtags de marque a inclure'],
        ['postTemplates', 'Json', 'Templates de structure de posts'],
    ]
    story.append(spacer(8))
    story.append(make_table(brand_fields[0], brand_fields[1:], cw5))
    story.append(caption('Tableau 6 - Schema du modele BrandProfile'))

    # ── PromptTemplate ──
    story.extend(add_sub3('3.1.3 PromptTemplate (Bibliotheque de prompts)'))
    story.append(p(
        'La bibliotheque de prompts centralise tous les system prompts utilises pour la generation de contenu IA. '
        'Chaque template est categorise par type de post (expertise, storytelling, carousel, teaser, video, institutionnel) '
        'et peut etre personnalise par les administrateurs. Les editeurs peuvent selectionner le template adapte lors '
        'de la creation d\'un post, et le systeme injecte automatiquement le branding du workspace courant dans le prompt.'
    ))
    prompt_fields = [
        ['Champ', 'Type', 'Description'],
        ['id', 'String (cuid)', 'Identifiant unique'],
        ['workspaceId', 'FK -> Workspace', 'Espace de travail proprietaire'],
        ['name', 'String', 'Nom du template (ex: "Expertise IA")'],
        ['type', 'Enum', 'expertise | storytelling | carousel | teaser | video | institutionnel'],
        ['systemPrompt', 'String', 'Prompt system complet'],
        ['variables', 'Json', 'Variables dynamiques injectables'],
        ['isDefault', 'Boolean', 'Template par defaut pour ce type'],
        ['isActive', 'Boolean', 'Template actif'],
        ['version', 'Int', 'Numero de version pour historique'],
        ['createdAt / updatedAt', 'DateTime', 'Timestamps'],
    ]
    story.append(spacer(8))
    story.append(make_table(prompt_fields[0], prompt_fields[1:], cw5))
    story.append(caption('Tableau 7 - Schema du modele PromptTemplate'))

    # ── Media ──
    story.extend(add_sub3('3.1.4 Media (Bibliotheque mediatique)'))
    story.append(p(
        'Le modele Media gere la bibliotheque de fichiers mediatiques (images, videos, documents) associes aux '
        'posts et aux workspaces. Les fichiers sont stockes dans un bucket S3-compatible (MinIO en dev, AWS S3 en prod) '
        'et les metadonnees sont persistees en base de donnees. Le systeme supporte l\'upload, la compression, '
        'le redimensionnement automatique et la generation de thumbnails.'
    ))
    media_fields = [
        ['Champ', 'Type', 'Description'],
        ['id', 'String (cuid)', 'Identifiant unique'],
        ['workspaceId', 'FK -> Workspace', 'Espace de travail'],
        ['uploadedBy', 'FK -> User', 'Utilisateur uploadur'],
        ['originalName', 'String', 'Nom original du fichier'],
        ['mimeType', 'String', 'Type MIME (image/png, video/mp4...)'],
        ['size', 'Int', 'Taille en octets'],
        ['url', 'String', 'URL d\'acces S3'],
        ['thumbnailUrl', 'String?', 'URL de la miniature'],
        ['width / height', 'Int?', 'Dimensions en pixels'],
        ['alt', 'String?', 'Texte alternatif'],
        ['tags', 'Json', 'Tags de recherche'],
    ]
    story.append(spacer(8))
    story.append(make_table(media_fields[0], media_fields[1:], cw5))
    story.append(caption('Tableau 8 - Schema du modele Media'))

    # ── PostMedia ──
    story.extend(add_sub3('3.1.5 PostMedia (Association post-medias)'))
    story.append(p(
        'Le modele PostMedia est une table de liaison many-to-many entre Post et Media, permettant d\'associer '
        'plusieurs fichiers mediatiques a un meme post. Le champ position definit l\'ordre d\'affichage (pour les '
        'carrousels par exemple) et le champ role indique le type d\'association (image principale, carrousel, '
        'thumbnail video, document joint).'
    ))
    postmedia_fields = [
        ['Champ', 'Type', 'Description'],
        ['id', 'String (cuid)', 'Identifiant unique'],
        ['postId', 'FK -> Post', 'Post associe'],
        ['mediaId', 'FK -> Media', 'Media associe'],
        ['position', 'Int', 'Ordre d\'affichage'],
        ['role', 'Enum', 'hero | carousel | thumbnail | attachment'],
        ['autoGenerated', 'Boolean', 'Genere automatiquement par IA'],
    ]
    story.append(spacer(8))
    story.append(make_table(postmedia_fields[0], postmedia_fields[1:], cw5))
    story.append(caption('Tableau 9 - Schema du modele PostMedia'))

    # ── ContentScore ──
    story.extend(add_sub3('3.1.6 ContentScore (Scores de qualite)'))
    story.append(p(
        'Le modele ContentScore stocke les metriques de qualite calculees pour chaque variante de post generee '
        'par l\'IA. Trois scores sont evalues : qualite redactionnelle, lisibilite et potentiel d\'engagement. '
        'Ces scores sont calcules par des modeles d\'evaluation specifiques ou par des heuristiques basees sur '
        'la structure du contenu (longueur, presence de CTA, usage de hashtags, etc.).'
    ))
    score_fields = [
        ['Champ', 'Type', 'Description'],
        ['id', 'String (cuid)', 'Identifiant unique'],
        ['aiVariantId', 'FK -> AIVariant', 'Variante evaluee'],
        ['qualityScore', 'Float', 'Score qualite (0-100)'],
        ['readabilityScore', 'Float', 'Score lisibilite (0-100)'],
        ['engagementScore', 'Float', 'Score potentiel engagement (0-100)'],
        ['suggestions', 'Json', 'Suggestions d\'amelioration'],
        ['metrics', 'Json', 'Metriques detaillees par critere'],
    ]
    story.append(spacer(8))
    story.append(make_table(score_fields[0], score_fields[1:], cw5))
    story.append(caption('Tableau 10 - Schema du modele ContentScore'))

    # ── CalendarEvent ──
    story.extend(add_sub3('3.1.7 CalendarEvent (Evenements calendrier)'))
    story.append(p(
        'Le modele CalendarEvent represente les entrees du calendrier editorial. Chaque evenement est lie a un post '
        'et porte les informations de planification (date, duree, recurrence). Les evenements peuvent etre deplaces '
        'par drag and drop dans l\'interface, ce qui met a jour automatiquement la date de publication prevue du post '
        'associe. Le champ eventType permet de distinguer les posts planifies des evenements recurrents (jalons '
        'editoriaux, campagnes, etc.).'
    ))
    calendar_fields = [
        ['Champ', 'Type', 'Description'],
        ['id', 'String (cuid)', 'Identifiant unique'],
        ['workspaceId', 'FK -> Workspace', 'Espace de travail'],
        ['postId', 'FK -> Post?', 'Post associe (optionnel pour jalons)'],
        ['title', 'String', 'Titre de l\'evenement'],
        ['startDate', 'DateTime', 'Date et heure de debut'],
        ['endDate', 'DateTime?', 'Date et heure de fin'],
        ['eventType', 'Enum', 'post | milestone | campaign | recurring'],
        ['recurrenceRule', 'String?', 'Regle de recurrence (RFC 5545)'],
        ['color', 'String?', 'Couleur d\'affichage'],
    ]
    story.append(spacer(8))
    story.append(make_table(calendar_fields[0], calendar_fields[1:], cw5))
    story.append(caption('Tableau 11 - Schema du modele CalendarEvent'))

    # ── SocialAccount ──
    story.extend(add_sub3('3.1.8 SocialAccount (Comptes sociaux multi-reseaux)'))
    story.append(p(
        'Le modele SocialAccount remplace et generalise le modele LinkedInAccount de la V1. Il supporte la connexion '
        'de comptes sur plusieurs reseaux sociaux (LinkedIn, X/Twitter, Facebook, Instagram, Threads) et stocke '
        'les tokens OAuth chiffres pour chaque plateforme. La migration des LinkedInAccount existants vers ce nouveau '
        'modele est automatique et transparente.'
    ))
    social_fields = [
        ['Champ', 'Type', 'Description'],
        ['id', 'String (cuid)', 'Identifiant unique'],
        ['workspaceId', 'FK -> Workspace', 'Espace de travail'],
        ['platform', 'Enum', 'linkedin | twitter | facebook | instagram | threads'],
        ['platformUserId', 'String', 'ID utilisateur sur la plateforme'],
        ['displayName', 'String', 'Nom d\'affichage du compte'],
        ['accessToken', 'String', 'Token OAuth (chiffre)'],
        ['refreshToken', 'String?', 'Token de rafraichissement'],
        ['tokenExpiresAt', 'DateTime?', 'Date d\'expiration du token'],
        ['scope', 'String?', 'Permissions accordees'],
        ['isActive', 'Boolean', 'Compte actif'],
        ['metadata', 'Json?', 'Metadonnees specifiques au reseau'],
    ]
    story.append(spacer(8))
    story.append(make_table(social_fields[0], social_fields[1:], cw5))
    story.append(caption('Tableau 12 - Schema du modele SocialAccount'))

    # ── ValidationStep ──
    story.extend(add_sub3('3.1.9 ValidationStep (Workflow multi-approbateurs)'))
    story.append(p(
        'Le modele ValidationStep represente les etapes successives du workflow de validation avance. Contrairement '
        'a la V1 ou l\'approbation etait mono-etape, la V2 permet de definir des workflows multi-etapes avec '
        'des approbateurs differents a chaque etape. Par exemple : revue editoriale, validation juridique, '
        'approbation direction. Chaque etape doit etre validee avant de passer a la suivante.'
    ))
    valstep_fields = [
        ['Champ', 'Type', 'Description'],
        ['id', 'String (cuid)', 'Identifiant unique'],
        ['postId', 'FK -> Post', 'Post concerne'],
        ['stepOrder', 'Int', 'Ordre de l\'etape'],
        ['stepName', 'String', 'Nom de l\'etape (ex: "Revue editoriale")'],
        ['requiredRole', 'String', 'Role requis pour cette etape'],
        ['assignedUserId', 'FK -> User?', 'Approbateur designe'],
        ['status', 'Enum', 'pending | approved | rejected | skipped'],
        ['comment', 'String?', 'Commentaire de l\'approbateur'],
        ['resolvedAt', 'DateTime?', 'Date de resolution'],
    ]
    story.append(spacer(8))
    story.append(make_table(valstep_fields[0], valstep_fields[1:], cw5))
    story.append(caption('Tableau 13 - Schema du modele ValidationStep'))

    # ── Notification ──
    story.extend(add_sub3('3.1.10 Notification'))
    story.append(p(
        'Le modele Notification centralise la gestion des notifications envoyees aux utilisateurs. Les notifications '
        'peuvent etre de type email, Slack ou in-app. Elles sont declenchees par des evenements specifiques : post '
        'en attente de validation, approbation/rejet, echec de publication, rappel de planning, etc. Le systeme '
        'utilise BullMQ pour les envois asynchrones et supporte les retries avec backoff exponentiel.'
    ))
    notif_fields = [
        ['Champ', 'Type', 'Description'],
        ['id', 'String (cuid)', 'Identifiant unique'],
        ['userId', 'FK -> User', 'Destinataire'],
        ['type', 'Enum', 'email | slack | in_app'],
        ['channel', 'String', 'Canal d\'envoi (ex: "validation_pending")'],
        ['title', 'String', 'Titre de la notification'],
        ['message', 'String', 'Contenu du message'],
        ['isRead', 'Boolean', 'Notification lue (in-app)'],
        ['sentAt', 'DateTime?', 'Date d\'envoi effectif'],
        ['readAt', 'DateTime?', 'Date de lecture'],
    ]
    story.append(spacer(8))
    story.append(make_table(notif_fields[0], notif_fields[1:], cw5))
    story.append(caption('Tableau 14 - Schema du modele Notification'))

    story.extend(add_subsection('3.2 Modeles modifies (evolution V1)'))

    story.append(p(
        'Plusieurs modeles existants de la V1 sont modifies pour supporter les nouvelles fonctionnalites. Le modele '
        'Post recoit les nouveaux champs workspaceId, contentFormat, carouselData et scriptVideo pour supporter '
        'les formats enrichis. Le modele User recoit les champs workspaceIds (relation many-to-many avec Workspace) '
        'et permissions (JSON) pour la gestion fine des roles. Le modele AIVariant est etendu avec le champ '
        'variantType pour distinguer les variantes standards des variantes carrousel et video.'
    ))

    modified_data = [
        ['Modele', 'Champs ajoutes', 'Description'],
        ['Post', 'workspaceId, contentFormat, carouselData, scriptVideo, contentScores',
         'Lien workspace, format enrichi, donnees carrousel, script video'],
        ['User', 'workspaceIds, permissions, avatarUrl, lastLoginAt',
         'Multi-workspace, permissions fines, avatar, tracking'],
        ['AIVariant', 'variantType, carouselSlides, scores',
         'Type variante (standard/carousel/video), slides carrousel'],
        ['AuditLog', 'workspaceId, ipAddress, userAgent, severity',
         'Contexte workspace, metadata securite, niveau de gravite'],
        ['Settings', 'workspaceId, category',
         'Settings par workspace, categorisation'],
    ]
    cw6 = [CONTENT_W * r for r in [0.12, 0.38, 0.50]]
    story.append(spacer(12))
    story.append(make_table(modified_data[0], modified_data[1:], cw6))
    story.append(caption('Tableau 15 - Modifications des modeles existants'))

    story.extend(add_subsection('3.3 Relations et diagramme ER'))

    story.append(p(
        'Le diagramme suivant presente les principales relations entre les 24 modeles du schema V2. Les relations '
        'one-to-many et many-to-many sont materialisees par des foreign keys. Les cascades de suppression sont '
        'configurees pour garantir l\'integrite referentielle : par exemple, la suppression d\'un workspace entraine '
        'la suppression de tous ses posts, medias et parametres en cascade.'
    ))

    er_data = [
        ['Entite source', 'Relation', 'Entite cible', 'Cardinalite'],
        ['Workspace', 'contient', 'BrandProfile', '1:1'],
        ['Workspace', 'contient', 'Post', '1:N'],
        ['Workspace', 'contient', 'Media', '1:N'],
        ['Workspace', 'contient', 'CalendarEvent', '1:N'],
        ['Workspace', 'contient', 'SocialAccount', '1:N'],
        ['Workspace', 'contient', 'PromptTemplate', '1:N'],
        ['Workspace', 'contient', 'User (M:N)', 'M:N (WorkspaceMember)'],
        ['Post', 'contient', 'AIVariant', '1:N'],
        ['Post', 'contient', 'ValidationStep', '1:N'],
        ['Post', 'contient', 'PostMedia', '1:N'],
        ['Post', 'contient', 'PublicationLog', '1:N'],
        ['Post', 'associe a', 'SocialAccount', 'N:1'],
        ['User', 'cree', 'Post', '1:N'],
        ['User', 'valide', 'ValidationStep', '1:N'],
        ['User', 'recut', 'Notification', '1:N'],
        ['AIVariant', 'possede', 'ContentScore', '1:1'],
    ]
    cw7 = [CONTENT_W * r for r in [0.22, 0.14, 0.30, 0.14]]
    story.append(spacer(12))
    story.append(make_table(er_data[0], er_data[1:], cw7))
    story.append(caption('Tableau 16 - Relations principales du schema V2'))

    # ════════════════════════════════════════════════════════════
    # 4. NOUVEAUX ECRANS
    # ════════════════════════════════════════════════════════════
    story.extend(add_major_section('4. Nouveaux ecrans'))

    story.append(p(
        'L\'interface V2 s\'enrichit de six nouveaux ecrans majeurs, en plus des ameliorations apportees aux ecrans '
        'existants. Le routing evolue du systeme Zustand interne vers le routing natif Next.js App Router pour '
        'profiter du SSR, du prefetching et de la navigation par URL. Chaque ecran est concu comme un composant '
        'modulaire avec ses propres sous-composants et son propre chargement de donnees via TanStack Query.'
    ))

    story.extend(add_subsection('4.1 Vue calendrier editorial'))
    story.append(p(
        'Le calendrier editorial est l\'ecran central de la V2. Il offre trois vues : mensuelle, hebdomadaire et '
        'liste. Les posts planifies apparaissent sous forme de cartes de couleur differente selon leur statut '
        '(brouillon en jaune, en attente en orange, approuve en vert, publie en bleu). Le drag and drop permet '
        'de deplacer un post d\'une date a une autre, ce qui met a jour automatiquement le scheduledDate. Un panneau '
        'lateral affiche le detail du post selectionne avec la possibilite de le modifier directement.'
    ))
    story.append(bullet('<b>Vues :</b> Mois / Semaine / Liste avec switch interactif'))
    story.append(bullet('<b>Drag and Drop :</b> Deplacement de posts entre dates via dnd-kit'))
    story.append(bullet('<b>Filtres :</b> Par statut, auteur, type de contenu, reseau social'))
    story.append(bullet('<b>Quick create :</b> Creation rapide de post depuis un clic sur une date vide'))
    story.append(bullet('<b>File d\'attente :</b> Panneau lateral avec posts non planifies a glisser dans le calendrier'))
    story.append(bullet('<b>Jalons :</b> Affichage de jalons editoriaux (campagnes, evenements)'))

    story.extend(add_subsection('4.2 Bibliotheque de prompts'))
    story.append(p(
        'L\'ecran de gestion des prompts permet aux administrateurs de creer, modifier et organiser les templates '
        'de prompts utilises pour la generation de contenu IA. L\'interface presente une grille de cartes, chaque carte '
        'representant un template avec son nom, son type, son statut (actif/inactif) et un apercu du prompt. Un '
        'editeur de prompt avec coloration syntaxique et preview de la generation est integre directement.'
    ))
    story.append(bullet('<b>Liste/Grid :</b> Basculement entre vue liste et grille de cartes'))
    story.append(bullet('<b>Editeur :</b> Editeur de texte riche pour les prompts avec variables dynamiques'))
    story.append(bullet('<b>Apercu :</b> Preview de generation IA directement dans l\'editeur'))
    story.append(bullet('<b>Categories :</b> Filtrage par type (expertise, storytelling, carousel, teaser, video, institutionnel)'))
    story.append(bullet('<b>Import/Export :</b> Import et export de templates au format JSON'))

    story.extend(add_subsection('4.3 Branding editorial'))
    story.append(p(
        'L\'ecran de branding editoriale permet de configurer l\'identite de marque de chaque workspace. Il se '
        'presente sous forme de sections organisees : ton et voix, vocabulaire (mots a utiliser/eviter), CTA '
        'favoris, hashtags de marque, et templates de structure. Un assistant IA propose des suggestions de '
        'branding basees sur les posts deja publies et le secteur d\'activite de l\'entreprise.'
    ))
    story.append(bullet('<b>Ton et voix :</b> Selection de ton (expert, decontracte, inspirant, provocateur)'))
    story.append(bullet('<b>Vocabulaire :</b> Listes de mots a utiliser et a eviter avec ajout/suppression dynamique'))
    story.append(bullet('<b>CTA :</b> Libraire de CTA favoris avec compteur d\'utilisation'))
    story.append(bullet('<b>Hashtags :</b> Listes de hashtags de marque avec suggessions automatiques'))
    story.append(bullet('<b>Templates :</b> Modeles de structure (hook + developpement + conclusion + CTA)'))

    story.extend(add_subsection('4.4 Media Library'))
    story.append(p(
        'La bibliotheque mediatique offre une interface de type "explorateur de fichiers" pour gerer les images, '
        'videos et documents associes aux posts. Elle supporte l\'upload multiple avec drag and drop, la recherche '
        'par tags, le filtrage par type et par date, et la visualisation en grille ou en liste. Un editeur d\'image '
        'integre permet le recadrage et le redimensionnement directement dans l\'interface.'
    ))
    story.append(bullet('<b>Upload :</b> Drag and drop multi-fichiers avec barre de progression'))
    story.append(bullet('<b>Grille/Liste :</b> Double vue avec tri par date, nom, taille'))
    story.append(bullet('<b>Recherche :</b> Recherche plein texte + filtrage par tags et type MIME'))
    story.append(bullet('<b>Association :</b> Association automatique image/post basee sur les tags'))
    story.append(bullet('<b>Suggestions :</b> Generation de visuels par IA (text-to-image)'))

    story.extend(add_subsection('4.5 Dashboard analytics'))
    story.append(p(
        'Le dashboard analytics remplace le dashboard V1 basique par une suite complete de graphiques et metriques. '
        'Il presente un resume global en haut de page (KPI cards), suivi de graphiques detailles : frequence de '
        'publication par semaine/mois, taux de publication reussie par reseau, classement des meilleurs angles de '
        'contenu, comparaison des performances par provider IA, et historique des publications. Les donnees sont '
        'mise a jour en temps reel via TanStack Query avec rafraichissement automatique.'
    ))
    story.append(bullet('<b>KPI Cards :</b> Posts publies ce mois, taux de reussite, engagement moyen, temps moyen de validation'))
    story.append(bullet('<b>Frequence :</b> Graphique en barres de la frequence de publication par semaine'))
    story.append(bullet('<b>Taux de reussite :</b> Donut chart par reseau social'))
    story.append(bullet('<b>Meilleurs angles :</b> Classement des angles par score d\'engagement moyen'))
    story.append(bullet('<b>Comparaison IA :</b> Radar chart comparant les performances par provider'))
    story.append(bullet('<b>Historique :</b> Timeline des publications avec filtres multi-criteres'))

    story.extend(add_subsection('4.6 Gestion des workspaces'))
    story.append(p(
        'L\'ecran de gestion des workspaces permet aux administrateurs de creer, configurer et gerer les espaces '
        'de travail. Chaque workspace est presente sous forme de carte avec son logo, son nom et le nombre de '
        'membres. Un drawer lateral permet d\'acceder aux parametres detailles du workspace : informations generales, '
        'membres et roles, comptes sociaux connectes, parametres de branding, et statistiques d\'utilisation.'
    ))
    story.append(bullet('<b>Liste workspaces :</b> Grille de cartes avec logo et stats rapides'))
    story.append(bullet('<b>Switcher :</b> Selecteur de workspace courant dans la barre de navigation'))
    story.append(bullet('<b>Parametres :</b> Drawer lateral avec sections organisees par onglets'))
    story.append(bullet('<b>Membres :</b> Gestion des membres avec invitation par email'))
    story.append(bullet('<b>Comptes sociaux :</b> Connexion/deconnexion multi-reseaux par workspace'))

    # ════════════════════════════════════════════════════════════
    # 5. NOUVELLES APIs
    # ════════════════════════════════════════════════════════════
    story.extend(add_major_section('5. Nouvelles API routes'))

    story.append(p(
        'La V2 introduit 32 nouvelles API routes, portant le total a environ 46 endpoints. Chaque endpoint suit '
        'les conventions REST : noms de ressources au pluriel, methodes HTTP semantiques (GET pour lire, POST pour '
        'creer, PUT pour modifier, DELETE pour supprimer), codes de statut HTTP explicites et reponses JSON '
        'structurees. L\'authentification JWT est obligatoire sur tous les endpoints sauf login/register et health check.'
    ))

    story.extend(add_subsection('5.1 APIs Calendrier'))

    cal_apis = [
        ['GET', '/api/calendar/events', 'Lister les evenements du calendrier avec filtres (dateDebut, dateFin, type)'],
        ['POST', '/api/calendar/events', 'Creer un evenement calendrier (post planifie ou jalon)'],
        ['PUT', '/api/calendar/events/:id', 'Modifier un evenement (deplacement, changement de date)'],
        ['PUT', '/api/calendar/events/:id/move', 'Deplacer un evenement par drag and drop'],
        ['DELETE', '/api/calendar/events/:id', 'Supprimer un evenement'],
        ['GET', '/api/calendar/queue', 'Lister les posts non planifies (file d\'attente)'],
        ['POST', '/api/calendar/schedule', 'Planifier un post (creer evenement + mettre a jour scheduledDate)'],
    ]
    cw8 = [CONTENT_W * r for r in [0.07, 0.30, 0.63]]
    story.append(spacer(12))
    story.append(make_table(cal_apis[0], cal_apis[1:], cw8))
    story.append(caption('Tableau 17 - APIs Calendrier'))

    story.extend(add_subsection('5.2 APIs Prompts'))
    prompt_apis = [
        ['GET', '/api/prompts', 'Lister les templates de prompts du workspace courant'],
        ['POST', '/api/prompts', 'Creer un nouveau template de prompt'],
        ['GET', '/api/prompts/:id', 'Recuperer un template par ID'],
        ['PUT', '/api/prompts/:id', 'Modifier un template existant'],
        ['DELETE', '/api/prompts/:id', 'Desactiver un template (soft delete)'],
        ['POST', '/api/prompts/:id/preview', 'Generer un apercu avec le template'],
        ['POST', '/api/prompts/import', 'Importer des templates depuis JSON'],
        ['GET', '/api/prompts/export', 'Exporter tous les templates du workspace'],
    ]
    story.append(spacer(12))
    story.append(make_table(prompt_apis[0], prompt_apis[1:], cw8))
    story.append(caption('Tableau 18 - APIs Prompts'))

    story.extend(add_subsection('5.3 APIs Branding'))
    brand_apis = [
        ['GET', '/api/branding', 'Recuperer le profil de marque du workspace courant'],
        ['PUT', '/api/branding', 'Mettre a jour le profil de marque complet'],
        ['PATCH', '/api/branding/tone', 'Modifier le ton et la voix'],
        ['PATCH', '/api/branding/vocabulary', 'Modifier les listes de mots'],
        ['PATCH', '/api/branding/ctas', 'Modifier les CTA favoris'],
        ['PATCH', '/api/branding/hashtags', 'Modifier les hashtags de marque'],
        ['POST', '/api/branding/suggest', 'Obtenir des suggestions IA de branding'],
    ]
    story.append(spacer(12))
    story.append(make_table(brand_apis[0], brand_apis[1:], cw8))
    story.append(caption('Tableau 19 - APIs Branding'))

    story.extend(add_subsection('5.4 APIs Medias'))
    media_apis = [
        ['GET', '/api/media', 'Lister les medias du workspace (pagination, filtres)'],
        ['POST', '/api/media/upload', 'Uploader un ou plusieurs fichiers (multipart/form-data)'],
        ['GET', '/api/media/:id', 'Recuperer un media par ID'],
        ['PUT', '/api/media/:id', 'Modifier les metadonnees d\'un media'],
        ['DELETE', '/api/media/:id', 'Supprimer un media (fichier S3 + BDD)'],
        ['POST', '/api/media/:id/suggest-posts', 'Suggerer des posts associes a ce media'],
        ['POST', '/api/media/generate-visual', 'Generer un visuel par IA (text-to-image)'],
    ]
    story.append(spacer(12))
    story.append(make_table(media_apis[0], media_apis[1:], cw8))
    story.append(caption('Tableau 20 - APIs Medias'))

    story.extend(add_subsection('5.5 APIs Analytics'))
    analytics_apis = [
        ['GET', '/api/analytics/overview', 'Resume global (KPI cards)'],
        ['GET', '/api/analytics/frequency', 'Frequence de publication par periode'],
        ['GET', '/api/analytics/success-rate', 'Taux de reussite par reseau social'],
        ['GET', '/api/analytics/top-angles', 'Classement des meilleurs angles de contenu'],
        ['GET', '/api/analytics/provider-comparison', 'Comparaison des performances par provider IA'],
        ['GET', '/api/analytics/history', 'Historique des publications avec pagination'],
        ['GET', '/api/analytics/export', 'Export des donnees analytics (CSV/JSON)'],
    ]
    story.append(spacer(12))
    story.append(make_table(analytics_apis[0], analytics_apis[1:], cw8))
    story.append(caption('Tableau 21 - APIs Analytics'))

    story.extend(add_subsection('5.6 APIs Workspaces'))
    ws_apis = [
        ['GET', '/api/workspaces', 'Lister les workspaces accessibles a l\'utilisateur'],
        ['POST', '/api/workspaces', 'Creer un nouveau workspace'],
        ['GET', '/api/workspaces/:id', 'Recuperer un workspace par ID'],
        ['PUT', '/api/workspaces/:id', 'Modifier les informations du workspace'],
        ['DELETE', '/api/workspaces/:id', 'Desactiver un workspace'],
        ['GET', '/api/workspaces/:id/members', 'Lister les membres du workspace'],
        ['POST', '/api/workspaces/:id/members', 'Ajouter un membre au workspace'],
        ['PUT', '/api/workspaces/:id/members/:userId', 'Modifier le role d\'un membre'],
        ['DELETE', '/api/workspaces/:id/members/:userId', 'Retirer un membre'],
        ['POST', '/api/workspaces/switch', 'Changer de workspace courant'],
    ]
    story.append(spacer(12))
    story.append(make_table(ws_apis[0], ws_apis[1:], cw8))
    story.append(caption('Tableau 22 - APIs Workspaces'))

    story.extend(add_subsection('5.7 APIs Reseaux sociaux (multi-reseaux)'))
    social_apis = [
        ['GET', '/api/social-accounts', 'Lister les comptes sociaux du workspace'],
        ['POST', '/api/social-accounts/connect', 'Connecter un nouveau compte social (OAuth)'],
        ['DELETE', '/api/social-accounts/:id', 'Deconnecter un compte social'],
        ['GET', '/api/social-accounts/:id/status', 'Verifier la validite du token OAuth'],
        ['POST', '/api/social-accounts/:id/refresh', 'Rafraichir le token OAuth expir'],
        ['POST', '/api/publish/multi', 'Publier un post sur plusieurs reseaux simultanement'],
    ]
    story.append(spacer(12))
    story.append(make_table(social_apis[0], social_apis[1:], cw8))
    story.append(caption('Tableau 23 - APIs Reseaux sociaux'))

    story.extend(add_subsection('5.8 APIs Validation avancee'))
    val_apis = [
        ['GET', '/api/posts/:id/steps', 'Lister les etapes de validation d\'un post'],
        ['POST', '/api/posts/:id/steps', 'Creer un workflow de validation multi-etapes'],
        ['PUT', '/api/posts/:id/steps/:stepId', 'Approuver, rejeter ou sauter une etape'],
        ['GET', '/api/validation/queues', 'Lister les posts en attente de validation pour l\'utilisateur'],
        ['POST', '/api/validation/bulk', 'Approbation/rejet en masse de plusieurs posts'],
    ]
    story.append(spacer(12))
    story.append(make_table(val_apis[0], val_apis[1:], cw8))
    story.append(caption('Tableau 24 - APIs Validation avancee'))

    story.extend(add_subsection('5.9 APIs Notifications'))
    notif_apis = [
        ['GET', '/api/notifications', 'Lister les notifications de l\'utilisateur'],
        ['PUT', '/api/notifications/:id/read', 'Marquer une notification comme lue'],
        ['PUT', '/api/notifications/read-all', 'Marquer toutes les notifications comme lues'],
        ['GET', '/api/notifications/unread-count', 'Compteur de notifications non lues'],
        ['PUT', '/api/settings/notifications', 'Configurer les preferences de notification'],
    ]
    story.append(spacer(12))
    story.append(make_table(notif_apis[0], notif_apis[1:], cw8))
    story.append(caption('Tableau 25 - APIs Notifications'))

    # ════════════════════════════════════════════════════════════
    # 6. CODE ET PSEUDO-CODE DETAILLE
    # ════════════════════════════════════════════════════════════
    story.extend(add_major_section('6. Code et pseudo-code detaille'))

    story.append(p(
        'Cette section presente les implementations cles de la V2 sous forme de code TypeScript simplifie. '
        'Le focus est porte sur les services principaux : service de generation IA enrichie, service de publication '
        'multi-reseaux, service de calendrier avec drag and drop, et service de scoring de qualite du contenu. '
        'Chaque extrait est accompagne d\'explications sur les choix d\'implementation et les patterns utilises.'
    ))

    story.extend(add_subsection('6.1 Schema Prisma V2 - Extrait'))
    story.append(p(
        'L\'extrait suivant presente les nouveaux modeles du schema Prisma V2. Les types PostgreSQL comme JsonB '
        'sont utilises pour les champs semi-structures (wordsToUse, carouselSlides, etc.). Les enums sont definis '
        'au niveau du schema pour garantir la coherence des donnees. Les contraintes d\'unicite et les index '
        'sont ajoutes pour optimiser les requetes frequentes.'
    ))
    story.append(code(
        '// prisma/schema.prisma (extrait V2)<br/>'
        '<br/>'
        'model Workspace {<br/>'
        '&nbsp;&nbsp;id&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String&nbsp;&nbsp;&nbsp;@id @default(cuid())<br/>'
        '&nbsp;&nbsp;name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String<br/>'
        '&nbsp;&nbsp;slug&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String&nbsp;&nbsp;&nbsp;@unique<br/>'
        '&nbsp;&nbsp;logoUrl&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String?<br/>'
        '&nbsp;&nbsp;isActive&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Boolean&nbsp;@default(true)<br/>'
        '&nbsp;&nbsp;createdAt&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;DateTime @default(now())<br/>'
        '&nbsp;&nbsp;updatedAt&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;DateTime @updatedAt<br/>'
        '&nbsp;&nbsp;posts&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Post[]<br/>'
        '&nbsp;&nbsp;medias&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Media[]<br/>'
        '&nbsp;&nbsp;socialAccounts SocialAccount[]<br/>'
        '&nbsp;&nbsp;brandProfile&nbsp;&nbsp;BrandProfile?<br/>'
        '&nbsp;&nbsp;promptTemplates PromptTemplate[]<br/>'
        '&nbsp;&nbsp;members&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;WorkspaceMember[]<br/>'
        '}<br/>'
        '<br/>'
        'model BrandProfile {<br/>'
        '&nbsp;&nbsp;id&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String&nbsp;&nbsp;@id @default(cuid())<br/>'
        '&nbsp;&nbsp;workspaceId&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String&nbsp;&nbsp;@unique<br/>'
        '&nbsp;&nbsp;workspace&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Workspace @relation(fields: [workspaceId])<br/>'
        '&nbsp;&nbsp;brandTone&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String&nbsp;&nbsp;@default("professional")<br/>'
        '&nbsp;&nbsp;brandVoice&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;String&nbsp;&nbsp;@default("")<br/>'
        '&nbsp;&nbsp;wordsToUse&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Json&nbsp;&nbsp;&nbsp;@default("[]")<br/>'
        '&nbsp;&nbsp;wordsToAvoid&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Json&nbsp;&nbsp;&nbsp;@default("[]")<br/>'
        '&nbsp;&nbsp;favoriteCtas&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Json&nbsp;&nbsp;&nbsp;@default("[]")<br/>'
        '&nbsp;&nbsp;brandHashtags&nbsp;&nbsp;&nbsp;&nbsp;Json&nbsp;&nbsp;&nbsp;@default("[]")<br/>'
        '&nbsp;&nbsp;postTemplates&nbsp;&nbsp;&nbsp;&nbsp;Json&nbsp;&nbsp;&nbsp;@default("[]")<br/>'
        '}'
    ))

    story.extend(add_subsection('6.2 Service de generation IA enrichie'))
    story.append(p(
        'Le service d\'IA enrichi etend celui de la V1 en ajoutant la generation de carrousels, de scripts video, '
        'de variantes courtes/longues et le scoring automatique de qualite. Le service injecte automatiquement '
        'le branding du workspace courant dans les prompts et utilise les templates de la bibliotheque pour '
        'structurer la generation.'
    ))
    story.append(code(
        '// src/lib/services/ai-service.ts<br/>'
        '<br/>'
        'interface EnrichedGenerationOptions {<br/>'
        '&nbsp;&nbsp;postId: string;<br/>'
        '&nbsp;&nbsp;workspaceId: string;<br/>'
        '&nbsp;&nbsp;promptTemplateId?: string;<br/>'
        '&nbsp;&nbsp;contentFormat: \'standard\' | \'carousel\' | \'video\' | \'short\' | \'long\';<br/>'
        '&nbsp;&nbsp;provider: AIProvider;<br/>'
        '&nbsp;&nbsp;targetAudience?: string;<br/>'
        '&nbsp;&nbsp;angle?: string;<br/>'
        '}<br/>'
        '<br/>'
        'async function generateEnrichedContent(opts: EnrichedGenerationOptions) {<br/>'
        '&nbsp;&nbsp;// 1. Charger le branding du workspace<br/>'
        '&nbsp;&nbsp;const brand = await prisma.brandProfile.findUnique({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;where: { workspaceId: opts.workspaceId }<br/>'
        '&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 2. Charger le template de prompt<br/>'
        '&nbsp;&nbsp;let systemPrompt = DEFAULT_SYSTEM_PROMPT;<br/>'
        '&nbsp;&nbsp;if (opts.promptTemplateId) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;const tpl = await prisma.promptTemplate.findUnique({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;where: { id: opts.promptTemplateId }<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;if (tpl) systemPrompt = tpl.systemPrompt;<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 3. Injecter le branding dans le prompt<br/>'
        '&nbsp;&nbsp;const enrichedPrompt = buildPromptWithBranding({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;systemPrompt,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;brandTone: brand?.brandTone ?? "professional",<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;wordsToUse: brand?.wordsToUse as string[] ?? [],<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;wordsToAvoid: brand?.wordsToAvoid as string[] ?? [],<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;hashtags: brand?.brandHashtags as string[] ?? [],<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;format: opts.contentFormat,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;audience: opts.targetAudience,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;angle: opts.angle,<br/>'
        '&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 4. Generer les variantes selon le format<br/>'
        '&nbsp;&nbsp;const variants = await generateVariants(enrichedPrompt, opts.provider, {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;format: opts.contentFormat,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;count: opts.contentFormat === \'carousel\' ? 1 : 3,<br/>'
        '&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 5. Calculer les scores de qualite<br/>'
        '&nbsp;&nbsp;for (const v of variants) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;const scores = await calculateContentScores(v.content);<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;await prisma.contentScore.create({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data: { aiVariantId: v.id, ...scores }<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;return variants;<br/>'
        '}'
    ))

    story.extend(add_subsection('6.3 Service de scoring de qualite'))
    story.append(p(
        'Le service de scoring evalue la qualite de chaque variante generee selon trois dimensions : qualite '
        'redactionnelle (structure, coherence, richesse du vocabulaire), lisibilite (longueur des phrases, '
        'complexite lexicale, presence de CTA) et potentiel d\'engagement (accroche, emotionnalite, appel a '
        'l\'action). Les scores sont combines en un score global et des suggestions d\'amelioration sont generees.'
    ))
    story.append(code(
        '// src/lib/services/scoring-service.ts<br/>'
        '<br/>'
        'interface ContentScores {<br/>'
        '&nbsp;&nbsp;qualityScore: number;&nbsp;&nbsp;&nbsp;&nbsp;// 0-100<br/>'
        '&nbsp;&nbsp;readabilityScore: number;&nbsp;&nbsp;// 0-100<br/>'
        '&nbsp;&nbsp;engagementScore: number;&nbsp;&nbsp;// 0-100<br/>'
        '&nbsp;&nbsp;suggestions: string[];<br/>'
        '&nbsp;&nbsp;metrics: Record&lt;string, number&gt;;<br/>'
        '}<br/>'
        '<br/>'
        'async function calculateContentScores(content: string): Promise&lt;ContentScores&gt; {<br/>'
        '&nbsp;&nbsp;const metrics: Record&lt;string, number&gt; = {};<br/>'
        '&nbsp;&nbsp;const suggestions: string[] = [];<br/>'
        '<br/>'
        '&nbsp;&nbsp;// Qualite redactionnelle<br/>'
        '&nbsp;&nbsp;metrics.charCount = content.length;<br/>'
        '&nbsp;&nbsp;metrics.sentenceCount = content.split(/[.!?]+/).filter(Boolean).length;<br/>'
        '&nbsp;&nbsp;metrics.avgSentenceLength = metrics.charCount / metrics.sentenceCount;<br/>'
        '&nbsp;&nbsp;metrics.paragraphCount = content.split(/\\n\\n+/).filter(Boolean).length;<br/>'
        '&nbsp;&nbsp;metrics.hasCta = content.match(/(contactez|decouvrez|partagez|commentez)/i) ? 1 : 0;<br/>'
        '&nbsp;&nbsp;metrics.hasHashtags = content.match(/#\\w+/) ? 1 : 0;<br/>'
        '<br/>'
        '&nbsp;&nbsp;// Score de qualite (ponderation)<br/>'
        '&nbsp;&nbsp;let qualityScore = 50;<br/>'
        '&nbsp;&nbsp;if (metrics.charCount &gt;= 500) qualityScore += 10;<br/>'
        '&nbsp;&nbsp;if (metrics.avgSentenceLength &gt;= 10 &amp;&amp; metrics.avgSentenceLength &lt;= 25) qualityScore += 15;<br/>'
        '&nbsp;&nbsp;if (metrics.hasCta) qualityScore += 15;<br/>'
        '&nbsp;&nbsp;if (metrics.paragraphCount &gt;= 3) qualityScore += 10;<br/>'
        '&nbsp;&nbsp;qualityScore = Math.min(100, qualityScore);<br/>'
        '<br/>'
        '&nbsp;&nbsp;if (!metrics.hasCta) suggestions.push("Ajoutez un appel a l\'action (CTA)");<br/>'
        '&nbsp;&nbsp;if (metrics.charCount &lt; 300) suggestions.push("Enrichissez le contenu (min. 500 car.)");<br/>'
        '<br/>'
        '&nbsp;&nbsp;// Lisibilite (indice de lisibilite simplifie)<br/>'
        '&nbsp;&nbsp;let readabilityScore = 70;<br/>'
        '&nbsp;&nbsp;if (metrics.avgSentenceLength &lt; 15) readabilityScore += 20;<br/>'
        '&nbsp;&nbsp;else if (metrics.avgSentenceLength &gt; 30) readabilityScore -= 20;<br/>'
        '&nbsp;&nbsp;if (metrics.paragraphCount &gt;= 4) readabilityScore += 10;<br/>'
        '&nbsp;&nbsp;readabilityScore = Math.max(0, Math.min(100, readabilityScore));<br/>'
        '<br/>'
        '&nbsp;&nbsp;// Potentiel d\'engagement (heuristiques)<br/>'
        '&nbsp;&nbsp;let engagementScore = 40;<br/>'
        '&nbsp;&nbsp;const hasHook = /^(\\?|Imagine|Saviez-vous|En |Pourquoi)/.test(content.trim());<br/>'
        '&nbsp;&nbsp;if (hasHook) engagementScore += 25;<br/>'
        '&nbsp;&nbsp;const hasQuestion = content.includes("?");<br/>'
        '&nbsp;&nbsp;if (hasQuestion) engagementScore += 15;<br/>'
        '&nbsp;&nbsp;if (metrics.hasHashtags) engagementScore += 10;<br/>'
        '&nbsp;&nbsp;const hasNumbers = /\\d+/.test(content);<br/>'
        '&nbsp;&nbsp;if (hasNumbers) engagementScore += 10;<br/>'
        '&nbsp;&nbsp;engagementScore = Math.min(100, engagementScore);<br/>'
        '<br/>'
        '&nbsp;&nbsp;if (!hasHook) suggestions.push("Commencez par une question ou un accroche");<br/>'
        '&nbsp;&nbsp;if (!hasQuestion) suggestions.push("Posez une question pour susciter l\'engagement");<br/>'
        '<br/>'
        '&nbsp;&nbsp;return { qualityScore, readabilityScore, engagementScore, suggestions, metrics };<br/>'
        '}'
    ))

    story.extend(add_subsection('6.4 Service de publication multi-reseaux'))
    story.append(p(
        'Le service de publication multi-reseaux est concu pour etre extensible. Chaque reseau social est implemente '
        'sous forme d\'adaptateur respectant une interface commune. Cela permet d\'ajouter de nouveaux reseaux sans '
        'modifier le code existant (principe Open/Closed). Le service gere le retry automatique en cas d\'echec, '
        'le logging des publications et la mise a jour du statut du post.'
    ))
    story.append(code(
        '// src/lib/services/publishing-service.ts<br/>'
        '<br/>'
        'interface SocialPublisher {<br/>'
        '&nbsp;&nbsp;publish(content: string, media: MediaItem[]): Promise&lt;PublishResult&gt;;<br/>'
        '&nbsp;&nbsp;refreshToken(account: SocialAccount): Promise&lt;void&gt;;<br/>'
        '&nbsp;&nbsp;verifyToken(account: SocialAccount): Promise&lt;boolean&gt;;<br/>'
        '}<br/>'
        '<br/>'
        'class LinkedInPublisher implements SocialPublisher {<br/>'
        '&nbsp;&nbsp;async publish(content, media) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;// Appel API LinkedIn v2<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;const response = await fetch(\'https://api.linkedin.com/v2/ugcPosts\', {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;method: \'POST\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;headers: { Authorization: `Bearer ${this.token}` },<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;body: JSON.stringify({ author: this.orgId, text: content })<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;return { platform: \'linkedin\', postId: response.id, status: \'success\' };<br/>'
        '&nbsp;&nbsp;}<br/>'
        '}<br/>'
        '<br/>'
        'class PublishingService {<br/>'
        '&nbsp;&nbsp;private publishers = new Map&lt;string, SocialPublisher&gt;();<br/>'
        '<br/>'
        '&nbsp;&nbsp;constructor() {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;this.publishers.set(\'linkedin\', new LinkedInPublisher());<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;// Futur: twitter, facebook, instagram, threads<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;async publishToMultiple(<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;postId: string,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;platforms: string[]<br/>'
        '&nbsp;&nbsp;): Promise&lt;Map&lt;string, PublishResult&gt;&gt; {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;const post = await prisma.post.findUnique({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;where: { id: postId },<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;include: { postMedias: { include: { media: true } } }<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;const results = new Map();<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;for (const platform of platforms) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;try {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const publisher = this.publishers.get(platform);<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const media = post.postMedias.map(pm =&gt; pm.media);<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const result = await publisher.publish(post.finalContent, media);<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;results.set(platform, result);<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;} catch (error) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;results.set(platform, {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;platform, status: \'failed\', error: error.message<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;// Logger les resultats<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;await logPublishResults(postId, results);<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;return results;<br/>'
        '&nbsp;&nbsp;}<br/>'
        '}'
    ))

    story.extend(add_subsection('6.5 Service de calendrier (drag and drop)'))
    story.append(p(
        'Le service de calendrier gere les operations de deplacement d\'evenements via drag and drop. Lorsqu\'un '
        'utilisateur deplace un post dans le calendrier, le service met a jour simultanement l\'evenement calendrier '
        'et la date de publication prevue du post. Les operations sont transactionnelles pour garantir la coherence '
        'des donnees. Si l\'evenement est un jalon (sans post associe), seule la date de l\'evenement est mise a jour.'
    ))
    story.append(code(
        '// src/app/api/calendar/events/[id]/move/route.ts<br/>'
        '<br/>'
        'export async function PUT(request: Request, { params }: { params: { id: string } }) {<br/>'
        '&nbsp;&nbsp;const user = await getAuthUser(request);<br/>'
        '&nbsp;&nbsp;if (!user) return NextResponse.json({ error: \'Non autorise\' }, { status: 401 });<br/>'
        '<br/>'
        '&nbsp;&nbsp;const { newStartDate, newEndDate } = await request.json();<br/>'
        '&nbsp;&nbsp;const eventId = params.id;<br/>'
        '<br/>'
        '&nbsp;&nbsp;// Transaction : mettre a jour evenement + post<br/>'
        '&nbsp;&nbsp;const result = await prisma.$transaction(async (tx) =&gt; {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;const event = await tx.calendarEvent.update({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;where: { id: eventId },<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data: { startDate: new Date(newStartDate),<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;endDate: newEndDate ? new Date(newEndDate) : null }<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;// Si l\'evenement est lie a un post, mettre a jour scheduledDate<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;if (event.postId) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;await tx.post.update({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;where: { id: event.postId },<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data: {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;scheduledDate: new Date(newStartDate),<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;status: \'scheduled\'<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;await createAuditLog({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;entityType: \'CalendarEvent\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;entityId: eventId,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;action: \'move\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;userId: user.id,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;metadata: { newStartDate, newEndDate }<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;return event;<br/>'
        '&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;return NextResponse.json({ event: result });<br/>'
        '}'
    ))

    story.extend(add_subsection('6.6 Middleware d\'authentification'))
    story.append(p(
        'La V2 introduit un middleware Next.js pour centraliser l\'authentification et le controle d\'acces. '
        'Ce middleware intercepte toutes les requetes vers les routes protegees, verifie la validite du token JWT, '
        'et injecte les informations de l\'utilisateur dans les headers de la requete. Cela elimine la duplication '
        'du code d\'authentification dans chaque route handler et garantit une politique de securite uniforme.'
    ))
    story.append(code(
        '// src/middleware.ts<br/>'
        '<br/>'
        'import { NextRequest, NextResponse } from \'next/server\';<br/>'
        'import { verifyToken } from \'@/lib/auth\';<br/>'
        '<br/>'
        'const PUBLIC_PATHS = [\'/api/auth/login\', \'/api/auth/register\', \'/api/health\'];<br/>'
        '<br/>'
        'export async function middleware(request: NextRequest) {<br/>'
        '&nbsp;&nbsp;const { pathname } = request.nextUrl;<br/>'
        '<br/>'
        '&nbsp;&nbsp;// Autoriser les routes publiques<br/>'
        '&nbsp;&nbsp;if (PUBLIC_PATHS.some(p =&gt; pathname.startsWith(p))) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;return NextResponse.next();<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;// Verifier le token JWT<br/>'
        '&nbsp;&nbsp;const token = request.headers.get(\'Authorization\')?.replace(\'Bearer \', \'\');<br/>'
        '&nbsp;&nbsp;if (!token) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;return NextResponse.json({ error: \'Token manquant\' }, { status: 401 });<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;const payload = await verifyToken(token);<br/>'
        '&nbsp;&nbsp;if (!payload) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;return NextResponse.json({ error: \'Token invalide\' }, { status: 401 });<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;// Injecter les infos user dans les headers<br/>'
        '&nbsp;&nbsp;const requestHeaders = new Headers(request.headers);<br/>'
        '&nbsp;&nbsp;requestHeaders.set(\'x-user-id\', payload.userId);<br/>'
        '&nbsp;&nbsp;requestHeaders.set(\'x-user-role\', payload.role);<br/>'
        '&nbsp;&nbsp;requestHeaders.set(\'x-user-email\', payload.email);<br/>'
        '<br/>'
        '&nbsp;&nbsp;return NextResponse.next({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;request: { headers: requestHeaders }<br/>'
        '&nbsp;&nbsp;});<br/>'
        '}<br/>'
        '<br/>'
        'export const config = {<br/>'
        '&nbsp;&nbsp;matcher: \'/api/:path*\'<br/>'
        '};'
    ))

    story.extend(add_subsection('6.7 Scheduler de publications differees'))
    story.append(p(
        'Le scheduler utilise BullMQ pour gerer les publications differees. Lorsqu\'un post est planifie a une '
        'date future, une tache BullMQ est creee avec un delai correspondant. Un worker tourne en permanence pour '
        'traiter la file d\'attente et executer les publications a l\'heure prevue. En cas d\'echec, le worker '
        'effectue des retries avec un backoff exponentiel (3 tentatives maximum) et notifie l\'equipe en cas '
        'd\'echec definitif.'
    ))
    story.append(code(
        '// src/lib/services/scheduler-service.ts<br/>'
        '<br/>'
        'import { Queue, Worker } from \'bullmq\';<br/>'
        '<br/>'
        'const publishQueue = new Queue(\'publish\', { connection: redis });<br/>'
        '<br/>'
        'async function schedulePost(postId: string, publishAt: Date) {<br/>'
        '&nbsp;&nbsp;const delay = publishAt.getTime() - Date.now();<br/>'
        '&nbsp;&nbsp;if (delay &lt; 0) throw new Error(\'La date de publication doit etre dans le futur\');<br/>'
        '<br/>'
        '&nbsp;&nbsp;await publishQueue.add(\'publish-post\', { postId }, {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;delay,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;attempts: 3,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;backoff: { type: \'exponential\', delay: 5000 },<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;removeOnComplete: true,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;removeOnFail: false,<br/>'
        '&nbsp;&nbsp;});<br/>'
        '}<br/>'
        '<br/>'
        '// Worker (tourne en arriere-plan)<br/>'
        'const worker = new Worker(\'publish\', async (job) =&gt; {<br/>'
        '&nbsp;&nbsp;const { postId } = job.data;<br/>'
        '&nbsp;&nbsp;const post = await prisma.post.findUnique({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;where: { id: postId },<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;include: { socialAccount: true }<br/>'
        '&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;if (!post || post.status !== \'scheduled\') {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;return; // Post annule ou deja publie<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;await publishToSocialNetwork(post);<br/>'
        '}, {<br/>'
        '&nbsp;&nbsp;connection: redis,<br/>'
        '&nbsp;&nbsp;concurrency: 5,<br/>'
        '});<br/>'
        '<br/>'
        'worker.on(\'failed\', async (job, err) =&gt; {<br/>'
        '&nbsp;&nbsp;await prisma.post.update({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;where: { id: job.data.postId },<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;data: { status: \'failed\', errorMessage: err.message }<br/>'
        '&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;await sendNotification({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;type: \'slack\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;channel: \'publish_failed\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;message: `Publication echouee pour le post ${job.data.postId}: ${err.message}`<br/>'
        '&nbsp;&nbsp;});<br/>'
        '});'
    ))

    # ════════════════════════════════════════════════════════════
    # 7. PLAN DE MIGRATION V1 vers V2
    # ════════════════════════════════════════════════════════════
    story.extend(add_major_section('7. Plan de migration V1 vers V2'))

    story.append(p(
        'La migration de la V1 vers la V2 est concue pour etre progressive, reversible et transparente pour les '
        'utilisateurs. Le plan se decompose en cinq phases, chacune introduisant un ensemble coherent de changements. '
        'Les phases sont ordonnees par priorite fonctionnelle et par dependance technique. Chaque phase inclut des '
        'tests de non-regression, une documentation des changements et un plan de rollback en cas de probleme.'
    ))

    story.extend(add_subsection('7.1 Phase 1 - Fondations (semaines 1-3)'))
    story.append(p(
        'La premiere phase pose les bases techniques de la V2 sans changer l\'experience utilisateur existante. '
        'Elle comprend la migration de SQLite vers PostgreSQL, l\'ajout du modele Workspace avec la creation '
        'automatique d\'un workspace par defaut, l\'introduction du middleware d\'authentification, et la mise '
        'en place de l\'infrastructure de configuration multi-environnements.'
    ))
    story.append(bullet('Migration SQLite vers PostgreSQL (Prisma migrate)'))
    story.append(bullet('Ajout du modele Workspace et creation automatique du workspace par defaut'))
    story.append(bullet('Migration des LinkedInAccount vers SocialAccount (reconciliation automatique)'))
    story.append(bullet('Ajout du middleware Next.js pour l\'authentification centralisee'))
    story.append(bullet('Mise en place des variables d\'environnement par environnement'))
    story.append(bullet('Ajout de Redis pour BullMQ et le cache de session'))
    story.append(bullet('Tests de non-regression sur toutes les fonctionnalites V1'))

    story.extend(add_subsection('7.2 Phase 2 - Branding et Prompts (semaines 4-6)'))
    story.append(p(
        'La deuxieme phase introduit le systeme de branding editorial et la bibliotheque de prompts. Ces '
        'fonctionnalites ameliorent la qualite de la generation IA sans modifier le workflow existant. Les '
        'utilisateurs peuvent desormais configurer le ton de leur marque et selectionner des templates de '
        'prompts specifiques lors de la generation de contenu.'
    ))
    story.append(bullet('Ajout du modele BrandProfile et de l\'API /api/branding'))
    story.append(bullet('Ajout du modele PromptTemplate et de l\'API /api/prompts'))
    story.append(bullet('Integration du branding dans le systeme de generation IA'))
    story.append(bullet('Ecrans de configuration du branding et des prompts'))
    story.append(bullet('Migration des prompts hardcodes vers la bibliotheque'))
    story.append(bullet('Seed des templates de prompts par defaut'))

    story.extend(add_subsection('7.3 Phase 3 - Calendrier et Medias (semaines 7-10)'))
    story.append(p(
        'La troisieme phase est la plus importante en termes d\'impact utilisateur. Elle introduit le calendrier '
        'editorial, la bibliotheque mediatique et la generation enrichie (carrousels, scripts video, scores). '
        'Le drag and drop est implemente pour le calendrier et l\'association des medias aux posts. Le scheduler '
        'BullMQ est active pour les publications differees.'
    ))
    story.append(bullet('Ajout du modele CalendarEvent et de l\'API /api/calendar'))
    story.append(bullet('Ecran calendrier avec vues mois/semaine/liste'))
    story.append(bullet('Drag and drop via dnd-kit'))
    story.append(bullet('Ajout du modele Media et de l\'API /api/media'))
    story.append(bullet('Upload S3 via MinIO (dev) et AWS S3 (prod)'))
    story.append(bullet('Ecran Media Library avec upload multiple'))
    story.append(bullet('Ajout du modele ContentScore et du service de scoring'))
    story.append(bullet('Generation enrichie : carrousels, scripts video, variantes courtes/longues'))
    story.append(bullet('Mise en place de BullMQ et du scheduler de publications differees'))

    story.extend(add_subsection('7.4 Phase 4 - Analytics et Gouvernance (semaines 11-14)'))
    story.append(p(
        'La quatrieme phase introduit les analytics avances et la gouvernance multi-approbateurs. Le dashboard '
        'est enrichi avec des graphiques detailles sur les performances de publication. Le workflow de validation '
        'evolue vers un systeme multi-etapes avec des approbateurs differents. Les notifications email et Slack '
        'sont activees pour les evenements cles du workflow.'
    ))
    story.append(bullet('Ajout de l\'API /api/analytics avec tous les endpoints'))
    story.append(bullet('Dashboard analytics avec KPI cards et graphiques'))
    story.append(bullet('Ajout du modele ValidationStep et du workflow multi-approbateurs'))
    story.append(bullet('Ecran de workflow de validation avec timeline'))
    story.append(bullet('Approbation en masse et file d\'attente de validation'))
    story.append(bullet('Ajout du modele Notification et du service de notifications'))
    story.append(bullet('Integration email (Resend) et Slack Webhook'))
    story.append(bullet('Preferences de notification par utilisateur'))

    story.extend(add_subsection('7.5 Phase 5 - Multi-reseaux et Industrialisation (semaines 15-18)'))
    story.append(p(
        'La cinquieme et derniere phase prepare l\'extension multi-reseaux et renforce l\'industrialisation de la '
        'plateforme. Les architectures d\'adaptateurs pour X/Twitter, Facebook, Instagram et Threads sont mises '
        'en place. Le monitoring, le logging structure et l\'audit de securite sont renforces. Des tests de charge '
        'sont effectues et la documentation operationnelle est finalisee.'
    ))
    story.append(bullet('Architecture d\'adaptateurs multi-reseaux (interface SocialPublisher)'))
    story.append(bullet('Implementation de l\'adaptateur X/Twitter'))
    story.append(bullet('Preparation des adaptateurs Facebook, Instagram, Threads (stubs)'))
    story.append(bullet('API de publication multi-reseaux'))
    story.append(bullet('Monitoring : health checks, metriques d\'API, alertes'))
    story.append(bullet('Logging structure (pino) avec export vers un systeme de logs centralise'))
    story.append(bullet('Audit de securite : chiffrement des tokens, rotation des secrets'))
    story.append(bullet('Tests de charge et optimisation des performances'))
    story.append(bullet('Documentation operationnelle et runbooks'))

    story.extend(add_subsection('7.6 Script de migration automatise'))
    story.append(p(
        'Un script de migration automatise est fourni pour transformer les donnees V1 en donnees V2. Ce script '
        'gere la migration du schema (ajout des nouvelles tables et colonnes), la migration des donnees (creation '
        'du workspace par defaut, reconciliation des comptes LinkedIn) et la validation post-migration (verification '
        'de l\'integrite des donnees). Le script est idempotent et peut etre relance en cas d\'echec partiel.'
    ))
    story.append(code(
        '// scripts/migrate-v1-to-v2.ts<br/>'
        '<br/>'
        'async function migrateV1toV2() {<br/>'
        '&nbsp;&nbsp;console.log(\'Debut de la migration V1 vers V2...\');<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 1. Creer le workspace par defaut<br/>'
        '&nbsp;&nbsp;const defaultWorkspace = await prisma.workspace.create({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;data: {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;name: \'Espace par defaut\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;slug: \'default\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;isActive: true,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 2. Migrer les utilisateurs vers le workspace par defaut<br/>'
        '&nbsp;&nbsp;const users = await prisma.user.findMany();<br/>'
        '&nbsp;&nbsp;for (const user of users) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;await prisma.workspaceMember.create({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data: {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;workspaceId: defaultWorkspace.id,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;userId: user.id,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;role: user.role === \'admin\' ? \'owner\' : \'member\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 3. Migrer les posts (ajouter workspaceId)<br/>'
        '&nbsp;&nbsp;await prisma.post.updateMany({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;data: { workspaceId: defaultWorkspace.id }<br/>'
        '&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 4. Migrer LinkedInAccount vers SocialAccount<br/>'
        '&nbsp;&nbsp;const accounts = await prisma.linkedInAccount.findMany();<br/>'
        '&nbsp;&nbsp;for (const acc of accounts) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;await prisma.socialAccount.create({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data: {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;workspaceId: defaultWorkspace.id,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;platform: \'linkedin\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;platformUserId: acc.organizationId ?? \'personal\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;displayName: acc.organizationName ?? \'Compte LinkedIn\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;accessToken: acc.accessToken,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;refreshToken: acc.refreshToken,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tokenExpiresAt: acc.tokenExpiresAt,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;isActive: acc.isActive,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 5. Creer les evenements calendrier pour les posts planifies<br/>'
        '&nbsp;&nbsp;const scheduledPosts = await prisma.post.findMany({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;where: { scheduledDate: { not: null } }<br/>'
        '&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;for (const post of scheduledPosts) {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;await prisma.calendarEvent.create({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data: {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;workspaceId: defaultWorkspace.id,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;postId: post.id,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;title: post.subject,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;startDate: post.scheduledDate!,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;eventType: \'post\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;});<br/>'
        '&nbsp;&nbsp;}<br/>'
        '<br/>'
        '&nbsp;&nbsp;// 6. Creer le profil de marque par defaut<br/>'
        '&nbsp;&nbsp;await prisma.brandProfile.create({<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;data: {<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;workspaceId: defaultWorkspace.id,<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;brandTone: \'professional\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;brandVoice: \'\',<br/>'
        '&nbsp;&nbsp;&nbsp;&nbsp;}<br/>'
        '&nbsp;&nbsp;});<br/>'
        '<br/>'
        '&nbsp;&nbsp;console.log(\'Migration V1 vers V2 terminee avec succes !\');<br/>'
        '}'
    ))

    # ════════════════════════════════════════════════════════════
    # 8. STRATEGIE PRODUIT V1 vers V2
    # ════════════════════════════════════════════════════════════
    story.extend(add_major_section('8. Strategie produit V1 vers V2'))

    story.extend(add_subsection('8.1 Positionnement'))
    story.append(p(
        'La V1 est un MVP (Minimum Viable Product) qui a demontre la valeur de l\'automatisation de la creation et '
        'publication de posts LinkedIn. La V2 transforme ce MVP en un produit complet de Content Operations, '
        'positionne comme un outil de gestion editorial professionnelle pour les equipes marketing B2B. Le produit '
        'se differencie par son approche IA-native (generation de contenu intelligente avec scoring), sa gouvernance '
        'avancee (workflows multi-approbateurs) et sa preparation multi-reseaux.'
    ))

    story.extend(add_subsection('8.2 Roadmap produit'))

    roadmap_data = [
        ['Phase', 'Periode', 'Livrables cles', 'KPIs'],
        ['Phase 1 : Fondations', 'S1-S3',
         'PostgreSQL, Workspace, Middleware, Config multi-env',
         'Zero regression V1, temps de reponse API &lt; 200ms'],
        ['Phase 2 : Branding', 'S4-S6',
         'BrandProfile, PromptTemplate, Integration IA branding',
         'Taux d\'adoption du branding &gt; 80%, score qualite moyen &gt; 70'],
        ['Phase 3 : Calendrier', 'S7-S10',
         'Calendrier drag/drop, Media Library, Generation enrichie, Scheduler',
         'Utilisation calendrier quotidienne, uploads medias &gt; 50/semaine'],
        ['Phase 4 : Analytics', 'S11-S14',
         'Dashboard analytics, Workflow multi-etapes, Notifications',
         'Taux de publication reussie &gt; 95%, temps de validation &lt; 24h'],
        ['Phase 5 : Multi-reseaux', 'S15-S18',
         'Adaptateurs sociaux, Monitoring, Audit securite',
         'Couverture multi-reseaux, uptime &gt; 99.5%'],
    ]
    cw9 = [CONTENT_W * r for r in [0.18, 0.08, 0.44, 0.30]]
    story.append(spacer(12))
    story.append(make_table(roadmap_data[0], roadmap_data[1:], cw9))
    story.append(caption('Tableau 26 - Roadmap produit V1 vers V2'))

    story.extend(add_subsection('8.3 Metriques de succes'))
    story.append(p(
        'Le succes de la V2 est mesure selon quatre axes : adoption utilisateur, qualite du contenu, efficacite '
        'operationnelle et fiabilite technique. Chaque axe dispose de KPIs specifiques qui sont suivis via le '
        'dashboard analytics et des outils de monitoring externes (Datadog, Sentry).'
    ))

    kpi_data = [
        ['Axe', 'KPI', 'Cible'],
        ['Adoption', 'Utilisateurs actifs hebdomadaires', 'Augmentation de 50% par rapport a la V1'],
        ['Adoption', 'Taux d\'utilisation du calendrier', '80% des posts planifies via le calendrier'],
        ['Qualite', 'Score moyen des posts publies', 'Superieur a 70/100'],
        ['Qualite', 'Taux d\'utilisation des templates de prompts', 'Superieur a 60%'],
        ['Efficacite', 'Temps moyen de creation d\'un post', 'Inferieur a 15 minutes'],
        ['Efficacite', 'Temps moyen de validation', 'Inferieur a 24 heures'],
        ['Fiabilite', 'Taux de publication reussie', 'Superieur a 95%'],
        ['Fiabilite', 'Uptime de la plateforme', 'Superieur a 99.5%'],
        ['Fiabilite', 'Temps de reponse API (p95)', 'Inferieur a 500ms'],
    ]
    cw10 = [CONTENT_W * r for r in [0.14, 0.40, 0.46]]
    story.append(spacer(12))
    story.append(make_table(kpi_data[0], kpi_data[1:], cw10))
    story.append(caption('Tableau 27 - Metriques de succes de la V2'))

    story.extend(add_subsection('8.4 Model d\'evolution et scalabilite'))
    story.append(p(
        'L\'architecture V2 est concue pour supporter trois niveaux d\'evolution future. Le premier niveau est '
        'l\'enrichissement des fonctionnalites existantes (nouveaux types de contenu IA, nouveaux reseaux sociaux, '
        'nouvelles integrations de notification). Le deuxieme niveau est l\'extraction en microservices si le '
        'trafic l\'exige (service d\'IA dedie, service de publication dedie, service d\'analytics dedie). Le troisieme '
        'niveau est la transformation en plateforme multi-tenant avec SaaSification complete, facturation et gestion '
        'des abonnements.'
    ))
    story.append(bullet('<b>Court terme (6 mois) :</b> Enrichissement des features existantes, ajout de reseaux sociaux'))
    story.append(bullet('<b>Moyen terme (12 mois) :</b> Microservices, API publique, SDK partenaires'))
    story.append(bullet('<b>Long terme (18+ mois) :</b> Multi-tenant SaaS, marketplace de templates IA, analytics predictive'))

    story.extend(add_subsection('8.5 Risques et mitigation'))
    story.append(p(
        'Tout projet d\'evolution majeur comporte des risques identifies qui doivent etre anticipes et maitrises. '
        'Le tableau ci-dessous presente les principaux risques de la migration V1 vers V2 et les strategies de '
        'mitigation associees. Chaque risque est evalue selon sa probabilite et son impact sur le projet.'
    ))

    risk_data = [
        ['Risque', 'Probabilite', 'Impact', 'Mitigation'],
        ['Regression fonctionnelle V1', 'Moyenne', 'Critique',
         'Tests de non-regression automatises, deploiement progressif, rollback rapide'],
        ['Migration de donnees incomplete', 'Faible', 'Critique',
         'Script de migration idempotent, validation post-migration, backup pre-migration'],
        ['Performance degradée PostgreSQL', 'Moyenne', 'Moyen',
         'Index optimises, connection pooling (PgBouncer), requetes N+1 eliminees'],
        ['Echec publications differees', 'Moyenne', 'Moyen',
         'BullMQ avec retries, monitoring temps reel, alertes Slack'],
        ['Resistance au changement', 'Elevee', 'Moyen',
         'Formation utilisateurs, documentation, feedback continu, beta testeurs'],
        ['Securite tokens OAuth', 'Faible', 'Critique',
         'Chiffrement AES-256, rotation automatique, audit trimestriel'],
    ]
    cw11 = [CONTENT_W * r for r in [0.20, 0.10, 0.10, 0.60]]
    story.append(spacer(12))
    story.append(make_table(risk_data[0], risk_data[1:], cw11))
    story.append(caption('Tableau 28 - Risques et strategies de mitigation'))

    return story


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD PDF
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    doc = TocDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title='LinkedInPost V2 - Architecture Technique',
        author='DataSphere Innovation',
        subject='Plateforme de Content Operations V2',
        creator='Z.ai'
    )

    story = build_document()
    doc.multiBuild(story)
    print(f'PDF genere avec succes : {OUTPUT_PATH}')

if __name__ == '__main__':
    main()
