# Notice

## Effect catalog credit

The effect catalog, names and ids are based on **patch-gg/pixelfx**
(https://github.com/patch-gg/pixelfx, MIT License) and **Hugo Duprez**, the author of that catalog.

All code, shaders and procedural assets in this package are new and were written from scratch.
No source, images or sprite sheets were copied from pixelfx.

## Character models

`assets/models/` contains characters and animations by **Quaternius** (https://quaternius.com), released under **CC0 1.0** (public domain):

- **Universal Base Characters** (heads, eyes, eyebrows, Hair_SimpleParted)
- **Modular Character Outfits – Fantasy** (Male_Ranger, Female_Ranger, Male_Peasant)
- **Universal Animation Library** 1 & 2 (animation clips)

The files are built by `tools/build-chars.mjs` (outfit + head cut from the base character, trimmed attributes, JPEG textures in `assets/models/tex/`).

## Runtime dependency

This package uses **three.js** (https://threejs.org, MIT License). three.js is not bundled; it is a peer dependency.

## License

This package is released under the MIT License. See the `license` field in package.json.
