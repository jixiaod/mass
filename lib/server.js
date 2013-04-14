var config = require('../etc/config.json');
var exec = require('child_process').exec,
    child,
    http = require('http'),
    path = require('path'),
    querystring = require("querystring");
    parseURL = require('url').parse;

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
    var prj_name = querystring.parse(parse_url.query).project;

    if( prj_name !== undefined ){
        var project = integrate(res, prj_name);

        mass(res, project);
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

function mass(res, project)
{
    child = exec('svn update ' + project.work_copy + ' --no-auth-cache --username ' + config.svn.username + ' --password '+ config.svn.password,
        function (error, stdout, stderr) {

            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write('<head><meta charset="utf-8"/></head>')
            res.write((''+stdout).replace("\n", "<br>"));
            res.end();

            rsync(res, project);

            //logs('stderr: ' + stderr);
            if (error !== null) {
                logs('svn update error: ' + error);
                _error(res, error);
            }
        });
}

function rsync(res, project)
{
    var rsync_opts = '-avzP';
    var rsync_exclude = path.join(__dirname,"..", "etc", "rsync_exclude");
    child = exec('rsync ' + rsync_opts + ' --delete --exclude-from=' + rsync_exclude +' ' + project.work_copy+ '/ ' + project.web_path+'/',
        function(error, stdout, stderr) {
            logs(stdout);

            if (error !== null) {
               _error(res, error);
            }

        });
}

function integrate( res, prj )
{
    for ( x in config.project) {
        if ( config.project[x].name == prj ) return config.project[x];
    }
    //logs('please config ' + prj + ' in ../etc/config.json first.');
    //process.exit(0);
    _error(res, 'please config project ' + prj + ' in ../etc/config.json first.');
}

function project_url(project)
{
    return 'http://'+host+':'+port+'?project='+ project;
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

