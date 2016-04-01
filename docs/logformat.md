# Log format for Musiccodes

Based on [daoplayer](http://github.org/cgreenhalgh/daoplayer) and related previous work.

Text file, UTF-8, one line per log entry, newline-separated, each line/log entry is a JSON object.

File name `yyyyMMdd'T'HHmmssSSS'Z'-ROOM.log`

Standard fields:
- `time`: Unix time, milliseconds
- `datetime`: formatted date/time, `"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"`
- `level`: `0`=TRACE, `2`=DEBUG, `4`=INFO, `6`=WARN, `8`=ERROR, `10`=SEVERE
- `component`: name of system component generating event, `server` or `client`
- `event`: event name
- `info`: event-specific information (JSON object)

Event names:
- `log.start`: start of (experience) log file
TODO: - `audio.note`: note detected from audio
TODO: - `midi.note`: note received from MIDI (from client)
TODO: - `action.tiggered`: action triggered/broadcast
TODO: - `midi.config.in`: change of MIDI input
TODO: - `midi.config.out`: change of MIDI output
TODO: - `state.update`: report of experience state
- `slave.connect`: slave view connect
- `slave.disconnect`: slave view disconnect
- `master.connect`: master connect
- `master.disconnect`: master disconnect
TODO: - `audio.parameters`: audio parameters set
- `log.end`: explicit end of log file

`log.start` event info fields:
- `application`: from `package.json` `name`, `"musiccodes-server"`
- `appVersion`: from `package.json` `version`, currently `"0.0.1"`
- `logVersion`: currently `"1.0"`
- `installId`: random GUID for this installation/machine
TODO: - `machineNickname`: user-specified
- `appCommit`: hash of current code commit

`master.connect`, `slave.connect` event info fields:
- `id`: local ID of master/slave
- `room`: room name
TODO: - `channel`: channel used

`master.disconnect`, `slave.disconnect` event info fields:
- `id`: local ID of master/slave
- `room`: room name

## Background

Log start info fields from daoplayer:
- `logVersion`: `"2.0"`
- `deviceId`: IMEI
- `packageName`, `appVersionName`, `appVersionCode`: android-app-specific

