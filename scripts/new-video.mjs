#!/usr/bin/env node
/**
 * Scaffolds a new video from a prompt-free template.
 *
 *   npm run new -- torque-wrenches "Torque Wrenches" "Click vs Digital vs Beam"
 *
 * Writes content/videos/<id>.yaml with the structure already correct, so you
 * only fill in ratings and takes.
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [id, subject, title] = process.argv.slice(2);

if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
  console.error('usage: npm run new -- <kebab-case-id> "<Subject>" "<Title>"');
  console.error('   eg: npm run new -- torque-wrenches "Torque Wrenches" "Click vs Digital vs Beam"');
  process.exit(1);
}

const dir = join(ROOT, 'content', 'videos');
const file = join(dir, `${id}.yaml`);
if (existsSync(file)) {
  console.error(`✗ ${file} already exists`);
  process.exit(1);
}

const template = `id: ${id}
title: "${title ?? 'Working title'}"
subject: ${subject ?? 'Subject'}
tagline: One line on why this comparison exists.

formats: [vertical, horizontal, square]

# The axes. Only include things that actually change a decision.
criteria:
  - id: criterion-one
    name: Criterion One
  - id: criterion-two
    name: Criterion Two
  - id: criterion-three
    name: Criterion Three

# Ratings are 1-5, your editorial call. They drive every verdict below.
contenders:
  - id: option-a
    name: Option A
    tagline: One line of identity.
    specs:
      Spec row: value
    ratings: { criterion-one: 5, criterion-two: 2, criterion-three: 3 }

  - id: option-b
    name: Option B
    tagline: One line of identity.
    specs:
      Spec row: value
    ratings: { criterion-one: 2, criterion-two: 5, criterion-three: 4 }

# The "it depends". Re-weight the criteria per situation and the ranking moves.
# If every scenario has the same winner, the build warns you.
scenarios:
  - id: situation-one
    name: Situation One
    context: The constraint that makes this situation different.
    weights: { criterion-one: 5, criterion-two: 1, criterion-three: 2 }
    verdict:
      winner: option-a
      why: Why this wins *here* specifically.
      avoid: option-b
      avoidWhy: why it's a trap in this situation

  - id: situation-two
    name: Situation Two
    context: A situation that flips the priorities.
    weights: { criterion-one: 1, criterion-two: 5, criterion-three: 4 }
    verdict:
      winner: option-b
      why: Why the answer changes.

# Running order. Add \`formats: [vertical]\` to a scene to keep it out of the
# other cuts. Add \`voice: voice/${id}/01.m4a\` to lock timing to real audio.
scenes:
  - type: hook
    text: The claim that makes someone stop scrolling.
    sub: One sentence of stakes.

  - type: lineup
    formats: [horizontal, square]

  - type: spec
    formats: [horizontal]

  - type: scenario
    id: situation-one

  - type: scenario
    id: situation-two

  - type: scorecard

  - type: takeaway
    formats: [horizontal, square]
    bullets:
      - The rule you'd actually give a junior engineer.
      - The mistake you see most often.

  - type: outro
    text: Which one would you spec?
`;

mkdirSync(dir, { recursive: true });
writeFileSync(file, template, 'utf8');
console.log(`✓ created content/videos/${id}.yaml`);
console.log(`  next: edit it, then \`npm run web\` to preview or \`npm run render -- ${id}\``);
