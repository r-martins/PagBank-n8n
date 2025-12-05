// PagBank SDK compatível com N8N
// Baseado no SDK oficial, mas removendo dependências problemáticas

const crypto = require('crypto');

// Implementação simplificada do BigInteger (apenas o necessário)
class BigInteger {
    constructor(a, b, c) {
        if (a != null) {
            if ("number" == typeof a) this.fromNumber(a, b, c);
            else if (b == null && "string" != typeof a) this.fromString(a, 256);
            else this.fromString(a, b);
        }
    }

    fromNumber(a, b, c) {
        if ("number" == typeof b) {
            if (a < 2) this.fromInt(1);
            else if (a < 256) {
                this.fromInt(a);
                this.testBit(a - 1) || this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
                this.isEven() && this.dAddOffset(1, 0);
                while (!this.isProbablePrime(b)) {
                    this.dAddOffset(2, 0);
                    this.bitLength() > a && this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
                }
            } else {
                this.fromNumber(a, c);
                this.testBit(a - 1) || this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
                this.isEven() && this.dAddOffset(1, 0);
                while (!this.isProbablePrime(b)) {
                    this.dAddOffset(2, 0);
                    this.bitLength() > a && this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
                }
            }
        } else {
            this.fromInt(0);
        }
    }

    fromString(s, b) {
        var k;
        if (b == 16) k = 4;
        else if (b == 8) k = 3;
        else if (b == 256) k = 8;
        else if (b == 2) k = 1;
        else if (b == 32) k = 5;
        else if (b == 4) k = 2;
        else {
            this.fromRadix(s, b);
            return;
        }
        this.t = 0;
        this.s = 0;
        var i = s.length, mi = false, sh = 0;
        while (--i >= 0) {
            var x = (k == 8) ? s[i] & 0xff : this.intAt(s, i);
            if (x < 0) {
                if (s.charAt(i) == "-") mi = true;
                continue;
            }
            mi = false;
            if (sh == 0) this[this.t++] = x;
            else if (sh + k > this.DB) {
                this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
                this[this.t++] = (x >> (this.DB - sh));
            } else this[this.t - 1] |= x << sh;
            sh += k;
            if (sh >= this.DB) sh -= this.DB;
        }
        if (k == 8 && (s[0] & 0x80) != 0) {
            this.s = -1;
            if (sh > 0) this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
        }
        this.clamp();
        if (mi) BigInteger.ZERO.subTo(this, this);
    }

    intAt(s, i) {
        var c = s.charCodeAt(i);
        if (c >= 48 && c <= 57) return c - 48;
        if (c >= 65 && c <= 90) return c - 55;
        if (c >= 97 && c <= 122) return c - 61;
        return -1;
    }

    fromInt(x) {
        this.t = 1;
        this.s = (x < 0) ? -1 : 0;
        if (x > 0) this[0] = x;
        else if (x < -1) this[0] = x + this.DV;
        else this.t = 0;
    }

    clamp() {
        var c = this.s & this.DM;
        while (this.t > 0 && this[this.t - 1] == c) --this.t;
    }

    toString(b) {
        if (this.s < 0) return "-" + this.negate().toString(b);
        var k;
        if (b == 16) k = 4;
        else if (b == 8) k = 3;
        else if (b == 2) k = 1;
        else if (b == 32) k = 5;
        else if (b == 4) k = 2;
        else return this.toRadix(b);
        var km = (1 << k) - 1, d, m = false, r = "", i = this.t;
        var p = this.DB - (i * this.DB) % k;
        if (i-- > 0) {
            if (p < this.DB && (d = this[i] >> p) > 0) {
                m = true;
                r = this.int2char(d);
            }
            while (i >= 0) {
                if (p < k) {
                    d = (this[i] & ((1 << p) - 1)) << (k - p);
                    d |= this[--i] >> (p += this.DB - k);
                } else {
                    d = (this[i] >> (p -= k)) & km;
                    if (p <= 0) {
                        p += this.DB;
                        --i;
                    }
                }
                if (d > 0) m = true;
                if (m) r += this.int2char(d);
            }
        }
        return m ? r : "0";
    }

    int2char(n) {
        return "0123456789abcdefghijklmnopqrstuvwxyz".charAt(n);
    }

    negate() {
        var r = new BigInteger();
        BigInteger.ZERO.subTo(this, r);
        return r;
    }

    abs() {
        return (this.s < 0) ? this.negate() : this;
    }

    compareTo(a) {
        var r = this.s - a.s;
        if (r != 0) return r;
        var i = this.t;
        r = i - a.t;
        if (r != 0) return (this.s < 0) ? -r : r;
        while (--i >= 0) if ((r = this[i] - a[i]) != 0) return r;
        return 0;
    }

    bitLength() {
        if (this.t <= 0) return 0;
        return this.DB * (this.t - 1) + this.nbits(this[this.t - 1] ^ (this.s & this.DM));
    }

    nbits(x) {
        var r = 1, t;
        if ((t = x >>> 16) != 0) {
            x = t;
            r += 16;
        }
        if ((t = x >> 8) != 0) {
            x = t;
            r += 8;
        }
        if ((t = x >> 4) != 0) {
            x = t;
            r += 4;
        }
        if ((t = x >> 2) != 0) {
            x = t;
            r += 2;
        }
        if ((t = x >> 1) != 0) {
            x = t;
            r += 1;
        }
        return r;
    }

    mod(a) {
        var r = new BigInteger();
        this.abs().divRemTo(a, null, r);
        if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
        return r;
    }

    modPowInt(e, m) {
        var z;
        if (e < 256 || m.isEven()) z = new ClassicReduction(m);
        else z = new MontgomeryReduction(m);
        return this.exp(e, z);
    }

