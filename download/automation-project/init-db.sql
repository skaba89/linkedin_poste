-- Schéma de base de données pour le système d'automatisation d'acquisition client
-- Version: 1.0.0
-- Description: Tables principales pour la gestion des prospects, séquences,
--              conversations, actions, quotas et logs d'automatisation.

-- ═══════════════════════════════════════════════════════════════════
-- Extensions
-- ═══════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════
-- Table: sequences
-- Séquences d'automatisation (étapes de contact automatisées)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE sequences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    platform        VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'instagram')),
    steps           JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- steps format: [{"day": 0, "type": "invite", "template": "..."}, ...]
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- Table: prospects
-- Prospects identifiés sur LinkedIn et Instagram
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE prospects (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform          VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'instagram')),
    profile_url       VARCHAR(1024) NOT NULL,
    name              VARCHAR(255),
    headline          TEXT,
    company           VARCHAR(255),
    location          VARCHAR(255),
    profile_data      JSONB DEFAULT '{}'::jsonb,
    status            VARCHAR(50) NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new', 'contacted', 'replied', 'qualified', 'converted', 'rejected', 'unsubscribed')),
    score             SMALLINT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 10),
    sequence_id       UUID REFERENCES sequences(id) ON DELETE SET NULL,
    last_contacted_at TIMESTAMPTZ,
    next_action_at    TIMESTAMPTZ,
    notes             TEXT,
    tags              TEXT[] DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_prospects_profile_url UNIQUE (profile_url)
);

CREATE INDEX idx_prospects_platform       ON prospects (platform);
CREATE INDEX idx_prospects_status         ON prospects (status);
CREATE INDEX idx_prospects_platform_status ON prospects (platform, status);
CREATE INDEX idx_prospects_score          ON prospects (score);
CREATE INDEX idx_prospects_next_action    ON prospects (next_action_at) WHERE status NOT IN ('converted', 'rejected', 'unsubscribed');

-- ═══════════════════════════════════════════════════════════════════
-- Table: conversations
-- Historique des messages échangés avec les prospects
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE conversations (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id      UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    platform         VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'instagram')),
    direction        VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_content  TEXT NOT NULL,
    message_type     VARCHAR(30) NOT NULL DEFAULT 'dm'
                     CHECK (message_type IN ('dm', 'invite', 'post_comment', 'email')),
    claude_analysis  JSONB,
    -- claude_analysis format: {"sentiment": "...", "intent": "...", "suggested_reply": "..."}
    is_read          BOOLEAN NOT NULL DEFAULT false,
    external_id      VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_prospect_id ON conversations (prospect_id);
CREATE INDEX idx_conversations_created_at  ON conversations (created_at);
CREATE INDEX idx_conversations_platform    ON conversations (platform);
CREATE INDEX idx_conversations_direction   ON conversations (direction);

-- ═══════════════════════════════════════════════════════════════════
-- Table: actions
-- Journal des actions automatisées (invitations, messages, likes…)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE actions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id   UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    action_type   VARCHAR(30) NOT NULL
                  CHECK (action_type IN ('send_invite', 'send_dm', 'accept_invite', 'view_profile', 'like_post', 'comment_post')),
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
    error_message TEXT,
    platform      VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'instagram')),
    metadata      JSONB DEFAULT '{}'::jsonb,
    executed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_actions_prospect_id  ON actions (prospect_id);
CREATE INDEX idx_actions_status      ON actions (status);
CREATE INDEX idx_actions_executed_at ON actions (executed_at);
CREATE INDEX idx_actions_action_type ON actions (action_type);
CREATE INDEX idx_actions_platform    ON actions (platform);

-- ═══════════════════════════════════════════════════════════════════
-- Table: daily_quotas
-- Suivi des quotas d'envoi par jour et par plateforme
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE daily_quotas (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform          VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'instagram')),
    date              DATE NOT NULL DEFAULT CURRENT_DATE,
    invitations_sent  INTEGER NOT NULL DEFAULT 0 CHECK (invitations_sent >= 0),
    messages_sent     INTEGER NOT NULL DEFAULT 0 CHECK (messages_sent >= 0),
    limit             INTEGER NOT NULL DEFAULT 100 CHECK (limit > 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_quotas_platform_date UNIQUE (platform, date)
);

CREATE INDEX idx_daily_quotas_platform_date ON daily_quotas (platform, date);

-- ═══════════════════════════════════════════════════════════════════
-- Table: account_credentials
-- Identifiants des comptes LinkedIn/Instagram utilisés pour l'automatisation
-- Les mots de passe sont chiffrés avec ENCRYPTION_KEY
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE account_credentials (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform               VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'instagram')),
    email                  VARCHAR(255) NOT NULL,
    encrypted_password     TEXT NOT NULL,
    encrypted_session_data JSONB,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    last_used_at           TIMESTAMPTZ,
    failure_count          INTEGER NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_credentials_platform_email UNIQUE (platform, email)
);

CREATE INDEX idx_account_credentials_platform ON account_credentials (platform);
CREATE INDEX idx_account_credentials_active   ON account_credentials (is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════
-- Table: automation_logs
-- Journal centralisé des événements du système d'automatisation
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE automation_logs (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level      VARCHAR(10) NOT NULL DEFAULT 'info'
               CHECK (level IN ('info', 'warn', 'error')),
    service    VARCHAR(50) NOT NULL
               CHECK (service IN ('playwright', 'n8n', 'claude', 'system', 'scheduler')),
    action     VARCHAR(255),
    message    TEXT NOT NULL,
    metadata   JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_logs_level      ON automation_logs (level);
CREATE INDEX idx_automation_logs_service    ON automation_logs (service);
CREATE INDEX idx_automation_logs_created_at ON automation_logs (created_at);

-- ═══════════════════════════════════════════════════════════════════
-- Trigger: updated_at auto-update
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prospects_updated_at
    BEFORE UPDATE ON prospects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_daily_quotas_updated_at
    BEFORE UPDATE ON daily_quotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
