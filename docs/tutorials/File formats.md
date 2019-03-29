# Star Wars: Dark Forces

In this tutorial you will find a lot of useful information about how to read every file
of the great Star Wars: Dark Forces.

## GOB Files

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

## FNT Files

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

## FME Files

## WAX Files
