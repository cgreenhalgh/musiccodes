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

SHELL


end

