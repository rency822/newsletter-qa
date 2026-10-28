import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTitle, slugify, dice} from '../src/normalize.js';

test('normalization', () => {
  assert.equal(normalizeTitle("Bi The Way ft Anna Cummings & Ray Ray XXX"), normalizeTitle("Bi The Way Ft Anna Cummings and Ray Ray Xxx"));
  assert.equal(normalizeTitle("Lia Lin – Eye-Rolling Orgasm"), "lia lin eye rolling orgasm");
  assert.equal(normalizeTitle("Robert's Cock"), "roberts cock");
  assert.equal(slugify("Please Don't Tell Your StepFather - CAM 2"), "please-dont-tell-your-stepfather-cam-2");
  assert.equal(dice("abc", "abc"), 1);
  assert.ok(dice("an Madrox & Yuri smoking & stroking on the couch", "Ian Madrox & Yuri smoking & stroking on the couch") >= 0.85);
  assert.ok(dice("Using A New Sub Boy - Part 4", "Cute Boy Gets Punished & Fucked - Part 1") < 0.85);
});
