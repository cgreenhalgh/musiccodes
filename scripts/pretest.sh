cd
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb 
sudo apt-get -f -y install
sudo apt-get install -y xfce4 virtualbox-guest-dkms virtualbox-guest-utils virtualbox-guest-x11
sudo sed -i s/allowed_users=console/allowed_users=anybody/g /etc/X11/Xwrapper.config
startxfce4&
export DISPLAY=:0.0
:w
I
