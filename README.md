# redis-jwt

> Management of sessions by Redis and JWT for horizontal scalability, with the possibility of having one session at a time or multiple for the same user

<a><img src="https://chris.lu/upload/images/redis.png" width="80"></a>
<a><img src="http://www.techforumist.com/wp-content/uploads/2016/11/introduction_to_json_web_token.png" width="120"></a>

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

import express from 'express';
const app = express();

app.get('/login', (req, res) => {
	// Create a new token with redis-jwt
	r.create(req, 'id_user').then(token => {
    	// return token to client (save token in cookie,localstorage,etc)
		res.json({token});
  	});
});

// Get me
app.get('/me', mw(), (req, res) => {
	// returns the current user associated with the token
	res.json(req.user);
});

// Middleware
function mw() {
  return (req, res, next) => {
  	// Extract token from header "authorization" (sent from the client)
 	const token = req.headers['authorization']; 
	// Verify token with redis-jwt
 	r.verify(token).then(session => {
    	// if all ok save session
    	req.user = {name: 'led', lastname: 'zeppelin' ,{session}};
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

### Create

```javascript

	// Simple

	r.create(req, 'id_user').then(token => {
		res.json({token});
  	});
    
    // With data
    
    r.create(req, 'id_user',{hello:'world'}).then(token => {
		res.json({token});
  	});
    
    // With TTL
    
    r.create(req, 'id_user', 5000).then(token => {
		res.json({token});
  	});
    
    // With data + TTL
    
    r.create(req, 'id_user', {hello:'world'}, 5000).then(token => {
		res.json({token});
  	});
         
```

### Verify


```javascript

	r.verify(token).then(result => {
    	// Token ok
  	}).catch(err => {
		// Wrong token
  	})

```

### Exec

```javascript

	// Native comands to redis
	var exec = r.exec();
    
	exec.rawCall(['keys', `507f191e810c19729de860ea:*`], (err, result) => {
		// all the keys with the search pattern
    	console.log(result);
	});

```

### Call

```javascript

	var call = r.call();
    	
    // Example
	call.getValuesByPattern('507f191e810c19729de860ea').then(result => {
		// all the keys with the search pattern
    	console.log(result);
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
