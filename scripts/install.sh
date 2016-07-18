# setup/install musiccodes 

    sudo apt-get install -y git wget curl

    # Node.js
    curl -sL https://deb.nodesource.com/setup_4.x | sudo bash -
    sudo apt-get install -y nodejs
    sudo apt-get install -y build-essential
    # node-gyp
    sudo npm install -g node-gyp node-pre-gyp

    # vamp plugin sdk
    # pre-reqs
    sudo apt-get install -y autoconf pkg-config libsndfile1-dev
    # plugin sdk
    if ! `pkg-config vamp-hostsdk`; then
      cd
      curl https://code.soundsoftware.ac.uk/attachments/download/1520/vamp-plugin-sdk-2.6.tar.gz | tar zxf -
      cd vamp-plugin-sdk-2.6
      aclocal
      autoconf
      ./configure
      make
      sudo make install
    fi

    # silvet plugin
    if ! [ -f /usr/local/lib/vamp/silvet.cat ]; then
      cd
      curl https://code.soundsoftware.ac.uk/attachments/download/1591/silvet-linux64-v1.1.tar.bz2 | tar jxf - 
      cd silvet-linux64-v1.1
      sudo cp silvet.* /usr/local/lib/vamp

      # fix up libraries
      sudo ldconfig -v
    fi

    # vamp-live
    if ! [ -f /usr/local/bin/vamp-live-host ]; then    
      cd
      git clone https://github.com/cgreenhalgh/vamp-live.git
      cd vamp-live
      #aclocal
      #autoconf
      ./configure
      make
      sudo make install
    fi

    if [ -z "$1" ]; then
      echo "default directory /vagrant/server"
      cd /vagrant/server
    else
      echo "non-default directory $1"
      cd "$1"
    fi
    # node dependencies
    # --no-bin-links workaround for use on top of windows FS
    npm install --no-bin-links

    # web/angular dependencies
    sudo npm install -g bower
    bower install

    # upstart user session for auto-running node
    #sudo cp /vagrant/upstart/session-init-setup.conf /etc/init/
    #sudo cp /vagrant/upstart/session-init.conf /etc/init/
    #mkdir -p $HOME/.config/upstart
    #cp /vagrant/upstart/musiccodes.conf $HOME/.config/upstart/
    #sudo service session-init-setup start
    # let us manage this with normal command line
    #export UPSTART_SESSION=$(initctl list-sessions | cut "-d " -f2)
    #initctl start musiccodes

    # upstart system
    sudo cp ../upstart/musiccodes.conf /etc/init/
    if ! [ -z "$1" ]; then
      sudo sed -i "s:/vagrant/server:$1:g" /etc/init/musiccodes.conf
    fi
  
    if ! (status musiccodes | grep -q "^musiccodes start" > /dev/null); then
      sudo service musiccodes start
    fi

