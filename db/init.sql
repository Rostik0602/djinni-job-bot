-- Схема базы вакансий.
-- Postgres выполняет этот файл автоматически ТОЛЬКО при первом запуске контейнера,
-- когда том pg_data ещё пустой. Если поменяешь файл позже, сам он не перезапустится:
-- либо выполни изменения вручную через psql, либо пересоздай том (docker compose down -v
-- удалит ВСЕ данные базы и n8n).

CREATE TABLE vacancies (
  id                  TEXT        PRIMARY KEY,   -- номер вакансии Djinni: /jobs/852334-... -> '852334'
  title               TEXT        NOT NULL,
  url                 TEXT        NOT NULL,
  description         TEXT,                      -- текст вакансии без HTML
  published_at        TIMESTAMPTZ,
  status              TEXT        NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new', 'sent', 'applied', 'skipped', 'failed')),
  send_attempts       INT         NOT NULL DEFAULT 0 CHECK (send_attempts >= 0),
  ai_score            SMALLINT    CHECK (ai_score BETWEEN 1 AND 10),  -- NULL = ИИ ещё не оценил
  ai_summary          JSONB,                     -- разбор от ИИ: stack, english, salary, summary
  telegram_message_id BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Статусы:
--   new     — ещё не отправлена в Telegram
--   sent    — отправлена, ждёт твоего нажатия
--   applied — нажал «✅ Відгукнувся»
--   skipped — нажал «❌ Пропустити» (или низкая оценка ИИ, если включишь такой фильтр)
--   failed  — не удалось отправить за 3 попытки

-- Индекс под главный запрос очереди отправки:
--   SELECT * FROM vacancies WHERE status = 'new' AND send_attempts < 3
--   ORDER BY published_at LIMIT 15;
-- Частичный индекс (WHERE status = 'new') хранит только неотправленные вакансии
-- и уже отсортирован по published_at: он маленький и подходит ровно под этот запрос.
CREATE INDEX vacancies_new_idx ON vacancies (published_at) WHERE status = 'new';

-- updated_at обновляется сам при любом UPDATE, не нужно помнить о нём в каждом запросе n8n.
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