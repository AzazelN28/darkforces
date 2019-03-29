# Star Wars: Dark Forces

This is a reimplementation or remake of the 1996 classic Star Wars: Dark Forces. It is a **work in progres** so there are a lot of things to do.

## File formats

SW:DF uses a series of custom file formats, some of these files are really easy to parse, mainly
because they're text-based file formats but others, like sprites, bitmaps, sounds, etc. are more
changelling because they're binary and they're not common or known formats like .PCX or .BMP.

Next there is a list of known formats and their purpose:

| Extension | Purpose |
|:----------|:--------------
| .GOB      | Contains all the game files in a packed way
| .CMP      | Contains a color map
| .PAL      | Contains a palette
| .FNT      | Contains a font
| .BM       | Contains an screen bitmap
| .FME      | Contains an sprite
| .WAX      | Contains an animated sprite
| .GMD      | Contains a MIDI song
| .VOC      | Contains a sound
| .LVL      | Contains a list of levels
| .LEV      | Contains a textual description of the geometry of a level
| .O        | Contains a textual description of the objects of a level
| .INF      | Contains a level script
| .CFG      | Contains settings or saved state (DARKPILO.CFG, JEDI.CFG)

Made with :heart: by [AzazelN28](https://github.com/azazeln28)
