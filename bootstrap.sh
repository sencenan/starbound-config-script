#!/bin/bash
rm -rf /home/ubuntu/starbound-config-script
mkdir -p /home/ubuntu/starbound-config-script
aws s3 cp --recursive s3://starbound-config/script /home/ubuntu/starbound-config-script/
/home/ubuntu/starbound-config-script/onstart.sh
