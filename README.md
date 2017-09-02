# redis-jwt

[![NPM version](https://badge.fury.io/js/redis-jwt.svg)](https://npmjs.org/package/redis-jwt) [![Build Status](https://travis-ci.org/kevoj/redis-jwt.svg?branch=master)](https://travis-ci.org/kevoj/redis-jwt) [![dependencies Status](https://david-dm.org/kevoj/redis-jwt/status.svg)](https://david-dm.org/kevoj/redis-jwt) [![devDependencies Status](https://david-dm.org/kevoj/redis-jwt/dev-status.svg)](https://david-dm.org/kevoj/redis-jwt?type=dev)
[![GitHub license](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](https://raw.githubusercontent.com/kevoj/redis-jwt/master/LICENSE)

> Management of sessions by Redis and JWT for horizontal scalability, with the possibility of having one session at a time or multiple for the same user

<a><img src="https://chris.lu/upload/images/redis.png" width="80"></a>
<a><img src="https://cdn.auth0.com/blog/jwtalgos/logo.png" width="80"></a>

## Requirements

- [Nodejs](https://nodejs.org) **>= 6.x.x** (**Recommended 8.x.x**)
- [Redis](https://redis.io)  **>= 3.x.x** (**Recommended 4.x.x**)

## Installation

Npm

```bash
npm install redis-jwt --save
```

Yarn
```bash
yarn add redis-jwt
```

## Usage

```javascript

import RedisJWT from 'redis-jwt';

const r = new RedisJWT({
	//host: '/tmp/redis.sock', //unix domain
	host: '127.0.0.1', //can be IP or hostname
	port: 6379, // port
	maxretries: 10, //reconnect retries, default 10
	//auth: '123', //optional password, if needed
	db: 0, //optional db selection
	secret: 'secret_key', // secret key for Tokens!
	multiple: false, // single or multiple sessions by user
	KEA: true // Enable notify-keyspace-events KEA
});

// Sign
r.sign('507f191e810c19729de860ea').then(token => {
	//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

	// Verify
	r.verify(token).then(result => {
		// object redis-jwt
	}).catch(err => {
		// Wrong token
	});

});

```

### Example with Express (Routers + Middleware)

```javascript

import RedisJWT from 'redis-jwt';
const r = new RedisJWT();
import express from 'express';
const app = express();

// Router Login
app.get('/login', (req, res) => {
	// Create a new token with redis-jwt
	r.sign('507f191e810c19729de860ea', { ttl: '15m', data: { hello: 'world' }, request: req }).then(token => {
		//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
		res.json({token});
  	});
});

// Router Me
app.get('/me', mw(), (req, res) => {
	/*
	req.user
	{
		name: 'led',
		lastname: 'zeppelin',
		"rjwt": {
			"rjwt": "507f191e810c19729de860ea:ZYYlwOGqTmx",
			"iat": 1504334208,
			"id": "507f191e810c19729de860ea",
			"ttl": 900,
			"value": {
				"_key": "507f191e810c19729de860ea:ZYYlwOGqTmx",
				"_agent": "Mozilla/5.0...",
				"_ip": "127.0.0.1",
				"hello": "world"
			}
		}
	}
	*/
	res.json(req.user);
});

// Middleware
function mw() {
  return (req, res, next) => {
  	// Extract token from header "authorization" (sent from the client)
 	const token = req.headers['authorization']; 
	// Verify token with redis-jwt
 	r.verify(token).then(rjwt => {
		/*
		rjwt
		{
			"rjwt": "507f191e810c19729de860ea:ZYYlwOGqTmx",
			"iat": 1504334208,
			"id": "507f191e810c19729de860ea",
			"ttl": 900,
			"value": {
				"_key": "507f191e810c19729de860ea:ZYYlwOGqTmx",
				"_agent": "Mozilla/5.0 (X11; Linux x86_64) ...",
				"_ip": "127.0.0.1",
				"hello": "world"
			}
		}
		*/

		// At this point you can query a user for a database, for example filter by rjwt.id
    	req.user = {name: 'led', lastname: 'zeppelin' ,{rjwt}};
        next();
  	}).catch(err => {
  		res.status(401).json({err})
  	})
  }
}

app.listen(3000, () => {
    console.log('Server listening on port 3000!');
});

```

## Options

### Sign

```javascript

	// Basic
	r.sign('507f191e810c19729de860ea').then(token => {
		//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  	});

    // With TTL: 1d, 10h, 2.5 hrs, 2h, 1m, 5s, 1y
    r.sign('507f191e810c19729de860ea', { ttl: '15m' }).then(token => {
		//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  	});
    
    // With Data: with "data" object are saved in redis-jwt
    r.sign('507f191e810c19729de860ea', { data: { hello: 'world' }}).then(token => {
		//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  	});

	// With Request: with "request" the client agent and ip are saved in redis-jwt
    r.sign('507f191e810c19729de860ea', { request: req }).then(token => {
		//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  	});
    
    // With TTL + Data + Request
    r.sign('507f191e810c19729de860ea', { ttl: '15m', data: { hello: 'world' }, request: req }).then(token => {
		//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  	});
         
```

### Verify

```javascript

	// Basic
	r.verify(token).then(result => {
		/*
		result
		{
			"rjwt": "507f191e810c19729de860ea:ZYYlwOGqTmx",
			"iat": 1504334208,
			"id": "507f191e810c19729de860ea",
			"ttl": 60
		}
		*/
  	}).catch(err => {
		// Wrong token
  	})

	// Value from redis
	r.verify(token, true).then(result => {
		/*
		result
		{
			"rjwt": "507f191e810c19729de860ea:ZYYlwOGqTmx",
			"iat": 1504334208,
			"id": "507f191e810c19729de860ea",
			"ttl": 60,
			"value": {
				"_key": "507f191e810c19729de860ea:ZYYlwOGqTmx",
				"_agent": "Mozilla/5.0 (X11; Linux x86_64)...",
				"_ip": "::1",
				"hello": "world"
			}
		}
		*/

  	}).catch(err => {
		// Wrong token
  	})

```

### Exec

```javascript

	// Execute Redis comands
	var exec = r.exec();
    
	exec.rawCall(['keys', `507f191e810c19729de860ea:*`], (err, result) => {
		/*
		result
		[
			"507f191e810c19729de860ea:ZYYlwOGqTmx",
			"507f191e810c19729de860ea:d39K8J249Hd",
		]
		*/
	});

```

### Call

```javascript

	// Method's redis-jwt
	var call = r.call();
    	
	// Example
	call.getValuesByPattern('507f191e810c19729de860ea').then(result => {
		/*
		result
		[
			"{\"_key\":\"507f191e810c19729de860ea:ZYYlwOGqTmx\",\"_agent\":\"Mozilla/5.0..."
		]
		*/
	})
      
    // Test Ping
    call.ping()..
    
     // Create
    call.create(key, value, ttl)..
    
    // exits by key
    call.exists(key)..
    
    // Get ttl by Key
    call.ttl(key)..
    
    // Get values by key
    call.getValueByKey(key)..
    
    // Get values by Pattern
    call.getValuesByPattern(pattern)..
    
    // Get count by Pattern
    call.getCountByPattern(pattern)..
    
    // Get info
    call.getInfo(section)..
    
    // Destroy by key
    call.destroy(key)..
    
    // Destroy multiple by key
    call.destroyMultiple(key)..
    

```

## Development

### Start

`npm start`

### Serve

`npm run serve`

### Build

`npm run build`

### Test

`npm test`


## License

MIT © [Leonardo Rico](https://github.com/kevoj/redis-jwt/blob/master/LICENSE)
