# Stuff to make the node server run

Using [upstart](http://upstart.ubuntu.com/cookbook) as i am using Ubuntu.

Running as vagrant, hence user session.

Should:
- install session-init-setup.conf and session-init.conf in /etc/init
- start session-init-setup
- configure that to auto-start
- copy musiccodes.conf to user session config dir ~/.config/upstart/

Note:
- need to sort logs, output to ~/.cache/upstart

Need to 'join' session to manage jobs, e.g. 
```
 export UPSTART_SESSION=$(initctl list-sessions | cut "-d " -f2)
```
Also need to use `initctl` rather than `service`, i.e.
```
initctl status musiccodes
initctl restart musiccodes
```
or
```
initctl start musiccodes
initctl stop musiccodes
```

