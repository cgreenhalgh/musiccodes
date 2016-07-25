# Understanding Muzicodes Inexact Matching

Consider someone playing this short phrase ignoring timing (e.g. with `beat quantisation` set to 0 in its `matching profile`):

`C4,D4,E4,D4`

or a version of it played at some tempo (note: `beat quantisation` must be 2 or a multiple of two in the `matching profile` to give half-beats):

`C4,/1,D4,/0.5,E4,/0.5,D4`

This comprises:

- note C4
- a 1 beat gap/delay (only in the timed version)
- note D4
- a half-beat gap (only in the timed version)
- note E4
- a half-beat gap (only in the timed version)
- note D4

## exact matching

With exact matching, muzicodes checks if the sequence of notes/delays exactly matches the specified pattern of notes and delays, exactly (!).

So for example, the untimed phrase above will match the following patterns (at start, but not at end):

- `C4,D4` - first two notes 
- `C4,[D4|D5]` - first two notes, although the second note could also have been an octave higher
- `C4,.*,E4` - the first and third notes, with any notes allowed between them

The timed phrase will match the following patterns:

- `C4,/1,D4` - first two notes and the delay between them
- `C4,.*,E4` - the first and third notes, with any notes/delays allowed between them
- `C4,/[-],D4` - the first and third notes, with any length of delay (but no other notes) allowed between them

## inexact matching

With inexact matching muzicodes works out how many changes it would have to make to convert the played sequence to the pattern sequence, or equivalently how many mistakes would have had to be made if the played sequence had been meant to be the pattern.

### inexact matching of notes

For example, the following patterns might have been what the person intended to trigger with the untimed phrase (at start, but not at end):

- `D4,D4` - the first note, `C4`, was meant to be a `D4`; this is a `replace` error and by default it is "worth" 2 (i.e. it is equivalent to not playing the expected `D4` and then playing the unexpected `C4`)
- `C4,B4,D4` - there is a `B4` in the pattern between the first two notes which they have not played; this is an `delete` error and by default it is "worth" 1.
- `C4,E4,D4` - they played an extra note, `D4`, that is not in the pattern; this is a `insert` error and by default it is also "worth" 1.

In order to use `inexact` matching you must select it for each code that you want to use it with. You can then specify how many errors you will accept and still trigger that code. For example, if you specify an `allowed error` of 1, then the untimed phrase would trigger the second two codes, above, but not the first (since the "cost" of replacing a note is 2, which is more than the allowed error).

It is also possible to adjust the relative weight given to the different kinds of errors in the `matching profile`. Specifically, you can change the `note replace cost`, `note insert cost` (played extra note) and `note delete cost` (missed note). These can be less than 1, e.g. setting `note insert cost` to 0.1 would mean a penalty of only 0.1 for each extra note played.

With inexact matching you can also allow some general inexactness in the tuning of the notes within a pattern. For example, if you specify a `note allow variation` of 1 semitone, then the following patterns would also match `C4,D4` with "no" error, as the notes are no more than 1 semitone different from  those played:

- `C#4,D4`
- `C#4,C#4` 

## inexact matching of delays

Matching with timing is generally more fiddly.

For example, the following patterns might have been what the person intended to trigger with the timed phrase (at start, but not at end):

- `C4,/0.5,D4` - the notes are correct but the gap/delay between them is different; this is a `delay` error and by default it is "worth" 1.
- `C4,D4` - the notes are correct but the gap/delay is missing; this is also a `delay` error and by default it is "worth" 1 (since no delay is the same as a delay of 0, `/0`!).
- `C4,/1.5,E5` - they played an extra note ('D4') (an insert error), but the resulting delay(s) are also different (1.5 vs 1, or 0.5). (At some point I may try to fix this so that the delays around missed notes are combined, but currently they are not).

You can adjust the relative weight given to delay/gap "errors" with the `matching profile` `delay cost` (default 1).

Note that it is possible (with exact or inexact matching) to use delay ranges to specify some flexibility in timing, e.g.:

- `C4,/[0.5-2],D4` - a pattern which will match with a gap of between 0.5 and 2 beats.

But the recommended approach to allowing flexibility of matching in timing is to use `delay allow variation` and `tempo allow variation`. These parameters are quite similar, and both change the way that inexact matching decides if two delays/gaps are the "same".

For example, with a `delay allow variation` of (+/-) 0.1 beats, it would make the following comparisons:

- `/0.5` is same as `/0.4`
- `/0.5` is same as `/0.6`
- `/0.5` is different from `/0.7`

With a `tempo allow variation` of 0.1, i.e. +/- 10%, it would make the following comparisons:

- `/0.5` is same as `/0.46`
- `/0.5` is same as `/0.55`
- `/0.5` is different from `/0.6`

If you also specify a (larger) `delay max variation` or `tempo max variation` then this is the difference at it counts as a "full" error, i.e. `delay cost`. For differences between delay/tempo `allow variation`  and delay/tempo `max variation` the error is a proportion `delay cost`. 

For example, with a `delay allow variation` of (+/-) 0.2 beats and a `delay max variation` of (+/-) 0.4 beats, the "error" between a gap of 0.7 beats and a pattern of `/1.0` (i.e. 0.3 beats) would be half of the full `delay cost`.

