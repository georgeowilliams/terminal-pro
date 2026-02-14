#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'content', 'courses', 'index.json');
const expectedCourseId = process.argv[2];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  fail('Missing content/courses/index.json');
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
if (!Array.isArray(index) || !index.length) {
  fail('content/courses/index.json must be a non-empty array');
}

const validEntries = index.filter((entry) => entry?.courseId && entry?.defaultLocale);
if (!validEntries.length) {
  fail('No valid course entries found. Expected { courseId, defaultLocale, locales?, paths? }.');
}

for (const entry of validEntries) {
  const locales = Array.isArray(entry.locales) && entry.locales.length ? entry.locales : [entry.defaultLocale];
  for (const locale of locales) {
    const filePath = path.join(root, 'content', 'courses', entry.courseId, locale, 'course.json');
    if (!fs.existsSync(filePath)) {
      fail(`Missing course metadata for ${entry.courseId}/${locale}: ${filePath}`);
    }
  }
}

if (expectedCourseId && !validEntries.some((entry) => entry.courseId === expectedCourseId)) {
  fail(`Expected courseId '${expectedCourseId}' was not discovered in content/courses/index.json`);
}

console.log(`Discovered courses: ${validEntries.map((entry) => entry.courseId).join(', ')}`);
