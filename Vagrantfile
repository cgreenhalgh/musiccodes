Vagrant.configure(2) do |config|
    config.vm.box = "ubuntu/trusty64"

  config.vm.provider "virtualbox" do |v|
    v.memory = 1024
  end

  # node server for vamp
  config.vm.network "forwarded_port", guest: 3000, host: 3000
  # web server for wordpress
  config.vm.network "forwarded_port", guest: 80, host: 8080

  # Not using wordpress interface for now (needs node for action broadcast)
=begin
  # Standard salt set-up cf. wordpress-selfservice
  # Workaround https://github.com/mitchellh/vagrant/issues/5973
  config.vm.provision "shell", inline: <<-SHELL
    # master formulas, pillars and states
    apt-get install -y git
    [ -d /srv ] ||  mkdir /srv
    cd /srv
    [ -d formulas ] || mkdir /srv/formulas
    cd /srv/formulas
    [ -d apache-formula ] || git clone https://github.com/cgreenhalgh/apache-formula.git
    [ -d mysql-formula ] || git clone https://github.com/cgreenhalgh/mysql-formula.git
    [ -d docker-formula ] || git clone https://github.com/cgreenhalgh/docker-formula.git
    [ -d php-formula ] || git clone https://github.com/cgreenhalgh/php-formula.git
    [ -d wordpress-selfservice ] || git clone https://github.com/cgreenhalgh/wordpress-selfservice.git
    # see http://docs.saltstack.com/en/latest/topics/installation/ubuntu.html
    add-apt-repository ppa:saltstack/salt
    apt-get update

    apt-get install -y salt-minion
    
    # This will set the salt ID, which will determine what gets installed!! - here 'dev' :-)
    cp /vagrant/saltstack/etc/minion-local-dev.conf /etc/salt/minion

    service salt-minion restart
    salt-call state.highstate

  SHELL
=end

  config.vm.provision "shell", privileged: false, inline: <<-SHELL
    sudo apt-get install -y git wget curl

    # Node.js
    curl -sL https://deb.nodesource.com/setup_4.x | sudo bash -
    sudo apt-get install -y nodejs
    sudo apt-get install -y build-essential

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

    # node dependencies
    cd /vagrant/server
    # --no-bin-links workaround for use on top of windows FS
    npm install --no-bin-links

SHELL


end

