"""Seamless wool rug weave (berber loops), grayscale colour + normal map, 256 px for 0.25 m.
Usage: python3 scripts/gen-wool.py <out_diff.png> <out_nor.png>"""
import math, random, struct, sys, zlib
N = 256
rnd = random.Random(7)
# loops on a grid (rows of knots, offset every other row), each a soft bump
H = [[0.0] * N for _ in range(N)]
step = 8
for row in range(N // step):
    for col in range(N // step):
        cx = col * step + (step / 2 if row % 2 else 0) + rnd.uniform(-1, 1)
        cy = row * step + rnd.uniform(-1, 1)
        r = step * 0.62
        amp = 0.7 + rnd.random() * 0.3
        for dy in range(-int(r) - 1, int(r) + 2):
            for dx in range(-int(r) - 1, int(r) + 2):
                d = math.hypot(dx, dy) / r
                if d < 1:
                    X, Y = int(cx + dx) % N, int(cy + dy) % N
                    H[Y][X] = max(H[Y][X], amp * (1 - d * d))
# fibre fuzz
for y in range(N):
    for x in range(N):
        H[y][x] += (rnd.random() - 0.5) * 0.12
def png(path, rows, ch):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    c = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + c(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 0 if ch == 1 else 2, 0, 0, 0)) + c(b"IDAT", zlib.compress(raw, 9)) + c(b"IEND", b""))
cl = lambda v: max(0, min(255, int(round(v))))
# colour: loop tops light, valleys a little darker, a slight mottle
mott = [[0.92 + 0.08 * math.sin(x * 0.07 + y * 0.03) * math.cos(y * 0.05) for x in range(N)] for y in range(N)]
png(sys.argv[1], [[cl((0.62 + 0.38 * max(0, min(1, H[y][x]))) * mott[y][x] * 255) for x in range(N)] for y in range(N)], 1)
rows = []
for y in range(N):
    row = []
    for x in range(N):
        dx = (H[y][(x + 1) % N] - H[y][(x - 1) % N]) * 2.5
        dy = (H[(y + 1) % N][x] - H[(y - 1) % N][x]) * 2.5
        l = math.sqrt(dx * dx + dy * dy + 1)
        row += [cl((-dx / l * 0.5 + 0.5) * 255), cl((dy / l * 0.5 + 0.5) * 255), cl((1 / l * 0.5 + 0.5) * 255)]
    rows.append(row)
png(sys.argv[2], rows, 3)
