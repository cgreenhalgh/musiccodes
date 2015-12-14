#!/bin/sh

# copy plugins to test wp installation

(cd plugins; tar zcf - */) | (cd wordpress/wordpress/wp-content/plugins; tar zxf -)
(cd wordpress/wordpress && ../wp-cli.phar plugin activate musiccodes)

