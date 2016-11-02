const
	path = require('path'),
	AWS = require('aws-sdk'),
	childproc = require('child_process');

const
	STARBOUND_HOME = '/starbound/server',
	STARBOUND_STORAGE = '/starbound/server/storage/',
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
	// startServer = function() {
	// 	if (!isRunning()) {
	// 		const child = childproc.spawn(
	// 			'./starbound_server',
	// 			[],
	// 			{
	// 				cwd: path.join(STARBOUND_HOME, 'linux'),
	// 				detached: true
	// 			}
	// 		);

	// 		child.unref();
	// 	}
	// },
	getUserCount = function() {
		return parseInt(
			childproc.execSync(
				'netstat -na | egrep 21025 | wc -l'
			).toString(),
			10
		) - 1;
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
	getPublicIp = function() {
		return childproc.execSync(
			'curl http://169.254.169.254/latest/meta-data/public-ipv4'
		).toString();
	};

const log = function(message) {
	console.log(`${new Date()}: ${message}`);
};


let serverStarted = true;

const script = function(cb) {
	let
		userCount = getUserCount(),,
		serverNotRunning = false;

	if (userCount === 0) {
		inactivePeriods += 1;
	} else {
		inactivePeriods = 0;
	}

	if (isRunning()) {
		// is running
		log(`server is running. ${userCount} users ${inactivePeriods} inactive periods`);
	} else {
		// if not running
		log('server is not running');
		serverNotRunning = true;
	}

	// in all case, send sns message
	return sendStats({
		userCount: userCount,
		inactivePeriods: inactivePeriods,
		serverStarted: serverStarted,
		serverNotRunning: serverNotRunning,
		serverIp: getPublicIp()
	}, cb);
};

// run at start and every 15mins thereafter
const run = function() {
	script(function() {
		serverStarted = false; //TODO rename this flag

		if (inactivePeriods > 2) {
			log('server should shutdown');
			stopServer();

			// backup storage
			backupStorage();
			log('game backed up');

			childproc.execSync('shutdown -h 0');
		} else {
			setTimeout(run, INTERVAL);
		}
	});
};

run();
