#!/usr/bin/env node

var pkg        = require('./package.json'),
    program    = require('commander'),
    fs         = require('fs'),
    path       = require('path'),
    color      = require('colors'),
    readline   = require('readline-sync'),
    Cfg        = require('./lib/cfg'),
    Client     = require('./lib/client'),
    Table      = require('cli-table'),
    configDir  = process.env['HOME']+'/.patrick',
    tokenFile  = configDir+'/token',
    configFile = configDir+'/config.json'

// Config
var cfg = new Cfg(configFile)

if (!fs.existsSync(configFile)) {
    console.log("Hello fellow developer,".yellow)
    console.log("It seems it is the first time you launch patrick".yellow)

    var url = readline.question("Would you please enter the patrick server url ? : ")

    cfg.url = url
    cfg.save()
    console.log("Thank you, the configuration is save at ".green, configFile)
    console.log("Now you can enjoy patrick".green)
    process.exit(0)
}

// Load config
cfg.load();

// Load client
var client = new Client(cfg.url, tokenFile)

program
    .version(pkg.version)
    .description('Node client for patrick')

program
    .command('run <task>')
    .description('Execute a server task')
    .action(function (task) {
        client.run(task)
    });

program
    .command('list')
    .alias('l')
    .description('List available tasks')
    .action(function () {
        console.log("Here is the tasks list available from the server.".magenta)
        console.log("You can execute them with the `run` command. Ex: patrick run <task>".magenta)

        client.getTasks(function (res, body) {
            var tasks = body.reduce(function (arr, t) {
                arr.push([t.name, t.description])
                return arr
            }, [])

            var table = new Table({})
            table.push.apply(table, tasks)
            console.log(table.toString())
        })
    });

program
    .command('logs')
    .description('Display logs')
    .action(function () {
        client.logs(function (res, body) {
            console.log(body)
        })
    });

program
    .command('login')
    .description('Login to the patrick server')
    .action(function () {
        client.login(function () {
            console.log("You are logged in!".green)
        })
    });

program
    .command('logout')
    .description('Logout from the patrick server')
    .action(function () {
        client.logout()
        console.log("You are logged out!".green)
    });

program
    .command('server-version')
    .description('Display the patrick server version')
    .action(function () {
        client.version(function (res, body) {
            console.log(body)
        })
    });

program.parse(process.argv)

if (!process.argv.slice(2).length) {
    program.help()
}
