export const SWEETENS_COVE = {
  name: 'Sweetens Cove',
  holes: [
    { number: 1, par: 5, yards: 469, hcp: 3 },
    { number: 2, par: 4, yards: 311, hcp: 9 },
    { number: 3, par: 5, yards: 477, hcp: 5 },
    { number: 4, par: 3, yards: 146, hcp: 13, name: 'King' },
    { number: 5, par: 4, yards: 229, hcp: 15 },
    { number: 6, par: 4, yards: 388, hcp: 1 },
    { number: 7, par: 4, yards: 257, hcp: 11 },
    { number: 8, par: 4, yards: 333, hcp: 7 },
    { number: 9, par: 3, yards: 116, hcp: 17 },
  ],
};

export function holeOrderFromStart(startHole) {
  return Array.from({ length: 9 }, (_, i) => ((startHole - 1 + i) % 9) + 1);
}

export function holeByNumber(n) {
  return SWEETENS_COVE.holes.find((h) => h.number === n);
}
