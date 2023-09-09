# regexpOutline README

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

## Extension Settings

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
                "nameIdx": 1,
                "detail": "H1"
            },
            {
                "level": 2,
                "format": "^□(.+)$",
                "nameIdx": 1,
                "detail": "H2"
            },
            {
                "level": 3,
                "format": "^▼(.+)$",
                "nameIdx": 1,
                "detail": "H3"
            }
        ]
    }
]
```

Set the setting item "Eeader Rules Each Ext" to a string that is compressed to one line without line feed code and indentation.

```
[{"ext":".txt","rules":[{"level":1,"format":"^■(.+)$","nameIdx":1,"detail":"H1"},{"level":2,"format":"^□(.+)$","nameIdx":1,"detail":"H2"},{"level":3,"format":"^▼(.+)$","nameIdx":1,"detail":"H3"}]}]
```

The meaning of each key is as follows.
All are required.

* ext
  - File extension.  
    If the value specified here matches the end of the filename, it is considered to be a target.
* rules / level
  - Heading level.
* rules / format
  - Format of heading.  
    Specify with a regular expression.
* rules / nameIdx
  - The number of the group to be displayed as the heading string.  
    If 0 is specified, the entire string matched by format is used as the heading string.
* rules / detail
  - The string to be displayed as details in the heading.
