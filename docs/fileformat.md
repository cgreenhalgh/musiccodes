# MusicCodes Experience Fileformat

The initial standalone proof of concept loads the default experience file `server/public/example.json`. The wordpress plugin-based version loads the experience from wordpress.

Single top-level JSON object with properties:
- `parameters` - map of parameter name/value
- `markers` - list of `marker` objects

## `parameters`:

(added 2015-12-14)

- `streamGap` (float, seconds, default 2.0), maximum gap between note onsets that are considered part of the same note stream by the default stream classifier
- `frequencyRatio` (float, ratio, default 2.05), maximum pitch/frequency ratio between a note and the first note of a stream group for the new note to be considered part of the same note stream by the default stream classifier.
- `vampParameters` - map of VAMP plugin parameters, default (for silvet plugin) `mode` = `0` (live), `instrument` = `0` (various/unknown).
- `monophonic` (boolean, default false), force note stream to monophonic (use first/lowest note)
- `monophonicGap` (float, seconds, default 0.1), minimum time gap between note onsets for both to be output in monophonic mode

not yet implemented:
- `vampPlugin` (string, default `silvet:silvet`), vamp feature extraction plugin to use


## `marker`
/
This is based on ArtCodes/Aestheticodes file format, pre November 2015.

Object with properties:
- `code` (string, required, no default), code associated with this marker/action - see below
- `codeformat` (string, default any code), format of code - see below (e.g. `no`)
- `showDetail` (boolean, default ?), when code is detected show title prompt (`true`) or trigger action immediately (`false`)
- `action` (string, URL), the action, e.g. target page to load, when code is detected
- `title` (string), title of the action in showDetail view
- `description` (string), description of the action in showDetail view (not currently used)
- `image` (string, URL), icon of the action in showDetail view

## `code`

As of 25/11/2015 there are two code formats.

### Code format 1

Format 1 (from original demo) builds codes from the note names, in the order they are detected, without timing information. E.g. `"B5A5G5"` corresponds to a note stream which ends with a `B5` (i.e. B in octave 5), `A5` then `G5`. These codes are only checked after the note stream has ended, i.e. after the `streamGap` with the default classifier.

### Code format 2

Format 2 builds codes from relative interval and timing the immediately preceeding notes. E.g. `"0/4,0"` corresponds to two consecutive notes of the same pitch, decomposing the string as follows:
- `0` - pitch offset of first note being considered relative to last note, in semitones = `0`, i.e. same pitch
- `/4` - (originally `(4)`) duration of time interval between that note and the next note, normalised so that the last interval is considered `4` (i.e. 4 beats)
- `,` - next note...
- `0` - last note is always considered to be pitch `0` and length unspecified.

E.g. `"4/4,2/4,0"` is a sequence of (at least) 3 notes, where the last 3 notes have the same time interval between them (i.e. the first and second notes have the same duration) and there the pitch of each note is one tone below the previous one.

Note that format 2 checks for codes after every note and does not wait for the 'end' of a note stream, so the note pattern can be embedded within a longer stream of notes.
  
### Generalised code format

planning notes... not yet implemented.

Note information includes: pitch (note, frequency), time, velocity and duration.

Pitch can be expressed in absolute terms as:
- Note name compared to reference pitch within some nominal octave, e.g. `C`
- Note name compared to reference pitch within two nominal octaves (as in folk tab notation), e.g. `C` or `c`
- Note name and octave compared to reference pitch and octave, e.g. `C4`
- Midi note number, e.g. `60` which is middle-C (C4)
- Frequency in Hz, e.g. `261.6` which is also middle-C (but to what precision?!)

Pitch can be expressed in relative terms as:
- Note name and octave based on some reference note, e.g. `D4` would be a tone above compared to middle-C
- Midi note number offset or semitone offset, e.g. `+2` or `-2` for a tone above or below
- Frequency ratio, e.g. `2.0` which is one octave above

A reference note could be:
- The last note played
- The first note in the group

From time we can derive time interval between notes, which is comparable to duration (an elapsed time).

Time interval can be expressed in absolute terms as:
- Seconds, e.g. `1.2`
- Beats relative to a specified tempo, e.g. `2` beats of 72 bpm
- Note type relative to a specified tempo and time signature, e.g. `dotted quaver`

Time interval can be expressed in relative terms as:
- Ratio of a reference note or time, e.g. `0.5`
- Beats relative to current tempo
- Note type relative to current tempo / time signature

A reference interval could be:
- The interval before the last note played
- The first interval in the group

A code prefix:
- `m` for midi note
- `n` for note name
- `o` for octave
- `r` for relative to
- `l` for last note
- `e` for equal-to (mapped-to) value

- `t` for time
- `c` for count
- `r` for relative to
- `l` for last note
- `e` for equal-to (mapped-to) value

- `*`, `,`, `;`, ` ` separator characters

E.g. format 1 = `no`; format 2 = `mrle0/crle4,`. 

Code variables, e.g. `x`. Constraints, e.g. `x<10`. Variable corresponds to `([A-G]#?[0-9]*)|([0-9]+(\.[0-9]+)?)`, i.e. note name with optional octave number or number (integer or float).

Compound code, prefix `:` code (opt.) `:` constraint expression
