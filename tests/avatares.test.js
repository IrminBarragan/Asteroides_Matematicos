import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDS_AVATARES, NOMBRES_AVATAR } from '../src/ui/avatares.js';
import { AVATARES } from '../src/core/storage.js';

test('los avatares dibujables coinciden exactamente con los que acepta el almacenamiento', () => {
    assert.deepEqual([...IDS_AVATARES].sort(), [...AVATARES].sort());
});

test('cada avatar tiene un nombre legible para lectores de pantalla', () => {
    for (const id of IDS_AVATARES) assert.ok(NOMBRES_AVATAR[id] && NOMBRES_AVATAR[id].length > 2, id);
});
