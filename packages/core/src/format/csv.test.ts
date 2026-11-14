import { describe, expect, it } from 'vitest';
import { versCsv } from './csv';

describe('versCsv (BLOG-08)', () => {
  it('« ; », BOM UTF-8 pour Excel, fin de ligne CRLF, accents intacts', () => {
    const c = versCsv(['titre', 'statut'], [['Pompe à chaleur', 'Publié']]);
    expect(c.startsWith('﻿')).toBe(true);
    expect(c).toBe('﻿titre;statut\r\nPompe à chaleur;Publié\r\n');
  });

  it('champ contenant « ; », guillemet ou saut de ligne : entre guillemets, guillemets doublés', () => {
    expect(versCsv(['a'], [['x;y'], ['dit "oui"'], ['l1\nl2']])).toBe(
      '﻿a\r\n"x;y"\r\n"dit ""oui"""\r\n"l1\nl2"\r\n',
    );
  });

  it('formule de tableur neutralisée (injection CSV)', () => {
    expect(versCsv(['a'], [['=SOMME(A1)'], ['+33'], ['-x'], ['@x']])).toBe(
      "﻿a\r\n'=SOMME(A1)\r\n'+33\r\n'-x\r\n'@x\r\n",
    );
  });

  it('sans BOM sur demande', () => {
    expect(versCsv(['a'], [['b']], { bom: false })).toBe('a\r\nb\r\n');
  });
});