    exp(e, z) {
        if (e > 0xffffffff || e < 1) return BigInteger.ONE;
        var r = new BigInteger(), r2 = new BigInteger(), g = z.convert(this), i = this.nbits(e) - 1;
        g.copyTo(r);
        while (--i >= 0) {
            z.sqrTo(r, r2);
            if ((e & (1 << i)) > 0) z.mulTo(r2, g, r);
            else {
                var t = r;
                r = r2;
                r2 = t;
            }
        }
        return z.revert(r);
    }

    copyTo(r) {
        for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
        r.t = this.t;
        r.s = this.s;
    }

    clone() {
        var r = new BigInteger();
        this.copyTo(r);
        return r;
    }

    intValue() {
        if (this.s < 0) {
            if (this.t == 1) return this[0] - this.DV;
            else if (this.t == 0) return -1;
        } else if (this.t == 1) return this[0];
        else if (this.t == 0) return 0;
        return ((this[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this[0];
    }

    byteValue() {
        return (this.t == 0) ? this.s : (this[0] << 24) >> 24;
    }

    shortValue() {
        return (this.t == 0) ? this.s : (this[0] << 16) >> 16;
    }

    signum() {
        if (this.s < 0) return -1;
        else if (this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
        else return 1;
    }

    toByteArray() {
        var i = this.t, r = [];
        r[0] = this.s;
        var p = this.DB - (i * this.DB) % 8, d, k = 0;
        if (i-- > 0) {
            if (p < this.DB && (d = this[i] >> p) != ((this.s & this.DM) >> p)) r[k++] = d | (this.s << (this.DB - p));
            while (i >= 0) {
                if (p < 8) {
                    d = (this[i] & ((1 << p) - 1)) << (8 - p);
                    d |= this[--i] >> (p += this.DB - 8);
                } else {
                    d = (this[i] >> (p -= 8)) & 0xff;
                    if (p <= 0) {
                        p += this.DB;
                        --i;
                    }
                }
                if ((d & 0x80) != 0) d |= -256;
                if (k == 0 && (this.s & 0x80) != (d & 0x80)) ++k;
                if (k > 0 || d != this.s) r[k++] = d;
            }
        }
        return r;
    }

    equals(a) {
        return (this.compareTo(a) == 0);
    }

    min(a) {
        return (this.compareTo(a) < 0) ? this : a;
    }

    max(a) {
        return (this.compareTo(a) > 0) ? this : a;
    }

    and(a) {
        var r = new BigInteger();
        this.bitwiseTo(a, op_and, r);
        return r;
    }

    or(a) {
        var r = new BigInteger();
        this.bitwiseTo(a, op_or, r);
        return r;
    }

    xor(a) {
        var r = new BigInteger();
        this.bitwiseTo(a, op_xor, r);
        return r;
    }

    andNot(a) {
        var r = new BigInteger();
        this.bitwiseTo(a, op_andnot, r);
        return r;
    }

    not() {
        var r = new BigInteger();
        for (var i = 0; i < this.t; ++i) r[i] = this.DM & ~this[i];
        r.t = this.t;
        r.s = ~this.s;
        return r;
    }

    shiftLeft(n) {
        var r = new BigInteger();
        if (n < 0) this.rShiftTo(-n, r);
        else this.lShiftTo(n, r);
        return r;
    }

    shiftRight(n) {
        var r = new BigInteger();
        if (n < 0) this.lShiftTo(-n, r);
        else this.rShiftTo(n, r);
        return r;
    }

    getLowestSetBit() {
        for (var i = 0; i < this.t; ++i) if (this[i] != 0) return i * this.DB + this.lbit(this[i]);
        if (this.s < 0) return this.t * this.DB;
        return -1;
    }

    lbit(x) {
        if (x == 0) return -1;
        var r = 0;
        if ((x & 0xffff) == 0) {
            x >>= 16;
            r += 16;
        }
        if ((x & 0xff) == 0) {
            x >>= 8;
            r += 8;
        }
        if ((x & 0xf) == 0) {
            x >>= 4;
            r += 4;
        }
        if ((x & 3) == 0) {
            x >>= 2;
            r += 2;
        }
        if ((x & 1) == 0) ++r;
        return r;
    }

    bitCount() {
        var r = 0, x = this.s & this.DM;
        for (var i = 0; i < this.t; ++i) r += this.cbit(this[i] ^ x);
        return r;
    }

    cbit(x) {
        var r = 0;
        while (x != 0) {
            x &= x - 1;
            ++r;
        }
        return r;
    }

    testBit(n) {
        var j = Math.floor(n / this.DB);
        if (j >= this.t) return (this.s != 0);
        return ((this[j] & (1 << (n % this.DB))) != 0);
    }

    setBit(n) {
        return this.changeBit(n, op_or);
    }

    clearBit(n) {
        return this.changeBit(n, op_andnot);
    }

    flipBit(n) {
        return this.changeBit(n, op_xor);
    }

    add(a) {
        var r = new BigInteger();
        this.addTo(a, r);
        return r;
    }

    subtract(a) {
        var r = new BigInteger();
        this.subTo(a, r);
        return r;
    }

    multiply(a) {
        var r = new BigInteger();
        this.multiplyTo(a, r);
        return r;
    }

    divide(a) {
        var r = new BigInteger();
        this.divRemTo(a, r, null);
        return r;
    }

    remainder(a) {
        var r = new BigInteger();
        this.divRemTo(a, null, r);
        return r;
    }

    divideAndRemainder(a) {
        var q = new BigInteger(), r = new BigInteger();
        this.divRemTo(a, q, r);
        return [q, r];
    }

    modPow(e, m) {
        var i = e.bitLength(), k, r = this.nbv(1), z;
        if (i <= 0) return r;
        else if (i < 18) k = 1;
        else if (i < 48) k = 3;
        else if (i < 144) k = 4;
        else if (i < 768) k = 5;
        else k = 6;
        if (i < 8) z = new ClassicReduction(m);
        else if (m.isEven()) z = new BarrettReduction(m);
        else z = new MontgomeryReduction(m);

        var g = [], n = 3, k1 = k - 1, km = (1 << k) - 1;
        g[1] = z.convert(this);
        if (k > 1) {
            var g2 = new BigInteger();
            z.sqrTo(g[1], g2);
            while (n <= km) {
                g[n] = new BigInteger();
                z.mulTo(g2, g[n - 2], g[n]);
                n += 2;
            }
        }

        var j = e.t - 1, w, is1 = true, r2 = new BigInteger(), t;
        i = this.nbits(e[j]) - 1;
        while (j >= 0) {
            if (i >= k1) w = (e[j] >> (i - k1)) & km;
            else {
                w = (e[j] & ((1 << (i + 1)) - 1)) << (k1 - i);
                if (j > 0) w |= e[j - 1] >> (this.DB + i - k1);
            }

            n = k;
            while ((w & 1) == 0) {
                w >>= 1;
                --n;
            }
            if ((i -= n) < 0) {
                i += this.DB;
                --j;
            }
            if (is1) {
                g[w].copyTo(r);
                is1 = false;
            } else {
                while (n > 1) {
                    z.sqrTo(r, r2);
                    z.sqrTo(r2, r);
                    n -= 2;
                }
                if (n > 0) z.sqrTo(r, r2);
                else {
                    t = r;
                    r = r2;
                    r2 = t;
                }
                z.mulTo(r2, g[w], r);
            }

            while (j >= 0 && (e[j] & (1 << i)) == 0) {
                z.sqrTo(r, r2);
                t = r;
                r = r2;
                r2 = t;
                if (--i < 0) {
                    i = this.DB - 1;
                    --j;
                }
            }
        }
        return z.revert(r);
    }

    modInverse(m) {
        var ac = m.isEven();
        if ((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
        var u = m.clone(), v = this.clone();
        var a = this.nbv(1), b = this.nbv(0), c = this.nbv(0), d = this.nbv(1);
        while (u.signum() != 0) {
            while (u.isEven()) {
                u.rShiftTo(1, u);
                if (ac) {
                    if (!a.isEven() || !b.isEven()) {
                        a.addTo(this, a);
                        b.subTo(m, b);
                    }
                    a.rShiftTo(1, a);
                } else if (!b.isEven()) b.subTo(m, b);
                b.rShiftTo(1, b);
            }
            while (v.isEven()) {
                v.rShiftTo(1, v);
                if (ac) {
                    if (!c.isEven() || !d.isEven()) {
                        c.addTo(this, c);
                        d.subTo(m, d);
                    }
                    c.rShiftTo(1, c);
                } else if (!d.isEven()) d.subTo(m, d);
                d.rShiftTo(1, d);
            }
            if (u.compareTo(v) >= 0) {
                u.subTo(v, u);
                if (ac) a.subTo(c, a);
                b.subTo(d, b);
            } else {
                v.subTo(u, v);
                if (ac) c.subTo(a, c);
                d.subTo(b, d);
            }
        }
        if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
        if (d.compareTo(m) >= 0) return d.subtract(m);
        if (d.signum() < 0) d.addTo(m, d);
        else return d;
        return (d.signum() < 0) ? d.add(m) : d;
    }

    pow(e) {
        return this.exp(e, new NullExp());
    }

    gcd(a) {
        var x = (this.s < 0) ? this.negate() : this.clone();
        var y = (a.s < 0) ? a.negate() : a.clone();
        if (x.compareTo(y) < 0) {
            var t = x;
            x = y;
            y = t;
        }
        var i = x.getLowestSetBit(), g = y.getLowestSetBit();
        if (g < 0) return x;
        if (i < g) g = i;
        if (g > 0) {
            x.rShiftTo(g, x);
            y.rShiftTo(g, y);
        }
        while (x.signum() > 0) {
            if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
            if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);
            if (x.compareTo(y) >= 0) {
                x.subTo(y, x);
                x.rShiftTo(1, x);
            } else {
                y.subTo(x, y);
                y.rShiftTo(1, y);
            }
        }
        if (g > 0) y.lShiftTo(g, y);
        return y;
    }

    isProbablePrime(t) {
        var i, x = this.abs();
        if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
            for (i = 0; i < lowprimes.length; ++i) if (x[0] == lowprimes[i]) return true;
            return false;
        }
        if (x.isEven()) return false;
        i = 1;
        while (i < lowprimes.length) {
            var m = lowprimes[i], j = i + 1;
            while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];
            m = x.modInt(m);
            while (i < j) if (m % lowprimes[i++] == 0) return false;
        }
        return x.millerRabin(t);
    }

    millerRabin(t) {
        var n1 = this.subtract(BigInteger.ONE);
        var k = n1.getLowestSetBit();
        if (k <= 0) return false;
        var r = n1.shiftRight(k);
        t = (t + 1) >> 1;
        if (t > lowprimes.length) t = lowprimes.length;
        var a = new BigInteger();
        for (var i = 0; i < t; ++i) {
            a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);
            var y = a.modPow(r, this);
            if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
                var j = 1;
                while (j++ < k && y.compareTo(n1) != 0) {
                    y = y.modPowInt(2, this);
                    if (y.compareTo(BigInteger.ONE) == 0) return false;
                }
                if (y.compareTo(n1) != 0) return false;
            }
        }
        return true;
    }

    square() {
        var r = new BigInteger();
        this.squareTo(r);
        return r;
    }

    // gcda removido - não necessário para criptografia de cartão

    // fromNumberAsync removido - não necessário para criptografia de cartão

    bitwiseTo(a, op, r) {
        var i, f, m = Math.min(a.t, this.t);
        for (i = 0; i < m; ++i) r[i] = op(this[i], a[i]);
        if (a.t < this.t) {
            f = a.s & this.DM;
            for (i = m; i < this.t; ++i) r[i] = op(this[i], f);
            r.t = this.t;
        } else {
            f = this.s & this.DM;
            for (i = m; i < a.t; ++i) r[i] = op(f, a[i]);
            r.t = a.t;
        }
        r.s = op(this.s, a.s);
        r.clamp();
    }

    changeBit(n, op) {
        var r = BigInteger.ONE.shiftLeft(n);
        this.bitwiseTo(r, op, r);
        return r;
    }

    addTo(a, r) {
        var i = 0, c = 0, m = Math.min(a.t, this.t);
        while (i < m) {
            c += this[i] + a[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
        }
        if (a.t < this.t) {
            c += a.s;
            while (i < this.t) {
                c += this[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c += this.s;
        } else {
            c += this.s;
            while (i < a.t) {
                c += a[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c += a.s;
        }
        r.s = (c < 0) ? -1 : 0;
        if (c > 0) r[i++] = c;
        else if (c < -1) r[i++] = this.DV + c;
        r.t = i;
        r.clamp();
    }

    dMultiply(n) {
        this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
        ++this.t;
        this.clamp();
    }

    dAddOffset(n, w) {
        if (n == 0) return;
        while (this.t <= w) this[this.t++] = 0;
        this[w] += n;
        while (this[w] >= this.DV) {
            this[w] -= this.DV;
            if (++w >= this.t) this[this.t++] = 0;
            ++this[w];
        }
    }

    multiplyLowerTo(a, n, r) {
        var i = Math.min(this.t + a.t, n);
        r.s = 0;
        r.t = i;
        while (i > 0) r[--i] = 0;
        var j;
        for (j = r.t - this.t; i < j; ++i) r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
        for (j = Math.min(a.t, n); i < j; ++i) this.am(0, a[i], r, i, 0, n - i);
        r.clamp();
    }

    multiplyUpperTo(a, n, r) {
        --n;
        var i = r.t = this.t + a.t - n;
        r.s = 0;
        while (--i >= 0) r[i] = 0;
        for (i = Math.max(n - this.t, 0); i < a.t; ++i) r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
        r.clamp();
        r.drShiftTo(1, r);
    }

    modInt(n) {
        if (n <= 0) return 0;
        var d = this.DV % n, r = (this.s < 0) ? n - 1 : 0;
        if (this.t > 0) if (d == 0) r = this[0] % n;
        else for (var i = this.t - 1; i >= 0; --i) r = (d * r + this[i]) % n;
        return r;
    }

    copyTo(r) {
        for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
        r.t = this.t;
        r.s = this.s;
    }

    fromRadix(s, b) {
        this.fromInt(0);
        var cs = this.chunkSize(b);
        var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
        for (var i = 0; i < s.length; ++i) {
            var x = this.intAt(s, i);
            if (x < 0) {
                if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
                continue;
            }
            w = b * w + x;
            if (++j >= cs) {
                this.dMultiply(d);
                this.dAddOffset(w, 0);
                j = 0;
                w = 0;
            }
        }
        if (j > 0) {
            this.dMultiply(Math.pow(b, j));
            this.dAddOffset(w, 0);
        }
        if (mi) BigInteger.ZERO.subTo(this, this);
    }

    fromNumber(a, b, c) {
        if ("number" == typeof b) {
            if (a < 2) this.fromInt(1);
            else {
                this.fromNumber(a, c);
                this.testBit(a - 1) || this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
                this.isEven() && this.dAddOffset(1, 0);
                while (!this.isProbablePrime(b)) {
                    this.dAddOffset(2, 0);
                    this.bitLength() > a && this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
                }
            }
        } else {
            var x = [], s = a & 7;
            x.length = (a >> 3) + 1;
            b.nextBytes(x);
            if (s > 0) x[0] &= ((1 << s) - 1);
            else x[0] = 0;
            this.fromString(x, 256);
        }
    }

    chunkSize(r) {
        return Math.floor(Math.LN2 * this.DB / Math.log(r));
    }

    toRadix(b) {
        if (b == null) b = 10;
        if (this.signum() == 0 || b < 2 || b > 36) return "0";
        var cs = this.chunkSize(b);
        var a = Math.pow(b, cs);
        var d = this.nbv(a), y = new BigInteger(), z = new BigInteger(), r = "";
        this.divRemTo(d, y, z);
        while (y.signum() > 0) {
            r = (a + z.intValue()).toString(b).substr(1) + r;
            y.divRemTo(d, y, z);
        }
        return z.intValue().toString(b) + r;
    }

    fromRadix(s, b) {
        this.fromInt(0);
        var cs = this.chunkSize(b);
        var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
        for (var i = 0; i < s.length; ++i) {
            var x = this.intAt(s, i);
            if (x < 0) {
                if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
                continue;
            }
            w = b * w + x;
            if (++j >= cs) {
                this.dMultiply(d);
                this.dAddOffset(w, 0);
                j = 0;
                w = 0;
            }
        }
        if (j > 0) {
            this.dMultiply(Math.pow(b, j));
            this.dAddOffset(w, 0);
        }
        if (mi) BigInteger.ZERO.subTo(this, this);
    }

    // Métodos auxiliares
    nbv(i) {
        var r = new BigInteger();
        r.fromInt(i);
        return r;
    }

    // Operações bit a bit
    lShiftTo(n, r) {
        var bs = n % this.DB;
        var cbs = this.DB - bs;
        var bm = (1 << cbs) - 1;
        var ds = Math.floor(n / this.DB), c = (this.s << bs) & this.DM, i;
        for (i = this.t - 1; i >= 0; --i) {
            r[i + ds + 1] = (this[i] >> cbs) | c;
            c = (this[i] & bm) << bs;
        }
        for (i = ds - 1; i >= 0; --i) r[i] = 0;
        r[ds] = c;
        r.t = this.t + ds + 1;
        r.s = this.s;
        r.clamp();
    }

    rShiftTo(n, r) {
        r.s = this.s;
        var ds = Math.floor(n / this.DB);
        if (ds >= this.t) {
            r.t = 0;
            return;
        }
        var bs = n % this.DB;
        var cbs = this.DB - bs;
        var bm = (1 << bs) - 1;
        r[0] = this[ds] >> bs;
        for (var i = ds + 1; i < this.t; ++i) {
            r[i - ds - 1] |= (this[i] & bm) << cbs;
            r[i - ds] = this[i] >> bs;
        }
        if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
        r.t = this.t - ds;
        r.clamp();
    }

    subTo(a, r) {
        var i = 0, c = 0, m = Math.min(a.t, this.t);
        while (i < m) {
            c += this[i] - a[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
        }
        if (a.t < this.t) {
            c -= a.s;
            while (i < this.t) {
                c += this[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c += this.s;
        } else {
            c += this.s;
            while (i < a.t) {
                c -= a[i];
                r[i++] = c & this.DM;
                c >>= this.DB;
            }
            c -= a.s;
        }
        r.s = (c < 0) ? -1 : 0;
        if (c < -1) r[i++] = this.DV + c;
        else if (c > 0) r[i++] = c;
        r.t = i;
        r.clamp();
    }

    multiplyTo(a, r) {
        var x = this.abs(), y = a.abs();
        var i = x.t;
        r.t = i + y.t;
        while (--i >= 0) r[i] = 0;
        for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
        r.s = 0;
        r.clamp();
        if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
    }

    squareTo(r) {
        var x = this.abs();
        var i = r.t = 2 * x.t;
        while (--i >= 0) r[i] = 0;
        for (i = 0; i < x.t - 1; ++i) {
            var c = x.am(i, x[i], r, 2 * i, 0, 1);
            if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
                r[i + x.t] -= x.DV;
                r[i + x.t + 1] = 1;
            }
        }
        if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
        r.s = 0;
        r.clamp();
    }

    divRemTo(m, q, r) {
        var pm = m.abs();
        if (pm.t <= 0) return;
        var pt = this.abs();
        if (pt.t < pm.t) {
            if (q != null) q.fromInt(0);
            if (r != null) this.copyTo(r);
            return;
        }
        if (r == null) r = new BigInteger();
        var y = new BigInteger(), ts = this.s, ms = m.s;
        var nsh = this.DB - this.nbits(pm[pm.t - 1]);
        if (nsh > 0) {
            pm.lShiftTo(nsh, y);
            pt.lShiftTo(nsh, r);
        } else {
            pm.copyTo(y);
            pt.copyTo(r);
        }
        var ys = y.t;
        var y0 = y[ys - 1];
        if (y0 == 0) return;
        var yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0);
        var d1 = this.FV / yt, d2 = (1 << this.F1) / yt, e = 1 << this.F2;
        var i = r.t, j = i - ys, t = (q == null) ? new BigInteger() : q;
        y.dlShiftTo(j, t);
        if (r.compareTo(t) >= 0) {
            r[r.t++] = 1;
            r.subTo(t, r);
        }
        BigInteger.ONE.dlShiftTo(ys, t);
        t.subTo(y, y);
        while (y.t < ys) y[y.t++] = 0;
        while (--j >= 0) {
            var qd = (r[--i] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
            if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
                y.dlShiftTo(j, t);
                r.subTo(t, r);
                while (r[i] < --qd) r.subTo(t, r);
            }
        }
        if (q != null) {
            r.drShiftTo(ys, q);
            if (ts != ms) BigInteger.ZERO.subTo(q, q);
        }
        r.t = ys;
        r.clamp();
        if (nsh > 0) r.rShiftTo(nsh, r);
        if (ts < 0) BigInteger.ZERO.subTo(r, r);
    }

    dlShiftTo(n, r) {
        var i;
        for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
        for (i = n - 1; i >= 0; --i) r[i] = 0;
        r.t = this.t + n;
        r.s = this.s;
    }

    drShiftTo(n, r) {
        for (var i = n; i < this.t; ++i) r[i - n] = this[i];
        r.t = Math.max(this.t - n, 0);
        r.s = this.s;
    }

    // Método am - multiplicação e acumulação
    am(i, x, w, j, c, n) {
        while (--n >= 0) {
            var v = x * this[i++] + w[j] + c;
            c = Math.floor(v / 0x4000000);
            w[j++] = v & 0x3ffffff;
        }
        return c;
    }

    // Constantes
    static get ZERO() {
        var z = new BigInteger();
        z.fromInt(0);
        return z;
    }

    static get ONE() {
        var o = new BigInteger();
        o.fromInt(1);
        return o;
    }

    // Propriedades
    get DB() { return 26; }
    get DM() { return (1 << 26) - 1; }
    get DV() { return 1 << 26; }
    get FV() { return Math.pow(2, 52); }
    get F1() { return 52 - 26; }
    get F2() { return 2 * 26 - 52; }
}

// Números primos baixos para testes
var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];

// Operações bit a bit
function op_and(x, y) { return x & y; }
function op_or(x, y) { return x | y; }
function op_xor(x, y) { return x ^ y; }
function op_andnot(x, y) { return x & ~y; }

// Classes de redução modular
class NullExp {
    convert(x) { return x; }
    revert(x) { return x; }
    mulTo(x, y, r) { x.multiplyTo(y, r); }
    sqrTo(x, r) { x.squareTo(r); }
}

class ClassicReduction {
    constructor(m) { this.m = m; }
    convert(x) { if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m); else return x; }
    revert(x) { return x; }
    reduce(x) { x.divRemTo(this.m, null, x); }
    mulTo(x, y, r) { x.multiplyTo(y, r); this.reduce(r); }
    sqrTo(x, r) { x.squareTo(r); this.reduce(r); }
}

class MontgomeryReduction {
    constructor(m) {
        this.m = m;
        this.mp = m.invDigit();
        this.mpl = this.mp & 0x7fff;
        this.mph = this.mp >> 15;
        this.um = (1 << (m.DB - 15)) - 1;
        this.mt2 = 2 * m.t;
    }
    convert(x) {
        var r = new BigInteger();
        x.abs().dlShiftTo(this.m.t, r);
        r.divRemTo(this.m, null, r);
        if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
        return r;
    }
    revert(x) {
        var r = new BigInteger();
        x.copyTo(r);
        this.reduce(r);
        return r;
    }
    reduce(x) {
        while (x.t <= this.mt2) x[x.t++] = 0;
        for (var i = 0; i < this.m.t; ++i) {
            var j = x[i] & 0x7fff;
            var u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;
            j = i + this.m.t;
            x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
            while (x[j] >= x.DV) {
                x[j] -= x.DV;
                x[++j]++;
            }
        }
        x.clamp();
        x.drShiftTo(this.m.t, x);
        if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
    }
    mulTo(x, y, r) { x.multiplyTo(y, r); this.reduce(r); }
    sqrTo(x, r) { x.squareTo(r); this.reduce(r); }
}

class BarrettReduction {
    constructor(m) {
        this.r2 = new BigInteger();
        this.q3 = new BigInteger();
        BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
        this.mu = this.r2.divide(m);
        this.m = m;
    }
    convert(x) {
        if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);
        else if (x.compareTo(this.m) < 0) return x;
        else {
            var r = new BigInteger();
            x.copyTo(r);
            this.reduce(r);
            return r;
        }
    }
    revert(x) { return x; }
    reduce(x) {
        x.drShiftTo(this.m.t - 1, this.r2);
        if (x.t > this.m.t + 1) {
            x.t = this.m.t + 1;
            x.clamp();
        }
        this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
        this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
        while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);
        x.subTo(this.r2, x);
        while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
    }
    mulTo(x, y, r) { x.multiplyTo(y, r); this.reduce(r); }
    sqrTo(x, r) { x.squareTo(r); this.reduce(r); }
}

// Implementação RSA simplificada
class RSAKey {
    constructor() {
        this.n = null;
        this.e = 0;
        this.d = null;
        this.p = null;
        this.q = null;
        this.dmp1 = null;
        this.dmq1 = null;
        this.coeff = null;
    }

    doPublic(x) {
        return x.modPowInt(this.e, this.n);
    }

    doPrivate(x) {
        if (this.p == null || this.q == null) return x.modPow(this.d, this.n);
        var xp = x.mod(this.p).modPow(this.dmp1, this.p);
        var xq = x.mod(this.q).modPow(this.dmq1, this.q);
        while (xp.compareTo(xq) < 0) xp = xp.add(this.p);
        return xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);
    }

    setPublic(N, E, logger) {
        if (N != null && E != null && N.length > 0 && E.length > 0) {
            this.n = new BigInteger(N, 16);
            this.e = parseInt(E, 16);
        } else if (logger) {
            logger.error('Invalid RSA public key');
        }
    }

    parseKey(key, logger) {
        try {
            if (logger) {
                logger.debug('Parsing key:', key.substring(0, 100) + '...');
            }
            
            // Remover headers e footers PEM
            key = key.replace(/-----BEGIN PUBLIC KEY-----/g, '');
            key = key.replace(/-----END PUBLIC KEY-----/g, '');
            key = key.replace(/\s/g, '');
            
            if (logger) {
                logger.debug('Key after cleanup:', key.substring(0, 50) + '...');
            }
            
            // Decodificar base64
            const binaryString = Buffer.from(key, 'base64').toString('binary');
            const bytes = [];
            for (let i = 0; i < binaryString.length; i++) {
                bytes.push(binaryString.charCodeAt(i));
            }
            
            if (logger) {
                logger.debug('Decoded bytes length:', bytes.length);
            }
            
            // Parse ASN.1 DER (simplificado)
            let pos = 0;
            
            // SEQUENCE
            if (bytes[pos] !== 0x30) throw new Error('Invalid ASN.1 structure');
            pos++;
            
            // Length
            let length = bytes[pos++];
            if (length & 0x80) {
                const lengthBytes = length & 0x7f;
                length = 0;
                for (let i = 0; i < lengthBytes; i++) {
                    length = (length << 8) | bytes[pos++];
                }
            }
            
            // AlgorithmIdentifier SEQUENCE
            if (bytes[pos] !== 0x30) throw new Error('Invalid algorithm identifier');
            pos++;
            
            // Skip algorithm identifier
            let algLength = bytes[pos++];
            if (algLength & 0x80) {
                const lengthBytes = algLength & 0x7f;
                algLength = 0;
                for (let i = 0; i < lengthBytes; i++) {
                    algLength = (algLength << 8) | bytes[pos++];
                }
            }
            pos += algLength;
            
            // SubjectPublicKeyInfo BIT STRING
            if (bytes[pos] !== 0x03) throw new Error('Invalid public key structure');
            pos++;
            
            // Skip unused bits
            let keyLength = bytes[pos++];
            if (keyLength & 0x80) {
                const lengthBytes = keyLength & 0x7f;
                keyLength = 0;
                for (let i = 0; i < lengthBytes; i++) {
                    keyLength = (keyLength << 8) | bytes[pos++];
                }
            }
            
            // Skip unused bits byte
            pos++;
            
            // RSA Public Key SEQUENCE
            if (bytes[pos] !== 0x30) throw new Error('Invalid RSA public key structure');
            pos++;
            
            // RSA Public Key length
            let rsaLength = bytes[pos++];
            if (rsaLength & 0x80) {
                const lengthBytes = rsaLength & 0x7f;
                rsaLength = 0;
                for (let i = 0; i < lengthBytes; i++) {
                    rsaLength = (rsaLength << 8) | bytes[pos++];
                }
            }
            
            // Modulus INTEGER
            if (bytes[pos] !== 0x02) throw new Error('Invalid modulus');
            pos++;
            
            let nLength = bytes[pos++];
            if (nLength & 0x80) {
                const lengthBytes = nLength & 0x7f;
                nLength = 0;
                for (let i = 0; i < lengthBytes; i++) {
                    nLength = (nLength << 8) | bytes[pos++];
                }
            }
            
            // Skip leading zero if present
            if (bytes[pos] === 0x00) {
                pos++;
                nLength--;
            }
            
            // Extract modulus
            const nBytes = bytes.slice(pos, pos + nLength);
            pos += nLength;
            
            // Exponent INTEGER
            if (bytes[pos] !== 0x02) throw new Error('Invalid exponent');
            pos++;
            
            let eLength = bytes[pos++];
            if (eLength & 0x80) {
                const lengthBytes = eLength & 0x7f;
                eLength = 0;
                for (let i = 0; i < lengthBytes; i++) {
                    eLength = (eLength << 8) | bytes[pos++];
                }
            }
            
            // Extract exponent
            const eBytes = bytes.slice(pos, pos + eLength);
            
            // Convert to hex strings
            const nHex = Array.from(nBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            const eHex = Array.from(eBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            
            this.setPublic(nHex, eHex, logger);
            return true;
            
        } catch (error) {
            if (logger) {
                logger.error('Error parsing public key:', error);
            }
            return false;
        }
    }

    encrypt(text, logger) {
        var m = this.pkcs1pad2(text, (this.n.bitLength() + 7) >> 3, logger);
        if (m == null) return null;
        var c = this.doPublic(m);
        if (c == null) return null;
        var h = c.toString(16);
        if ((h.length & 1) == 0) return h;
        else return "0" + h;
    }

    pkcs1pad2(s, n, logger) {
        if (n < s.length + 11) {
            if (logger) {
                logger.error('Message too long for RSA');
            }
            return null;
        }
        var ba = [];
        var i = s.length - 1;
        while (i >= 0 && n > 0) {
            var c = s.charCodeAt(i--);
            if (c < 128) {
                ba[--n] = c;
            } else if ((c > 127) && (c < 2048)) {
                ba[--n] = (c & 63) | 128;
                ba[--n] = (c >> 6) | 192;
            } else {
                ba[--n] = (c & 63) | 128;
                ba[--n] = ((c >> 6) & 63) | 128;
                ba[--n] = (c >> 12) | 224;
            }
        }
        ba[--n] = 0;
        var rng = new SecureRandom();
        var x = [];
        while (n > 2) {
            x[0] = 0;
            while (x[0] == 0) rng.nextBytes(x);
            ba[--n] = x[0];
        }
        ba[--n] = 2;
        ba[--n] = 0;
        return new BigInteger(ba);
    }
}

// Gerador de números aleatórios seguro
class SecureRandom {
    nextBytes(ba) {
        for (var i = 0; i < ba.length; ++i) ba[i] = Math.floor(Math.random() * 256);
    }
}

// Implementação JSEncrypt simplificada
class JSEncrypt {
    constructor(options) {
        options = options || {};
        this.default_key_size = parseInt(options.default_key_size) || 1024;
        this.default_public_exponent = options.default_public_exponent || "010001";
        this.log = options.log || false;
        this.key = null;
    }

    setKey(key, logger) {
        if (this.log && this.key && logger) {
            logger.warn('A key was already set, overriding existing.');
        }
        this.key = new RSAKey();
        if (typeof key === "string") {
            if (key.includes('-----BEGIN PUBLIC KEY-----')) {
                // Chave PEM
                if (!this.key.parseKey(key, logger)) {
                    throw new Error('Failed to parse PEM public key');
                }
            } else {
                // Chave em formato hex
                this.key.setPublic(key, "010001", logger);
            }
        } else {
            this.key.setPublic(key.n, key.e, logger);
        }
    }

    setPrivateKey(privkey, logger) {
        this.setKey(privkey, logger);
    }

    setPublicKey(pubkey, logger) {
        this.setKey(pubkey, logger);
    }

    decrypt(ctext) {
        try {
            return this.getKey().decrypt(this.b64tohex(ctext));
        } catch (ex) {
            return false;
        }
    }

    encrypt(text, logger) {
        try {
            return this.hex2b64(this.getKey().encrypt(text, logger));
        } catch (ex) {
            return false;
        }
    }

    getKey(cb) {
        if (!this.key) {
            this.key = new RSAKey();
            if (cb && {}.toString.call(cb) === '[object Function]') {
                this.key.generateAsync(this.default_key_size, this.default_public_exponent, cb);
                return;
            }
            this.key.generate(this.default_key_size, this.default_public_exponent);
        }
        return this.key;
    }

    b64tohex(s) {
        var ret = "";
        var i;
        var k = 0;
        var slop;
        for (i = 0; i < s.length; ++i) {
            if (s.charAt(i) == "=") break;
            var v = this.b64map.indexOf(s.charAt(i));
            if (v < 0) continue;
            if (k == 0) {
                ret += this.int2char(v >> 2);
                slop = v & 3;
                k = 1;
            } else if (k == 1) {
                ret += this.int2char((slop << 2) | (v >> 4));
                slop = v & 0xf;
                k = 2;
            } else if (k == 2) {
                ret += this.int2char(slop);
                ret += this.int2char(v >> 2);
                slop = v & 3;
                k = 3;
            } else {
                ret += this.int2char((slop << 2) | (v >> 4));
                ret += this.int2char(v & 0xf);
                k = 0;
            }
        }
        if (k == 1) ret += this.int2char(slop << 2);
        return ret;
    }

    hex2b64(h) {
        var i;
        var c;
        var ret = "";
        for (i = 0; i + 3 <= h.length; i += 3) {
            c = parseInt(h.substring(i, i + 3), 16);
            ret += this.b64map.charAt(c >> 6) + this.b64map.charAt(c & 63);
        }
        if (i + 1 == h.length) {
            c = parseInt(h.substring(i, i + 1), 16);
            ret += this.b64map.charAt(c << 2);
        } else if (i + 2 == h.length) {
            c = parseInt(h.substring(i, i + 2), 16);
            ret += this.b64map.charAt(c >> 2) + this.b64map.charAt((c & 3) << 4);
        }
        while ((ret.length & 3) > 0) ret += "=";
        return ret;
    }

    int2char(n) {
        return "0123456789abcdefghijklmnopqrstuvwxyz".charAt(n);
    }

    get b64map() {
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    }
}

// Função principal de criptografia do PagBank usando crypto nativo
function encryptCard(cardData, logger) {
    const errors = [];
    
    // Validações
    if (!cardData.publicKey) {
        errors.push({ code: 'INVALID_PUBLIC_KEY', message: 'invalid `publicKey`' });
    }
    
    if (!cardData.number || cardData.number.length < 13 || cardData.number.length > 19) {
        errors.push({ code: 'INVALID_NUMBER_LENGTH', message: 'invalid field `number`. You must pass a value between 13 and 19 digits' });
    }
    
    if (!cardData.securityCode || (cardData.securityCode.length !== 3 && cardData.securityCode.length !== 4)) {
        errors.push({ code: 'INVALID_SECURITY_CODE', message: 'invalid field `securityCode`. You must pass a value with 3, 4 or none digits' });
    }
    
    if (!cardData.expMonth || parseInt(cardData.expMonth) < 1 || parseInt(cardData.expMonth) > 12) {
        errors.push({ code: 'INVALID_EXPIRATION_MONTH', message: 'invalid field `expMonth`. You must pass a value between 1 and 12' });
    }
    
    if (!cardData.expYear || parseInt(cardData.expYear) < 1900 || parseInt(cardData.expYear) > 2099) {
        errors.push({ code: 'INVALID_EXPIRATION_YEAR', message: 'invalid field `expYear`. You must pass a value between 1900 and 2099' });
    }
    
    if (!cardData.holder || /\d/.test(cardData.holder)) {
        errors.push({ code: 'INVALID_HOLDER', message: 'invalid `holder`' });
    }
    
    if (errors.length > 0) {
        return {
            hasErrors: true,
            encryptedCard: null,
            errors: errors
        };
    }
    
    // Formatar dados
    const holder = cardData.holder.trim().substring(0, 30).replace(/'/g, '').replace(/\//g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z\s]/g, '');
    const number = cardData.number.trim();
    const securityCode = cardData.securityCode.trim();
    const expMonth = cardData.expMonth.length === 1 ? '0' + cardData.expMonth : cardData.expMonth;
    const expYear = cardData.expYear.trim();
    const publicKey = cardData.publicKey.trim();
    
    // Criar string de dados
    const dataString = `${number};${securityCode};${expMonth};${expYear};${holder};${Date.now()}`;
    
    try {
        // Adicionar headers PEM se não existirem
        let pemKey = publicKey;
        if (!pemKey.includes('-----BEGIN PUBLIC KEY-----')) {
            pemKey = `-----BEGIN PUBLIC KEY-----\n${pemKey}\n-----END PUBLIC KEY-----`;
        }
        
        // Usar crypto nativo do Node.js
        const publicKeyObj = crypto.createPublicKey({
            key: pemKey,
            format: 'pem'
        });
        
        const encrypted = crypto.publicEncrypt(
            {
                key: publicKeyObj,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            Buffer.from(dataString, 'utf8')
        );
        
        const encryptedCard = encrypted.toString('base64');
        
        return {
            hasErrors: false,
            encryptedCard: encryptedCard,
            errors: []
        };
        
    } catch (error) {
        if (logger) {
            logger.error('Encryption error:', error);
        }
        return {
            hasErrors: true,
            encryptedCard: null,
            errors: [{ code: 'ENCRYPTION_ERROR', message: error.message }]
        };
    }
}

// Exportar para uso no N8N
module.exports = {
    encryptCard: encryptCard,
    JSEncrypt: JSEncrypt,
    RSAKey: RSAKey,
    BigInteger: BigInteger
};
