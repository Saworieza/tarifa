var Q = require('q'),
    chalk = require('chalk'),
    fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    argsHelper = require('../../lib/args'),
    devices = require('../../lib/devices'),
    settings = require('../../lib/settings'),
    pkg = require('../../package.json');

function getToolVersion(name, tool, verbose) {
    var defer = Q.defer(),
        options = {
            timeout : 600,
            maxBuffer: 1024 * 400
        },
        child = exec(tool + ' -v', options, function (err, stdout, stderr) {
            if(err) {
                defer.reject(tool + ' ' + err);
                return;
            }
            defer.resolve({
                name: name,
                version: stdout.toString().replace('\n', '')
            });
        });

    return defer.promise;
}

function check_tools(verbose) {
    var rslts = [];
    for(var bin in settings.external) {
        rslts.push(getToolVersion(
                    settings.external[bin]['name'],
                    settings.external[bin]['print_version'],
                    verbose)
                );
    }

    return Q.allSettled(rslts).then(function (results) {
        results.forEach(function (result) {
            if (result.state === "fulfilled") {
                console.log(chalk.green(result.value.name + ' version: ') + result.value.version);
            } else {
                console.log(chalk.cyan(result.reason.split(' ')[0] + ' not found!'));
                if (verbose) console.log('\tReason: ' + chalk.cyan(result.reason));
            }
        });
        return Q.resolve();
    });
}

module.exports = function (argv) {

    var verbose = false;
    var usage = false;

    for(var a in argv) if(a != 'verbose' && a !="_") usage = true;

    if(argsHelper.matchSingleOptions(argv, 'V', 'verbose')) {
        verbose = true;
    } else if(argv._.length != 0 || usage) {
        console.log(fs.readFileSync(path.join(__dirname, 'usage.txt'), 'utf-8'));
        return Q.resolve();
    }

        console.log(chalk.green('node version:               ') + process.versions.node);
        console.log(chalk.green('cordova version:            ') + pkg.dependencies.cordova);

    return devices.ios().then(function (devices) {
        console.log(chalk.green('connected iOS devices:      \n\t') +  devices.join('\n\t'));
    }).then(devices.android).then(function (devices) {
        console.log(chalk.green('connected Android devices:') +  devices.join('\n\t'));
    }).then(function () {
        return check_tools(verbose);
    });

    // check installed xcode version if available
    // check android sdk version
    // check if we are in a tarifa project
};
