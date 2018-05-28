# MusicCodes

Experimental implementation of music code system.

Chris Greenhalgh, The University of Nottingham, 2015-2018

## Running in Docker

Run on port 3000:
```
docker run --restart always -d -p 3000:3000 --name cgreenhalgh/musiccodes musiccodes
```
(TODO: internal network)

Check:
```
docker ps
docker logs musiccodes
```

To copy experiences and content in use 
```
docker cp XXX musiccodes:/srv/musiccodes/experiences/
docker cp XXX musiccodes:/srv/musiccodes/pubic/content/
```
To copy logs out use
```
docker cp musiccodes:/srv/musiccodes/logs logs/
```

### Build on Docker

To build image:
```
docker build -t musiccodes .
docker tag musiccodes cgreenhalgh/musiccodes:20180529.1
```
(and docker push ... :-)

## Old notes

See Vagrantfile for setup/pre-requisites, e.g. 

- `vamp-live-host` from 
[vamp-live](https://github.com/cgreenhalgh/vamp-live)
- VAMP plugin SDK is installed from 
[vamp plugins](http://www.vamp-plugins.org/develop.html).
- [silvet vamp plugin](https://code.soundsoftware.ac.uk/projects/silvet/files)
- Node.js
- Node.js dependencies from `server/package.json`

Run
```
cd server
node server.js
```

Open browser to [http://localhost:3000](http://localhost:3000).

Note: requires good web audio support - probably Chrome.

