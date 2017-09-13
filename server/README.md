# Musiccodes main server

## Docker

Build - no audio support.

```
docker build . -t musiccodes
```

Run in background:
```
docker run -d --restart=always -p 3000:3000 --name=musiccodes musiccodes
```

foreground test:
```
docker run -it --rm -p 3000:3000 --name=musiccodes musiccodes
```

## Notes

OSC depends on serialport, which (possibly amongst other packages)
won't work with Alpine after building with Debian.


