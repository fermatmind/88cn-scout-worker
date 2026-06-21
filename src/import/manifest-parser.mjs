import fs from 'node:fs';
import { validateManifest } from './validators.mjs';

export function parseManifestJson(text) {
  const manifest = JSON.parse(text);
  const validation = validateManifest(manifest);
  if (!validation.ok) {
    const error = new Error(`invalid manifest: ${validation.errors.join(', ')}`);
    error.validation = validation;
    throw error;
  }
  return { manifest, validation };
}

export function readManifest(filePath) {
  return parseManifestJson(fs.readFileSync(filePath, 'utf8'));
}
