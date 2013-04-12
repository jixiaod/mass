var config = require('../etc/config.json');
var exec = require('child_process').exec,
    child,
    http = require('http'),
    path = require('path'),
    querystring = require("querystring");
    parseURL = require('url').parse;

var SVN_DIR, WEB_DIR;
var host = config.http.host,
    port = config.http.port;

(function run(port, host)
{
    port = port || 8124;
    var server = http.createServer(function(req, res){
            var _postData = '';
            //on用于添加一个监听函数到一个特定的事件
            req.on('data', function(chunk)
                {
                _postData += chunk;
                })
            .on('end', function()
                {
                req.post = querystring.parse(_postData);
                handlerRequest(req, res);
                });
    }).listen(port, host);
    console.log('Server running at http://'+host+':'+ port +'/');
})(port, host);

function handlerRequest(req, res)
{
    parse_url = parseURL(req.url);
    var project = querystring.parse(parse_url.query);

    if( project.svn_dir !== undefined &&project.web_dir !== undefined){
        SVN_DIR = project.svn_dir;
        WEB_DIR = project.web_dir;

        mass(res);
    }else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<head><meta charset="utf-8"/></head>')
        res.write('<body>');
        res.write('<h1>同步项目列表</h1>');
        res.write('<ul>');
        for ( x in config.project) {
            var url = project_url(config.project[x]);
            res.write('<li><a href="'+url+'">'+config.project[x].description+'</a></li>');
        }
        res.write('</ul>');
        res.write('</body>');
        res.end();
    }
}

function mass(res)
{
    //SVN_DIR = path.normalize( path.join(config.svn_root_dir, project, config.svn_directory));
    //WEB_DIR = path.normalize( path.join(config.web_root_dir, project));
    child = exec('svn update '+SVN_DIR+' --no-auth-cache --username ' + config.svn.username + ' --password '+ config.svn.password,
        function (error, stdout, stderr) {

            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write('<head><meta charset="utf-8"/></head>')
            res.write(stdout.replace("\n", "<br>"));
            res.end();

            rsync(res);

            //logs('stderr: ' + stderr);
            if (error !== null) {
                logs('svn update error: ' + error);
                _error(res, error);
            }
        });
}

function rsync(res)
{
    var rsync_opts = '-avzP';
    var rsync_exclude = path.join(__dirname,"..", "etc", "rsync_exclude");
    child = exec('rsync ' + rsync_opts + ' --delete --exclude-from=' + rsync_exclude +' ' + SVN_DIR + '/ ' + WEB_DIR +'/',
        function(error, stdout, stderr) {
            logs(stdout);
            //res.writeHead(200, {'Content-Type': 'text/html'});
            //res.write('<head><meta charset="utf-8"/></head>')
            //res.write('<p>------------------------</p>');
            //res.write(stdout.replace("\n", "<br>"));
            //res.write(stdout.replace("\r", "<br>"));
            //res.end();
            if (error !== null) {
               _error(res, error);
            }

        });
}

function project_url(project)
{
    return 'http://'+host+':'+port+'?'+encodeURI('svn_dir='+project.svn_dir+'&web_dir='+project.web_dir);
}

function _error(res, err)
{
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<head><meta charset="utf-8"/></head>')
    res.write('<span>404 ERROR : '+err+'<span>');
    res.write('a href="http://'+host+':'+port+'">点击返回首页</a>');
    res.end();
}

function logs(log)
{
    console.log(log);
}

