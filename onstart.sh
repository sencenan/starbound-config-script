#!/bin/bash
cd  /home/ubuntu/starbound-config-script
npm install

sudo -i -u steam rm -rf /home/steam/log

sudo -i -u steam mkdir -p /home/steam/log

sudo -i -u steam forever stopall
sleep 1
echo "forever stopall done."

sudo -i -u steam forever start \
	-l /home/steam/log/starbound-config-script.log \
	-o /home/steam/log/starbound-config-script.stdout.log \
	-e /home/steam/log/starbound-config-script.stderr.log \
	/home/ubuntu/starbound-config-script/index.js
echo "forever start done."
