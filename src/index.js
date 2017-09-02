import Redis from 'redis-fast-driver';
import jwt from 'jsonwebtoken';
import shell from 'shelljs';
import chalk from 'chalk';
import ms from 'ms';

/**
  Jwt Class
 */
class Jwt {

    constructor(secret) {
        this.secret = secret;
    }

    async sign(rjwt) {
        try {
            return await jwt.sign({
                rjwt
            }, this.secret);
        } catch (err) {
            throw 'redis-jwt->  Error creating token...';
        }

    }

    async verify(token) {
        try {
            return jwt.verify(token, this.secret);
        } catch (err) {
            throw 'redis-jwt-> Error verify token...';
        }
    }

}

/**
  Driver class
 */
class Driver {

    constructor(config) {
        this.config = config;
        this.r = new Redis(this.config);
        this.events();
    }

    // Return instance
    exec() {
        return this.r;
    }

    // Events
    events() {

        const uri = `${this.config.host}:${this.config.port}/${this.config.db}`;

        this.r.on('ready', () => {
            console.log(chalk.greenBright(`-------\nRedis[${this.config.name}]-> connected on ${uri}\n-------`));
        });

        // //happen each time when reconnected
        this.r.on('connected', () => {
            // console.log('redis connected');
        });

        this.r.on('disconnected', () => {
            console.log(chalk.redBright(`Redis[${this.config.name}]-> disconnected: ${uri}`));
        });

        this.r.on('error', (err) => {
            console.log(chalk.redBright(`Redis[${this.config.name}]-> error: ${uri} - detail: ${err}`));
        });

        setTimeout(() => {
            this.ping();
        }, 2000);

    }

    // Test Ping
    async ping() {
        if (!await this.r.rawCall(['ping'])) {
            console.log(chalk.redBright(`Redis[${name}]-> Could not establish a connection: ${uri}`));
            process.exit(-1);
        }
    }

    // Create
    async create(key, value, ttl) {
        try {
            let id = key.split(':')[0];
            if (!this.config.multiple)
                await this.destroyMultiple(id);
            if (ttl) {
                await this.r.rawCall(['SETEX', key, (ms(ttl) / 1000), value]);
            } else {
                await this.r.rawCall(['SET', key, value]);
            }

        } catch (err) {
            throw `Error 1 Redis ${err}`;
        }
        return true;
    }

    // exits by key
    async exists(key) {
        return new Promise((resolve, reject) => {
            this.r.rawCall([
                'EXISTS', key
            ], (err, result) => {
                if (result)
                    resolve(result);
                resolve(null);
            });
        });
    }

    // Get ttl by Key
    async ttl(key) {
        return new Promise((resolve, reject) => {
            this.r.rawCall([
                'ttl', key
            ], (err, result) => {
                if (result)
                    resolve(result);
                resolve(null);
            });
        });
    }

    // Get values by key
    async getValueByKey(key) {
        return new Promise((resolve, reject) => {
            this.r.rawCall([
                'get', key
            ], (err, result) => {
                if (result)
                    resolve(result);
                resolve(null);
            });
        });
    }

    // Get values by Pattern
    async getValuesByPattern(pattern) {
        return new Promise((resolve, reject) => {
            this.r.rawCall([
                'keys', `${pattern}:*`
            ], (err, keys) => {
                let query = ['MGET'].concat(keys);
                this.r.rawCall(query, (err, result) => {
                    if (result)
                        resolve(result);
                    resolve(null);
                })
            });
        });
    }

    // Get count by Pattern
    async getCountByPattern(pattern) {
        return new Promise((resolve, reject) => {
            this.r.rawCall([
                'keys', `${pattern}:*`
            ], (err, result) => {
                if (result)
                    resolve(result.length);
                resolve(null);
            });
        });
    }

    // Get info
    async getInfo(section) {
        return new Promise((resolve, reject) => {
            let query = (section === 'DBSIZE') ? ['DBSIZE'] : ['INFO', section];
            this.r.rawCall(query, (err, result) => {
                if (result)
                    resolve(result);
                resolve(null);
            });
        });
    }

    // Destroy by key
    async destroy(key) {
        return new Promise((resolve, reject) => {
            this.r.rawCall([
                'DEL', key
            ], (err, result) => {
                if (result)
                    resolve(result);
                resolve(null);
            });
        });
    }

    // Destroy multiple by key
    async destroyMultiple(key) {
        return new Promise((resolve, reject) => {
            this.r.rawCall([
                'KEYS', `${key}:*`
            ], (err, keys) => {
                keys.join();
                keys.splice(0, 0, "DEL");
                this.r.rawCall(keys, (err, result) => {
                    if (result)
                        resolve(result);
                    resolve(null);
                })
            });
        });
    }

}

