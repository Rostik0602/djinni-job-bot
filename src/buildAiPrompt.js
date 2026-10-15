const MAX_DESCRIPTION_LENGTH = 3000;

const PROFILE = `Junior Frontend Developer (React + TypeScript). No commercial experience yet.
About 1.5 years of frontend practice, 1 year of it with React and TypeScript.
Built and deployed two fullstack portfolio apps (a personal finance app and an online store).
Main skills: React 18, TypeScript, Redux Toolkit, RTK Query, React Router, Formik + Yup,
SCSS (Modules, BEM), responsive layout from 320px, Figma, Vite, i18next.
Also: Node.js, Express, NestJS, PostgreSQL, Prisma, JWT auth, Docker, Jest.
Learning now: n8n, workflow automation, AI APIs.
English: B1 (Intermediate).
Wants: remote work, salary from $500 per month.`;

const SCORING = `9-10: junior or trainee role with React + TypeScript (Next.js is fine too),
or JavaScript fullstack with React + Node.js/NestJS; remote; English B1 or lower;
salary from $500 or not stated.
7-8: good fit with small gaps: Vue or another modern frontend stack; English B2;
up to 1 year of commercial experience required.
4-6: partial fit: Angular, React Native or a mostly backend role; 2+ years required;
hybrid or office only.
1-3: does not fit: middle or senior level; not JavaScript (.NET, Java, PHP, Python and so on);
not a developer role; salary clearly below $500.
Add 1 point (max 10) if the job involves n8n, workflow automation or AI integrations.`;

const OUTPUT_FORMAT = `Reply with JSON only, without markdown and without any other text. Fields:
- "score": integer from 1 to 10
- "stack": array of up to 6 key technologies from the vacancy
- "english": required English level as a string, or null if not stated
- "salary": salary as written in the vacancy, or null if not stated
- "summary": one short sentence in Ukrainian about the company and the tasks`;

function buildAiPrompt(vacancy, { profile = PROFILE } = {}) {
  const title = String(vacancy?.title ?? '').trim();
  const description = truncate(vacancy?.description, MAX_DESCRIPTION_LENGTH) || '(no description)';

  return [
    'You help a junior developer choose job vacancies. Rate how well the vacancy fits the candidate.',
    '',
    'CANDIDATE:',
    profile,
    '',
    'HOW TO SCORE (1-10):',
    SCORING,
    '',
    'VACANCY:',
    `Title: ${title}`,
    description,
    '',
    OUTPUT_FORMAT,
  ].join('\n');
}

function truncate(text, maxLength) {
  const chars = Array.from(String(text ?? '').trim());
  if (chars.length <= maxLength) return chars.join('');
  return `${chars.slice(0, maxLength - 1).join('').trimEnd()}…`;
}

module.exports = { buildAiPrompt, PROFILE, MAX_DESCRIPTION_LENGTH };