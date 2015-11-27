#!/bin/sh

# check for syntax errors in plugins
# then for syntax errors in tests
# then check for coding style violations in plugins
# then run unit tests (this needs wordpress somewnere linked to the phpunit bootsrap file)
find plugins \( -iname '*.php' \) -print0 | xargs -n1 -0 php -l &&
find scripts \( -iname '*.php' \) -print0 | xargs -n1 -0 php -l &&
find tests \( -iname '*.php' \) -print0 | xargs -n1 -0 php -l &&
phpcs -psvn --standard=WordPress plugins &&
phpunit -c phpunit.xml

