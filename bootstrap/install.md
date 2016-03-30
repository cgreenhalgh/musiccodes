# Musiccodes Install

Requires Vagrant. 


- (windows and MacOS X) download [VirtualBox](https://www.virtualbox.org/wiki/Downloads), `VirtualBox platform packages` for your operating system, i.e. `VirtualBox 5... for Windows hosts -> x86/amd64` or `VirtualBox 5... for OS X Hosts -> amd64`. Open/run and follow install instructions. (Currently version 5.0.16)
- download [vagrant](https://www.vagrantup.com/downloads.html) for your operating system, i.e. `MAC OS X` or `WINDOWS`. Open/run and follow install instructions (on Mac OS X open the downloaded disk image and double-click Vagrant.pkg). Currently version 1.8.1.
- download [chrome](https://www.google.com/chrome/browser/desktop/index.html) and install. 

- on Windows, for trouble-shooting, download [cygwin](http://cygwin.com/install.html) and install, including ssh and git.

Versions tested:

- Mac OS X Yosemite (10.10.5), vagrant 1.7.4, virtualbox 5.0.6: works, commands not in path (e.g. `/opt/vagrant/bin/vagrant`)
- Mac OS X Yosemite (10.10.5), vagrant 1.7.4, virtualbox 5.0.16: works
- Mac OS X Yosemite (10.10.5), vagrant 1.8.1, virtualbox 5.0.16: works, no longer requires explicit start of service each time (i.e. upstart `on vagrant-mounted` works)
- Windows 7 SP1, vagrant 1.7.4, virtualbox 4.3.6: works
- Windows 7 SP1, vagrant 1.8.1, virtualbox 5.0.16: works

