const
	path = require('path'),
	AWS = require('aws-sdk'),
	sudo = require('sudo'),
	childproc = require('child_process');

const
	STARBOUND_HOME = '/home/steam/starbound',
	STARBOUND_STORAGE = '/home/steam/starbound/storage/',
	INTERVAL = 1000 * 60 * 15;

const sns = new AWS.SNS({
	region: 'us-east-1'
});

let inactivePeriods = 0;

const
	isRunning = function() {
		return childproc.execSync(
			'netstat -na | egrep \'21025.+LISTEN\' | wc -l'
		).toString().trim() === '1';
	},
	stopServer = function() {
		return isRunning() && childproc.execSync(
			'killall starbound_server'
		).toString();
	},
	startServer = function() {
		if (!isRunning()) {
			const child = childproc.spawn(
				'./starbound_server',
				[],
				{
					cwd: path.join(STARBOUND_HOME, 'linux'),
					detached: true
				}
			);

			child.unref();
		}
	},
	getUserCount = function() {
		return parseInt(
			childproc.execSync(
				'netstat -na | egrep \'21025.+ESTABLISHED\' | wc -l'
			).toString(),
			10
		);
	},
	sendStats = function(data = {}, cb) {
		sns.publish(
			{
				Subject: 'Starbound Server Status',
				Message: JSON.stringify({ serverStats: data }),
				TopicArn: 'arn:aws:sns:us-east-1:943153259197:starbound-server-manage'
			},
			cb
		);
	},
	backupStorage = function() {
		const time = Date.now();

		childproc.execSync(
			`tar -zcvf starbound.backup.${time}.tar.gz -C ${STARBOUND_STORAGE} .`,
			{
				cwd: '/tmp'
			}
		);

		childproc.execSync(
			`aws s3 cp starbound.backup.${time}.tar.gz s3://starbound-config/backup/`,
			{
				cwd: '/tmp'
			}
		);
	},
	pullConfig = function() {
		childproc.execSync(
			'aws s3 cp s3://starbound-config/starbound_server.config .',
			{
				cwd: STARBOUND_STORAGE
			}
		);
	},
	getPublicIp = function() {
		return childproc.execSync(
			'curl http://169.254.169.254/latest/meta-data/public-ipv4'
		).toString();
	};

const script = function(cb) {
	let
		userCount = getUserCount(),
		serverStarted = false;

	if (userCount === 0) {
		inactivePeriods += 1;
	} else {
		inactivePeriods = 0;
	}

	if (isRunning()) {
		// is running
		console.log(`server is running. ${userCount} users ${inactivePeriods} inactive periods`);
	} else {
		// if not running
		console.log('server is not running');

		// pull config
		pullConfig();
		console.log('config pulled');

		// start server
		startServer();
		console.log('server started');
		serverStarted = true;
	}

	// in all case, send sns message
	return sendStats({
		userCount: userCount,
		inactivePeriods: inactivePeriods,
		serverStarted: serverStarted,
		serverIp: getPublicIp()
	}, cb);
};

// run at start and every 15mins thereafter
const run = function() {
	script(function() {
		setTimeout(function() {

			if (inactivePeriods > 2) {
				console.log('server should shutdown');
				stopServer();

				// backup storage
				backupStorage();
				console.log('game backed up');

				sudo(
					['shutdown',  '-h', '0'],
					{
						password: 'passwordstarbound'
					}
				);
			} else {
				run();
			}

		}, INTERVAL);
	});
};

run();
