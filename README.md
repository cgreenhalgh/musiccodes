# MusicCodes

Experimental implementation of music code system.

Note, requires a compiled binary of `vamp-plugin-host` from 
[vamp-live](https://github.com/cgreenhalgh/vamp-live). That in turn
requires that the VAMP plugin SDK is installed from 
[vamp plugins](http://www.vamp-plugins.org/develop.html).

Also requires the [silvet vamp plugin](https://code.soundsoftware.ac.uk/projects/silvet/files)
to be installed. 
```
sudo cp silvet.* /usr/local/lib/vamp/
```

Copy `vamp-plugin-host` to `server/`

Then run
```
cd server
node server.js
```

