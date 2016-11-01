#!/bin/bash

HOME=/starbound

echo ">>>>> ${HOME}"
cd ${HOME}/starbound-config-script
npm install

echo ">>>>> clear log"
rm -rf ${HOME}/log
mkdir -p ${HOME}/log

forever stopall
echo ">>>>> forever stopall done."

forever start \
	-l ${HOME}/log/starbound-config-script.log \
	-o ${HOME}/log/starbound-config-script.stdout.log \
	-e ${HOME}/log/starbound-config-script.stderr.log \
	${HOME}/starbound-config-script/index.js
echo ">>>>> forever start done."
