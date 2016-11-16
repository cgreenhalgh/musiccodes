# MusicCodes Experience Fileformat

The initial standalone proof of concept loads the default experience file `server/public/example.json`. The wordpress plugin-based version loads the experience from wordpress.

Single top-level JSON object with properties:
- `parameters` - map of parameter name/value
- `markers` - list of `marker` objects
- `examples` - list of `example` objects
- `defaultContext` - context config (v2)
- `projections` - list of `projection` objects (v2)
- `controls` - list of `control` objects (v2, todo)

## `parameters`:

(added 2015-12-14)

- `vampParameters` - map of VAMP plugin parameters, default (for silvet plugin) `mode` = `0` (live), `instrument` = `0` (various/unknown).
- `initstate` (map of name to value), initial state, used in code `precondition`s.
- `midiInput` (string, default undefined), name of midi input device, if any
- `midiOutput` (string, default undefined), name of midi output device, if any
- `midiControl` (string, default undefined), name of midi control input device, if any (todo)
- `audioInput` (string, default undefined => default), name of audio input device (if not midi)
- `audioChannel` (number, default 0), channel of audio input (if not midi)

In addition any/all of the `projection` `filterParameters` can be specified as global default values 

not yet implemented:
- `vampPlugin` (string, default `silvet:silvet`), vamp feature extraction plugin to use

## `defaultContext`:

(v2)

- `tempo` (float, beats per minute, default 60)

## `projection`: 

(v2)

- `id` (string), id/name by which projection is referred to in markers and examples
- `countsPerBeat` (integer (?!), default 0), quantisation applied to time, e.g. 0 => ignore, 1 => round to nearest beat, 2 => round to nearest half-beat
- `pitchesPerSemitone` (integer (?!), default 1), quantisation applied to pitch, e.g. 1 => round to nearest semitone, 2 => round to nearest quarter-tone
- `polyphonicGap` (float, seconds, default 0), maximum gap between note onsets that are considered to be 'at the same time' for polyphonic matching (these will be sorted in ascending frequency order). (added 2016-10-05)
- `polyphonicFilter` (string, default `all`) action to perform on simultaneous notes: `lowest` (keep lowest), `all` (keep all), `loudest` (keep loudest) (added 2016-10-05)
- `pitchMap` (string, default `none`) mapping to perform on note pitch: `none` (no change), `octave4` (to octave 4), `C4` (to C4) (added 2016-10-05)
- `inexactParameters` - see below
- `filterParameters` - see below

`inexactParameters` is object with properties:
- `delayError` (number, default 1) weight given to delay errors vs note errors (default for all note errors is 1)
- `noteInsertError` (number, default 1) weight given to note insertion errors, i.e. extra notes not in the code
- `noteDeleteError` (number, default 1) weight given to note deletion errors, i.e. missing a note in the code
- `noteReplaceError` (number, default 2) weight given to note replacement errors, i.e. a different note to the one in the code (which will never be more than an insert plus a delete)
- `noteAllowRange` (number, semitones, default 0) allowed difference between actual and code midinote value (1=one semitone)
- `noteErrorRange` (number, semitones, default 0) difference between actual and code midinote value beyond which a full error penalty is applied. E.g. `noteAllowRange` 1 and `noteErrorRange` 3 would assign an error of 0 to same note or +/-1 semitone, error of 0.5 to +/-2 semitones, and error of 1 to +/-3 semitones or above.
- `delayAllowRange` (number, beats, default 0) allowed difference between actual and code delay value (1=one beat)
- `delayErrorRange` (number, beats, default 0) difference between actual and code delay value beyond which a full error penalty is applied (1=one beat)
- `tempoAllowRange` (number, ratio - fraction of tempo, default 0) allowed fraction by which delays may differ compared to context-defined tempo. E.g. 0.1 implies actual delays may be 1/1.1 (90.9%) - 1.1/1 (110%) of code delays.
- `tempoErrorRange` (number, ratio - fraction of tempo, default 0) fraction by which delays may differ compared to context-defined tempo beyond which a full error penalty is applied. 
- (more to be determined)

Note that delay and tempo parameters both affect delays, and the lowest cost is taken. The delay parameters is expressed in an absolute +/- beat value and it can be used to represent the timing accuracy of beats. The tempo parameters are expressed as a fraction and can be used to represent the correspondence of tempo. The two measures differ mostly with respect to short delays: a delay parameter is likely to allow /no/ delay as an alternative while a tempo parameter will not. 

`filterParameters` is object with properties:
- `streamGap` (float, seconds, default 2.0), maximum gap between note onsets that are considered part of the same note stream by the default stream classifier
- `frequencyRatio` (float, ratio, default infinite), maximum pitch/frequency ratio between a note and the first note of a stream group for the new note to be considered part of the same note stream by the default stream classifier.
- `maxDuration` (float, seconds, default unlimited), maximum duration for a note (e.g. to deal with 'stuck' notes)
- `minFrequency` (float, Hz, default 0), minimum frequency of note to include in group(s)
- `maxFrequency` (float, Hz, default 20000), maximum frequency of note to include in group(s)
- `minVelocity` (int, 0-127, default 0), minimum midi note velocity of note to include in group(s)
- `maxVelocity` (int, 0-127, default 127), maximum note velocity of note to include in group(s)

