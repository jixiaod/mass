(function () {
 'use strict';

 var fs = require('fs'),
 mkdirOrig = fs.mkdir,
 mkdirSyncOrig = fs.mkdirSync,
 renameSyncOrig = fs.renameSync,
 symlinkSyncOrig = fs.symlinkSync,
 rmdirSyncOrig = fs.rmdirSync,
 osSep = process.platform === 'win32' ? '\\' : '/';

 /**
  * Offers functionality similar to mkdir -p
  *
  * Asynchronous operation. No arguments other than a possible exception
  * are given to the completion callback.
  */
 function mkdir_p (path, mode, callback, position) {
 var parts = require('path').normalize(path).split(osSep);

 mode = mode || process.umask();
 position = position || 0;

 if (position >= parts.length) {
     return callback();
 }

 var directory = parts.slice(0, position + 1).join(osSep) || osSep;
 fs.stat(directory, function(err) {    
         if (err === null) {
         mkdir_p(path, mode, callback, position + 1);
         } else {
         mkdirOrig(directory, mode, function (err) {
             if (err && err.code != 'EEXIST') {
             return callback(err);
             } else {
             mkdir_p(path, mode, callback, position + 1);
             }
             });
         }
         });
 }

 function mkdirSync_p(path, mode, position) {
     var parts = require('path').normalize(path).split(osSep);

     mode = mode || process.umask();
     position = position || 0;

     if (position >= parts.length) {
         return true;
     }

     var directory = parts.slice(0, position + 1).join(osSep) || osSep;
     try {
         fs.statSync(directory);
         mkdirSync_p(path, mode, position + 1);
     } catch (e) {
         try {
             mkdirSyncOrig(directory, mode);
             mkdirSync_p(path, mode, position + 1);
         } catch (e) {
             if (e.code != 'EEXIST') {
                 throw e;
             }
             mkdirSync_p(path, mode, position + 1);
         }
     }
 }

 function rmdirSync_p(path, position) {
    function iterator(path, dirs) {
        var stat = fs.statSync(path);
        if(stat.isDirectory()){
            dirs.unshift(path);//收集目录
            var arr = fs.readdirSync(path);
            for(var i = 0, el; el = arr[i++];){
                iterator(path + osSep + el, dirs);
            }
        }else if(stat.isFile()){
            fs.unlinkSync(path);//直接删除文件
        }
    }

    var dirs = [];

    try{
        iterator(path,dirs);
        for(var i = 0, el ; el = dirs[i++];){
            fs.rmdirSync(el);
        }
    }catch(e){
        if (e.code != "ENOENT") {
            throw e;
        }
    }

 }

 function renameSync_p(oldPath, newPath, mode, position) {
     var parts = require('path').normalize(newPath).split(osSep);

     mode = mode || process.umask();
     position = position || 0;

     if (position >= parts.length) {
         return true;
     }

     var directory = parts.slice(0, position + 1).join(osSep) || osSep;
     try {
        renameSyncOrig(oldPath, newPath);
     } catch (e) {
         try {
             mkdirSyncOrig(directory);
             renameSync_p(oldPath, newPath, mode, position + 1);
         } catch (e) {
             if (e.code != 'EEXIST') {
                 throw e;
             }
             renameSync_p(oldPath, newPath, mode, position + 1);
         }
     }
 }
    
 function symlinkSync_p(srcPath, dstPath, mode, position) {
     var parts = require('path').normalize(dstPath).split(osSep);

     mode = mode || process.umask();
     position = position || 0;

     if (position >= parts.length) {
         return true;
     }

     var directory = parts.slice(0, position + 1).join(osSep) || osSep;
     try {
         fs.statSync(directory);
         symlinkSyncOrig(srcPath, dstPath);
     } catch (e) {
         try {
             mkdirSyncOrig(directory);
             symlinkSync_p(srcPath, dstPath, mode, position + 1);
         } catch (e) {
             if (e.code != 'EEXIST') {
                 throw e;
             }
             symlinkSync_p(srcPath, dstPath, mode, position + 1);
         }
     }
 }

 /**
  * Polymorphic approach to fs.mkdir()
  *
  * If the third parameter is boolean and true assume that
  * caller wants recursive operation.
  */
 fs.mkdir = function (path, mode, recursive, callback) {
     if (typeof recursive !== 'boolean') {
         callback = recursive;
         recursive = false;
     }

     if (typeof callback !== 'function') {
         callback = function () {};
     }

     if (!recursive) {
         mkdirOrig(path, mode, callback);
     } else {
         mkdir_p(path, mode, callback);
     }
 }

 /**
  * Polymorphic approach to fs.mkdirSync()
  *
  * If the third parameter is boolean and true assume that
  * caller wants recursive operation.
  */
 fs.mkdirSync = function (path, mode, recursive) {
     if (typeof recursive !== 'boolean') {
         recursive = false;
     }

     if (!recursive) {
         mkdirSyncOrig(path, mode);
     } else {
         mkdirSync_p(path, mode);
     }
 }

 /**
  * Polymorphic approach to fs.renameSync()
  *
  * If the third parameter is boolean and true assume that
  * caller wants recursive operation.
  */
 fs.renameSync = function(oldPath, newPath, recursive, mode) {
      if (typeof recursive !== 'boolean') {
         recursive = false;
     }

     if (!recursive) {
         renameSyncOrig(oldPath, newPath);
     } else {
         renameSync_p(oldPath, newPath, mode);
     }

 }
 /**
  * Polymorphic approach to fs.symlinkSync()
  *
  * If the third parameter is boolean and true assume that
  * caller wants recursive operation.
  */
 fs.symlinkSync = function(srcPath, dstPath, recursive, mode) {
     if (typeof recursive !== 'boolean') {
         recursive = false;
     }

     if (!recursive) {
         symlinkSyncOrig(srcPath, dstPath);
     } else {
         symlinkSync_p(srcPath, dstPath, mode);
     }

 }

 /**
  * Polymorphic approach to fs.rmdirSync()
  *
  * If the third parameter is boolean and true assume that
  * caller wants recursive operation.
  */
 fs.rmdirSync = function(path, recursive) {
     if (typeof recursive !== 'boolean') {
         recursive = false;
     }

     if (!recursive) {
         rmdirSyncOrig(path);
     } else {
         rmdirSync_p(path);
     }
 }


 module.exports = fs;
}());
