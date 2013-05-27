(function() { 

 'use strict';

 var cfg = require('../etc/config.json'),
 fs = require('../lib/fs'),
 spawn = require('child_process').spawn,
 exec = require('child_process').exec,
 path = require('path');

 function print_version() {
    logs("mass version: 0.1 " + os_type() + " " + os_release() + " &nodejs version " + nodejs_version());
 }
    
 function nodejs_version() {
    return process.version;
 }
    
 function os_type() {
    return require('os').type();
 }

 function os_release() {
    return require('os').release();
 }

 function print_help() {
     logs("Usage : mass <subcommand> --project <project> [options] [args]");
     print_version();
     logs("Type 'mass --version or mass -V' to see the program version.");
     logs("Available subcommands:");
     logs("\tdeploy | do \t\t deploy the project web envrionment.")
     //logs("\tupdate | up \t\t update project delpoy.")
     logs("\tshare  | sa \t\t only update 'shared' configure.")
     logs("options:");
     logs("\t--project | -p \t\tsvn project name.");
     logs("\t--quiet | -q   \t\tno verbose message.");
     process.exit(0);
 }

 function help_tips() {
     logs("Type 'mass --help' or 'mass -h' for help infomation.");
     process.exit(0);
 }

 function logs(message) {
     console.log(message);
 }
    
 var options = {};
 (function options_filter(argvs) {
    function parse_argv(prop, regexp) {
        if (argvs[x].match(regexp)) {
            if (argvs[x].indexOf('=') != -1) {
                options[prop] = argvs[x].split('=')[x];
            } else {
                var argv = argvs[++x];
                options[prop] = typeof(argv) == "undefined" ? undefined : argv;
            }
        }
    }

    if ( argvs.length == 0 ) {
        logs("Type 'mass --help' or 'mass -h' for help infomation.");
        process.exit(0);
    }
    var x;
    for ( x in argvs ) {
        if ( argvs[x] == '-V' || argvs[x] == '--version') {
            print_version();
            process.exit(0);
        }
        if ( argvs[x] == '-h' || argvs[x] == '--help') {
            print_help();
            process.exit(0);
        }
        if (argvs[x] == 'deploy' || argvs[x] == 'do') {
            options.subcommand = 'deploy';
        }
        if (argvs[x] == 'up' || argvs[x] == 'update') {
            options.subcommand = 'update';   
        }
        if (argvs[x] == 'sa' || argvs[x] == 'share') {
            options.subcommand = 'share';   
        }

        if ( argvs[x] == '--project' || argvs[x] == '-p') {
            parse_argv('project', /(\-\-project\s[\w\.\/]+|\-p)/);
        }

        if ( argvs[x] == '--quiet' || argvs[x] =='-q' ) {
            options.quiet = true;
        }
    }
    // default action setup
    
    options.quiet == undefined ? false : true;

  })(process.argv.splice(2));

 
  // init paths
  (function env_init() {
     // init svn root directory.
     if ( !fs.existsSync(cfg.env.svn_root ) ) {
        fs.mkdirSync(cfg.env.svn_root, '0777', true);
     }

     // init web root  directory.
     if ( !fs.existsSync(cfg.env.svn_root ) ) {
        fs.mkdirSync(cfg.env.svn_root, '0777', true);
     }
     logs('deploy envrionment directory initilized.');
  })();
 
 if ( options.subcommand == undefined ) {
    help_tips();
 }

 if ( options.project == undefined ) {
    logs("add option '--project <project>' to deploy project.");  
    process.exit(0);
 }

 var prj = integrate(options.project),
 work_copy = path.join(cfg.env.svn_root, prj.name),
 web_dir = path.join(cfg.env.web_root, prj.name),
 mass_dir = path.join(web_dir, 'mass'),
 shared_dir = path.join(web_dir, 'shared');

 
 switch (options.subcommand) {
    case 'deploy' : 
        deploy();
        break;
    case 'update' :
        //update();
        break;
    case 'share' : 
        shared_link();
        break;
    default : 
        deploy();
        break;
 }

   
 function deploy() {
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
 }
    
 function checkout() {
    // change directory to svn root directory.
    //process.chdir(cfg.env.svn_root);
    var co = spawn('svn', ['checkout',prj.svn_url, work_copy,'--no-auth-cache','--username',cfg.svn.username,'--password',cfg.svn.password]);
    co.stdout.on('data', function(data) {
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

 function rsync(from_dir, to_dir) {
     var rsync_opts = '-avzP';
     var rsync_exclude = path.join(__dirname,"..", "etc", "rsync_exclude"),
     rsync = spawn('rsync', [rsync_opts, '--delete', '--exclude-from='+rsync_exclude, from_dir + '/', to_dir +'/']);

     rsync.stdout.on('data', function(data) {
        logs('' + data);
     });

     rsync.stderr.on('data', function(data){
        logs('error : ' + data);
     });

     rsync.on('close', function(code) {

        shared_link();        
        logs('deploy done.');
     });
 }

 /**
  * @brief  create symbolic link of the shared directory or file.
  *
  */
 function shared_link() {
     if (prj.shared != "") {
         var shareds = prj.shared.split(/\s+/);
         if ( require('util').isArray(shareds) === false ) {
            logs('project.shared configure wrong case, fix it and try again.');
            process.exit(0);
         }
         var x;
         for ( x in shareds ) {

             var dst_path = path.join(mass_dir, shareds[x]),
                 src_path = path.join(shared_dir, shareds[x]);
             if ( fs.existsSync( dst_path ) ) {
                 if ( options.subcommand == 'share' ) {
                     // subcommand == 'share', rm symbolic file or path.
                     //logs(fs.lstatSync(dst_path).isDirectory());
                     if ( fs.lstatSync(dst_path).isDirectory() ) {
                         logs('rm -rf ' + dst_path );
                         fs.rmdirSync(dst_path, true);
                     } else {
                         logs('unlink ' + dst_path);
                         fs.unlinkSync(dst_path);
                     }
                 } else {
                     // default subcommand == 'deploy'
                     logs('rename '+ dst_path + ' ' + src_path);
                     fs.renameSync(dst_path, src_path, true);
                 }
             }else {
                 logs('mkdir ' + src_path);
                 fs.mkdirSync(src_path, '0777', true);
             }
             logs('ln -s ' + src_path + ' ' + dst_path);
             fs.symlinkSync(src_path, dst_path, true);  
         }
     }
 }

 function integrate( prj ) {
     var x;
     for ( x in cfg.project) {
         if ( x == prj ) return cfg.project[x];
         if ( cfg.project[x].name == prj ) return cfg.project[x];
     }
     logs('please assign project \'' + prj + '\' in ../etc/config.json first.');
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

