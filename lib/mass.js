var config = require('../etc/config.json');
var os = require('os'),
    spawn = require('child_process').spawn,
    child,
    path = require('path');

(function(){
    
    function print_version()
    {
        logs("mass version: 0.1 " + os.type() + " " + os.release() + " &nodejs version " + process.version);
    }
    
    function print_help()
    {
        print_version();
        logs("Usage : mass --project <project> [options]");
        logs("\t--project | -p \t\tsvn project name");
        logs("options:");
        logs("\t--verbose | -v \t\tincrease verbosity");
        process.exit(0);
    }

    function logs(message)
    {
        console.log(message);
    }
    
    var options = {};
    (function options_filter(argvs)
    {
        function parse_argv(prop, regexp)
        {
            if (argvs[x].match(regexp)) {
                if (argvs[x].indexOf('=') != -1) {
                    options[prop] = argvs[x].split('=')[x];
                } else {
                    argv = argvs[++x];
                    options[prop] = typeof(argv) == "undefined" ? undefined : argv;
                }
            }

        }

        if ( argvs.length == 0 ) {
            print_help();
        }

        for ( x in argvs ) {
            if ( argvs[x] == '--version') {
                print_version();
                process.exit(0);
            }
            if ( argvs[x] == '-h' || argvs[x] == '--version') {
                print_help();
                process.exit(0);
            }
            if ( argvs[x] == '--project' || argvs[x] == '-p') {
                parse_argv('project', /(\-\-project\s[\w\.\/]+|\-p)/);
            }
            if ( argvs[x] == '--verbose' || argvs[x] =='-v' ) {
                parse_argv('verbose', /(\-\-verbose\s[\w\.\/]+|\-v)/);
            }
        }

        if ( options.project == undefined ) {
            print_help();
        }
    })(process.argv.splice(2));
    

    (function run()
    {
        var prj = integrate(options.project);
        checkout(prj);
        
    })();

    function checkout(prj)
    {
        var co = spawn('svn', ['checkout',prj.svn_url, prj.work_copy,'--no-auth-cache','--username',config.svn.username,'--password',config.svn.password]);

        co.stdout.on('data', function(data){
            logs(('' + data).replace("\n", ""));
        });
        co.stderr.on('data', function(data){
            logs('stderr : ' + data);
        });
        co.on('close', function (code) {
            rsync(prj);
            logs('exit ' +code)
        });
        
    }

    function rsync(prj)
    {
        var rsync_opts = '-avzP';
        var rsync_exclude = path.join(__dirname,"..", "etc", "rsync_exclude");
        var rsync = spawn('rsync', [rsync_opts, '--delete', '--exclude-from='+rsync_exclude, prj.work_copy + '/', prj.web_path +'/']);

        rsync.stdout.on('data', function(data) {
            logs('' + data);
        });

        rsync.stderr.on('data', function(data){
            logs('error : ' + data);
        });
        rsync.on('close', function(code) {
            logs('exit ' + code);
        });

    }


    function integrate( prj )
    {
        for ( x in config.project) {
            if ( config.project[x].name == prj ) return config.project[x];
        }
        logs('please config ' + prj + ' in ../etc/config.json first.');
        process.exit(0);

    }

})();
