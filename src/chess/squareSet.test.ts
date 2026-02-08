/**
 * Comprehensive tests for SquareMask (64-bit bitboard).
 * Tests all operations including construction, bit manipulation,
 * 64-bit arithmetic, queries, and iteration.
 */

import { describe, it, expect } from 'vitest';
import { SquareMask } from './squareSet';

describe('SquareMask', () => {
  // ============================================
  // Construction
  // ============================================
  describe('construction', () => {
    it('should create with lo and hi values', () => {
      const mask = new SquareMask(0x12345678, 0xabcdef01);
      expect(mask.lo).toBe(0x12345678);
      expect(mask.hi).toBe(0xabcdef01 | 0); // Converted to signed 32-bit
    });

    it('should handle negative values via bit coercion', () => {
      const mask = new SquareMask(-1, -1);
      expect(mask.lo).toBe(-1);
      expect(mask.hi).toBe(-1);
    });
  });

  describe('fromSquare', () => {
    it('should create mask for square 0 (a1)', () => {
      const mask = SquareMask.fromSquare(0);
      expect(mask.lo).toBe(1);
      expect(mask.hi).toBe(0);
      expect(mask.has(0)).toBe(true);
      expect(mask.size()).toBe(1);
    });

    it('should create mask for square 31 (h4)', () => {
      const mask = SquareMask.fromSquare(31);
      expect(mask.lo).toBe(-2147483648); // 1 << 31 in two's complement
      expect(mask.hi).toBe(0);
      expect(mask.has(31)).toBe(true);
      expect(mask.size()).toBe(1);
    });

    it('should create mask for square 32 (a5)', () => {
      const mask = SquareMask.fromSquare(32);
      expect(mask.lo).toBe(0);
      expect(mask.hi).toBe(1);
      expect(mask.has(32)).toBe(true);
      expect(mask.size()).toBe(1);
    });

    it('should create mask for square 63 (h8)', () => {
      const mask = SquareMask.fromSquare(63);
      expect(mask.lo).toBe(0);
      expect(mask.hi).toBe(-2147483648); // 1 << 31 in two's complement
      expect(mask.has(63)).toBe(true);
      expect(mask.size()).toBe(1);
    });

    it('should create unique masks for all 64 squares', () => {
      for (let sq = 0; sq < 64; sq++) {
        const mask = SquareMask.fromSquare(sq);
        expect(mask.size()).toBe(1);
        expect(mask.has(sq)).toBe(true);
        // Check no other square is set
        for (let other = 0; other < 64; other++) {
          if (other !== sq) {
            expect(mask.has(other)).toBe(false);
          }
        }
      }
    });
  });

  describe('fromRank', () => {
    it('should create mask for rank 0 (rank 1)', () => {
      const mask = SquareMask.fromRank(0);
      expect(mask.size()).toBe(8);
      for (let file = 0; file < 8; file++) {
        expect(mask.has(file)).toBe(true);
      }
      expect(mask.has(8)).toBe(false);
    });

    it('should create mask for rank 3 (rank 4)', () => {
      const mask = SquareMask.fromRank(3);
      expect(mask.size()).toBe(8);
      for (let file = 0; file < 8; file++) {
        expect(mask.has(24 + file)).toBe(true);
      }
    });

    it('should create mask for rank 4 (rank 5, in hi)', () => {
      const mask = SquareMask.fromRank(4);
      expect(mask.size()).toBe(8);
      for (let file = 0; file < 8; file++) {
        expect(mask.has(32 + file)).toBe(true);
      }
    });

    it('should create mask for rank 7 (rank 8)', () => {
      const mask = SquareMask.fromRank(7);
      expect(mask.size()).toBe(8);
      for (let file = 0; file < 8; file++) {
        expect(mask.has(56 + file)).toBe(true);
      }
    });

    it('should create disjoint masks for all 8 ranks', () => {
      const ranks = Array.from({ length: 8 }, (_, i) => SquareMask.fromRank(i));
      for (let i = 0; i < 8; i++) {
        for (let j = i + 1; j < 8; j++) {
          expect(ranks[i].isDisjoint(ranks[j])).toBe(true);
        }
      }
      // Union of all ranks should be full
      let all = SquareMask.empty();
      for (const r of ranks) all = all.union(r);
      expect(all.equals(SquareMask.full())).toBe(true);
    });
  });

  describe('fromFile', () => {
    it('should create mask for file 0 (a-file)', () => {
      const mask = SquareMask.fromFile(0);
      expect(mask.size()).toBe(8);
      for (let rank = 0; rank < 8; rank++) {
        expect(mask.has(rank * 8)).toBe(true);
      }
    });

    it('should create mask for file 4 (e-file)', () => {
      const mask = SquareMask.fromFile(4);
      expect(mask.size()).toBe(8);
      for (let rank = 0; rank < 8; rank++) {
        expect(mask.has(rank * 8 + 4)).toBe(true);
      }
    });

    it('should create mask for file 7 (h-file)', () => {
      const mask = SquareMask.fromFile(7);
      expect(mask.size()).toBe(8);
      for (let rank = 0; rank < 8; rank++) {
        expect(mask.has(rank * 8 + 7)).toBe(true);
      }
    });

    it('should create disjoint masks for all 8 files', () => {
      const files = Array.from({ length: 8 }, (_, i) => SquareMask.fromFile(i));
      for (let i = 0; i < 8; i++) {
        for (let j = i + 1; j < 8; j++) {
          expect(files[i].isDisjoint(files[j])).toBe(true);
        }
      }
      // Union of all files should be full
      let all = SquareMask.empty();
      for (const f of files) all = all.union(f);
      expect(all.equals(SquareMask.full())).toBe(true);
    });
  });

  describe('static factories', () => {
    it('empty() should create empty mask', () => {
      const mask = SquareMask.empty();
      expect(mask.lo).toBe(0);
      expect(mask.hi).toBe(0);
      expect(mask.isEmpty()).toBe(true);
      expect(mask.size()).toBe(0);
    });

    it('full() should create full mask', () => {
      const mask = SquareMask.full();
      expect(mask.lo).toBe(-1);
      expect(mask.hi).toBe(-1);
      expect(mask.size()).toBe(64);
      for (let sq = 0; sq < 64; sq++) {
        expect(mask.has(sq)).toBe(true);
      }
    });

    it('corners() should contain exactly a1, h1, a8, h8', () => {
      const mask = SquareMask.corners();
      expect(mask.size()).toBe(4);
      expect(mask.has(0)).toBe(true);   // a1
      expect(mask.has(7)).toBe(true);   // h1
      expect(mask.has(56)).toBe(true);  // a8
      expect(mask.has(63)).toBe(true);  // h8
    });

    it('center() should contain d4, e4, d5, e5', () => {
      const mask = SquareMask.center();
      expect(mask.size()).toBe(4);
      expect(mask.has(27)).toBe(true);  // d4
      expect(mask.has(28)).toBe(true);  // e4
      expect(mask.has(35)).toBe(true);  // d5
      expect(mask.has(36)).toBe(true);  // e5
    });

    it('backranks() should contain rank 1 and rank 8', () => {
      const mask = SquareMask.backranks();
      expect(mask.size()).toBe(16);
      expect(mask.equals(SquareMask.fromRank(0).union(SquareMask.fromRank(7)))).toBe(true);
    });

    it('backrank(white) should be rank 1', () => {
      const mask = SquareMask.backrank('white');
      expect(mask.equals(SquareMask.fromRank(0))).toBe(true);
    });

    it('backrank(black) should be rank 8', () => {
      const mask = SquareMask.backrank('black');
      expect(mask.equals(SquareMask.fromRank(7))).toBe(true);
    });

    it('lightSquares() should contain 32 light squares', () => {
      const mask = SquareMask.lightSquares();
      expect(mask.size()).toBe(32);
      // Light squares: a1 is dark, so b1 is light
      expect(mask.has(0)).toBe(false);  // a1 dark
      expect(mask.has(1)).toBe(true);   // b1 light
      expect(mask.has(8)).toBe(true);   // a2 light
      expect(mask.has(9)).toBe(false);  // b2 dark
    });

    it('darkSquares() should contain 32 dark squares', () => {
      const mask = SquareMask.darkSquares();
      expect(mask.size()).toBe(32);
      expect(mask.has(0)).toBe(true);   // a1 dark
      expect(mask.has(1)).toBe(false);  // b1 light
      expect(mask.has(8)).toBe(false);  // a2 light
      expect(mask.has(9)).toBe(true);   // b2 dark
    });

    it('lightSquares and darkSquares should be complements', () => {
      const light = SquareMask.lightSquares();
      const dark = SquareMask.darkSquares();
      expect(light.union(dark).equals(SquareMask.full())).toBe(true);
      expect(light.isDisjoint(dark)).toBe(true);
    });
  });

  // ============================================
  // Bit Operations
  // ============================================
  describe('bit operations', () => {
    describe('complement', () => {
      it('should invert all bits', () => {
        const mask = new SquareMask(0x0f0f0f0f, 0xf0f0f0f0);
        const comp = mask.complement();
        expect(comp.lo).toBe(~0x0f0f0f0f | 0);
        expect(comp.hi).toBe(~0xf0f0f0f0 | 0);
      });

      it('complement of empty should be full', () => {
        expect(SquareMask.empty().complement().equals(SquareMask.full())).toBe(true);
      });

      it('complement of full should be empty', () => {
        expect(SquareMask.full().complement().equals(SquareMask.empty())).toBe(true);
      });

      it('double complement should equal original', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.complement().complement().equals(mask)).toBe(true);
      });
    });

    describe('xor', () => {
      it('should compute XOR of two masks', () => {
        const a = new SquareMask(0xff00ff00, 0x00ff00ff);
        const b = new SquareMask(0xf0f0f0f0, 0x0f0f0f0f);
        const result = a.xor(b);
        expect(result.lo).toBe((0xff00ff00 ^ 0xf0f0f0f0) | 0);
        expect(result.hi).toBe((0x00ff00ff ^ 0x0f0f0f0f) | 0);
      });

      it('XOR with self should be empty', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.xor(mask).isEmpty()).toBe(true);
      });

      it('XOR with empty should be self', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.xor(SquareMask.empty()).equals(mask)).toBe(true);
      });

      it('XOR should be commutative', () => {
        const a = SquareMask.fromSquare(10);
        const b = SquareMask.fromSquare(50);
        expect(a.xor(b).equals(b.xor(a))).toBe(true);
      });
    });

    describe('union', () => {
      it('should compute OR of two masks', () => {
        const a = SquareMask.fromSquare(5);
        const b = SquareMask.fromSquare(37);
        const result = a.union(b);
        expect(result.size()).toBe(2);
        expect(result.has(5)).toBe(true);
        expect(result.has(37)).toBe(true);
      });

      it('union with self should be self', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.union(mask).equals(mask)).toBe(true);
      });

      it('union with empty should be self', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.union(SquareMask.empty()).equals(mask)).toBe(true);
      });

      it('union should be commutative', () => {
        const a = SquareMask.fromSquare(10);
        const b = SquareMask.fromSquare(50);
        expect(a.union(b).equals(b.union(a))).toBe(true);
      });
    });

    describe('intersect', () => {
      it('should compute AND of two masks', () => {
        const rank2 = SquareMask.fromRank(1);
        const fileE = SquareMask.fromFile(4);
        const result = rank2.intersect(fileE);
        expect(result.size()).toBe(1);
        expect(result.has(12)).toBe(true); // e2
      });

      it('intersect with self should be self', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.intersect(mask).equals(mask)).toBe(true);
      });

      it('intersect with empty should be empty', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.intersect(SquareMask.empty()).isEmpty()).toBe(true);
      });

      it('intersect with full should be self', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.intersect(SquareMask.full()).equals(mask)).toBe(true);
      });

      it('intersect should be commutative', () => {
        const a = SquareMask.fromRank(3);
        const b = SquareMask.fromFile(5);
        expect(a.intersect(b).equals(b.intersect(a))).toBe(true);
      });
    });

    describe('diff', () => {
      it('should compute A AND NOT B', () => {
        const full = SquareMask.full();
        const fileA = SquareMask.fromFile(0);
        const result = full.diff(fileA);
        expect(result.size()).toBe(56);
        expect(result.intersects(fileA)).toBe(false);
      });

      it('diff of self should be empty', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.diff(mask).isEmpty()).toBe(true);
      });

      it('diff with empty should be self', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.diff(SquareMask.empty()).equals(mask)).toBe(true);
      });

      it('empty diff anything should be empty', () => {
        expect(SquareMask.empty().diff(SquareMask.full()).isEmpty()).toBe(true);
      });
    });

    describe('intersects', () => {
      it('should return true for overlapping masks', () => {
        const rank4 = SquareMask.fromRank(3);
        const fileE = SquareMask.fromFile(4);
        expect(rank4.intersects(fileE)).toBe(true);
      });

      it('should return false for disjoint masks', () => {
        const rank1 = SquareMask.fromRank(0);
        const rank8 = SquareMask.fromRank(7);
        expect(rank1.intersects(rank8)).toBe(false);
      });

      it('should return false for empty masks', () => {
        expect(SquareMask.empty().intersects(SquareMask.empty())).toBe(false);
        expect(SquareMask.empty().intersects(SquareMask.full())).toBe(false);
      });
    });

    describe('isDisjoint', () => {
      it('should return true for disjoint masks', () => {
        const rank1 = SquareMask.fromRank(0);
        const rank8 = SquareMask.fromRank(7);
        expect(rank1.isDisjoint(rank8)).toBe(true);
      });

      it('should return false for overlapping masks', () => {
        const rank4 = SquareMask.fromRank(3);
        const fileE = SquareMask.fromFile(4);
        expect(rank4.isDisjoint(fileE)).toBe(false);
      });
    });

    describe('supersetOf/subsetOf', () => {
      it('full should be superset of everything', () => {
        expect(SquareMask.full().supersetOf(SquareMask.empty())).toBe(true);
        expect(SquareMask.full().supersetOf(SquareMask.fromSquare(42))).toBe(true);
        expect(SquareMask.full().supersetOf(SquareMask.full())).toBe(true);
      });

      it('empty should be subset of everything', () => {
        expect(SquareMask.empty().subsetOf(SquareMask.empty())).toBe(true);
        expect(SquareMask.empty().subsetOf(SquareMask.fromSquare(42))).toBe(true);
        expect(SquareMask.empty().subsetOf(SquareMask.full())).toBe(true);
      });

      it('rank should be subset of full', () => {
        const rank4 = SquareMask.fromRank(3);
        expect(rank4.subsetOf(SquareMask.full())).toBe(true);
        expect(SquareMask.full().supersetOf(rank4)).toBe(true);
      });

      it('single square should be subset of its rank and file', () => {
        const e4 = SquareMask.fromSquare(28);
        expect(e4.subsetOf(SquareMask.fromRank(3))).toBe(true);
        expect(e4.subsetOf(SquareMask.fromFile(4))).toBe(true);
      });
    });
  });

  // ============================================
  // 64-bit Shifts
  // ============================================
  describe('64-bit shifts', () => {
    describe('shr64', () => {
      it('shift 0 should return self', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.shr64(0).equals(mask)).toBe(true);
      });

      it('shift by 1', () => {
        const mask = new SquareMask(0x00000002, 0x00000000);
        const shifted = mask.shr64(1);
        expect(shifted.has(0)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 31 (boundary within lo)', () => {
        const mask = SquareMask.fromSquare(31);
        const shifted = mask.shr64(31);
        expect(shifted.has(0)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 32 (crosses to hi)', () => {
        const mask = SquareMask.fromSquare(32);
        const shifted = mask.shr64(32);
        expect(shifted.has(0)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 33', () => {
        const mask = SquareMask.fromSquare(63);
        const shifted = mask.shr64(33);
        expect(shifted.has(30)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 63', () => {
        const mask = SquareMask.fromSquare(63);
        const shifted = mask.shr64(63);
        expect(shifted.has(0)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 64 should return empty', () => {
        const mask = SquareMask.full();
        expect(mask.shr64(64).isEmpty()).toBe(true);
      });

      it('shift by 65 should return empty', () => {
        const mask = SquareMask.full();
        expect(mask.shr64(65).isEmpty()).toBe(true);
      });

      it('shift brings bits from hi to lo', () => {
        // Put a bit at position 48 (in hi at bit 16)
        const mask = new SquareMask(0, 0x00010000);
        const shifted = mask.shr64(16);
        // After shift, bit should be at position 32 (in hi at bit 0)
        expect(shifted.has(32)).toBe(true);
        expect(shifted.size()).toBe(1);
      });
    });

    describe('shl64', () => {
      it('shift 0 should return self', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.shl64(0).equals(mask)).toBe(true);
      });

      it('shift by 1', () => {
        const mask = SquareMask.fromSquare(0);
        const shifted = mask.shl64(1);
        expect(shifted.has(1)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 31 (boundary within lo)', () => {
        const mask = SquareMask.fromSquare(0);
        const shifted = mask.shl64(31);
        expect(shifted.has(31)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 32 (crosses to hi)', () => {
        const mask = SquareMask.fromSquare(0);
        const shifted = mask.shl64(32);
        expect(shifted.lo).toBe(0);
        expect(shifted.has(32)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 33', () => {
        const mask = SquareMask.fromSquare(0);
        const shifted = mask.shl64(33);
        expect(shifted.has(33)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 63', () => {
        const mask = SquareMask.fromSquare(0);
        const shifted = mask.shl64(63);
        expect(shifted.has(63)).toBe(true);
        expect(shifted.size()).toBe(1);
      });

      it('shift by 64 should return empty', () => {
        const mask = SquareMask.full();
        expect(mask.shl64(64).isEmpty()).toBe(true);
      });

      it('shift by 65 should return empty', () => {
        const mask = SquareMask.full();
        expect(mask.shl64(65).isEmpty()).toBe(true);
      });

      it('shift brings bits from lo to hi', () => {
        const mask = new SquareMask(0x80000000, 0);
        const shifted = mask.shl64(16);
        expect((shifted.hi >>> 0).toString(16)).toBe('8000');
      });
    });

    it('shl64 and shr64 should be inverses', () => {
      const mask = SquareMask.fromSquare(20);
      for (let shift = 0; shift < 44; shift++) {
        const shifted = mask.shl64(shift);
        const back = shifted.shr64(shift);
        expect(back.equals(mask)).toBe(true);
      }
    });
  });

  // ============================================
  // Byte/Bit Manipulation
  // ============================================
  describe('byte/bit manipulation', () => {
    describe('bswap64', () => {
      it('should reverse byte order', () => {
        const mask = new SquareMask(0x01020304, 0x05060708);
        const swapped = mask.bswap64();
        // After bswap64: lo and hi swap, and each is byte-reversed
        expect((swapped.lo >>> 0).toString(16)).toBe('8070605');
        expect((swapped.hi >>> 0).toString(16)).toBe('4030201');
      });

      it('double bswap64 should return original', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.bswap64().bswap64().equals(mask)).toBe(true);
      });

      it('bswap64 of empty should be empty', () => {
        expect(SquareMask.empty().bswap64().isEmpty()).toBe(true);
      });

      it('bswap64 of full should be full', () => {
        expect(SquareMask.full().bswap64().equals(SquareMask.full())).toBe(true);
      });
    });

    describe('rbit64', () => {
      it('should reverse all bits', () => {
        const mask = SquareMask.fromSquare(0);
        const reversed = mask.rbit64();
        expect(reversed.has(63)).toBe(true);
        expect(reversed.size()).toBe(1);
      });

      it('should reverse bit 31 to bit 32', () => {
        const mask = SquareMask.fromSquare(31);
        const reversed = mask.rbit64();
        expect(reversed.has(32)).toBe(true);
        expect(reversed.size()).toBe(1);
      });

      it('double rbit64 should return original', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.rbit64().rbit64().equals(mask)).toBe(true);
      });

      it('rbit64 of empty should be empty', () => {
        expect(SquareMask.empty().rbit64().isEmpty()).toBe(true);
      });

      it('rbit64 of full should be full', () => {
        expect(SquareMask.full().rbit64().equals(SquareMask.full())).toBe(true);
      });

      it('rbit64 should reverse square positions', () => {
        for (let sq = 0; sq < 64; sq++) {
          const mask = SquareMask.fromSquare(sq);
          const reversed = mask.rbit64();
          expect(reversed.has(63 - sq)).toBe(true);
          expect(reversed.size()).toBe(1);
        }
      });
    });

    describe('minus64', () => {
      it('should subtract correctly within lo', () => {
        const a = new SquareMask(10, 0);
        const b = new SquareMask(3, 0);
        const result = a.minus64(b);
        expect(result.lo).toBe(7);
        expect(result.hi).toBe(0);
      });

      it('should handle borrow from hi to lo', () => {
        const a = new SquareMask(0, 1);
        const b = new SquareMask(1, 0);
        const result = a.minus64(b);
        expect((result.lo >>> 0)).toBe(0xffffffff);
        expect(result.hi).toBe(0);
      });

      it('a - 0 should equal a', () => {
        const a = new SquareMask(0x12345678, 0xabcdef01);
        expect(a.minus64(SquareMask.empty()).equals(a)).toBe(true);
      });

      it('a - a should be empty', () => {
        const a = new SquareMask(0x12345678, 0xabcdef01);
        expect(a.minus64(a).isEmpty()).toBe(true);
      });
    });
  });

  // ============================================
  // Queries
  // ============================================
  describe('queries', () => {
    describe('equals', () => {
      it('should return true for equal masks', () => {
        const a = new SquareMask(0x12345678, 0xabcdef01);
        const b = new SquareMask(0x12345678, 0xabcdef01);
        expect(a.equals(b)).toBe(true);
      });

      it('should return false for different masks', () => {
        const a = new SquareMask(0x12345678, 0xabcdef01);
        const b = new SquareMask(0x12345679, 0xabcdef01);
        expect(a.equals(b)).toBe(false);
      });

      it('empty equals empty', () => {
        expect(SquareMask.empty().equals(SquareMask.empty())).toBe(true);
      });

      it('full equals full', () => {
        expect(SquareMask.full().equals(SquareMask.full())).toBe(true);
      });
    });

    describe('size', () => {
      it('empty should have size 0', () => {
        expect(SquareMask.empty().size()).toBe(0);
      });

      it('full should have size 64', () => {
        expect(SquareMask.full().size()).toBe(64);
      });

      it('single square should have size 1', () => {
        expect(SquareMask.fromSquare(42).size()).toBe(1);
      });

      it('rank should have size 8', () => {
        expect(SquareMask.fromRank(5).size()).toBe(8);
      });

      it('corners should have size 4', () => {
        expect(SquareMask.corners().size()).toBe(4);
      });

      it('size should count bits correctly across lo/hi boundary', () => {
        const mask = new SquareMask(0xffffffff, 0xffffffff);
        expect(mask.size()).toBe(64);

        const half = new SquareMask(0xffffffff, 0);
        expect(half.size()).toBe(32);
      });
    });

    describe('isEmpty/nonEmpty', () => {
      it('empty should be isEmpty and not nonEmpty', () => {
        expect(SquareMask.empty().isEmpty()).toBe(true);
        expect(SquareMask.empty().nonEmpty()).toBe(false);
      });

      it('full should be nonEmpty and not isEmpty', () => {
        expect(SquareMask.full().isEmpty()).toBe(false);
        expect(SquareMask.full().nonEmpty()).toBe(true);
      });

      it('single square should be nonEmpty', () => {
        expect(SquareMask.fromSquare(30).nonEmpty()).toBe(true);
        expect(SquareMask.fromSquare(30).isEmpty()).toBe(false);
      });
    });

    describe('has', () => {
      it('should detect squares in lo', () => {
        const mask = SquareMask.fromRank(0);
        for (let i = 0; i < 8; i++) {
          expect(mask.has(i)).toBe(true);
        }
        expect(mask.has(8)).toBe(false);
      });

      it('should detect squares in hi', () => {
        const mask = SquareMask.fromRank(7);
        for (let i = 56; i < 64; i++) {
          expect(mask.has(i)).toBe(true);
        }
        expect(mask.has(55)).toBe(false);
      });

      it('empty has no squares', () => {
        for (let sq = 0; sq < 64; sq++) {
          expect(SquareMask.empty().has(sq)).toBe(false);
        }
      });

      it('full has all squares', () => {
        for (let sq = 0; sq < 64; sq++) {
          expect(SquareMask.full().has(sq)).toBe(true);
        }
      });
    });

    describe('first/last', () => {
      it('first of empty should be undefined', () => {
        expect(SquareMask.empty().first()).toBeUndefined();
      });

      it('last of empty should be undefined', () => {
        expect(SquareMask.empty().last()).toBeUndefined();
      });

      it('first of single square should return that square', () => {
        expect(SquareMask.fromSquare(42).first()).toBe(42);
      });

      it('last of single square should return that square', () => {
        expect(SquareMask.fromSquare(42).last()).toBe(42);
      });

      it('first of full should be 0', () => {
        expect(SquareMask.full().first()).toBe(0);
      });

      it('last of full should be 63', () => {
        expect(SquareMask.full().last()).toBe(63);
      });

      it('first of rank 7 should be 56', () => {
        expect(SquareMask.fromRank(7).first()).toBe(56);
      });

      it('last of rank 0 should be 7', () => {
        expect(SquareMask.fromRank(0).last()).toBe(7);
      });

      it('first should return lowest set bit', () => {
        const mask = SquareMask.fromSquare(20).union(SquareMask.fromSquare(50));
        expect(mask.first()).toBe(20);
      });

      it('last should return highest set bit', () => {
        const mask = SquareMask.fromSquare(20).union(SquareMask.fromSquare(50));
        expect(mask.last()).toBe(50);
      });
    });

    describe('singleSquare', () => {
      it('should return undefined for empty', () => {
        expect(SquareMask.empty().singleSquare()).toBeUndefined();
      });

      it('should return undefined for multiple squares', () => {
        expect(SquareMask.fromRank(0).singleSquare()).toBeUndefined();
      });

      it('should return the square for single square mask', () => {
        for (let sq = 0; sq < 64; sq++) {
          expect(SquareMask.fromSquare(sq).singleSquare()).toBe(sq);
        }
      });
    });

    describe('moreThanOne', () => {
      it('empty should return false', () => {
        expect(SquareMask.empty().moreThanOne()).toBe(false);
      });

      it('single square should return false', () => {
        expect(SquareMask.fromSquare(42).moreThanOne()).toBe(false);
      });

      it('two squares should return true', () => {
        const mask = SquareMask.fromSquare(0).union(SquareMask.fromSquare(63));
        expect(mask.moreThanOne()).toBe(true);
      });

      it('full should return true', () => {
        expect(SquareMask.full().moreThanOne()).toBe(true);
      });

      it('two in lo should return true', () => {
        const mask = SquareMask.fromSquare(10).union(SquareMask.fromSquare(20));
        expect(mask.moreThanOne()).toBe(true);
      });

      it('two in hi should return true', () => {
        const mask = SquareMask.fromSquare(40).union(SquareMask.fromSquare(50));
        expect(mask.moreThanOne()).toBe(true);
      });

      it('one in lo and one in hi should return true', () => {
        const mask = SquareMask.fromSquare(10).union(SquareMask.fromSquare(50));
        expect(mask.moreThanOne()).toBe(true);
      });
    });
  });

  // ============================================
  // Mutators
  // ============================================
  describe('mutators', () => {
    describe('with', () => {
      it('should add square to mask in lo', () => {
        const mask = SquareMask.empty().with(10);
        expect(mask.has(10)).toBe(true);
        expect(mask.size()).toBe(1);
      });

      it('should add square to mask in hi', () => {
        const mask = SquareMask.empty().with(50);
        expect(mask.has(50)).toBe(true);
        expect(mask.size()).toBe(1);
      });

      it('adding existing square should not change mask', () => {
        const mask = SquareMask.fromSquare(42);
        expect(mask.with(42).equals(mask)).toBe(true);
      });

      it('should add multiple squares', () => {
        const mask = SquareMask.empty().with(0).with(31).with(32).with(63);
        expect(mask.size()).toBe(4);
        expect(mask.has(0)).toBe(true);
        expect(mask.has(31)).toBe(true);
        expect(mask.has(32)).toBe(true);
        expect(mask.has(63)).toBe(true);
      });
    });

    describe('without', () => {
      it('should remove square from mask in lo', () => {
        const mask = SquareMask.fromRank(0).without(4);
        expect(mask.has(4)).toBe(false);
        expect(mask.size()).toBe(7);
      });

      it('should remove square from mask in hi', () => {
        const mask = SquareMask.fromRank(7).without(60);
        expect(mask.has(60)).toBe(false);
        expect(mask.size()).toBe(7);
      });

      it('removing non-existent square should not change mask', () => {
        const mask = SquareMask.fromSquare(42);
        expect(mask.without(10).equals(mask)).toBe(true);
      });

      it('removing all squares should give empty', () => {
        let mask = SquareMask.fromSquare(10).union(SquareMask.fromSquare(50));
        mask = mask.without(10).without(50);
        expect(mask.isEmpty()).toBe(true);
      });
    });

    describe('toggle', () => {
      it('should add square if not present', () => {
        const mask = SquareMask.empty().toggle(42);
        expect(mask.has(42)).toBe(true);
      });

      it('should remove square if present', () => {
        const mask = SquareMask.fromSquare(42).toggle(42);
        expect(mask.has(42)).toBe(false);
        expect(mask.isEmpty()).toBe(true);
      });

      it('double toggle should return original', () => {
        const mask = new SquareMask(0x12345678, 0xabcdef01);
        expect(mask.toggle(30).toggle(30).equals(mask)).toBe(true);
      });

      it('toggle at boundary (31, 32)', () => {
        const mask = SquareMask.empty().toggle(31).toggle(32);
        expect(mask.has(31)).toBe(true);
        expect(mask.has(32)).toBe(true);
        expect(mask.size()).toBe(2);
      });
    });

    describe('set', () => {
      it('set(sq, true) should add square', () => {
        const mask = SquareMask.empty().set(42, true);
        expect(mask.has(42)).toBe(true);
      });

      it('set(sq, false) should remove square', () => {
        const mask = SquareMask.fromSquare(42).set(42, false);
        expect(mask.has(42)).toBe(false);
      });
    });

    describe('withoutFirst', () => {
      it('should remove first square in lo', () => {
        const mask = SquareMask.fromSquare(5).union(SquareMask.fromSquare(10));
        const result = mask.withoutFirst();
        expect(result.has(5)).toBe(false);
        expect(result.has(10)).toBe(true);
        expect(result.size()).toBe(1);
      });

      it('should remove first square when only in hi', () => {
        const mask = SquareMask.fromSquare(40).union(SquareMask.fromSquare(50));
        const result = mask.withoutFirst();
        expect(result.has(40)).toBe(false);
        expect(result.has(50)).toBe(true);
        expect(result.size()).toBe(1);
      });

      it('withoutFirst on empty should be empty', () => {
        expect(SquareMask.empty().withoutFirst().isEmpty()).toBe(true);
      });

      it('withoutFirst on single square should be empty', () => {
        expect(SquareMask.fromSquare(42).withoutFirst().isEmpty()).toBe(true);
      });
    });
  });

  // ============================================
  // Iteration
  // ============================================
  describe('iteration', () => {
    describe('forward iteration', () => {
      it('should iterate empty mask as no elements', () => {
        const squares = [...SquareMask.empty()];
        expect(squares).toEqual([]);
      });

      it('should iterate single square', () => {
        const squares = [...SquareMask.fromSquare(42)];
        expect(squares).toEqual([42]);
      });

      it('should iterate in ascending order', () => {
        const mask = SquareMask.fromSquare(63)
          .union(SquareMask.fromSquare(0))
          .union(SquareMask.fromSquare(31))
          .union(SquareMask.fromSquare(32));
        const squares = [...mask];
        expect(squares).toEqual([0, 31, 32, 63]);
      });

      it('should iterate rank correctly', () => {
        const squares = [...SquareMask.fromRank(3)];
        expect(squares).toEqual([24, 25, 26, 27, 28, 29, 30, 31]);
      });

      it('should iterate file correctly', () => {
        const squares = [...SquareMask.fromFile(4)];
        expect(squares).toEqual([4, 12, 20, 28, 36, 44, 52, 60]);
      });

      it('should iterate all 64 squares for full', () => {
        const squares = [...SquareMask.full()];
        expect(squares.length).toBe(64);
        expect(squares).toEqual(Array.from({ length: 64 }, (_, i) => i));
      });
    });

    describe('reversed iteration', () => {
      it('should iterate empty mask as no elements', () => {
        const squares = [...SquareMask.empty().reversed()];
        expect(squares).toEqual([]);
      });

      it('should iterate single square', () => {
        const squares = [...SquareMask.fromSquare(42).reversed()];
        expect(squares).toEqual([42]);
      });

      it('should iterate in descending order', () => {
        const mask = SquareMask.fromSquare(63)
          .union(SquareMask.fromSquare(0))
          .union(SquareMask.fromSquare(31))
          .union(SquareMask.fromSquare(32));
        const squares = [...mask.reversed()];
        expect(squares).toEqual([63, 32, 31, 0]);
      });

      it('should iterate rank correctly in reverse', () => {
        const squares = [...SquareMask.fromRank(3).reversed()];
        expect(squares).toEqual([31, 30, 29, 28, 27, 26, 25, 24]);
      });

      it('should iterate all 64 squares for full in reverse', () => {
        const squares = [...SquareMask.full().reversed()];
        expect(squares.length).toBe(64);
        expect(squares).toEqual(Array.from({ length: 64 }, (_, i) => 63 - i));
      });
    });

    it('forward and reversed should contain same elements', () => {
      const mask = new SquareMask(0x12345678, 0xabcdef01);
      const forward = [...mask];
      const reversed = [...mask.reversed()];
      expect(forward.sort((a, b) => a - b)).toEqual(reversed.sort((a, b) => a - b));
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('operations at bit 32 boundary', () => {
      const lo31 = SquareMask.fromSquare(31);
      const hi32 = SquareMask.fromSquare(32);

      // Union
      const union = lo31.union(hi32);
      expect(union.size()).toBe(2);
      expect(union.has(31)).toBe(true);
      expect(union.has(32)).toBe(true);

      // They should be disjoint
      expect(lo31.isDisjoint(hi32)).toBe(true);

      // Shift across boundary
      expect(lo31.shl64(1).has(32)).toBe(true);
      expect(hi32.shr64(1).has(31)).toBe(true);
    });

    it('operations with signed 32-bit overflow', () => {
      // 0x80000000 is -2147483648 in signed 32-bit
      const mask = new SquareMask(0x80000000, 0x80000000);
      expect(mask.has(31)).toBe(true);
      expect(mask.has(63)).toBe(true);
      expect(mask.size()).toBe(2);
    });

    it('all squares 0-63 should be distinct', () => {
      const masks = Array.from({ length: 64 }, (_, i) => SquareMask.fromSquare(i));
      for (let i = 0; i < 64; i++) {
        for (let j = i + 1; j < 64; j++) {
          expect(masks[i].isDisjoint(masks[j])).toBe(true);
        }
      }
    });

    it('union of all single squares should be full', () => {
      let union = SquareMask.empty();
      for (let sq = 0; sq < 64; sq++) {
        union = union.union(SquareMask.fromSquare(sq));
      }
      expect(union.equals(SquareMask.full())).toBe(true);
    });
  });
});
