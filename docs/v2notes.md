# Musiccodes Mark 2 Design notes

## Notes and Phrases

Sequence of notes abstract data type.

Concrete array of `note` with:
- `time`, relative to epoch for all notes in thie sequence (e.g. first note)
- `note` ~ `frequency`
- `velocity` ~ `volume`
- ? `instrument`
- ?? `duration`

Dually, an array interleaving (not necessarily strictly) `note`s (without `time`) and `delay`s with `time` only. This form more naturally supports copy/paste or drag/drop.

Equivalence and canonical form under varying `projection`s... ~ v1 codeformat.

Codes entered in codeformat -> defaults for invisible values, e.g. absolute pitch, time.

`Projection` specifies level of abstraction for representation and matching. `Projection` may also depend on musical `context`. In principle aspects of context could be dynamically determined during performance, or pre-set. For example muzicodes version 1 could be instructed to infer a tempo from the time interval between the first and second notes, or the penultimate and final notes of a phrase.

A concrete `Context` (tentatively) comprises:
- `tempo`, beats (time signature denominator) per minutes
- `pitchReference`, frequency (Hz) of A above middle C (default 440)
- `key`, 'C major', 'C# minor', etc. (default 'C major')

The `projection` specifies how the context should be determined for streams of raw notes. 
- `defaultContext`, fixed values for context parameters
- `tempoEstimator`, method to use to estimate tempo, default none
- `keyEstimator`, method to use to estimate key, default none
- (pitchReferenceEstimator - future work)

Other aspects of projection, which are explicitly specified and express some dimensions of 'fuzziness', i.e. certain equivalence relationships between concrete note sequences:
- `countsPerBeat`, quantisation of times, units per beat (e.g. 2 => round to nearest half-beat)
- `countMap`, nominally a function from time (counts) to counts, e.g. default n->n, n->0, n->1, n-> sign(n) (i.e. n==0 ? 0 : 1)
- `transpose`, number of semitones (+ve up, -ve down) to transpose note compared to frequency.
- `pitchesPerSemitone`, quantisation of pitch/frequency, default 1
- `pitchMap`, nominally a function from frequency to note pitch or chroma, e.g. 'standard' (*A*4 = pitchReference, 440Hz), 'C' (all C), 'keyOfC' (map from key to key of C)?! 
- `octaveMap`, nominally a function from freqency to octave number, e.g. 'standard' (A*4* = pitchReference, 440Hz), '2' (all octave 2, Helmholz 'great' octave)
- `maxPolyphony`, replace monophonic flag in note stream builder?!
- policy for note selection when maxPolyphony exceeded...
- merge policy for rapidly repeated notes 

