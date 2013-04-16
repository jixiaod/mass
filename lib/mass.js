/*
    $SVN_ROOT/{project} 
    $WEB_ROOT/{project}/shared
    $WEB_ROOT/{project}/copy

*/

(function() {
    var cfg = require('../etc/config.json'),
        fs = require('fs'),
        spawn = require('child_process').spawn,
        exec = require('child_process').exec,
        path = require('path');

    function print_version()
    {
        logs("mass version: 0.1 " + os_type() + " " + os_release() + " &nodejs version " + nodejs_version());
    }
    
    function nodejs_version()
    {
        return process.version;
    }
    
    function os_type()
    {
        return require('os').type();
    }

    function os_release()
    {
        return require('os').release();
    }
    
    function print_help()
    {
        logs("Usage : mass <subcommand> --project <project> [options] [args]");
        print_version();
        logs("Type 'mass --version or mass -V' to see the program version.");
        logs("Available subcommands:");
        logs("\tdeploy | de \t\t deploy the project web envrionment.")
        logs("\tupdate | up \t\t update project delpoy.")
        logs("options:");
        logs("\t--project | -p \t\tsvn project name.");
        //logs("\t--verbose | -v \t\tincrease verbosity.");
        process.exit(0);
    }

    function help_tips()
    {
        logs("Type 'mass --help' or 'mass -h' for help infomation.");
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
            logs("Type 'mass --help' or 'mass -h' for help infomation.");
            process.exit(0);
        }

        for ( x in argvs ) {
            if ( argvs[x] == '-V' || argvs[x] == '--version') {
                print_version();
                process.exit(0);
            }
            if ( argvs[x] == '-h' || argvs[x] == '--help') {
                print_help();
                process.exit(0);
            }
            if (argvs[x] == 'deploy' || argvs[x] == 'dp') {
                options.action = 'deploy';
            }
            if (argvs[x] == 'up' || argvs[x] == 'update') {
                options.action = 'update';   
            }
            if ( argvs[x] == '--project' || argvs[x] == '-p') {
                parse_argv('project', /(\-\-project\s[\w\.\/]+|\-p)/);
            }

            if ( argvs[x] == '--verbose' || argvs[x] =='-v' ) {
                parse_argv('verbose', /(\-\-verbose\s[\w\.\/]+|\-v)/);
            }
        }
        // default action setup
        options.action == undefined ? 'deploy' : options.action;
        
        if ( options.project == undefined ) {
            help_tips();
        }
    })(process.argv.splice(2));
    // 
    var prj = integrate(options.project);
    var work_copy = path.join(cfg.env.svn_root, prj.name);
    var web_dir = path.join(cfg.env.web_root, prj.name);

    // init paths
    (function env_init()
    {
        if ( !fs.existsSync(cfg.env.svn_root ) ) {
            fs.mkdirSync(cfg.env.svn_root);
        }
        if ( !fs.existsSync(cfg.env.web_root) ) {
            fs.mkdirSync(cfg.env.web_root);
        }

    })();

    
    (function deploy()
    {
        if ( fs.existsSync( work_copy ) ) {
            ask('Do you want to remove and recreate svn directory? yes/no', function(answer){
                if ( answer.match(/^y(es)?$/i) ) {
                    //fs.unlinkSync(work_copy);
                    exec('rm -rf ' + work_copy, function(error, stdout, stderr){
                        logs('' + stdout);
                        logs('' + stderr);
                        logs('remove svn directory success.');

                        // checkout svn repository.
                        checkout();
                        
                        if (error != null) {
                            logs('delete svn directory error : ' + error);
                            process.exit(0);
                        }
                    });
                }else {
                    process.exit(0);
                }
            });
        }else {
            // checkout svn repository.
            checkout();
        }

    })();
    
    function checkout()
    {
         // change directory to svn root directory.
        //process.chdir(cfg.env.svn_root);
        var co = spawn('svn', ['checkout',prj.svn_url, work_copy,'--no-auth-cache','--username',cfg.svn.username,'--password',cfg.svn.password]);

        co.stdout.on('data', function(data){
            logs(('' + data).replace("\n", ""));
        });
        co.stderr.on('data', function(data){
            logs('stderr : ' + data);
        });
        co.on('close', function (code) {
            rsync(work_copy, web_dir);
            logs('exit ' +code)
        });
    }

    function rsync(from_dir, to_dir)
    {
        var rsync_opts = '-avzP';
        if (prj.exclude != "") {
            //rsync_opts += ' --exclude="'+prj.shared+'"';
        }
        var rsync_exclude = path.join(__dirname,"..", "etc", "rsync_exclude");
        var rsync = spawn('rsync', [rsync_opts, '--delete', '--exclude-from='+rsync_exclude, from_dir + '/', to_dir +'/']);

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
        for ( x in cfg.project) {
            if ( x == prj ) return cfg.project[x];
            if ( cfg.project[x].name == prj ) return cfg.project[x];
        }
        logs('please cfg project ' + prj + ' in ../etc/config.json first.');
        process.exit(0);

    }

    function ask(question, callback) {
        var r = require('readline').createInterface({input:process.stdin, output:process.stdout});
        r.question(question + '\n', function(answer) {
            r.close();
            callback(answer);
        });
    }

})();

