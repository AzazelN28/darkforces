# Star Wars: Dark Forces

In this tutorial you will find a lot of useful information about how to read every file
of the great Star Wars: Dark Forces.

## .GOB Files

The .GOB files are containers for files of other types. I'm not sure of where that strange
extension came (maybe Group Of Binaries?)

### .GOB Header

| Range      | Size   | Value   | Description                               |
|:----------:|:------:|:-------:|:------------------------------------------|
| 0x00-0x03  | 4      | GOB\xA0 | File signature                            |
| 0x04-0x07  | 4      | ?       | Directory offset                          |

### .GOB Directory Header

This directory header can be found at _directory offset_.

| Range      | Size   | Value   | Description                               |
|:----------:|:------:|:-------:|:------------------------------------------|
| 0x00-0x03  | 4      | ?       | File entry count                          |

### .GOB Directory Entry

The first directory entry can be found inmediately after _file entry count_

| Range      | Size   | Value   | Description                               |
|:----------:|:------:|:-------:|:------------------------------------------|
| 0x00-0x03  | 4      | ?       | File entry offset                         |
| 0x04-0x07  | 4      | ?       | File entry size                           |
| 0x08-0x15  | 13     | ?       | File entry name                           |

## .FNT Files

The .FNT files contains fonts and I usually start examining this type of files because they're
usually very easy to read. In this case they aren't an exception.

Well, basically, behind a font file there is usually a small header specifying which glyphs (characters)
are in the file and some other properties like glyph spacing, line spacing, etc.

### .FNT Header

| Range      | Size   | Value   | Description                               |
|:----------:|:------:|:-------:|:------------------------------------------|
| 0x00-0x03  | 4      | FNT\x15 | File signature                            |
| 0x04       | 1      | ?       | Glyph height                              |
| 0x05       | 1      | ?       | Glyph spacing (width of the space)        |
| 0x06       | 1      | ?       | X spacing (space between glyphs)          |
| 0x07       | 1      | ?       | Y spacing (space between lines)           |
| 0x08       | 1      | ?       | Range start (first character in this file)|
| 0x09       | 1      | ?       | Range end (last character in this file)   |

### .FNT Glyph

| Range      | Size   | Value   | Description                               |
|:----------:|:------:|:-------:|:------------------------------------------|
| 0x01       | 1      | ?       | Glyph width                               |
| ...        | ...    | ?       | Glyph bitmap                              |

## .BM files

.BM files contains bitmap data and are used mainly for keeping textures,
weapons and user interface images.

## .FME Files

.FME files contains single-side sprite bitmap data:

## .WAX Files

.WAX files contains actor sprite bitmap data: multiple states, multiple
angles and multiple animations.

## .GMD Files

.GMD files are regular MIDI files with an extra header with the following
chunks: MIDI and MDpg.

| Range      | Size   | Value   | Description                               |
|:----------:|:------:|:-------:|:------------------------------------------|
| 0x00-0x03  | 4      | MIDI    | File signature                            |
| 0x04-0x07  | 4      | ?       | File size                                 |
| 0x08-0x0A  | 4      | MDpg    | ?                                         |
| 0x0B-0x0F  | 4      | ?       | MDpg size                                 |

## .3DO Files

.3DO files contains 3D objects in a plain-text format.

## .VUE files

.VUE files contains animated 3D objects matrices.

## .CMP files

.CMP files contains color map tables. Color map tables are used to render
darker areas using palettes.

## .GOL files

.GOL files contains _goals_ information.

## .INF files

.INF files contains level info data (like switches, events, etc).

## .LEV files

.LEV files contains level geometry data.

## .LVL files

.LVL files contains the list of levels that can be played in the game.
This file can be used to define custom campaigns.

## .O files

.O files contains all the objects that are present in a level.

## .PAL files

.PAL files contains palette files.

## .VOC files

.VOC files contains sound data.
