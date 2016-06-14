# Muzicodes User Guide

Version 2, 2016-06-14

Contents:
- editor
- player

## Home page

The home page is typically access as URL [http://localhost:3000/](http://localhost:3000/).

![Home page](images/home.png)

Click `Muzicodes Editor` to open the editor view - see below.

Click `Software update` to change your version of muzicodes. Keep a note of your current "Commit" in case you need to return to this version. Enter the new version (commit ID) and press `Update`. This may take a minute or two to update - be patient.

## Editor

### Experience List

The initial editor view is a list of local experiences. Select one in order to edit or use it (see below), or enter a new experience name and press `+` to create a new blank experience.

![Experience list](images/editor-list.png)

### Experience View

The experience editor view is divided into an upper panel for settings and a lower panel for examples and codes. Each panel is subdivided with tabs, reflecting different elements of the experience.

![Experience editor](images/editor-new.png)

To save the current experience press `Save` in the upper `Edit` tab. 

To use an experience press `Open Master view` in the upper `Edit` tab; the "player" interface will open in a new browser window - see below.



## Player (Master)

The player read notes from the default audio input or the MIDI input specified in the experience, filters these notes, ignoring any which are (e.g. too high or too low according to the experience), applies the current context to those notes (e.g. to convert times in seconds to beats), groups these notes in sequences, and attempts to match them against the codes in the experience. When a match is found the corresponding action is performed (e.g. loading a URL).

The player view has 6 parts:

![Player view](images/player-new.png)

- A status line, with controls to `Stop` the player or `Reload` it (if the experience is changed in the editor). The `Keys` button opens a small virtual keyboard at the bottom of the page for testing.

- A "context" line, which currently just allows the tempo to be set. The `M` button is a visual metronome; tap the `Tap` buttom in time with the music as another way to set the tempo.

- A piano-roll style view of the notes being detected by the player. Notes are shown as note names and blocks, green for notes that are being considered for codes and grey for notes that are being filtered out. Red boxes show sequences (groups) of notes that are being considered as possible codes. You can copy notes from the piano-roll into the editor by selecting them (main mouse button), switching to the editor and pressing `Paste` (next to `Record`) at the bottom of the lower `Examples` tab.

- A "part-codes" area (bottom left) which gives visual feedback on the code in the experience and how much they have been matched by the current note sequence.

- A "State" area (bottom, middle) which shows the current values of any variables (state) used in the experience for conditional interaction.

- An output area (bottom, right) which shows the most recent URL triggered on the default channel.

