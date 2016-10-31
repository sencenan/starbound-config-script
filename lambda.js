'use strict';

const AWS = require('aws-sdk');

const startServer = (cb) => {
    const ec2 = new AWS.EC2({
        region: 'us-east-1'
    });

    ec2.startInstances({ InstanceIds: ['i-503b66c9'] }, cb);
};

const notifyServerUp = (serverStats, cb) => {
    const sns = new AWS.SNS({
        region: 'us-east-1'
    });

    sns.publish(
		{
			Subject: 'Starbound Server Up @ ' + serverStats.serverIp,
			Message: JSON.stringify({ serverStats: serverStats }),
			TopicArn: 'arn:aws:sns:us-east-1:943153259197:starbound-server-notify'
		},
		cb
	);
};

exports.handler = (event, context, callback) => {
    if (event.Records.length) {
        try {
            const msg = JSON.parse(event.Records[0].Sns.Message);

            console.log(msg);

            if (msg.head_commit) {
                if ('startserver' === msg.head_commit.message) {
                    console.log('Starting server');
                    startServer(callback);
                    return;
                }
            } else if (msg.serverStats && msg.serverStats.serverStarted) {
                console.log('Notifying server upstart');
                notifyServerUp(msg.serverStats, callback);
                return;
            }
        } catch (ex) {
            callback(ex);
            return;
        }
    }

    callback(null);
};