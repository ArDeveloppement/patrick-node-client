var fs       = require('fs'),
    request  = require('request'),
    readline = require('readline-sync')

function Client(baseUrl, tokenFile)
{
    this.baseUrl = baseUrl
    this.tokenFile = tokenFile
    this.baseRequest = request.defaults({
        baseUrl: baseUrl,
        timeout: 3000
    })
    this.jwtRequest = this.baseRequest.defaults({
        auth: {
            bearer: function () { return this.token }.bind(this)
        }
    })

    if (fs.existsSync(this.tokenFile)) {
        this.token = fs.readFileSync(this.tokenFile)
    }
}

Client.prototype.handleResponse = function (cb, redo)
{
    return function (err, res, body) {
        if (err) {
            if (err.code == 'ENOTFOUND') {
                throw new Error("Server with url "+this.baseUrl+" not found")
            } else if (err.code == 'ETIMEDOUT') {
                throw new Error('Server timed out')
            } else {
                throw err
            }
        }

        if (res.statusCode == 401) {
            console.error(body.red)
            return this.login(redo)
        }

        if (res.statusCode == 400) {
            console.error(body.red)
            process.exit(1)
        }

        cb(res, body)
    }.bind(this)
}

Client.prototype.version = function (cb)
{
    this.baseRequest.get('/version', this.handleResponse(cb, this.version.bind(this, cb)))
}

Client.prototype.logs = function (cb)
{
    this.jwtRequest.get('/logs/action', this.handleResponse(cb, this.logs.bind(this, cb)))
}

Client.prototype.login = function (cb)
{
    var user = readline.question('Username: ');
    var pass = readline.question('Password: ', {hideEchoBack: true});

    this.baseRequest.get(
        {
            uri: '/get-token',
            auth: {
                user: user,
                pass: pass
            }
        },
        this.handleResponse(
            function (res, body) {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    fs.writeFileSync(this.tokenFile, body)
                    this.token = body

                    if (cb) {
                        cb(res, body)
                    }
                } else {
                    throw new Error('Not token return by server: '+res.statusCode)
                }
            }.bind(this),
            cb
        )
    )
}

Client.prototype.logout = function ()
{
    if (fs.existsSync(this.tokenFile)) {
        fs.unlinkSync(this.tokenFile)
    }

    this.token = null
}

Client.prototype.getTasks = function (cb)
{
    this.jwtRequest.get('/task/list', {json: true}, this.handleResponse(cb, this.getTasks.bind(this, cb)))
}

Client.prototype.run = function (task, cb)
{
    var body = {task: task}

    var stop = false

    this.jwtRequest
        .post('/task/execute', {timeout: 0, json: true, body: body}, cb)
        .on('response', function (res) {
            if (res.statusCode == 401) {
                stop = true
                res.on('data', function (data) {
                    console.error(data.toString().red)
                })
                .on('end', function () {
                    this.login(this.run.bind(this, task, cb))
                }.bind(this))
            }

            if (res.statusCode == 400) {
                stop = true
                res.on('data', function (data) {
                    console.error(data.toString().red)
                }).on('end', function () { process.exit(1) })
            }
        }.bind(this))
        .on('error', function (err) {
            if (err.code == 'ENOTFOUND') {
                throw new Error("Server with url "+this.baseUrl+" not found")
            } else if (err.code == 'ETIMEDOUT') {
                throw new Error('Server timed out')
            } else {
                throw err
            }
        }.bind(this))
        .on('data', function (data) {
            if (stop) {
                return
            }

            console.log(data.toString())
        })
}

module.exports = Client
