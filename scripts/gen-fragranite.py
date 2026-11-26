"""Seamless speckled-stone texture (granite composite), 512 px, grayscale PNG."""
import random, struct, sys, zlib
N = 512
rnd = random.Random(2026)
px = [[0.0] * N for _ in range(N)]
for y in range(N):
    for x in range(N):
        px[y][x] = 0.80 + (rnd.random() - 0.5) * 0.06  # matrix
def blob(cx, cy, r, v):
    ri = int(r) + 1
    for dy in range(-ri, ri + 1):
        for dx in range(-ri, ri + 1):
            d = (dx * dx + dy * dy) ** 0.5
            if d <= r:
                a = 1 - d / (r + 0.5)
                X, Y = (cx + dx) % N, (cy + dy) % N  # wrapped: seamless
                px[Y][X] = px[Y][X] * (1 - a) + v * a
for _ in range(9000):  # light quartz grains
    blob(rnd.randrange(N), rnd.randrange(N), 0.6 + rnd.random() * 1.2, 0.97 + rnd.random() * 0.03)
for _ in range(6000):  # dark flecks
    blob(rnd.randrange(N), rnd.randrange(N), 0.5 + rnd.random() * 1.0, 0.42 + rnd.random() * 0.15)
raw = b"".join(b"\x00" + bytes(max(0, min(255, int(v * 255))) for v in row) for row in px)
def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 0, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
open(sys.argv[1], "wb").write(png)
