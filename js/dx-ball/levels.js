import { buildEndlessLevels } from "./level-gen.js?v=3";

/**
 * Level packs for Super DX-Ball remake.
 * Legend (string cells):
 *  . empty | 0-9 colored normal | E explosive | M multi-hit
 *  I invincible | A almost-invincible | H hidden
 */

function row(s) {
  return s.replace(/\s/g, '').split('').map((c) => {
    if (c === '.' || c === ' ') return null;
    if (c >= '0' && c <= '9') return { type: 'normal', color: +c };
    if (c === 'E') return { type: 'explosive' };
    if (c === 'M') return { type: 'multi', hits: 3 };
    if (c === 'I') return { type: 'invincible' };
    if (c === 'A') return { type: 'almost' };
    if (c === 'H') return { type: 'hidden' };
    return null;
  });
}

function grid(lines) {
  return lines.map(row);
}

function stripe(colors, rows = 6, gap = 0) {
  const lines = [];
  for (let r = 0; r < rows; r++) {
    let s = '';
    for (let c = 0; c < 20; c++) {
      if (gap && c % (gap + 1) !== 0) s += '.';
      else s += String(colors[r % colors.length]);
    }
    lines.push(s);
  }
  return grid(lines);
}

function frame(inner, border = 'I') {
  const h = inner.length;
  const out = [];
  out.push(border.repeat(20));
  for (let r = 0; r < h; r++) {
    const rowStr = inner[r].replace(/\s/g, '');
    const padded = rowStr.padEnd(18, '.').slice(0, 18);
    out.push(border + padded + border);
  }
  out.push(border.repeat(20));
  return grid(out);
}

