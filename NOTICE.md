# Notice

## Effect catalog credit

The effect catalog, names and ids are based on **patch-gg/pixelfx**
(https://github.com/patch-gg/pixelfx, MIT License) and **Hugo Duprez**, the author of that catalog.

All code, shaders and procedural assets in this package are new and were written from scratch.
No source, images or sprite sheets were copied from pixelfx.

## Character models

`assets/models/` contains models by **Kay Lousberg** (https://kaylousberg.com), released under **CC0 1.0** (public domain):

- Knight and Mage from **KayKit Adventurers 1.0** (https://kaylousberg.itch.io/kaykit-adventurers)
- Skeleton_Warrior from **KayKit Skeletons 1.0** (https://kaylousberg.itch.io/kaykit-skeletons)

The files were stripped by `tools/strip-glb.mjs`: Knight keeps 25 animation clips (shared with the other two by bone name), Mage and Skeleton_Warrior keep none.

## Runtime dependency

This package uses **three.js** (https://threejs.org, MIT License). three.js is not bundled; it is a peer dependency.

## License

This package is released under the MIT License. See the `license` field in package.json.
