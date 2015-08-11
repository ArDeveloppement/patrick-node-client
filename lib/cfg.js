var fs     = require('fs'),
    path   = require('path'),
    mkdirp = require('mkdirp'),
    merge  = require('merge')

function Configuration(file)
{
    Object.defineProperty(this, 'file', {
        writable: true,
        enumerable: false,
    });

    this.file = file
}

Configuration.prototype.load = function()
{
    var options = JSON.parse(fs.readFileSync(this.file))
    merge(this, options)
}

Configuration.prototype.save = function()
{
    mkdirp.sync(path.dirname(this.file))
    fs.writeFileSync(this.file, JSON.stringify(this, null, 4))
}

module.exports = Configuration
