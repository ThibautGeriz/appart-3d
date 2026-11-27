"""Seamless chenille "pebble" weave of the Olivia chair: rows of soft rounded
loops, staggered, ~3.5 mm apart, with darker gaps between them (the fabric
swatches photographed in store). Writes a grayscale colour map (tinted by the
material colour, so each of the shop's colours can be picked) and a normal map
(OpenGL).
Usage: python3 scripts/gen-chenille.py <out_diff.png> <out_nor.png>
"""
import math, random, struct, sys, zlib

N = 256  # px per tile; the tile covers 4 cm → 12 loops across, ~3.3 mm each
COLS = 12
ROWS = 16  # loops are a little wider than tall
random.seed(7)
# each loop: its own height and a slight size jitter, so the weave is not flat
jitter = [[(0.85 + 0.3 * random.random(), 0.9 + 0.2 * random.random()) for _ in range(COLS)] for _ in range(ROWS)]
height = [[0.0] * N for _ in range(N)]
sx, sy = N / COLS, N / ROWS
for y in range(N):
    for x in range(N):
        best = 0.0
        r = int(y // sy)
        for row in (r - 1, r, r + 1):
            cy = (row + 0.5) * sy
            offset = sx / 2 if row % 2 else 0
            dy = y - cy
            c = int((x - offset) // sx)
            for col in (c - 1, c, c + 1):
                cx = (col + 0.5) * sx + offset
                dx = x - cx
                dx -= round(dx / N) * N  # wrap
                dyw = dy - round(dy / N) * N
                peak, size = jitter[row % ROWS][col % COLS]
                d = math.sqrt((dx / (sx * 0.5 * size)) ** 2 + (dyw / (sy * 0.55 * size)) ** 2)
                if d < 1:
                    best = max(best, peak * math.sqrt(1 - d * d))  # rounded loop
        height[y][x] = best

def png(path, rows, channels):
    raw = b"".join(b"\x00" + bytes(row) for row in rows)
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    color_type = 0 if channels == 1 else 2
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, color_type, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

clamp = lambda v: max(0, min(255, int(round(v))))
# colour: loop tops light, the gaps between loops dark (their own shadow)
png(sys.argv[1], [[clamp((0.45 + 0.55 * min(1, height[y][x])) * 255) for x in range(N)] for y in range(N)], 1)
# normal map from the height gradient
strength = 2.5
rows = []
for y in range(N):
    row = []
    for x in range(N):
        dx = (height[y][(x + 1) % N] - height[y][(x - 1) % N]) * strength
        dy = (height[(y + 1) % N][x] - height[(y - 1) % N][x]) * strength
        nx, ny, nz = -dx, dy, 1.0  # OpenGL: +y up in texture space
        l = math.sqrt(nx * nx + ny * ny + nz * nz)
        row += [clamp((nx / l * 0.5 + 0.5) * 255), clamp((ny / l * 0.5 + 0.5) * 255), clamp((nz / l * 0.5 + 0.5) * 255)]
    rows.append(row)
png(sys.argv[2], rows, 3)