Deprecated / removed (2016-10-05):
- `monophonic` (boolean, default false), force note stream to monophonic (use first/lowest note)
- `monophonicGap` (float, seconds, default 0.1), minimum time gap between note onsets for both to be output in monophonic mode


The same properties in the top-level `parameters` are used as default values.

## `marker`

This is based on ArtCodes/Aestheticodes file format, pre November 2015.

Object with properties:
- `code` (string, required, no default), code associated with this marker/action - see below
- `projection` - `id` of `projection` applied to notes for matching with marker (v2)
- `priority` (float, default 0) higher-priority markers are matched first (v2, todo)
- `atStart` (boolean, default false), require code to appear at start of group
- `atEnd` (boolean, default false), require code to appear at end of group
- `inexact` (boolean, default false), use inexact matching, i.e. code can be triggered with some errors
- `inexactError` (float, default 0), allowable error when matching in inexact mode
- `actions` (array or objects), action(s) to be triggered; each object should have a `url` and optionally a `channel` (default channel is '').
- `action` (string, URL, deprecated - use `actions`), the action, e.g. target page to load, when code is detected (associated with default channel '')
- `title` (string), title of the action in showDetail view
- `description` (string), description of the action in showDetail view (not currently used)
- `image` (string, URL), icon of the action in showDetail view
- `actions` (array or objects), action(s) to be triggered; each object should have a `url` and optionally a `channel` (default channel is '').
- `precondition` (string, default true, i.e. code can always be matched), expression which if true enables code to be matched, can depend only on state variables.
- `poststate` (map of state names to value), updates to be made to state if marker is triggeres (simultaneous assignment).

No longer supported (v2):
- `codeformat` 
- `showDetail` (boolean, default ?), when code is detected show title prompt (`true`) or trigger action immediately (`false`)

## `control`

For inputs from other system(s) that control the muzicodes system. e.g. from `midiControl` input.

Object with properties:
- `inputUrl` (string) URL-style specification of input trigger/control, comparable to action URLs. See below.

and, like `marker`:
- `actions` (array or objects), action(s) to be triggered; each object should have a `url` and optionally a `channel` (default channel is '').
- `description` (string), description of the action in showDetail view (not currently used)
- `precondition` (string, default true, i.e. code can always be matched), expression which if true enables code to be matched, can depend only on state variables.
- `poststate` (map of state names to value), updates to be made to state if marker is triggeres (simultaneous assignment).

Values for `inputUrl` include:
- MIDI message, starting `data:text/x-midi-hex,`, e.g. `data:text/x-midi-hex,903a7f` (note on 60 channel 1) (todo)
- OSC message, starting `osc.udp:///` (todo)
- on load, `event:load`
- on start of note stream, `event:start:PROJECTIONNAME` where `PROJECTIONNAME` is the name of the note projection in which the stream has started. 
- on end of note stream, `event:end:PROJECTIONNAME`
- HTTP POST to server (see below), starting `post:` and followed by input name.

HTTP POST for input ('post:' action):
- POST to "/input"
- url-encoded form body
- parameter "room": room name (default "default")
- parameter "pin": room pin/password (default "")
- parameter "name": action name (required)
- parameter "client": optional client identification
 
(- on partial match of marker (todo, TBD) `event:match:TITLE:DEGREE`, which might include parameters in format `{{NAME}}` which cannot include `/` or `:`.)


## State

The state is a number of named variables, e.g. `a`, `ready`, etc., and their values, e.g. `0`, `true`, `"ready"`. Variable names must start with a letter or underscore and contain only letters, digits or underscore. Values should be numbers, true/false or strings only. State expressions, e.g. in `precondition` or `poststate` should be simple expressions involving no functions.

For example...

`count` is initially `0`:
```
"parameters":{
  "initstate":{
    "count": 0
  }
  ...
}
```

Code will only be matched if count is less than 4:
```
"markers":[
  {
    "precondition":"count<4",
    ...
  }
]
```
Matching code will increase count by 1:
```
"markers":[
  {
    "poststate":{
      "count":"count+1"
    }
    ...
  }
]
```

## Actions

Actions are URLs. By default they are loaded into an iframe when triggered.

Note that simple text can be encoded using data URIs, e.g. `data:text/plain,hello`. Strictly these should be %-escaped for all characters other than letters and digits.

### Midi actions

A data URI with the non-standard MIME type `text/x-midi-hex` will be output to the current MIDI output channel (if any). All bytes are output immediately. Each byte is encoded as two hex digits. E.g. `data:text/x-midi-hex,903a7f` is note on, middle C, max velocity.

### OSC actions

