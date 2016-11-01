#!/bin/bash

HOME=/starbound
echo ">>>>> ${HOME}"

echo ">>>>> update game"
${HOME}/steamcmd/update_starbound.sh

echo ">>>>> clean script"
rm -rf ${HOME}/starbound-config-script

echo ">>>>> pull script"
mkdir -p ${HOME}/starbound-config-script
/usr/bin/aws s3 cp \
	--recursive s3://starbound-config/script \
	${HOME}/starbound-config-script
chmod +x ${HOME}/starbound-config-script/onstart.sh

echo ">>>>> start script"
${HOME}/starbound-config-script/onstart.sh
