Vagrant.configure(2) do |config|
    config.vm.box = "ubuntu/trusty64"

  config.vm.provider "virtualbox" do |v|
    v.memory = 1024
  end

  config.vm.network "forwarded_port", guest: 3000, host: 3000

  config.vm.provision "shell", inline: <<-SHELL
    apt-get install -y git wget curl

    # Node.js
    curl -sL https://deb.nodesource.com/setup_4.x | bash -
    apt-get install -y nodejs
    apt-get install -y build-essential

    # vamp plugin sdk
    # pre-reqs
    apt-get install -y autoconf pkg-config libsndfile1-dev
    # plugin sdk
    cd
    curl https://code.soundsoftware.ac.uk/attachments/download/1520/vamp-plugin-sdk-2.6.tar.gz | tar zxf -
    cd vamp-plugin-sdk-2.6
    aclocal
    autoconf
    ./configure
    make
    make install

    # silvet plugin
    cd
    curl https://code.soundsoftware.ac.uk/attachments/download/1591/silvet-linux64-v1.1.tar.bz2 | tar jxf - 
    cd silvet-linux64-v1.1
    cp silvet.* /usr/local/lib/vamp

    # fix up libraries
    ldconfig -v

    # vamp-live
    cd
    git clone https://github.com/cgreenhalgh/vamp-live.git
    cd vamp-live
    #aclocal
    #autoconf
    ./configure
    make
    make install

    # node dependencies
    cd /vagrant/server
    npm install

SHELL


end