A URI with the protocol `osc.udp:` will send an [Open Sound Control](http://opensoundcontrol.org/introduction-osc) message over UDP. The hostname and port are the address of the OSC server to send to; the path is the OSC address. After a comma is the OSC type string, and the arguments themselves follow, comma-separated. Currently supported data types are 'i' (integer), 'f' (float), 's' (string, url-encoded) and 'b' (binary, hex-encoded). Note that only individually messages can currently be sent, i.e. not packets containing multiple messages.  

For example, the URI `osc.udp://1.2.3.4:9001/test/address,if,40,1.0` will send a message to the OSC server on the machine with IP address/hostname `1.2.3.4`, running on port `9001`, with OSC address pattern `/test/address` and two arguments, `40` (an integer, type `i`) and `1.0` (a float, type `f`). Please refer to documentation of the server for the messages that it supports.


## `code`

(version 2)

For version 2, a code is based on a regular expression, but with notes and delays as the 'alphabet' rather than individual characters.

Atomic terms are:
- note: as note name and (optional) octave number. E.g. "C4" is midi note 60, middle C. The default octave is 4.
- delay: as "/" and number of beats (floating point, approximate). E.g. "/1" is a 1-beat pause between notes.

Basic range terms are:
- note range: minimum note and maximum note, default any note. Syntax is '[' note '-' note ']', e.g. "[C4-]" is any note middle-C or above.
- delay range: minimum delay and maximum delay, default any delay. Syntax is '/[' delay '-' delay ']' or '[/' delay '-' '/'? delay ']', e.g. "/[0.5-2]" is any delay between 0.5 and 2 beats.

Wildcard, ".", is any note or delay (but only one).

Basic compound terms are:
- group: wraps any term as a single unit, e.g. "(C4,D4)" - only needed to deal with precedence of other operators.
- sequence: of terms in order, separated by ",". E.g. "C4,/1,D4" is middle-C, 1 beat delay, D above middle-C.
- choice: of terms, unordered, separated by "|". E.g. "C4|D4" is middle-C or D above middle-C.

Precedence of "|" is lowest, i.e. 'a,b|c,d' is equivalent to '(a,b)|(c,d)'.
Note: for inexact matching a choice can only include individual notes, delays or ranges. For example "(A4|B4),C4" is OK, but "(A4,B4)|(B4,C4)" is not.

Quantifier (repeats) terms are all suffix operators:
- "?", for optional. E.g. "C4?" is either middle-C or nothing (i.e. 0 or 1 repetitions)
- "*", for kleene star, i.e. any number of repetitions including 0. E.g. "C4*" or ".*"
- "+", for at least once. 
- "{" m "-" n "}" for between m and n repetitions, inclusive. E.g. "C4{0-1}" is equilent to "C4?"

Precedence of quantifiers is more than sequence or choice. E.g. "C4,D4+" is middle-C followed by at least one D4
Note: for inexact matching  "?" (equivalently "{0-1}"), "*"  (equivalently "{0-}"), and  "+" (equivalently "{1-}") are supported, but other ranges are not (i.e. m > 1, or n >1 but not unlimited).

The regular expression beginning/end markers ("^" and "$") are not used; the marker properties "atStart" and "atEnd" specify whether the pattern match must be at the start/end of the note group, respectively.

## Version 1 code formats

For historical reference the following code formats were used in version 1, and patterns based on these may be found in old experience files. The were based on purely textual regular expressions, i.e. each character was a token, rather than each note or delay.

### Code format 1

This is `codeformat`:`no`

Format 1 (from original demo) builds codes from the note names, in the order they are detected, without timing information. E.g. `"B5A5G5"` corresponds to a note stream which ends with a `B5` (i.e. B in octave 5), `A5` then `G5`. These codes are only checked after the note stream has ended, i.e. after the `streamGap` with the default classifier.

### Code format 2

This is `codeformat`:`mrle0/crle4,`

Format 2 builds codes from relative interval and timing the immediately preceeding notes. E.g. `"0/4,0"` corresponds to two consecutive notes of the same pitch, decomposing the string as follows:
- `0` - pitch offset of first note being considered relative to last note, in semitones = `0`, i.e. same pitch
- `/4` - (originally `(4)`) duration of time interval between that note and the next note, normalised so that the last interval is considered `4` (i.e. 4 beats)
- `,` - next note...
- `0` - last note is always considered to be pitch `0` and length unspecified.

E.g. `"4/4,2/4,0"` is a sequence of (at least) 3 notes, where the last 3 notes have the same time interval between them (i.e. the first and second notes have the same duration) and there the pitch of each note is one tone below the previous one.

Note that format 2 checks for codes after every note and does not wait for the 'end' of a note stream, so the note pattern can be embedded within a longer stream of notes.

## `example`

(added 2016-05-12)

An example of some playing, including its raw notes (and potentially audio), and its associated code-like representation. Encoded as a JSON objects with properties:
- `title` - the name of the clip
- `rawnotes` - an array of raw `note`s (see below)
- `codeformat` - codeformat to use
- `context` - `context` in which example is interpretted (v2)
- `projection` - `id` of `projection` applied to example (v2)

A `note` is a JSON object with properties:
- `freq` - the frequency of the note in Hz
- `time`: time, seconds, since 'start'
- `velocity`: MIDI-style note velocity (volume), 0-127
- `duration` - the duration of the notes, seconds
- `group` - ID (number) of stream group note is assigned to with current parameters, or undefined.

## Future Work

Future work:
- inexact matching of codes