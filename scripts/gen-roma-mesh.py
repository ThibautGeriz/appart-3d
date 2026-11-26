"""Seamless 3D mesh ("maillage 3D") fabric of the Roma sofa: a honeycomb of
small holes between raised ridges. Writes a grayscale colour map (tinted by the
material colour, so any colour can be picked) and a normal map (OpenGL).
Usage: python3 scripts/gen-roma-mesh.py <out_diff.png> <out_nor.png>
"""
import math, struct, sys, zlib

N = 256  # px per tile; the tile covers 5 cm → ~3 mm between holes
STEP = 16  # hole spacing (px), divides N: seamless
height = [[0.0] * N for _ in range(N)]
for y in range(N):
    for x in range(N):
        best = 1e9
        # holes on a brick (offset) lattice, wrapped
        for row in range(-1, N // STEP + 1):
            cy = row * STEP + STEP / 2
            offset = STEP / 2 if row % 2 else 0
            dy = min(abs(y - cy), N - abs(y - cy))
            if dy > STEP:
                continue
            for col in range(-1, N // STEP + 1):
                cx = col * STEP + STEP / 2 + offset
                dx = min(abs(x - cx), N - abs(x - cx))
                best = min(best, dx * dx + dy * dy)
        d = math.sqrt(best) / (STEP / 2)  # 0 at a hole centre, ~1 between holes
        hole = max(0.0, 1 - d / 0.72)  # hole radius ≈ 72 % of the half-spacing: thin ridges
        ridge = 0.5 + 0.5 * math.cos(min(d, 1.2) * math.pi / 1.2)
        height[y][x] = (1 - ridge * 0.35) - hole * 0.9

def png(path, rows, channels):
    raw = b"".join(b"\x00" + bytes(row) for row in rows)
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    color_type = 0 if channels == 1 else 2
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, color_type, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

clamp = lambda v: max(0, min(255, int(round(v))))
# colour: ridges light, hole bottoms dark (the fabric's own shadow)
png(sys.argv[1], [[clamp((0.4 + 0.6 * min(1, max(0, height[y][x]))) * 255) for x in range(N)] for y in range(N)], 1)
# normal map from the height gradient
strength = 3.0
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