/**
  RedisJwt Class
 */
class RedisJwt {

    constructor(config) {

        // Enable notify-keyspace-events
        if (config.KEA) {
            if (shell.exec('redis-cli config set notify-keyspace-events KEA').code !== 0) {
                shell.echo('Error: notify-keyspace-events KEA failed');
                shell.exit(1);
            }
        }
        // params
        this.config = {}
        this.config.name = 'redis-jwt';
        this.config.host = config.host || '127.0.0.1';
        this.config.port = config.port || 6379;
        this.config.db = config.db || 0;
        this.config.maxretries = config.maxretries || 10;
        this.config.auth = config.auth || false;

        this.config.secret = config.secret || 'secret_key';
        this.config.multiple = !config.multiple ? false : true;

        // instances
        this.d = new Driver(this.config);
        this.j = new Jwt(this.config.secret);
    }

    // Create a new token

    async sign(_id, _options) {

        try {

            let key = `${_id}:${this.makeid(11)}`;
            let _ttl = null;
            let session = { _key: key };

            if (_options) {

                // If have TTL
                if (_options.ttl)
                    _ttl = _options.ttl;

                // If have request save agent and ip
                if (_options.request) {
                    Object.assign(session, {
                        _agent: _options.request.headers['user-agent'],
                        _ip: _options.request.headers['x-forwarded-for'] || _options.request.connection.remoteAddress
                    });
                }

                // If have data save in session
                if (_options.data)
                    Object.assign(session, _options.data);

            }

            // Sign Jwt
            let token = await this.j.sign(key);

            // Stringify info session
            let data = JSON.stringify(session);

            // Set in Redis
            await this.d.create(key, data, _ttl);

            return token;

        } catch (err) {
            throw chalk.redBright(err);
        }

    }

    // Verify

    async verify(token, getValue) {

        try {
            // Verify Token with Jwt
            let decode = await this.j.verify(token);
            if (!decode)
                return false;

            // get key in redis
            let key = decode.rjwt;

            // Verify if exits key in redis
            if (!await this.d.exists(key))
                return false;

            // get current TTL
            let ttl = await this.d.ttl(key);

            // get Id
            let id = decode.rjwt.split(':')[0];

            // Merge
            Object.assign(decode, { id, ttl });

            // if full get value from redis
            if (getValue) {
                let value = JSON.parse(await this.d.getValueByKey(key));
                Object.assign(decode, { value });
            }

            return decode;

        } catch (err) {
            throw chalk.redBright(err);
        }

    }

    // return instance to Driver (access method's) -> this.r.method
    call() {
        return this.d;
    }

    // return redis fast driver native ->  this.r.rawCall([])
    exec() {
        return this.d.exec();
    }

    // Util
    makeid(length) {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

}

module.exports = RedisJwt;

// KEA

// this.node = parseInt(process.env.NODE_APP_INSTANCE) || 0;

/*
 * Basic Example Pubsub
 * Listener all nodes
 */

// r.rawCall([
//     'subscribe', `news`
// ], async function (e, data) {
//     if (config.log)
//         console.log(chalk.blueBright(`${data} - node = ${this.node}`));
// });


// Send publish from node 0

// if (this.node === 0) {
//     const r2 = new Redis(this.config.db);
//     setTimeout(function () {
//         r2.rawCall(['PUBLISH', 'news', 'hello world!']);
//     }, 3000);
// }


// Thread event manager (Expired, del)

// if (this.node === 0) {
//   r.rawCall([
//     'subscribe', `__keyevent@${this.config.db}__:del`, `__keyevent@${this.config.db}__:expired`
//   ], async function (e, data) {

//     let obj = formatKea(data);
//     let msg = '';
//     if (obj) {
//       switch (obj.event) {
//         case 'expired':
//           msg = `expired ${obj.key}`;
//           break;
//         case 'del':
//           msg = `del ${obj.key}`;
//           break;
//         default:
//           break;
//       }
//     } else {
//       msg = data;
//     }
//     if (config.log)
//       console.log(chalk.blueBright(`${msg} - node = ${this.node}`));
//   });
// }


// Format KEA

// function formatKea(data) {
//     if (data[0] === 'message') {
//         let event = data[1].split(`__keyevent@${this.config.db}__:`)[1];
//         let key = data.reverse()[0];
//         return { event, key };
//     } else {
//         return null;
//     }
// }