/** Classic rectangular boards — tribute to original DX-Ball. */
export const CLASSIC = [
  {
    name: 'Rainbow',
    bricks: stripe([0, 1, 2, 3, 4, 5], 6),
  },
  {
    name: 'Checker',
    bricks: grid([
      '01010101010101010101',
      '10101010101010101010',
      '01010101010101010101',
      '10101010101010101010',
      '01010101010101010101',
      '10101010101010101010',
    ]),
  },
  {
    name: 'Pyramid',
    bricks: grid([
      '.........66.........',
      '........5555........',
      '.......444444.......',
      '......33333333......',
      '.....2222222222.....',
      '....111111111111....',
      '...00000000000000...',
    ]),
  },
  {
    name: 'Boom Line',
    bricks: grid([
      '33333333333333333333',
      'EEEEEEEEEEEEEEEEEEEE',
      '22222222222222222222',
      '11111111111111111111',
      '00000000000000000000',
    ]),
  },
  {
    name: 'Fortress',
    bricks: frame([
      '444444444444444444',
      '4................4',
      '4.MMMMMMMMMMMMMM.4',
      '4................4',
      '4.55555555555555.4',
      '4................4',
      '4.EEEEEEEEEEEEEE.4',
      '444444444444444444',
    ]),
  },
  {
    name: 'Hidden Threat',
    bricks: grid([
      'HHHHHHHHHHHHHHHHHHHH',
      '....................',
      '66666666666666666666',
      '55555555555555555555',
      '....................',
      'HHHHHHHHHHHHHHHHHHHH',
    ]),
  },
  {
    name: 'Almost',
    bricks: grid([
      'AAAAAAAAAAAAAAAAAAAA',
      '33333333333333333333',
      'AAAAAAAAAAAAAAAAAAAA',
      '22222222222222222222',
      'AAAAAAAAAAAAAAAAAAAA',
    ]),
  },
  {
    name: 'Diamonds',
    bricks: grid([
      '....3......3......3.',
      '...333....333....333',
      '..33333..33333..3333',
      '.333E333333E333333E3',
      '..33333..33333..3333',
      '...333....333....333',
      '....3......3......3.',
    ]),
  },
  {
    name: 'Corridors',
    bricks: grid([
      'I.4.I.5.I.6.I.5.I.4.',
      'I.4.I.5.I.6.I.5.I.4.',
      'I.4.I.5.I.6.I.5.I.4.',
      'I.4.I.5.I.6.I.5.I.4.',
      'I.4.I.5.I.6.I.5.I.4.',
      'I.4.I.5.I.6.I.5.I.4.',
      'I.4.I.5.I.6.I.5.I.4.',
      'I.4.I.5.I.6.I.5.I.4.',
    ]),
  },
  {
    name: 'Cascade',
    bricks: grid([
      '0...................',
      '01..................',
      '012.................',
      '0123................',
      '01234...............',
      '012345..............',
      '0123456.............',
      '01234567............',
      '012345678...........',
      '0123456789..........',
    ]),
  },
  {
    name: 'Multi Wall',
    bricks: grid([
      'MMMMMMMMMMMMMMMMMMMM',
      '99999999999999999999',
      'MMMMMMMMMMMMMMMMMMMM',
      '88888888888888888888',
      'MMMMMMMMMMMMMMMMMMMM',
    ]),
  },
  {
    name: 'Crossfire',
    bricks: grid([
      '....E..........E....',
      '....E..........E....',
      'EEEEEEEEEEEEEEEEEEEE',
      '....E..........E....',
      '....E....EE....E....',
      '....E....EE....E....',
      '....E..........E....',
      'EEEEEEEEEEEEEEEEEEEE',
      '....E..........E....',
      '....E..........E....',
    ]),
  },
  {
    name: 'Cage',
    bricks: grid([
      'IIIIIIIIIIIIIIIIIIII',
      'I..................I',
      'I.6666666666666666.I',
      'I.6..............6.I',
      'I.6.EEEEEEEEEEEE.6.I',
      'I.6..............6.I',
      'I.6666666666666666.I',
      'I..................I',
      'IIIIIIIIIIIIIIIIIIII',
    ]),
  },
  {
    name: 'Smile',
    bricks: grid([
      '......22222222......',
      '....222222222222....',
      '...22..22..22..22...',
      '..22...22..22...22..',
      '..22............22..',
      '..22..2......2..22..',
      '...22..222222..22...',
      '....222......222....',
      '......22222222......',
    ]),
  },
  {
    name: 'Steps',
    bricks: grid([
      '0000................',
      '00001111............',
      '....11112222........',
      '........22223333....',
      '............33334444',
      '............EEEE4444',
    ]),
  },
  {
    name: 'Spiral Hint',
    bricks: grid([
      '55555555555555555555',
      '5..................5',
      '5.4444444444444444.5',
      '5.4..............4.5',
      '5.4.333333333333.4.5',
      '5.4.3..........3.4.5',
      '5.4.3.EEEEEEEE.3.4.5',
      '5.4.3..........3.4.5',
      '5.4.333333333333.4.5',
      '5.4..............4.5',
      '5.4444444444444444.5',
      '5..................5',
      '55555555555555555555',
    ]),
  },
  {
    name: 'Mixed Bag',
    bricks: grid([
      '0E1E2E3E4E5E6E7E8E9E',
      'M.M.M.M.M.M.M.M.M.M.',
      'H.H.H.H.H.H.H.H.H.H.',
      'A.A.A.A.A.A.A.A.A.A.',
      'I.3.I.4.I.5.I.6.I.7.',
    ]),
  },
  {
    name: 'Twin Towers',
    bricks: grid([
      'MMM..........MMM....',
      '3.3..........6.6....',
      '3.3..........6.6....',
      '3E3..........6E6....',
      '3.3..........6.6....',
      '3.3..........6.6....',
      'MMM..........MMM....',
      '....................',
      '....2222222222......',
      '....2222222222......',
    ]),
  },
  {
    name: 'Gauntlet',
    bricks: grid([
      'IIII..IIII..IIII..II',
      '....44....55....66..',
      'IIII..IIII..IIII..II',
      '....44....55....66..',
      'EEEE..EEEE..EEEE..EE',
      '....44....55....66..',
      'IIII..IIII..IIII..II',
    ]),
  },
  {
    name: 'Finale Classic',
    bricks: grid([
      'MMMMMMMMMMMMMMMMMMMM',
      'MEEEEEEEEEEEEEEEEEEM',
      'MEIIIIIIIIIIIIIIIIEM',
      'MEIHHHHHHHHHHHHHHIEM',
      'MEIHAAAAAAAAAAAAHIEM',
      'MEIHA.EEEEEEEE.AHIEM',
      'MEIHAAAAAAAAAAAAHIEM',
      'MEIHHHHHHHHHHHHHHIEM',
      'MEIIIIIIIIIIIIIIIIEM',
      'MEEEEEEEEEEEEEEEEEEM',
      'MMMMMMMMMMMMMMMMMMMM',
    ]),
  },
];

