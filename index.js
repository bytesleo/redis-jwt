import RedisJwt from './dist/index';
import express from 'express';

const r = new RedisJwt({
	//host: '/tmp/redis.sock', //unix domain
	host: '127.0.0.1', //can be IP or hostname
	port: 6379, // port
	maxretries: 10, //reconnect retries, default 10
	//auth: '123', //optional password, if needed
	db: 0, //optional db selection
	secret: 'secret_key', // secret key for Tokens!
	multiple: false, // single or multiple sessions by user
	kea: true // Enable notify-keyspace-events KEA
});

const app = express();

// Events

r.on('ready', () => {
	console.log('redis-jwt-> ready!');
});

r.on('connected', () => {
	console.log('redis-jwt-> connected!');
});

r.on('disconnected', () => {
	console.log('redis-jwt-> disconnected!');
});

r.on('error', (err) => {
	console.log('redis-jwt-> error!', err);
});

// Router

app.get('/', (req, res) => {

	// sign
	r.sign('507f191e810c19729de860ea', {
		ttl: '15 minutes',
		dataToken: { hello: 'world' },
		dataSession: {
			hello: 'world',
			headers: req.headers
		}
	}).then(sign => {

		// verify
		r.verify(sign, true).then(decode => {

			// exec
			var rexec = r.exec();

			rexec.rawCall(['keys', `507f191e810c19729de860ea:*`], (err, exec) => {

				// call
				var rcall = r.call();

				rcall.getValuesByPattern('507f191e810c19729de860ea').then(call => {

					console.log({ sign, decode, exec, call });
					res.json({ sign, decode, exec, call });
				})

			});

		}).catch(err => console.log('error verify-> ', err));
	});

});

app.listen(3000, () => console.log('Server listening on port 3000!'));