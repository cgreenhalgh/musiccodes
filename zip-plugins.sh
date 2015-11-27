#!/bin/sh

[ ! -f musiccodes.zip ] || rm musiccodes.zip
cd plugins
zip -r ../musiccodes.zip musiccodes/