/** Geometric / mosaic-style Super boards. */
export const SUPER = [
  {
    name: 'Orbit',
    bricks: grid([
      '.........99.........',
      '.......997799.......',
      '......99....99......',
      '.....99..EE..99.....',
      '....99...EE...99....',
      '....9..........9....',
      '....99...EE...99....',
      '.....99..EE..99.....',
      '......99....99......',
      '.......997799.......',
      '.........99.........',
    ]),
  },
  {
    name: 'Chevron',
    bricks: grid([
      '0..................0',
      '.1................1.',
      '..2..............2..',
      '...3............3...',
      '....4..........4....',
      '.....5........5.....',
      '......6......6......',
      '.......7....7.......',
      '........8..8........',
      '.........99.........',
      '........8EE8........',
      '.......7....7.......',
    ]),
  },
  {
    name: 'Hex Hint',
    bricks: grid([
      '..3.3.3.3.3.3.3.3...',
      '.3.3.3.3.3.3.3.3.3..',
      '3.3.E.3.3.E.3.3.E.3.',
      '.3.3.3.3.3.3.3.3.3..',
      '..3.3.3.3.3.3.3.3...',
      '.3.3.3.3.3.3.3.3.3..',
      '3.3.E.3.3.E.3.3.E.3.',
      '.3.3.3.3.3.3.3.3.3..',
      '..3.3.3.3.3.3.3.3...',
    ]),
  },
  {
    name: 'Mosaic',
    bricks: grid([
      '01234567890123456789',
      '90123456789012345678',
      '89012345678901234567',
      '78901234567890123456',
      '67890123456789012345',
      '56789012345678901234',
      '45678901234567890123',
    ]),
  },
  {
    name: 'Star',
    bricks: grid([
      '.........2..........',
      '........222.........',
      '.......22222........',
      '22222222222222222222',
      '.222222222222222222.',
      '..2222222222222222..',
      '...2222.22.2222.....',
      '....222....222......',
      '.....22....22.......',
      '......2....2........',
    ]),
  },
  {
    name: 'Waves',
    bricks: grid([
      '4....4....4....4....',
      '.5..5.5..5.5..5.5..5',
      '..66...66...66...66.',
      '.7..7.7..7.7..7.7..7',
      '8....8....8....8....',
      '.9..9.9..9.9..9.9..9',
      '..00...00...00...00.',
      '.1..1.1..1.1..1.1..1',
      '2EEEE2EEEE2EEEE2EEEE',
    ]),
  },
  {
    name: 'Lattice',
    bricks: grid([
      'I4I4I4I4I4I4I4I4I4I4',
      '4.4.4.4.4.4.4.4.4.4.',
      'I4I4I4I4I4I4I4I4I4I4',
      '4.4.4.4.4.4.4.4.4.4.',
      'I4IEI4IEI4IEI4IEI4IE',
      '4.4.4.4.4.4.4.4.4.4.',
      'I4I4I4I4I4I4I4I4I4I4',
      '4.4.4.4.4.4.4.4.4.4.',
      'I4I4I4I4I4I4I4I4I4I4',
    ]),
  },
  {
    name: 'Arrow',
    bricks: grid([
      '..........6.........',
      '.........666........',
      '........66666.......',
      '.......6666666......',
      '......666666666.....',
      '.....III666III......',
      '........66666.......',
      '........66666.......',
      '........66666.......',
      '........MMMMM.......',
    ]),
  },
  {
    name: 'Islands',
    bricks: grid([
      '..3333......7777....',
      '.33EE33....77EE77...',
      '.33EE33....77EE77...',
      '..3333......7777....',
      '....................',
      '....5555......9999..',
      '...55HH55....99AA99.',
      '...55HH55....99AA99.',
      '....5555......9999..',
    ]),
  },
  {
    name: 'Tunnel',
    bricks: grid([
      'IIIIIIII....IIIIIIII',
      'I..................I',
      'I......EEEE........I',
      'I..................I',
      'IIII..........IIIIII',
      '....I........I......',
      '....I..MMMM..I......',
      '....I........I......',
      '....IIIIIIIIII......',
    ]),
  },
  {
    name: 'Butterfly',
    bricks: grid([
      '3......3..3......3..',
      '33....33..33....33..',
      '333..333EE333..333..',
      '33333333..33333333..',
      '333333......333333..',
      '3333..........3333..',
      '33..............33..',
      '3................3..',
    ]),
  },
  {
    name: 'Cityscape',
    bricks: grid([
      '......M.............',
      '......M...M.........',
      '..M...M...M...M.....',
      '..M...M...M...M...M.',
      '.MMM.MMM.MMM.MMM.MMM',
      '.M5M.M6M.M7M.M8M.M9M',
      '.M5M.M6M.M7M.M8M.M9M',
      'EEEEEEEEEEEEEEEEEEEE',
    ]),
  },
  {
    name: 'DNA',
    bricks: grid([
      '0..............9....',
      '.1............8.....',
      '..2..........7......',
      '...3...EE...6.......',
      '....4......5........',
      '.....5....4.........',
      '......6..3..........',
      '.......72...........',
      '......8..1..........',
      '.....9....0.........',
      '....0......9........',
      '...1...EE...8.......',
      '..2..........7......',
      '.3............6.....',
    ]),
  },
  {
    name: 'Crown',
    bricks: grid([
      '2..2..2..2..2..2..2.',
      '2222222222222222222.',
      '.2.2.2.2.2.2.2.2.2..',
      '..EEEEEEEEEEEEEEE...',
      '...2222222222222....',
      '....MMMMMMMMMMM.....',
      '.....222222222......',
    ]),
  },
  {
    name: 'Super Finale',
    bricks: grid([
      'E.I.E.I.E.I.E.I.E.I.',
      'I.M.I.M.I.M.I.M.I.M.',
      'E.I.E.I.E.I.E.I.E.I.',
      'H.A.H.A.H.A.H.A.H.A.',
      'E.I.E.I.E.I.E.I.E.I.',
      'I.M.I.M.I.M.I.M.I.M.',
      'E.I.E.I.E.I.E.I.E.I.',
      '....................',
      '.9.8.7.6.5.4.3.2.1.0',
      '9.8.7.6.5.4.3.2.1.0.',
    ]),
  },
];

export const PACKS = [
  {
    id: "classic",
    name: "Classic",
    subtitle: `${CLASSIC.length} handcrafted boards`,
    levels: CLASSIC
  },
  {
    id: "super",
    name: "Super",
    subtitle: `${SUPER.length} geometric mosaics`,
    levels: SUPER
  },
  {
    id: "endless",
    name: "Endless",
    subtitle: "100 generated boards · rising difficulty",
    levels: buildEndlessLevels(100)
  }
];

export function getPack(id) {
  return PACKS.find((p) => p.id === id) || PACKS[0];
}