Other aspects of surface representation, which are explicitly specified for each pattern (perhaps with some local defaults), which affect the textual/visual form of the notes but not whether they match or not:
- `noteFormat`, 'numbered' (e.g. 'C2'), 'helmholz' (upper case - octave 2 - or lower case - octave 3 - case plus ,s or 's), 'solfa' (based on sol-fa in specified keySignature, with helmholz notation for octave to avoid ambiguity), 'midi' (e.g. '60' = C4) (note: silvet plugin may currently use a different octave numbering, maybe 1 more or less? something american?! 
-- Since representations should be faithful and not lossy something additional is needed to deal with quarter-tones etc. and notes not in the sol-fa scale. By default +/-N cents (where 100 cents = 1 semitone), which is only shown if N!=0. Might be configurable if another sub-format is needed.
- `keySignature`, determines choice of note name and sharp/double-sharp/flat/double-flat/natural (default 'C major')
- `timeSignatureNumerator`, beats per bar (commonly 2, 3, 4 or 6; sometimes 5, 7 or other counts)
- `timeSignatureDenominator`, beats in a semi-breve (typically 2 = minim, 4 = quaver, or 8 = semi-quaver)
- `timeFormat`, 'beats', 'counts', 'value' (semi-breves), 'british' name (?), ...
(pianoroll and visual forms?) 


## Regular Expressions, etc.

Regexp-type functionality introduces additional algebraic-style specifications of equivalence sets of concrete note sequences. Since regular expressions are equivalent to finite state automata there is a clear limit on the variations that they can express.

The essentials of a regular expression are [wikipedia](https://en.wikipedia.org/wiki/Regular_expression) :-) :
- literals, here individual notes/delays
- empty 'string', i.e. no notes/delay
- concatenation, i.e. A followed by B
- alternation, i.e. choice: A or B
- quantification, minimally the Kleene star, i.e. 0 or more repetitions
- grouping, i.e. a means to mark sub-expressions as the scope of quantification/alternation

Typical string regular expression libraries add some additional short-hand notations, although these do not affect their fundamental expressiveness, e.g.:
- alternation shorthand, including
  - any single character, '.'
  - character ranges, e.g. inclusive '[a-z]' and exclusive '[^a-z]'
  - pre-defined character ranges, e.g. '\s' any whitespace
  - pre-defined sub-expressions, e.g. a 'word' = a sequence of non-whitespace characters
- more quantifiers, including '?' (0-1), '+' (1+), '{m,n}' (m-n)
- explicit start/end of string markers, '^' and '$' (equivalently not having implicit '.*' matches at start and end)

A regular expression can be represented by a simple syntax tree. It is typically compiled to a non-deterministic finite state automaton for execution.

A concrete array of notes corresponds to regular expression using only concatenation (no alternation or quantification, and consequently no need for grouping as concatenation is associative). 

But even in this case there are some built-in domain-specific equivalence relationships which may (hopefully :) be respected through conversion to a normal form, including:
- merging adjacent delays
- either eliminating "zero-length" delays or introducing them where notes are adjacent (depending on choice of normal form)
- merging "simultaneous" identical notes(?!)
- re-ordering "simultaneous" notes consistently (e.g. ascending? instrument? velocity??)

We may also think about time as ticks which could also be quantified at the sub-expression level, i.e. it would be very big but we could specify (e.g.) "any notes over a period of 3-5 seconds" as a quantified pattern matching 3-5 seconds-worth of elementary delays (i.e. ticks). But having this as a general sub-expression constraint feels like pushing out of FSA into PDA (push-down automata), so perhaps we will leave that for now.

Perhaps some permutation support would be useful, e.g. for different chord voicings or arpegiations. E.g. "any permutation of (order of) A4C5E5".

## Requirements

- Text-like editability.
- Feedback on partial matching.
- Match against a string of 10-100 notes in <<1ms.

## Implementation

It's less efficient, but the performance constraints are not huge, so I'll try an implementation in terms of the grammar structure rather than compiling to a (N)DFA.

Raw:
- note: frequency (Hz)
- delay: time (seconds) 

Context:
- Plus context (tempo, pitchReference) => pitch as midi-style note number, time as beats
- This is the primary internal representation in patterns, etc.!

Projection:
- Temporal projection (countsPerBeat, countMap) => quantised and possibly projected time as beats (NB need to compare inexact numbers)
- Pitch projection (transpose, pitchesPerSemitone, pitchMap, octaveMap) => quantised and possibly offset and mapped midi-style note number (may be non-integer, Note need to compare inexact numbers)
- This is the normalised form used in comparisons!

Representation:
- Temporal representation (timeFormat, timeSignatureNumerator, timeSignatureDenominator) => string form based primarily on timeFormat
- Pitch representation (noteFormat, keySignature (default to key)) => string form based primarily on noteFormat
- This is used in the textual user interface for text-based viewing, entry and editing.

So...

Every marker (pattern) and example has a single projection, a single representation and (at least for now) a single context. 

So the context is implicit, and copying/pasting a note to a different pattern/note stream implies a change of context, but with its note number/beat values preserved (i.e. raw frequency/time will be changed if the contexts have different values). 

For a marker (pattern) the context may be dynamic, e.g. specifying how tempo is estimated from the note stream. So the mapping from raw notes may in general need to be done independently for each pattern. However, in practice there will be relatively few dynamic options, and a one or a few standard context estimation methods may be applied to each note stream independent of the patterns under active consideration. 

Typically several markers or examples within a single experience will use the same projection and/or representation. This is analogous to the codeformat in muzicodes v1 (which combines elements of projection, representation and dynamic context). 

Atomic terms are:
- note: number of midi-equivalent note (floating point, approximate)
- delay: number of beats (floating point, approximate)

Surface syntax of atomic terms is determined by chosen representation. Some disambiguation is needed for (e.g.) midi note vs delay count. 
Perhaps use current notation of '/' as prefix for delay, while note is without prefix.

The accuracies are a function of the levels of quantisation used. The pattern and candidate note stream are passed through the same projection when testing equivalence, and ranges of note and delay and relatively limited (about 2 Decimal Places, DPs), so a default and relatively small accuracy can be used in inexact comparisons (3-4DPs for single precision, i.e. 0.001-0.0001). This should also take into account the precision with which numbers and persisted in the file format (at least 6DPs). 

Basic compound terms are:
- sequence: of terms in order
- choice: of terms, unordered

Surface syntax is '(' ... ')' for grouping/precedence, ',' or ' ' or '/' (which also indicates a delay) for sequence terms, and '|' for choice terms. The alternation operator ('|') has lowest precedence, i.e. 'a,b|c,d' is equivalent to '(a,b)|(c,d)'

Quantifier term has:
- single child term
- min count, default 0
- max count, default unlimited/infinite

Surface syntax is '?' for 0-1, '*' for 0-any, '+' for 1-any and '{m,n}' for m-n (m default 0, n default any).

Basic range terms are:
- note range: minimum note and maximum note, default any note (implies approximate inequality tests)
- delay range: minimum delay and maximum delay, default any delay (implies approximate inequality tests)

Surface syntax is '[' note '-' note ']' or '/[' delay '-' delay ']' or '[/' delay '-' '/'? delay ']', where note and delay are in chosen representation (with no additional prefix on delay). Omit left note/delay for no lower bound, omit right note/delay for no upper bound. Omit both for wildcard note/delay. Alternative syntax for wildcards are '.' for any note and '/.' for any delay.

Start/end terms are special cases, since they cannot exist in sub-patterns (for example). They correspond to top-level flags:
- atStart: no default wildcard before specified pattern
- atEnd: no default wildcard before specified pattern

Surface syntax is '^' at start, '$' at end.

A permutation term might be useful but is not yet defined. It would be a variant of repeated choice but with constraints about the number of repetitions of each term. To avoid immediate need for it, it is important that patterns and note sequences are normalised before comparison, in particular that simultaneous note are ordered unambiguously, perhaps by note value.

A universal wildcard and wildcard/kleene star might be useful to concisely specify "anything at all".
