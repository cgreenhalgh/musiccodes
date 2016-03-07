# Stuff to make the node server run

Using [upstart](http://upstart.ubuntu.com/cookbook) as i am using Ubuntu.

Running as vagrant, hence setuid.


Should:
- copy musiccodes.conf to `/etc/init/`
- ensure service starts (having trouble with vagrant), e.g. `sudo service musiccodes start`

Note:
- logs output to `/var/log/upstart/musiccodes.log`
- if updating 
```
sudo service musiccodes restart
```

