# Surface relief maps

Normal (OpenGL) and roughness maps of the CC0 [Poly Haven](https://polyhaven.com/textures)
scans whose colour maps live in `..` (512 px, JPEG; the app loads their KTX2 encodings in `../ktx2/`). Used on desktop only, where
walls and floors are physically based (`usePhysicalSurfaces` in
`src/apartment/textures.ts`); phones keep Lambert shading.

| Maps                      | Colour map                  | Finish                 |
| ------------------------- | --------------------------- | ---------------------- |
| `wood_floor_*`            | `wood_floor.jpg`            | parquet                |
| `smooth_concrete_floor_*` | `smooth_concrete_floor.jpg` | worktop, kitchen tiles |
| `long_white_tiles_*`      | `long_white_tiles.jpg`      | shower wall            |
| `tiled_floor_001_*`       | `tiled_floor_001.jpg`       | shower floor           |

The oak maps are shared with the furniture (`../furniture/oak_veneer_01_*`).
The painted walls' relief is procedural (`paintRelief`), not a scan.
