# ensure musiccodes service running

  # lots of trouble trying to make musiccodes start on boot... (at least in Vagrant pre-1.8.1)
    if ! (status musiccodes | grep -q "^musiccodes start" > /dev/null); then
      sudo service musiccodes start
    fi

