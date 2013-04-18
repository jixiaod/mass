/*
    $SVN_ROOT/{project} 
    $WEB_ROOT/{project}/shared
    $WEB_ROOT/{project}/copy

*/

(function() {
    var cfg = require('../etc/config.json'),
        fs = require('../lib/fs'),
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
    var prj = integrate(options.project),
        work_copy = path.join(cfg.env.svn_root, prj.name),
        web_dir = path.join(cfg.env.web_root, prj.name),
        mass_dir = path.join(web_dir, 'mass'),
        shared_dir = path.join(web_dir, 'shared');

    shared_link();
    process.exit(0);
    // init paths
    (function env_init()
    {
        // init svn root directory.
        if ( !fs.existsSync(cfg.env.svn_root ) ) {
            fs.mkdirSync(cfg.env.svn_root, '0777', true);
        }

        // init web root  directory.
        if ( !fs.existsSync(cfg.env.svn_root ) ) {
            fs.mkdirSync(cfg.env.svn_root, '0777', true);
        }

        
    })();

    
    (function deploy()
    {
        if ( fs.existsSync( work_copy ) || fs.existsSync( web_dir ) ) {
            ask('Do you want to remove and recreate mass deployment directory? yes/no', function(answer){
                if ( answer.match(/^y(es)?$/i) ) {
                    //fs.unlinkSync(work_copy);
                    exec('rm -rf ' + work_copy, function(error, stdout, stderr){
                        //logs('' + stdout);
                        //logs('' + stderr);
                        exec('rm -rf ' + web_dir, function(error, stdout, stderr){
                            logs('remove deloyment directory success.');
                            
                            // checkout svn repository.
                            checkout();
   
                            if (error != null) {
                                logs('delete deployment directory error : ' + error);
                                process.exit(0);
                            }
                        });
                                                
                        if (error != null) {
                            logs('delete deployment directory error : ' + error);
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
            // init web diretory. Deployed web path :
            // web_root/$PROJECT/mass
            // web_root/$PROJECT/shared
            if ( !fs.existsSync( mass_dir ) ) {
                fs.mkdirSync( mass_dir, '0777', true );
            }

            if ( !fs.existsSync(shared_dir) ) {
                fs.mkdirSync( shared_dir, '0777', true );
            }

            // deploy to web directory
            rsync( work_copy, mass_dir );
            //logs('exit ' +code)
        });
    }

    function rsync(from_dir, to_dir)
    {
        var rsync_opts = '-avzP';
        var rsync_exclude = path.join(__dirname,"..", "etc", "rsync_exclude");
        var rsync = spawn('rsync', [rsync_opts, '--delete', '--exclude-from='+rsync_exclude, from_dir + '/', to_dir +'/']);

        rsync.stdout.on('data', function(data) {
            logs('' + data);
        });

        rsync.stderr.on('data', function(data){
            logs('error : ' + data);
        });

        rsync.on('close', function(code) {
            
            //
            shared_link();        
            logs('exit ' + code);
        });
    }

    /**
    * @brief  create symbolic link of the shared directory or file.
    *
    */
    function shared_link()
    {
        if (prj.shared != "") {
            var shareds = prj.shared.split(/\s+/);
            for ( x in shareds ) {
                
                fs.renameSync(path.join(mass_dir, shareds[x]),  path.join(shared_dir, shareds[x]), true);
                fs.symlinkSync(path.join(shared_dir, shareds[x]), path.join(mass_dir, shareds[x]), true);  
            }
        }
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

