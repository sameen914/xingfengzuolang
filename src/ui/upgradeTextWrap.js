const BREAK_PUNCTUATION = new Set(['，', '。', '；', '：', '！', '？', '、']);
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const PROTECTED_TOKEN_RE = /(?:[+-]?\d+(?:\.\d+)?(?:ms|%|s)?|Lv\.\d+|[A-Za-z]+(?:\.\d+)?|\s+|[\u3400-\u9fff\uf900-\ufaff]|.)/gu;

export function measureUpgradeTextUnits(text = '') {
  let units = 0;
  for (const ch of String(text)) {
    if (/\s/u.test(ch)) units += 0.34;
    else if (CJK_RE.test(ch)) units += 1;
    else if (/[A-Za-z0-9]/u.test(ch)) units += 0.62;
    else if (/[，。；：！？、]/u.test(ch)) units += 0.48;
    else units += 0.56;
  }
  return units;
}

function splitClauses(text) {
  const clauses = [];
  let current = '';
  for (const ch of text) {
    current += ch;
    if (BREAK_PUNCTUATION.has(ch)) {
      clauses.push(current);
      current = '';
    }
  }
  if (current) clauses.push(current);
  return clauses;
}

function atomicTokens(text) {
  return String(text).match(PROTECTED_TOKEN_RE) ?? [];
}

function splitLongClause(clause, maxUnits) {
  const lines = [];
  let current = '';
  for (const token of atomicTokens(clause)) {
    const candidate = current + token;
    if (current && measureUpgradeTextUnits(candidate) > maxUnits) {
      // Punctuation should finish the current line instead of starting a new one.
      if (BREAK_PUNCTUATION.has(token.trim())) {
        current += token;
        continue;
      }
      lines.push(current.trimEnd());
      current = token.trimStart();
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current.trim());
  return lines.filter(Boolean);
}

function rebalanceOrphanLines(lines, maxUnits) {
  const result = lines.slice();
  const orphanThreshold = 3.25;
  const targetTailUnits = 4.4;

  for (let i = result.length - 1; i > 0; i -= 1) {
    if (measureUpgradeTextUnits(result[i]) >= orphanThreshold) continue;

    const previousTokens = atomicTokens(result[i - 1]);
    let moved = '';

    while (
      previousTokens.length > 1
      && measureUpgradeTextUnits(result[i]) + measureUpgradeTextUnits(moved) < targetTailUnits
    ) {
      const token = previousTokens.pop();
      moved = token + moved;

      // Do not strand punctuation at the end of the previous line.
      const tail = previousTokens.at(-1)?.trim();
      if (tail && BREAK_PUNCTUATION.has(tail) && previousTokens.length > 1) {
        moved = previousTokens.pop() + moved;
      }
    }

    const shortenedPrevious = previousTokens.join('').trimEnd();
    const expandedCurrent = (moved + result[i]).trimStart();

    if (
      shortenedPrevious
      && measureUpgradeTextUnits(shortenedPrevious) >= 4
      && measureUpgradeTextUnits(expandedCurrent) <= maxUnits + 0.75
    ) {
      result[i - 1] = shortenedPrevious;
      result[i] = expandedCurrent;
    }
  }

  return result;
}

export function wrapUpgradeCardTextSemantic(text, maxUnits = 13.5) {
  if (!text) return '';

  const paragraphs = String(text).split('\n');
  const output = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const normalized = paragraph.replace(/\s+/gu, ' ').trim();
    if (!normalized) {
      if (paragraphIndex < paragraphs.length - 1) output.push('');
      return;
    }

    const lines = [];
    let current = '';

    for (const clause of splitClauses(normalized)) {
      const candidate = current + clause;
      if (!current || measureUpgradeTextUnits(candidate) <= maxUnits) {
        current = candidate;
        continue;
      }

      lines.push(current.trim());
      current = '';

      if (measureUpgradeTextUnits(clause) <= maxUnits) {
        current = clause.trimStart();
      } else {
        const split = splitLongClause(clause, maxUnits);
        if (split.length > 1) lines.push(...split.slice(0, -1));
        current = split.at(-1) ?? '';
      }
    }

    if (current) lines.push(current.trim());
    output.push(...rebalanceOrphanLines(lines.filter(Boolean), maxUnits));
  });

  return output.join('\n');
}
