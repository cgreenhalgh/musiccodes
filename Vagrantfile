Vagrant.configure(2) do |config|
    config.vm.box = "ubuntu/trusty64"

  config.vm.provider "virtualbox" do |v|
    v.memory = 1024
    # for tests (chrome)
    v.gui = true
  end

  # node server for vamp
  config.vm.network "forwarded_port", guest: 3000, host: 3000
  # web server for wordpress
  config.vm.network "forwarded_port", guest: 80, host: 8080

  config.vm.provision "shell", privileged: false, inline: <<-SHELL
    sudo apt-get update
    sudo apt-get install -y git zip
  SHELL

  # Not using wordpress interface for now (needs node for action broadcast)
=begin
  # Standard salt set-up cf. wordpress-selfservice
  # Workaround https://github.com/mitchellh/vagrant/issues/5973
  config.vm.provision "shell", inline: <<-SHELL
    apt-get update
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

  config.vm.provision "shell", privileged: false, path:"scripts/install.sh"
  # x-windows based test stuff
  config.vm.provision "shell", privileged: false, path:"scripts/pretest.sh"

  # lots of trouble trying to make musiccodes start on boot... (at least in Vagrant pre-1.8.1)
  config.vm.provision "shell", run:"always", privileged: false, path:"scripts/run.sh"

end

