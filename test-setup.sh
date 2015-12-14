#!/bin/sh

export WORDPRESS_VERSION=4.3

# setup for running test-plugins.sh
[ -d wordpress ] || mkdir wordpress
cd wordpress
[ -d wpcs ] || composer create-project wp-coding-standards/wpcs:dev-master --no-dev --keep-vcs
export PATH="$(pwd)/wpcs/vendor/bin":$PATH
[ -f wp-cli.phar ] || curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod a+x wp-cli.phar
# root at localhost?? - following is setup by SaltStack
#mysql -e 'CREATE DATABASE wordpress-dev;' -uroot
#mysql -e 'GRANT ALL ON wordpress-dev.* TO wordpress-dev@localhost;'
[ -f wordpress-${WORDPRESS_VERSION}.tar.gz ] || curl -O https://wordpress.org/wordpress-${WORDPRESS_VERSION}.tar.gz
[ -d wordpress ] || tar -zxf wordpress-${WORDPRESS_VERSION}.tar.gz
cd wordpress
[ -f wp-config.php ] || ../wp-cli.phar core config --dbname=wordpress-dev --dbuser=wordpress-dev
../wp-cli.phar core is-installed || ../wp-cli.phar core install --url=http://127.0.0.1:8080/wordpress-dev/ --title=wordpress-dev --admin_user=admin --admin_password=admin --admin_email=root@127.0.0.1
cd ..
echo "<?php require_once '$(pwd)/wordpress/wp-config.php'; ?>" > bootstrap.php
echo "<?php require_once 'autoload.php'; ?>" >> bootstrap.php
