(function(){
 var config = require('../etc/config.json'),
 exec = require('child_process').exec,
 child,
 fs = require('../lib/fs'),
 path = require('path');

 var host = config.http.host,
 port = config.http.port;

 var project, work_copy, web_dir, mass_dir, shared_dir; 

 (function run(port, host) {
    port = port || 8124;
    var server = require('http').createServer(function(req, res){
        var _postData = '';
        //on用于添加一个监听函数到一个特定的事件
        req.on('data', function(chunk) {
         _postData += chunk;
         })
     .on('end', function() {
         req.post = require('querystring').parse(_postData);
         handlerRequest(req, res);
      });
    }).listen(port, host);
    console.log('Server running at http://'+host+':'+ port +'/');
 })(port, host);

 function handlerRequest(req, res) {
    parse_url = require('url').parse(req.url);
    var prj_name = require('querystring').parse(parse_url.query).project;

    if( prj_name !== undefined ){

        project = integrate(res, prj_name);
        mass(res);
    }else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<head><meta charset="utf-8"/></head>')
        res.write('<body>');
        res.write('<h1>同步项目列表</h1>');
        res.write('<ul>');
        for ( x in config.project) {
            var url = project_url(config.project[x].name);
            res.write('<li><a href="'+url+'">'+config.project[x].description+'</a></li>');
        }
        res.write('</ul>');
        res.write('</body>');
        res.end();
    }
 }

 function mass(res) {
    
    work_copy = path.join(config.env.svn_root, project.name);
    web_dir = path.join(config.env.web_root, project.name);
    mass_dir = path.join(web_dir, 'mass');
    shared_dir = path.join(web_dir, 'shared');
    
    child = exec('svn update ' + work_copy + ' --no-auth-cache --username ' + config.svn.username + ' --password '+ config.svn.password,
        function (error, stdout, stderr) {
            logs(stdout);
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write('<head><meta charset="utf-8"/></head>')
            res.write((''+stdout).replace(/\n/g, "<br>"));
            res.end();
            rsync(res, project);

            //logs('stderr: ' + stderr);
            if (error !== null) {
                logs('svn update error: ' + error);
                _error(res, error);
            }
        });
 }

 function rsync(res) {
    var rsync_opts = '-avzP';

    var rsync_exclude = path.join(__dirname,"..", "etc", "rsync_exclude");
    child = exec('rsync ' + rsync_opts + ' --delete --exclude-from=' + rsync_exclude +' ' + work_copy+ '/ ' + mass_dir+'/',
        function(error, stdout, stderr) {
            logs(stdout);
            
            // deploy shared link.
            shared_link();

            if (error !== null) {
               _error(res, error);
            }

        });
 }

 /**
  * @brief  create symbolic link of the shared directory or file.
  *
  */
 function shared_link() {
     if ( project.shared != "" ) {
         var shareds = project.shared.split(/\s+/);
         if ( require('util').isArray(shareds) === false ) {
            logs('project.shared configure wrong case, fix it and try again.');
            process.exit(0);
         }

         for ( x in shareds ) {
             var dst_path = path.join(mass_dir, shareds[x]),
                 src_path = path.join(shared_dir, shareds[x]);
             if ( fs.lstatSync(dst_path).isDirectory() ) {
                 logs('rm -rf ' + dst_path);
                fs.rmdirSync(dst_path, true);

             } else {
                logs('unlink ' + dst_path);
                fs.unlinkSync(dst_path);
             }
             
             logs('ln -s ' + src_path + ' ' + dst_path);
             fs.symlinkSync(src_path, dst_path, true);  
         }
     }
 }

 function integrate( res, prj ) {
    for ( x in config.project) {
        if ( x == prj ) return config.project[x];
        if ( config.project[x].name == prj ) return config.project[x];
    }

    //logs('please config ' + prj + ' in ../etc/config.json first.');
    //process.exit(0);
    _error(res, 'please config project ' + prj + ' in ../etc/config.json first.');
 }

 function project_url(project) {
    return 'http://'+host+':'+port+'?project='+ project;
 }

 function _error(res, err) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<head><meta charset="utf-8"/></head>')
    res.write('<span>404 ERROR : '+err+'<span>');
    res.write('a href="http://'+host+':'+port+'">点击返回首页</a>');
    res.end();
 }

 function logs(log) {
    console.log(log);
 }
})();
