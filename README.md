#What is mass for
Mass is a simple tool for deploying web evnrionment. In case you are using svn for repository. Mostly for testing evnrionment.
If your deployment have more than one project, mass will help a lot.

##Configure file
'svn.username' & 'svn.password' must be given to checkout and update svn working copy.

Each project should assign a 'svn_url'.

You can assign your project config file or config folders in 'shared', must be separated by space.

- **Example**: etc/config.json

```javascript
{
    "http" : {                                                                                                                                                 
        "host" : "127.0.0.1",
        "port" : "8124"
    },  
    "svn" : { 
        "username" : "svnuser",
        "password" : "svnpass"
    },  
    "env" : { 
        "svn_root" : "/opt/svn", 
        "web_root" : "/opt/web"
    },  
    "project" : { 
        "project1" : { 
            "name" : "project1",
            "description" : "test project1",
            "svn_url" : "svn://svn_url/project1/trunk",
            "shared" : "config.php setting/setting.php"
            },  
        "project2" : { 
            "name" : "project2",
            "description" : "test project2",
            "svn_url" : "svn://svn_url/project2/trunk",
            "shared" : "config.php setting/setting.php"
            }   

    }   
}
```

##How to deploy your project
        bin/mass deploy --project project1
        
Update your new configuration
        bin/mass share --project project1
        
##How to run mass server
        bin/server start &
Now, by default, visit http://127.0.0.1:8124. You can see the project list that configed.
Click to update the latest version.

To restart server
        bin/server restart &
        
To stop server
        bin/server stop &
        
    
Have fun & good day.

