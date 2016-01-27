# some notes on partial matching of codes

For visual feedback we want to show that the first 'part' of a code has
been matched. We want something that is useful, reasonably simple and
does not have to be perfect.

Strategy:
- split the regex into a sequence of prefix regexes
- visualise how far along the full regex is currently matching

Where to split?
- dont split in an escape, i.e. octal `\\[0-7]{1,3}`, hex `\\x[a-fA-F0-9]{2}`, `\\u[a-fA-F0-9]{4}`, other metacharacter`\\[A-Za-z]`
- dont split before a quantifier, i.e. `+`, `*`, `?`, `{[0-9]+(,[0-9]*)?}`
- can split before `$`
- no point splitting immediately after `^`
- (wont handle for now but) shouldnt split between `?=` or `?!` and first character
- (for simplicity) dont split within `(` ... `)`, nb will need to count


