const childproc = require('child_process');

const STARBOUND_STORAGE = '/starbound/server/storage/';

const pullConfig = function() {
	childproc.execSync(
		'aws s3 cp s3://starbound-config/starbound_server.config .',
		{
			cwd: STARBOUND_STORAGE
		}
	);
};

pullConfig();
