'use strict';

const AWS = require('aws-sdk');

const INSTANCE_ID = 'i-6ba1c4f8';

const startServer = (cb) => {
    const ec2 = new AWS.EC2({
        region: 'us-east-1'
    });

    ec2.startInstances({ InstanceIds: [ INSTANCE_ID ] }, cb);
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

const recordStats = (serverStats, cb) => {
    const s3 = new AWS.S3({
        region: 'us-east-1'
    });

    s3.putObject(
        {
            Bucket: 'starbound-config',
            Key: 'stats',
            Body: JSON.stringify(serverStats),
            ContentType: 'application/json'
        },
        cb
    );
};

exports.handler = (event, context, callback) => {
    const cb = (err, res) => {
        // avoid retries
        console.log('Error: ', err);
        console.log('Data: ', res);

        callback(null, res);
    };

    if (event.Records.length) {
        try {
            const msg = JSON.parse(event.Records[0].Sns.Message);

            console.log(msg);

            if (msg.head_commit) {
                if ('startserver' === msg.head_commit.message) {
                    console.log('Starting server');
                    startServer(cb);
                    return;
                }
            } else if (msg.serverStats) {
                recordStats(msg.serverStats, (err, data) => {
                    if (msg.serverStats.serverStarted) {
                        console.log('Notifying server upstart');
                        notifyServerUp(msg.serverStats, cb);
                    } else {
                        cb(err, data);
                    }
                });

                return;
            }
        } catch (ex) {
            cb(ex);
            return;
        }
    }

    cb(null);
};
