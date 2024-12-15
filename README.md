# regexpOutline README

[日本語のREADME](https://github.com/longfish801/regexpOutline/blob/main/README.jp.md)もあります。

## Features

Generates outline by specifying the format of the heading with a regular expression.

* It is assumed to be used in the following cases.
  - You want to generate outline, even if it is plain text.
  - No extensions to generate outline, perhaps because of proprietary specification.
* Specify heading rules for each file extension.
* The heading format is specified as a regular expression.  
  You can specify where headings appear in groups.
* Also generates headings at the beginning and end of the file.
* Single-line headings are assumed.  
  Complex syntax is not supported.

This is a feature implemented in most Japanese editors (Hidemaru Editor, Sakura Editor, WZ EDITOR, etc).  
I created it because it is not implemented in VSCode for unknown reasons.

## Extension Settings
### Example

Please set the setting item "Eeader Rules Each Ext".  
It will not work in its default state.

For example, suppose you want to create the following headings.
Level 1 corresponds to the H1 tag (top-level heading) in HTML.

* Target files with ". txt" file extension.
* Level 1 heading if line starts with "■"
* Level 2 heading if line starts with "□"
* Level 3 heading if line starts with "▼"
* Make the text after the bullet the heading text.

Create the heading rules in JSON format as follows.

```
[
    {
        "ext": ".txt",
        "rules": [
            {
                "level": 1,
                "format": "^■(.+)$",
                "detail": "H1"
            },
            {
                "level": 2,
                "format": "^□(.+)$",
                "detail": "H2"
            },
            {
                "level": 3,
                "format": "^▼(.+)$",
                "detail": "H3"
            }
        ]
    }
]
```

Set the setting item "Eeader Rules Each Ext" to a string that is compressed to one line without line feed code and indentation.

```
[ { "ext": ".txt", "rules": [ { "level": 1, "format": "^■(.+)$", "detail": "H1" }, { "level": 2, "format": "^□(.+)$", "detail": "H2" }, { "level": 3, "format": "^▼(.+)$", "detail": "H3" } ] } ]
```

Please note the following

* Compressing JSON into a single line can be done by using the “Join Lines” function of VSCode.
* JSON requires escaping of special characters.
* It is not recommended to set directly in settings.json.
  - You need to escape JSON to a string, not JSON.

#### Detail of keys

The meaning of each key is as follows.

* ext
  - File extension.  
    If the value specified here matches the end of the filename, it is considered to be a target.  
    Required.
* showTOF
  - Whether TOF (Top Of File) is displayed at the top of the outline or not.
  - Boolean, default value is true.
* showEOF
  - Whether EOF (End Of File) is displayed at the end of the outline or not.
  - Boolean, default value is true.
* rules / level
  - Heading level.  
    Required.
* rules / format
  - Format of heading.  
    Specify with a regular expression.  
    Required.
* rules / nameIdx
  - The number of the group to be displayed as the heading string.  
    Default is 1.  
    If 0 is specified, the entire string matched by format is used as the heading string.
* rules / detail
  - The string to be displayed as details in the heading.  
    Default is an empty string.

#### About showTOF, showEOF

If the heading happens to be on the first line of the file, that heading may appear above TOF in the outline (the same thing happens with EOF).  
This issue has not been resolved. When the positions of the heading lines are the same, the display order in the outline is controlled by the VSCode application itself.  
At least we have implemented a function to hide TOF and EOF.
