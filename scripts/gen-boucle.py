"""Seamless bouclé of the BoConcept Bolzano sofa (Rimini fabric, as on the
swatch photographed in store): dense, irregular little curls of thick yarn
(short arcs, 1 to 2 mm across) piled on each other with no rows, the darker
base yarn showing in the gaps. Writes a grayscale colour
map (tinted by the material colour, so any of the shop's colours can be
picked) and a normal map (OpenGL).
Usage: python3 scripts/gen-boucle.py <out_diff.png> <out_nor.png>
"""
import math, random, struct, sys, zlib

N = 256  # px per tile; the tile covers 3 cm → ~0.12 mm per px
random.seed(11)
height = [[0.0] * N for _ in range(N)]
fleck = [[0.0] * N for _ in range(N)]  # a few curls of a lighter yarn

# each curl: a short arc of thick yarn (a loop of the bouclé yarn seen from
# above), its own radius, thickness, start angle and span
curls = 2300
for _ in range(curls):
    cx, cy = random.random() * N, random.random() * N
    R = 3.0 + random.random() * 3.5  # loop radius 0.35–0.75 mm
    t = 1.4 + random.random() * 1.1  # yarn half-thickness
    a0 = random.random() * 2 * math.pi
    span = (0.9 + random.random() * 0.75) * math.pi
    peak = 0.6 + 0.4 * random.random()
    light = 1.0 if random.random() < 0.1 else 0.0
    reach = R + t + 1
    for y in range(int(cy - reach), int(cy + reach) + 1):
        for x in range(int(cx - reach), int(cx + reach) + 1):
            dx, dy = x - cx, y - cy
            a = (math.atan2(dy, dx) - a0) % (2 * math.pi)
            if a <= span:
                dist = abs(math.hypot(dx, dy) - R)  # to the arc
            else:  # past the ends: to the nearest end of the arc
                ends = [(cx + R * math.cos(a0), cy + R * math.sin(a0)),
                        (cx + R * math.cos(a0 + span), cy + R * math.sin(a0 + span))]
                dist = min(math.hypot(x - ex, y - ey) for ex, ey in ends)
            if dist >= t:
                continue
            h = peak * math.sqrt(1 - (dist / t) ** 2)
            px, py = x % N, y % N  # wrap: seamless
            if h > height[py][px]:
                height[py][px] = h
                fleck[py][px] = light

def png(path, rows, channels):
    raw = b"".join(b"\x00" + bytes(row) for row in rows)
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    color_type = 0 if channels == 1 else 2
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, color_type, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

clamp = lambda v: max(0, min(255, int(round(v))))
# colour: curl tops light, the base yarn between them dark, a few lighter curls
png(
    sys.argv[1],
    [[clamp((0.26 + 0.66 * min(1, height[y][x]) + 0.08 * fleck[y][x]) * 255) for x in range(N)] for y in range(N)],
    1,
)
# normal map from the height gradient: deep relief, the fabric is not smooth
strength = 3.2
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
