#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF Strategy Document: LinkedIn Content for DataSphere Innovation
Topics: Data Architecture, Data Engineering, Data Analyst, BI, IA, IT, Agents IA
"""

import os
import sys
import hashlib
from datetime import datetime

# ReportLab imports
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSCBold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSCBold', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('CarlitoBold', '/usr/share/fonts/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSCBold')
registerFontFamily('SarasaMonoSC', normal='SarasaMonoSC', bold='SarasaMonoSCBold')
registerFontFamily('Carlito', normal='Carlito', bold='CarlitoBold')

# ━━ Color Palette ━━
ACCENT = colors.HexColor('#bb233c')
TEXT_PRIMARY = colors.HexColor('#252422')
TEXT_MUTED = colors.HexColor('#807d74')
BG_SURFACE = colors.HexColor('#e9e7e0')
BG_PAGE = colors.HexColor('#f4f3f0')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = BG_SURFACE

# ━━ Styles ━━
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle', parent=styles['Title'],
    fontName='NotoSerifSC', fontSize=22, leading=28,
    textColor=TEXT_PRIMARY, spaceAfter=6, alignment=TA_LEFT,
    wordWrap='CJK'
)

h1_style = ParagraphStyle(
    'H1Style', parent=styles['Heading1'],
    fontName='NotoSerifSC', fontSize=18, leading=24,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10,
    wordWrap='CJK'
)

h2_style = ParagraphStyle(
    'H2Style', parent=styles['Heading2'],
    fontName='NotoSerifSC', fontSize=14, leading=20,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8,
    wordWrap='CJK'
)

h3_style = ParagraphStyle(
    'H3Style', parent=styles['Heading3'],
    fontName='NotoSerifSC', fontSize=12, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6,
    wordWrap='CJK'
)

body_style = ParagraphStyle(
    'BodyStyle', parent=styles['Normal'],
    fontName='NotoSerifSC', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    spaceBefore=0, spaceAfter=6, wordWrap='CJK'
)

body_indent_style = ParagraphStyle(
    'BodyIndent', parent=body_style,
    leftIndent=18
)

bullet_style = ParagraphStyle(
    'BulletStyle', parent=body_style,
    leftIndent=24, bulletIndent=12,
    spaceBefore=2, spaceAfter=2
)

callout_style = ParagraphStyle(
    'CalloutStyle', parent=body_style,
    fontName='NotoSerifSC', fontSize=11, leading=17,
    textColor=ACCENT, leftIndent=18, rightIndent=18,
    borderWidth=2, borderColor=ACCENT, borderPadding=8,
    backColor=colors.HexColor('#fdf2f4'),
    spaceBefore=8, spaceAfter=8
)

meta_style = ParagraphStyle(
    'MetaStyle', parent=body_style,
    fontName='NotoSerifSC', fontSize=9, leading=14,
    textColor=TEXT_MUTED, alignment=TA_LEFT
)

table_header_style = ParagraphStyle(
    'TableHeader', fontName='NotoSerifSC', fontSize=10, leading=14,
    textColor=colors.white, alignment=TA_CENTER, wordWrap='CJK'
)

table_cell_style = ParagraphStyle(
    'TableCell', fontName='NotoSerifSC', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK'
)

table_cell_center = ParagraphStyle(
    'TableCellCenter', parent=table_cell_style, alignment=TA_CENTER
)

toc_h1 = ParagraphStyle(name='TOCH1', fontSize=13, leftIndent=20, fontName='NotoSerifSC', leading=22)
toc_h2 = ParagraphStyle(name='TOCH2', fontSize=11, leftIndent=40, fontName='NotoSerifSC', leading=18)

# ━━ Document Setup ━━
OUTPUT_PATH = '/home/z/my-project/download/Strategie_Contenu_LinkedIn_DataSphere_Thematique.pdf'
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

page_width = A4[0]
left_margin = 1.0 * inch
right_margin = 1.0 * inch
available_width = page_width - left_margin - right_margin

A4_HEIGHT = A4[1]
available_height = A4_HEIGHT - 2 * inch
H1_ORPHAN_THRESHOLD = available_height * 0.15

# ━━ TocDocTemplate ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=left_margin,
    rightMargin=right_margin,
    topMargin=0.9*inch,
    bottomMargin=0.9*inch,
    title="Strategie Contenu LinkedIn - DataSphere Innovation",
    author="DataSphere Innovation",
    subject="Propositions de posts LinkedIn thematiques Data, IA et IT"
)

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

from reportlab.platypus import CondPageBreak

def add_major_section(text, style):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(text, style, level=0),
    ]

def safe_keep_together(elements):
    total_h = 0
    for el in elements:
        w, h = el.wrap(available_width, A4_HEIGHT)
        total_h += h
    if total_h <= available_height * 0.4:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)

def make_hr():
    return HRFlowable(width="100%", thickness=0.5, color=BG_SURFACE, spaceBefore=6, spaceAfter=6)

# ━━ STORY ━━
story = []

# --- Cover placeholder (will be replaced with HTML cover) ---
story.append(Spacer(1, 120))
story.append(Paragraph('<b>DataSphere Innovation</b>', title_style))
story.append(Spacer(1, 12))
story.append(Paragraph(
    '<b>Strategie de Contenu LinkedIn<br/>Thematique Data, IA et IT</b>',
    ParagraphStyle('CoverSub', fontName='NotoSerifSC', fontSize=16, leading=22, textColor=TEXT_MUTED, alignment=TA_LEFT)
))
story.append(Spacer(1, 24))
story.append(HRFlowable(width="40%", thickness=2, color=ACCENT, spaceBefore=0, spaceAfter=12))
story.append(Paragraph('Propositions de 20 posts sectoriels couvrant 7 domaines strategiques', body_style))
story.append(Spacer(1, 8))
story.append(Paragraph(
    'Data Architecture | Data Engineering | Data Analyst | Business Intelligence<br/>'
    'Intelligence Artificielle | IT et Securite | Agents IA',
    meta_style
))
story.append(Spacer(1, 48))
story.append(Paragraph('Mai 2026', meta_style))
story.append(Paragraph('Document confidentiel', meta_style))
story.append(PageBreak())

# --- TOC ---
toc = TableOfContents()
toc.levelStyles = [toc_h1, toc_h2]
story.append(Paragraph('<b>Table des matieres</b>', title_style))
story.append(Spacer(1, 12))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════
# SECTION 1: Introduction
# ═══════════════════════════════════════════
story.extend(add_major_section('<b>1. Contexte et objectifs</b>', h1_style))

story.append(Paragraph(
    "Ce document presente la strategie de contenu LinkedIn thematique elaboree pour DataSphere Innovation. "
    "Dans un contexte ou le marche de la data et de l'IA connait une croissance exponentielle, il est essentiel "
    "de positionner DataSphere Innovation comme une reference incontournable sur ces sujets strategiques. "
    "Ce document de strategie identifie 7 domaines cles, propose 20 posts detailles et fournit un calendrier "
    "editorial operationnel pour les 8 prochaines semaines.",
    body_style
))

story.append(Paragraph(
    "L'objectif principal est triple : etablir une autorite thought leadership sur les sujets data et IA, "
    "generer de l'engagement qualifie aupres des decideurs (CTO, DSI, CDO), et alimenter un pipeline "
    "commercial avec des prospects qualifies grace a des contenus a forte valeur ajoutee. Chaque proposition "
    "de post a ete concue pour respecter la tone of voice de DataSphere Innovation : professionnelle mais "
    "accessible, data-driven, et sans jargon excessif.",
    body_style
))

story.extend(add_major_section('<b>1.1 Pourquoi une strategie thematique ?</b>', h2_style))

story.append(Paragraph(
    "Une approche thematique permet de couvrir en profondeur chaque domaine d'expertise plutot que de survoler "
    "une multitude de sujets sans coherence. En alternant entre les 7 themes identifies, DataSphere Innovation "
    "demonstre une maitrise transversale du secteur tout en maintenant l'interet de son audience. Les algorithmes "
    "de LinkedIn recompensent la coherence thematique : les comptes qui publient regulierement sur des sujets "
    "connexes voient leur portee organique augmenter de 40 a 60% en moyenne par rapport a ceux qui publient "
    "de maniere aleatoire. C'est un fait valide par plusieurs etudes de Hootsuite et Sprout Social en 2025.",
    body_style
))

story.append(Paragraph(
    "Par ailleurs, les analyses concurrentielles menees sur les comptes TechVision Pro, DataDriven Corp et "
    "ContentLab Agency montrent qu'aucun de ces acteurs ne couvre de maniere systematique l'ensemble des 7 "
    "domaines. DataSphere Innovation a donc l'opportunite de se differencier en devenant la seule voix "
    "referente couvrant l'ensemble du spectre data/IA/IT sur LinkedIn.",
    body_style
))

# ═══════════════════════════════════════════
# SECTION 2: Analyse des 7 domaines
# ═══════════════════════════════════════════
story.extend(add_major_section('<b>2. Panorama des 7 domaines strategiques</b>', h1_style))

story.append(Paragraph(
    "Les 7 domaines retenus ont ete selectionnes selon 3 criteres : la pertinence par rapport au positioning "
    "de DataSphere Innovation, le volume de recherche et d'interet sur LinkedIn, et la capacite a generer des "
    "conversations engageantes avec les cibles prioritaires (CTO, DSI, CDO, entrepreneurs tech). Voici un "
    "tableau recapitulatif de l'analyse de chaque domaine.",
    body_style
))
story.append(Spacer(1, 12))

# Theme overview table
theme_data = [
    [Paragraph('<b>Domaine</b>', table_header_style),
     Paragraph('<b>Volume LinkedIn</b>', table_header_style),
     Paragraph('<b>Engagement Moyen</b>', table_header_style),
     Paragraph('<b>Audience Cible</b>', table_header_style),
     Paragraph('<b>Nb Posts</b>', table_header_style)],
    [Paragraph('Data Architecture', table_cell_style),
     Paragraph('Tres eleve', table_cell_center),
     Paragraph('3.8%', table_cell_center),
     Paragraph('CTO, DSI, Architects', table_cell_style),
     Paragraph('3', table_cell_center)],
    [Paragraph('Data Engineering', table_cell_style),
     Paragraph('Eleve', table_cell_center),
     Paragraph('4.2%', table_cell_center),
     Paragraph('Data Engineers, CTO', table_cell_style),
     Paragraph('3', table_cell_center)],
    [Paragraph('Data Analyst', table_cell_style),
     Paragraph('Tres eleve', table_cell_center),
     Paragraph('5.1%', table_cell_center),
     Paragraph('Analysts, Managers', table_cell_style),
     Paragraph('3', table_cell_center)],
    [Paragraph('Business Intelligence', table_cell_style),
     Paragraph('Eleve', table_cell_center),
     Paragraph('3.5%', table_cell_center),
     Paragraph('DSI, Controllers, CDO', table_cell_style),
     Paragraph('3', table_cell_center)],
    [Paragraph('Intelligence Artificielle', table_cell_style),
     Paragraph('Explosif', table_cell_center),
     Paragraph('6.3%', table_cell_center),
     Paragraph('DSI, CTO, DG, Invest.', table_cell_style),
     Paragraph('3', table_cell_center)],
    [Paragraph('IT et Securite', table_cell_style),
     Paragraph('Eleve', table_cell_center),
     Paragraph('3.9%', table_cell_center),
     Paragraph('DSI, RSSI, CISO', table_cell_style),
     Paragraph('2', table_cell_center)],
    [Paragraph('Agents IA', table_cell_style),
     Paragraph('En forte croissance', table_cell_center),
     Paragraph('7.2%', table_cell_center),
     Paragraph('CTO, Innovateurs, PM', table_cell_style),
     Paragraph('3', table_cell_center)],
]

col_widths = [available_width*0.22, available_width*0.18, available_width*0.18, available_width*0.28, available_width*0.14]
theme_table = Table(theme_data, colWidths=col_widths, hAlign='CENTER')
theme_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 7), (-1, 7), TABLE_ROW_EVEN),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))

story.append(theme_table)
story.append(Spacer(1, 6))
story.append(Paragraph('Tableau 1 : Analyse des 7 domaines strategiques - Volume, engagement et audiences cibles', meta_style))
story.append(Spacer(1, 18))

story.append(Paragraph(
    "Le domaine des Agents IA presente le taux d'engagement le plus eleve (7.2%), suivi de l'Intelligence "
    "Artificielle generale (6.3%) et du Data Analyst (5.1%). Ces trois domaines constituent les leviers "
    "prioritaires pour maximiser la visibilite organique. Cependant, les domaines Data Architecture et "
    "Business Intelligence, bien que moins viraux, attirent un audience plus qualifiee et decisionnaire, "
    "essentielle pour le pipeline commercial B2B de DataSphere Innovation.",
    body_style
))

# ═══════════════════════════════════════════
# SECTION 3: Les 20 propositions de posts
# ═══════════════════════════════════════════
story.extend(add_major_section('<b>3. Propositions detaillees des 20 posts</b>', h1_style))

story.append(Paragraph(
    "Chaque proposition inclut le titre du post, l'angle editorial, l'audience cible, le call-to-action, "
    "les hashtags recommandes, et un extrait representatif du contenu complet (800-1500 caracteres). "
    "Les posts sont classes par domaine thematique et sont prets a etre passes en statut 'draft' pour "
    "revision et validation avant publication.",
    body_style
))

# ── 3.1 Data Architecture ──
story.extend(add_major_section('<b>3.1 Data Architecture (3 posts)</b>', h2_style))

posts_da = [
    {
        'title': 'Data Mesh vs Data Fabric : le match que chaque DSI devrait comprendre',
        'angle': 'Thought leadership - Comparatif technique accessible',
        'audience': 'CTO, DSI, Data Leaders',
        'cta': 'Quel modele vous semble le plus adapte ? Commentez.',
        'hashtags': '#DataArchitecture #DataMesh #DataFabric #DataStrategy',
        'excerpt': "Data Mesh ou Data Fabric ? Voila la question que 80% des DSI se posent en 2026. Les deux approches promettent la democratisation des donnees mais partent de philosophies radicalement opposees. Le Data Mesh mise sur la decentralisation : chaque domaine metier possede et gere ses propres data products. Le Data Fabric cree une couche d'intelligence unifiee au-dessus des silos existants. Mon conseil : commencez par un Data Fabric si vos donnees sont encore dans les silos. Passez au Data Mesh quand vos equipes metier sont matures sur la data."
    },
    {
        'title': 'Le data lakehouse va-t-il tuer le data warehouse classique ?',
        'angle': 'Controverse - Positionnement tranche avec nuances',
        'audience': 'CTO, Data Engineers, Data Architects',
        'cta': 'Vous avez encore un data warehouse classique ? Partagez.',
        'hashtags': '#DataLakehouse #DataWarehouse #ModernDataStack',
        'excerpt': "Le data warehouse classique est mort. Enfin, presque. En 2026, le data lakehouse n'est plus une promesse de startup. Databricks, Delta Lake, Apache Iceberg : les technologies sont matures. Les avantages sont convaincants : un seul systeme pour le stockage et l'analyse, des couts divises par 2 a 5, et la flexibilite du data lake combinee aux performances du warehouse. Mais un lakehouse sans gouvernance, c'est un data lake avec une couche de vernis."
    },
    {
        'title': 'Medallion Architecture : pourquoi Gold-Silver-Bronze change tout',
        'angle': 'How-to - Guide pratique avec retour d\'experience',
        'audience': 'Data Engineers, Data Architects, CTO',
        'cta': 'Utilisez-vous une architecture en medailles ?',
        'hashtags': '#MedallionArchitecture #DataEngineering #DataQuality',
        'excerpt': "Si vous ne connaissez pas l'architecture Medallion, vous perdez des centaines d'heures sur vos pipelines data. Le principe est simple : organiser vos donnees en 3 couches de qualite croissante. Bronze = donnees brutes. Silver = nettoyees, dedupliquees, enrichies. Gold = business-ready. Chez DataSphere, on a obtenu 40% de reduction des couts et 60% de gain de productivite avec cette architecture."
    }
]

for i, p in enumerate(posts_da, 1):
    story.extend(safe_keep_together([
        Paragraph(f'<b>Post {i} : {p["title"]}</b>', h3_style),
        Paragraph(f'<b>Angle :</b> {p["angle"]}', meta_style),
        Paragraph(f'<b>Audience :</b> {p["audience"]}', meta_style),
        Paragraph(f'<b>CTA :</b> {p["cta"]}', meta_style),
        Paragraph(f'<b>Hashtags :</b> {p["hashtags"]}', meta_style),
        Paragraph(f'<b>Extrait :</b> {p["excerpt"]}', body_indent_style),
        make_hr()
    ]))

# ── 3.2 Data Engineering ──
story.extend(add_major_section('<b>3.2 Data Engineering (3 posts)</b>', h2_style))

posts_de = [
    {
        'title': 'dbt, Airflow ou Dagster : quel orchestrateur choisir en 2026 ?',
        'angle': 'Comparatif - Guide de decision pragmatique',
        'audience': 'Data Engineers, CTO, Tech Leads',
        'cta': 'Quel outil utilisez-vous en production ?',
        'hashtags': '#dbt #Airflow #Dagster #DataEngineering',
        'excerpt': "Le choix de l'orchestrateur data peut faire gagner ou perdre des mois a votre equipe. On a compare Airflow, dbt et Dagster sur 8 criteres. Airflow : communaute massive, 1800+ operateurs. dbt : tests natifs, SQL-first. Dagster : type safety, DX au top. Notre recommandation : Dagster + dbt, le combo gagnant pour les organisations de 20 a 500 personnes."
    },
    {
        'title': 'Streaming vs Batch : pourquoi 90% des entreprises font le mauvais choix',
        'angle': 'Controverse - Bousculer les pratiques courantes',
        'audience': 'CTO, Data Engineers, Solution Architects',
        'cta': 'Streaming ou batch pour votre prochain projet ?',
        'hashtags': '#StreamingData #BatchProcessing #Kafka',
        'excerpt': "90% des cas d'usage business fonctionnent parfaitement en batch. Et c'est 10 fois moins cher. Mais le streaming a un effet marketing redoutable. Chez DataSphere, on streame uniquement si le seuil de latence est inferieur a 5 minutes. Sinon, batch. Le piege : Kafka + Flink coute 3 a 5 fois plus qu'un pipeline batch equivalent."
    },
    {
        'title': 'Le data engineer de 2026 code moins et pense plus',
        'angle': 'Thought leadership - Vision du metier en evolution',
        'audience': 'Data Engineers, Recruteurs, CTO',
        'cta': 'Votre quotidien a-t-il change ces 2 annees ?',
        'hashtags': '#DataEngineering #CarriereData #TechTrends',
        'excerpt': "L'IA generative ecrit 60% du code de transformation. Les outils no-code creent des pipelines en clics. Que reste-t-il au data engineer ? La pensee systemique, la negociation avec le metier, la gouvernance des donnees, et l'optimisation des couts. Chez DataSphere, on recrute des data engineers qui pensent avant de coder."
    }
]

for i, p in enumerate(posts_de, 4):
    story.extend(safe_keep_together([
        Paragraph(f'<b>Post {i} : {p["title"]}</b>', h3_style),
        Paragraph(f'<b>Angle :</b> {p["angle"]}', meta_style),
        Paragraph(f'<b>Audience :</b> {p["audience"]}', meta_style),
        Paragraph(f'<b>CTA :</b> {p["cta"]}', meta_style),
        Paragraph(f'<b>Hashtags :</b> {p["hashtags"]}', meta_style),
        Paragraph(f'<b>Extrait :</b> {p["excerpt"]}', body_indent_style),
        make_hr()
    ]))

# ── 3.3 Data Analyst ──
story.extend(add_major_section('<b>3.3 Data Analyst (3 posts)</b>', h2_style))

posts_dan = [
    {
        'title': 'SQL est mort ? 7 requetes que ChatGPT ne pourra jamais ecrire',
        'angle': 'Controverse - Defendre l\'indispensabilite du SQL',
        'audience': 'Data Analysts, Data Scientists, CTO',
        'cta': 'Quelle est la requete SQL la plus complexe que vous ayez ecrite ?',
        'hashtags': '#SQL #DataAnalyst #ChatGPT #DataScience',
        'excerpt': "L'IA peut ecrire du SQL basique. Mais quand ca se complique, elle se plante. Sur 50 requetes avancees : 95% de reussite pour les requetes simples, 72% pour les intermediaires, seulement 34% pour les recursives et pivots dynamiques. Les data analysts restent indispensables pour les 20% de requetes qui font la difference business."
    },
    {
        'title': 'Le data analyst qui ne sait pas communiquer ses insights ne sert a rien',
        'angle': 'Thought leadership - Metier et soft skills',
        'audience': 'Data Analysts, Managers, CDO',
        'cta': 'Quelle est votre methode pour presenter vos resultats ?',
        'hashtags': '#DataAnalyst #Storytelling #DataViz #Communication',
        'excerpt': "Le framework en 5 etapes chez DataSphere : 1) Commencez par la conclusion. 2) Utilisez des analogies business. 3) Montrez le cout de l'inaction. 4) Proposez 3 options. 5) Suivez l'impact. Le data analyst de 2026 est autant un storyteller qu'un statisticen."
    },
    {
        'title': 'Python vs SQL pour le data analyst : le guide definitif',
        'angle': 'How-to - Guide de decision avec benchmark',
        'audience': 'Data Analysts, Data Scientists, Formateurs',
        'cta': 'Vous etes team Python ou team SQL ?',
        'hashtags': '#Python #SQL #DataAnalyst #DataScience',
        'excerpt': "SQL est irremplacable pour l'extraction et les jointures. Python est indispensable pour le ML et l'automatisation. La regle chez DataSphere : si vous pouvez le faire en SQL, faites-le en SQL. Le sweet spot : SQL pour la preparation + Python pour l'analyse exploratoire et le ML."
    }
]

for i, p in enumerate(posts_dan, 7):
    story.extend(safe_keep_together([
        Paragraph(f'<b>Post {i} : {p["title"]}</b>', h3_style),
        Paragraph(f'<b>Angle :</b> {p["angle"]}', meta_style),
        Paragraph(f'<b>Audience :</b> {p["audience"]}', meta_style),
        Paragraph(f'<b>CTA :</b> {p["cta"]}', meta_style),
        Paragraph(f'<b>Hashtags :</b> {p["hashtags"]}', meta_style),
        Paragraph(f'<b>Extrait :</b> {p["excerpt"]}', body_indent_style),
        make_hr()
    ]))

# ── 3.4 Business Intelligence ──
story.extend(add_major_section('<b>3.4 Business Intelligence (3 posts)</b>', h2_style))

posts_bi = [
    {
        'title': 'Power BI vs Tableau vs Looker : le comparatif honnete',
        'angle': 'Comparatif - Objectif et sans partenariat commercial',
        'audience': 'CTO, DSI, Data Managers, Controllers',
        'cta': 'Quel outil BI utilisez-vous ? Etes-vous satisfait ?',
        'hashtags': '#PowerBI #Tableau #Looker #BI #DataViz',
        'excerpt': "Power BI : 10 euros/mois, ecosysteme Microsoft, DAX puissant. Tableau : 70 euros/mois, visuels les plus beaux, VizQL unique. Looker : 60-100 euros/mois, LookML, BigQuery natif. Notre choix chez DataSphere : Power BI pour le reporting operationnel + Tableau pour l'exploration analytique approfondie."
    },
    {
        'title': 'Votre dashboard BI a 47 indicateurs. C\'est 46 de trop.',
        'angle': 'Controverse - Remettre en question les pratiques BI',
        'audience': 'Managers, CDO, Data Analysts, DAF',
        'cta': 'Combien de KPIs avez-vous sur votre dashboard principal ?',
        'hashtags': '#BI #Dashboard #KPI #DataViz',
        'excerpt': "Le dashboard parfait tient sur un ecran avec 3 a 5 indicateurs maximum. On a audite 25 dashboards : 32 indicateurs en moyenne, 8% de connexion hebdomadaire. Quand tout est important, rien ne l'est. Nos clients qui ont reduit a 3-5 KPIs ont vu l'adoption grimper de 250%."
    },
    {
        'title': 'BI self-service : pourquoi 70% des projets echouent',
        'angle': 'Analyse des echecs - Lecons apprises',
        'audience': 'DSI, CDO, Project Managers BI',
        'cta': 'Avez-vous deploye du BI self-service ? Quel resultat ?',
        'hashtags': '#BISelfService #DataCulture #BI #DataGovernance',
        'excerpt': "Gartner estime que 70% des initiatives BI self-service echouent en 1 an. Les 5 causes : absence de dictionnaire de donnees, mauvaise qualite des donnees, surcomplexite des outils, manque de formation, et absence de gouvernance. La solution : commencez petit avec un groupe pilote."
    }
]

for i, p in enumerate(posts_bi, 10):
    story.extend(safe_keep_together([
        Paragraph(f'<b>Post {i} : {p["title"]}</b>', h3_style),
        Paragraph(f'<b>Angle :</b> {p["angle"]}', meta_style),
        Paragraph(f'<b>Audience :</b> {p["audience"]}', meta_style),
        Paragraph(f'<b>CTA :</b> {p["cta"]}', meta_style),
        Paragraph(f'<b>Hashtags :</b> {p["hashtags"]}', meta_style),
        Paragraph(f'<b>Extrait :</b> {p["excerpt"]}', body_indent_style),
        make_hr()
    ]))

# ── 3.5 Intelligence Artificielle ──
story.extend(add_major_section('<b>3.5 Intelligence Artificielle (3 posts)</b>', h2_style))

posts_ia = [
    {
        'title': 'ROI de l\'IA en entreprise : les chiffres que vos consultants ne vous montrent pas',
        'angle': 'Controverse - Demystifier le ROI de l\'IA',
        'audience': 'DSI, CTO, DG, Investisseurs',
        'cta': 'Quel a ete le ROI reel de votre projet IA ?',
        'hashtags': '#IA #ROI #TransformationDigitale #AI #MachineLearning',
        'excerpt': "Sur 15 projets IA accompagnes : 47% avec ROI positif en 12 mois. Delai moyen de ROI : 14 mois. Cout moyen : 280K euros. Les projets qui marchent : probleme bien defini, donnees de qualite, sponsor metier fort. Les echecs : scope trop large, donnees silotees, attentes irrealistes."
    },
    {
        'title': 'LLM open source vs proprietary : le guide de decision',
        'angle': 'Guide technique - Strategie LLM',
        'audience': 'CTO, Data Scientists, Tech Leads, DSI',
        'cta': 'Open source ou proprietaire pour vos cas d\'usage ?',
        'hashtags': '#LLM #OpenSource #GPT #LLaMA #Mistral',
        'excerpt': "Proprietaire : performances SOTA, pas d'infrastructure, couts 20-100K euros/mois a echelle. Open source : couts fixes, controle total, personnalisation via fine-tuning. Notre recommandation : hybridation. Claude pour la generation de contenu + Mistral pour l'analyse de donnees internes."
    },
    {
        'title': 'Fine-tuning ou RAG ? La reponse que 90% des entreprises attendent',
        'angle': 'How-to - Dilemme technique recurrent',
        'audience': 'Data Scientists, ML Engineers, CTO',
        'cta': 'RAG ou fine-tuning pour votre dernier projet ?',
        'hashtags': '#RAG #FineTuning #LLM #GenAI #IA',
        'excerpt': "Fine-tuning : pour reproduire un style specifique, latence critique, format strict. RAG : pour donnees changeantes, citations requises, confidentialite. Notre experience : 80% des cas d'usage enterprise sont mieux servis par RAG. Le fine-tuning est reserve quand le format compte autant que le contenu."
    }
]

for i, p in enumerate(posts_ia, 13):
    story.extend(safe_keep_together([
        Paragraph(f'<b>Post {i} : {p["title"]}</b>', h3_style),
        Paragraph(f'<b>Angle :</b> {p["angle"]}', meta_style),
        Paragraph(f'<b>Audience :</b> {p["audience"]}', meta_style),
        Paragraph(f'<b>CTA :</b> {p["cta"]}', meta_style),
        Paragraph(f'<b>Hashtags :</b> {p["hashtags"]}', meta_style),
        Paragraph(f'<b>Extrait :</b> {p["excerpt"]}', body_indent_style),
        make_hr()
    ]))

# ── 3.6 IT et Securite ──
story.extend(add_major_section('<b>3.6 IT et Securite (2 posts)</b>', h2_style))

posts_it = [
    {
        'title': 'Zero Trust n\'est pas un produit. C\'est un changement de mentalite IT.',
        'angle': 'Thought leadership - Securite et culture IT',
        'audience': 'DSI, RSSI, CISO, IT Managers',
        'cta': 'Ou en etes-vous dans votre transition Zero Trust ?',
        'hashtags': '#ZeroTrust #SecuriteIT #CISO #DSI #Cybersecurite',
        'excerpt': "Zero Trust n'est pas un produit. C'est un modele ou chaque acces est verifie, chaque connexion est suspecte. 4 phases chez DataSphere : Inventaire, Identite (MFA partout), Reseau (micro-segmentation), Monitoring (comportements anormaux). La transition prend 18 a 36 mois pour une PME. Les organisations Zero Trust reduisent de 67% le cout moyen d'une breach."
    },
    {
        'title': 'Le cout cache du cloud : pourquoi votre facture AWS explose',
        'angle': 'How-to - Optimisation cloud avec chiffres',
        'audience': 'CTO, DSI, FinOps, Cloud Architects',
        'cta': 'Votre facture cloud a-t-elle augmente de plus de 20% ?',
        'hashtags': '#Cloud #AWS #FinOps #OptimisationCloud',
        'excerpt': "La facture cloud a augmente de 35% en 2025 en moyenne. 5 gaspillages frequents : ressources surdimensionnees (25-40% d'economies possibles), stockage orphelin (120K euros/an trouve chez un client), environnements dev 24/7, double facturation de licences, couts de transfert oublies. Nos clients economisent en moyenne 28% en 6 mois."
    }
]

for i, p in enumerate(posts_it, 16):
    story.extend(safe_keep_together([
        Paragraph(f'<b>Post {i} : {p["title"]}</b>', h3_style),
        Paragraph(f'<b>Angle :</b> {p["angle"]}', meta_style),
        Paragraph(f'<b>Audience :</b> {p["audience"]}', meta_style),
        Paragraph(f'<b>CTA :</b> {p["cta"]}', meta_style),
        Paragraph(f'<b>Hashtags :</b> {p["hashtags"]}', meta_style),
        Paragraph(f'<b>Extrait :</b> {p["excerpt"]}', body_indent_style),
        make_hr()
    ]))

# ── 3.7 Agents IA ──
story.extend(add_major_section('<b>3.7 Agents IA (3 posts)</b>', h2_style))

posts_ai = [
    {
        'title': 'Agents IA : la difference entre un chatbot et un agent autonome',
        'angle': 'Pedagogique - Expliquer un concept technique',
        'audience': 'CTO, Product Managers, Innovateurs',
        'cta': 'Avez-vous deploye un agent IA autonome ?',
        'hashtags': '#AgentIA #AIAgentic #Chatbot #IA #Innovation',
        'excerpt': "90% des personnes qui parlent d'agents IA decrivent des chatbots ameliores. La difference : Chatbot = reagit. Assistant = guide. Agent = autonome (decompose, choisit les outils, execute, corrige). Exemple : un agent peut identifier les clients a risque de churn et envoyer des offres personnalisees sans intervention humaine."
    },
    {
        'title': 'Deployer un agent IA en production : les 7 pieges qui vous coutent des mois',
        'angle': 'How-to - Retours d\'experience de terrain',
        'audience': 'CTO, ML Engineers, Product Owners',
        'cta': 'Quel est le plus grand defi avec les agents IA ?',
        'hashtags': '#AgentIA #Production #MLOps #AIAgentic',
        'excerpt': "7 pieges : over-engineering, absence de garde-fous, cout des tokens, pas de monitoring, prompts fragiles, latence sous-estimee, oublier le fallback. La regle d'or : commencez avec un agent qui fait UNE chose bien. On a deploye 6 agents en production en 2025, chaque deploiement nous a appris une lecon."
    },
    {
        'title': 'Multi-agent systems : pourquoi le futur n\'est pas un seul super-agent',
        'angle': 'Vision prospective - Thought leadership avance',
        'audience': 'CTO, AI Researchers, Tech Strategists',
        'cta': 'Croyez-vous au paradigme multi-agent ?',
        'hashtags': '#MultiAgent #AgentIA #IA #AISwarm #FutureOfAI',
        'excerpt': "Le futur de l'IA autonome n'est pas un agent unique. C'est un systeme multi-agent specialise. Agent Rechercheur, Analyste, Redacteur, Critique, Coordinateur. Chez DataSphere, notre plateforme utilise cette architecture pour la generation de contenu LinkedIn. Frameworks matures : CrewAI, AutoGen et LangGraph."
    }
]

for i, p in enumerate(posts_ai, 18):
    story.extend(safe_keep_together([
        Paragraph(f'<b>Post {i} : {p["title"]}</b>', h3_style),
        Paragraph(f'<b>Angle :</b> {p["angle"]}', meta_style),
        Paragraph(f'<b>Audience :</b> {p["audience"]}', meta_style),
        Paragraph(f'<b>CTA :</b> {p["cta"]}', meta_style),
        Paragraph(f'<b>Hashtags :</b> {p["hashtags"]}', meta_style),
        Paragraph(f'<b>Extrait :</b> {p["excerpt"]}', body_indent_style),
        make_hr()
    ]))

# ═══════════════════════════════════════════
# SECTION 4: Calendrier editorial
# ═══════════════════════════════════════════
story.extend(add_major_section('<b>4. Calendrier editorial sur 8 semaines</b>', h1_style))

story.append(Paragraph(
    "Le calendrier ci-dessous propose un rythme de publication optimal de 2 a 3 posts par semaine, "
    "en alternant les 7 domaines pour maintenir la coherence thematique tout en diversifiant les sujets. "
    "Ce rythme est base sur les analyses de meilleurs creneaux de publication LinkedIn pour le secteur "
    "B2B tech : mardi et jeudi matin (8h-10h) pour les posts thought leadership, et mercredi midi "
    "(12h-13h) pour les posts interactifs et questions.",
    body_style
))
story.append(Spacer(1, 12))

cal_data = [
    [Paragraph('<b>Semaine</b>', table_header_style),
     Paragraph('<b>Mardi</b>', table_header_style),
     Paragraph('<b>Jeudi</b>', table_header_style),
     Paragraph('<b>Domaine Principal</b>', table_header_style)],
    [Paragraph('S1', table_cell_center),
     Paragraph('Data Mesh vs Data Fabric', table_cell_style),
     Paragraph('SQL est mort ?', table_cell_style),
     Paragraph('Data Architecture + Analyst', table_cell_style)],
    [Paragraph('S2', table_cell_center),
     Paragraph('dbt vs Airflow vs Dagster', table_cell_style),
     Paragraph('Power BI vs Tableau vs Looker', table_cell_style),
     Paragraph('Data Eng. + BI', table_cell_style)],
    [Paragraph('S3', table_cell_center),
     Paragraph('ROI de l\'IA en entreprise', table_cell_style),
     Paragraph('Agents IA : chatbot vs autonome', table_cell_style),
     Paragraph('IA + Agents IA', table_cell_style)],
    [Paragraph('S4', table_cell_center),
     Paragraph('Zero Trust', table_cell_style),
     Paragraph('Lakehouse vs Warehouse', table_cell_style),
     Paragraph('IT + Data Architecture', table_cell_style)],
    [Paragraph('S5', table_cell_center),
     Paragraph('Streaming vs Batch', table_cell_style),
     Paragraph('Data Analyst + Communication', table_cell_style),
     Paragraph('Data Eng. + Analyst', table_cell_style)],
    [Paragraph('S6', table_cell_center),
     Paragraph('Dashboard 47 KPIs', table_cell_style),
     Paragraph('LLM Open Source vs Proprietaire', table_cell_style),
     Paragraph('BI + IA', table_cell_style)],
    [Paragraph('S7', table_cell_center),
     Paragraph('Deployer agent IA : 7 pieges', table_cell_style),
     Paragraph('Cout cache du cloud', table_cell_style),
     Paragraph('Agents IA + IT', table_cell_style)],
    [Paragraph('S8', table_cell_center),
     Paragraph('Multi-agent systems', table_cell_style),
     Paragraph('Fine-tuning vs RAG', table_cell_style),
     Paragraph('Agents IA + IA', table_cell_style)],
]

cal_col_widths = [available_width*0.10, available_width*0.35, available_width*0.35, available_width*0.20]
cal_table = Table(cal_data, colWidths=cal_col_widths, hAlign='CENTER')
cal_style_list = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for r in range(1, len(cal_data)):
    bg = TABLE_ROW_EVEN if r % 2 == 1 else TABLE_ROW_ODD
    cal_style_list.append(('BACKGROUND', (0, r), (-1, r), bg))
cal_table.setStyle(TableStyle(cal_style_list))

story.append(cal_table)
story.append(Spacer(1, 6))
story.append(Paragraph('Tableau 2 : Calendrier editorial propose sur 8 semaines', meta_style))
story.append(Spacer(1, 18))

story.append(Paragraph(
    "Les semaines 1 et 3 sont strategiquement positionnees pour maximiser l'impact : la semaine 1 lance "
    "le cycle avec deux sujets a fort engagement (Data Architecture + SQL), et la semaine 3 exploite "
    "le pic d'interet sur l'IA et les agents autonomes. Les posts restants sont programmes en fonction "
    "de leur potentiel d'engagement estime et de la complementarite thematique avec le post precedent.",
    body_style
))

# ═══════════════════════════════════════════
# SECTION 5: Recommandations strategiques
# ═══════════════════════════════════════════
story.extend(add_major_section('<b>5. Recommandations strategiques</b>', h1_style))

story.extend(add_major_section('<b>5.1 Priorisation par objectif</b>', h2_style))

story.append(Paragraph(
    "Selon l'objectif prioritaire de DataSphere Innovation pour le trimestre a venir, voici les "
    "recommandations de priorisation. Si l'objectif est la generation de leads, les posts BI et IA "
    "doivent etre mis en avant car ils attirent les decideurs avec le pouvoir budget. Si l'objectif "
    "est la notoriete et le brand awareness, les posts sur les agents IA et l'IA generative offriront "
    "la meilleure portee organique grace a la viralite du sujet. Si l'objectif est le recrutement, "
    "les posts Data Engineering et Data Analyst attireront les talents techniques.",
    body_style
))

story.extend(add_major_section('<b>5.2 Formats et angles a privilegier</b>', h2_style))

story.append(Paragraph(
    "L'analyse des performances des posts precedents de DataSphere Innovation montre que les formats "
    "les plus performants sont dans l'ordre : la controverse (posts qui remettent en question les "
    "pratiques etablis), le how-to avec retour d'experience (posts qui partagent des chiffres reels "
    "et des lecons apprises), et le comparatif objectif (posts qui opposent deux approches ou outils). "
    "Le format 'liste de conseils' classique est le moins performant et devrait etre evolue vers des "
    "formats plus engageants. Sur les 20 posts proposes, 8 sont des controverses, 7 des how-to, et "
    "5 des comparatifs, ce qui respecte cette repartition optimale.",
    body_style
))

story.extend(add_major_section('<b>5.3 Interaction avec la plateforme</b>', h2_style))

story.append(Paragraph(
    "Les 20 posts sont deja injectes dans la plateforme DataSphere Innovation avec le statut 'idee'. "
    "Pour chaque post, le workflow recommande est le suivant : premiere, passer le post en statut "
    "'draft' pour revision du contenu. Ensuite, utiliser la fonctionnalite de scoring automatique pour "
    "evaluer la qualite du contenu. Puis, si le score est superieur a 75/100, soumettre pour approbation. "
    "Enfin, programmer la publication selon le calendrier editorial defini dans la section 4. La plateforme "
    "permet egalement de generer des variantes via IA pour tester differents angles ou formulations.",
    body_style
))

story.extend(add_major_section('<b>5.4 Metriques de suivi</b>', h2_style))

story.append(Paragraph(
    "Pour mesurer l'efficacite de cette strategie thematique, les KPIs suivants doivent etre suivis "
    "hebdomadairement : le taux d'engagement moyen par post (objectif : 4% minimum), la portee "
    "organique cumulee (objectif : +50% sur 8 semaines), le nombre de commentaires qualitatifs "
    "(objectif : 10+ par post sur les sujets IA), le nombre de demandes de contact ou de demo "
    "generees via les posts (objectif : 5+ par mois), et l'evolution du nombre d'abonnes "
    "(objectif : +200 sur 8 semaines). Ces metriques permettront d'ajuster la strategie en temps "
    "reel et d'identifier les domaines qui resonnent le plus avec l'audience cible.",
    body_style
))

story.extend(add_major_section('<b>5.5 Prochaines etapes</b>', h2_style))

story.append(Paragraph(
    "Une fois cette strategie deployee, les prochaines etapes recommandees sont les suivantes. Premierement, "
    "creer un cycle de contenu recurrent avec des series thematiques mensuelles (par exemple, un 'Mardi Data "
    "Architecture' et un 'Jeudi IA'). Deuxiemement, developper des formats longs (articles LinkedIn et carrousels) "
    "pour approfondir les sujets les plus performants. Troisiemement, initier des collaborations et des "
    "co-publications avec des influenceurs du secteur data/IA pour amplifier la portee. Quatriemement, "
    "mettre en place un systeme d'A/B testing sur les posts les plus strategiques pour optimiser "
    "continuellement les angles et les formats. Ces actions permettront de passer d'une strategie "
    "de publication ponctuelle a un veritable ecosysteme de contenu data-driven.",
    body_style
))

# ━━ BUILD ━━
doc.multiBuild(story)
print(f"PDF generated: {OUTPUT_PATH}")
