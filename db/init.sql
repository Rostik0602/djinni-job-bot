CREATE TABLE vacancies (
  id                  TEXT        PRIMARY KEY,
  title               TEXT        NOT NULL,
  url                 TEXT        NOT NULL,
  description         TEXT,
  published_at        TIMESTAMPTZ,
  status              TEXT        NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new', 'sent', 'applied', 'skipped', 'failed')),
  send_attempts       INT         NOT NULL DEFAULT 0 CHECK (send_attempts >= 0),
  ai_score            SMALLINT    CHECK (ai_score BETWEEN 1 AND 10),
  ai_summary          JSONB,
  telegram_message_id BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX vacancies_new_idx ON vacancies (published_at) WHERE status = 'new';

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vacancies_set_updated_at
  BEFORE UPDATE ON vacancies
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();