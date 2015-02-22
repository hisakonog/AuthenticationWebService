#!/bin/bash
function coloredEcho(){
  local exp=$1;
  local color=$2;
  if ! [[ $color =~ '^[0-9]$' ]] ; then
   case $(echo $color | tr '[:upper:]' '[:lower:]') in
    black) color=0 ;;
red) color=1 ;;
green) color=2 ;;
yellow) color=3 ;;
blue) color=4 ;;
magenta) color=5 ;;
cyan) color=6 ;;
        white|*) color=7 ;; # white or invalid color
esac
fi
tput setaf $color;
echo $exp;
tput sgr0;
}


TESTCOUNT=0;
TESTFAILED=0;
TESTSFAILEDSTRING="";
TESTPASSED=0;
TESTCOUNTEXPECTED=21;

# Production server is using http behind nginx
SERVER="https://localhost:3183";
if [ "$NODE_DEPLOY_TARGET" == "production" ]; then
  SERVER="http://localhost:3183";
  echo ""
  echo "Using $SERVER"
else
  echo ""
  echo "Using $SERVER"
fi

echo ""
echo "It should accept login"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme"}' \
$SERVER/login `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept login"
 }
fi 
if [[ $result =~ "\"lastname\": \"\"" ]]
  then {
    echo "Details recieved, you can use this user object in your app settings for this user."
  } else  {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should return user details upon successful login"
 }
fi 

echo ""
echo "It should count down the password reset"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "opps"}' \
$SERVER/login `"
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "wrongpassword"}' \
$SERVER/login `"
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "again"}' \
$SERVER/login `"
echo ""
if [[ $result =~ "You have 2 more attempts"  ]]
  then {
    echo "Response: $result";
  } else {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should count down the password reset"
 }
fi


echo ""
echo "It should count down the password reset"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "trying"}' \
$SERVER/login `"
echo ""
if [[ $result =~ "You have 1 more attempts"  ]]
  then {
    echo "Response: $result";
  } else {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should count down the password reset"
 }
fi

echo ""
echo "It should count down the password reset"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "wrongpassword"}' \
$SERVER/login `"
echo ""
if [[ $result =~ "You have tried to log in"  ]]
  then {
    echo "Response: $result";
  } else {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should count down the password reset"
 }
fi

echo ""
echo "It should refuse to register existing names"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme"}' \
$SERVER/register `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo " server refused, thats good."
  } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should refuse to register existing names"
  }
fi 

echo ""
echo "It should refuse to register short usernames"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "ba", "password": "phoneme"}' \
$SERVER/register `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo " server refused, thats good."
  } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should refuse to register short usernames"
  }
fi 

echo ""
echo "It should accept changepassword"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme", "newpassword": "phoneme", "confirmpassword": "phoneme"}' \
$SERVER/changepassword `"
echo ""
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo "Response: $result";
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept changepassword"
  }
fi 

echo ""
echo "It should refuse to changepassword if the new password is missing"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme"}' \
$SERVER/changepassword `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo " server refused, thats good."
  } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should refuse to changepassword if the new password is missing"
  }
fi 

echo ""
echo "It should refuse to changepassword if the confirm password doesnt match"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme", "newpassword": "phoneme", "confirmpassword": "phonem"}' \
$SERVER/changepassword `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo " server refused, thats good."
  } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should refuse to changepassword if the confirm password doesnt match"
  }
fi 

echo ""
echo "It should refuse forgotpassword if the user hasnt tried to login (ie doesnt know thier username)"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"email": "myemail@example.com"}' \
$SERVER/forgotpassword `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {  
  echo "server refused, this is good."
} else {
  TESTFAILED=$[TESTFAILED + 1]
  TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should refuse forgotpassword if the user hasnt tried to login (ie doesnt know thier username)"
}
fi 


echo ""
echo "It should accept forgotpassword"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testinguserwithemail", "password": "opps"}' \
$SERVER/login `"
echo ""
echo "Response: $result";
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"email": "myemail@example.com"}' \
$SERVER/forgotpassword `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept forgotpassword"
  }
fi 

echo ""
echo "It should refuse to send a password reset if neither email nor username was provided"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{}' \
$SERVER/forgotpassword `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo " server refused, thats good."
  } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should refuse to send a password reset if neither email nor username was provided"
  }
fi 

echo ""
echo "It should refuse to tell a corpusteam details if the username is not a valid user "
echo ""
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testingspreadsheet",  "couchConnection": {"pouchname": "jenkins-firstcorpus"} }' \
$SERVER/corpusteam `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo "server refused, this is good."
  } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept corpusteam from the spreadsheet app"
  }
fi 

echo ""
echo "It should refuse to tell a corpusteam details if the username is not a valid user and on that team. eg: "
echo ""
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "testingspreadsheet", "password": "test", "couchConnection": {"pouchname": "jenkins-firstcorpus"} }' \
$SERVER/corpusteam `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo "server refused, this is good."
  } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should refuse to tell a corpusteam details if the username is not a valid user and on that team."
  }
fi 

echo ""
echo "It should accept corpusteam from the backbone app. eg: "
echo '  //Send username to limit the requests so only valid users can get a user list'
echo '  dataToPost.username = this.get("userPrivate").get("username");'
echo '  dataToPost.couchConnection = window.app.get("corpus").get("couchConnection");'
echo ""
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme", "couchConnection": {"pouchname": "jenkins-firstcorpus"} }' \
$SERVER/corpusteam `"
echo ""
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo "Response: $result";
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should reply with corpusteam details for backbone"
  } else {
    if [[ $result =~ readers ]]
      then {
        echo "Response: $result" | grep -C 4 readers;
        echo " server replied with team details to a prototype-like request."
      } else {
        TESTFAILED=$[TESTFAILED + 1]
        TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should reply with corpusteam details for backbone"
      }
    fi 
  }
fi 

echo ""
echo "It should accept corpusteam requests from the spreadsheet app. eg: "
echo ' dataToPost.username = $rootScope.loginInfo.username;'
echo ' dataToPost.password = $rootScope.loginInfo.password;'
echo ' dataToPost.serverCode = $rootScope.serverCode;'
echo ' dataToPost.authUrl = Servers.getServiceUrl($rootScope.serverCode, "auth");'
echo ' dataToPost.pouchname = $rootScope.corpus.pouchname;'
echo ""
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme", "serverCode": "localhost", "pouchname": "jenkins-firstcorpus"}' \
$SERVER/corpusteam `"
echo ""
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo "Response: $result";
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept corpusteam from the spreadsheet app"
  } else {
    if [[ $result =~ readers ]]
      then {
        echo "Response: $result" | grep -C 4 readers;
        echo " server replied with team details to a spreadsheet-like request"
      } else {
        TESTFAILED=$[TESTFAILED + 1]
        TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should reply with corpus team details"
      }
    fi 
  }
fi 

echo ""
echo "It should refuse to addroletouser if the corpus is missing"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme" }' \
$SERVER/addroletouser `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo "sever refused, this is good."
  } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should refuse to addroletouser if the corpus is missing"
  }
fi 

echo ""
echo "It should accept addroletouser from the backbone app. eg: "
echo '  //Send username to limit the requests so only valid users can get a user list'
echo '  dataToPost.username = this.get("userPrivate").get("username");'
echo '  dataToPost.couchConnection = window.app.get("corpus").get("couchConnection");'
echo ""
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme", "userToAddToRole": "testingprototype", "roles": ["reader","commenter"], "couchConnection": {"pouchname": "jenkins-firstcorpus"} }' \
$SERVER/addroletouser `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept addroletouser from the backbone app"
  } else {
    if [[ $result =~ "Added role(s) to user" ]]
      then {
        echo "Response: $result" | grep -C 4 readers;
        echo " server replied with addroletouser details to a prototype-like request."
      } else {
        TESTFAILED=$[TESTFAILED + 1]
        TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should reply with addroletouser team details for backbone"
      }
    fi 
  }
fi 


echo ""
echo "It should refuse newcorpus if the title is not specified"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme"}' \
$SERVER/newcorpus `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    echo "sever refused, this is good."
  } else {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should refuse newcorpus if the title is not specified"
  }
fi 

echo ""
echo "It should not complain if users tries to recreate a newcorpus"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme", "newCorpusName": "My new corpus title"}' \
$SERVER/newcorpus `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
   echo "server replied with user friendly errors, which is okay"
   } else {
    if [[ $result =~ 302 ]]
      then {
        echo "Response: $result" | grep -C 2 my_new_corpus_title;
        echo " server replied with a 302 status saying it existed."
      } else {
        TESTFAILED=$[TESTFAILED + 1]
        TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should reply with a 302 status code"
      }
    fi 
  }
fi 

echo ""
echo "It should accept deprecated updateroles and run addroletouser (from the spreadsheet app eg)"
echo 'file://angular_client/modules/spreadsheet/app/scripts/controllers/SpreadsheetController.js '
echo '      dataToPost.userRoleInfo = {};'
echo '      dataToPost.userRoleInfo.usernameToModify = userid;'
echo '      dataToPost.userRoleInfo.pouchname = $rootScope.corpus.pouchname;'
echo '      //dataToPost.userRoleInfo.removeUser = true;'
echo '      switch (newUserRoles.role) {'
# echo '      /*'
# echo '            NOTE THESE ROLES are not accurate reflections of the db roles,'
# echo '            they are a simplification which assumes the'
# echo '            admin -> writer -> commenter -> reader type of system.'
# echo ''
# echo '            Infact some users (technical support or project coordinators) might be only admin,'
# echo '            and some experiment participants might be only writers and'
# echo '            cant see each others data.'
# echo ''
# echo '            Probably the clients wanted the spreadsheet roles to appear implicative since its more common.'
# echo '            see https://github.com/OpenSourceFieldlinguistics/FieldDB/issues/1113'
# echo '          */'
# echo '      case "admin":'
# echo '        newUserRoles.admin = true;'
# echo '        newUserRoles.reader = true;'
# echo '        newUserRoles.commenter = true;'
# echo '        newUserRoles.writer = true;'
# echo '        rolesString += " Admin";'
# echo '        break;'
# echo '      case "read_write":'
# echo '        newUserRoles.admin = false;'
# echo '        newUserRoles.reader = true;'
# echo '        newUserRoles.commenter = true;'
# echo '        newUserRoles.writer = true;'
# echo '        rolesString += " Writer Reader";'
# echo '        break;'
# echo '      case "read_only":'
# echo '        newUserRoles.admin = false;'
# echo '        newUserRoles.reader = true;'
# echo '        newUserRoles.commenter = false;'
# echo '        newUserRoles.writer = false;'
# echo '        rolesString += " Reader";'
# echo '        break;'
# echo '      case "read_comment_only":'
# echo '        newUserRoles.admin = false;'
# echo '        newUserRoles.reader = true;'
# echo '        newUserRoles.commenter = true;'
# echo '        newUserRoles.writer = false;'
# echo '        rolesString += " Reader Commenter";'
# echo '        break;'
# echo '      case "write_only":'
echo '        newUserRoles.admin = false;'
echo '        newUserRoles.reader = false;'
echo '        newUserRoles.commenter = true;'
echo '        newUserRoles.writer = true;'
echo '        rolesString += " Writer";'
# echo '        break;'
# echo '    }'
echo ''
echo '    newUserRoles.pouchname = $rootScope.corpus.pouchname;'
echo ''
echo '    var dataToPost = {};'
echo '    dataToPost.username = $rootScope.user.username.trim();'
echo '    dataToPost.password = $rootScope.loginInfo.password.trim();'
echo '    dataToPost.serverCode = $rootScope.serverCode;'
echo '    dataToPost.authUrl = Servers.getServiceUrl($rootScope.serverCode, "auth");'
echo ''
echo '    dataToPost.userRoleInfo = newUserRoles;'
echo '    '
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme", "serverCode": "localhost", "userRoleInfo": {"usernameToModify": "testingprototype", "pouchname": "jenkins-firstcorpus", "admin": false, "writer": true, "reader": true, "commenter": true }}' \
$SERVER/updateroles `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept deprecated updateroles and run addroletouser"
  }
fi 

echo;
echo;
echo ""
echo "Result";
echo;

TESTPASSED=$((TESTCOUNT-TESTFAILED));
if [ $TESTPASSED = $TESTCOUNT ]; then
 coloredEcho  "$TESTPASSED passed of $TESTCOUNT" green
else
  coloredEcho  "$TESTPASSED passed of $TESTCOUNT" red
  coloredEcho  " $TESTFAILED failed" red
  coloredEcho " $TESTSFAILEDSTRING" red
fi

if [ $TESTCOUNT = $TESTCOUNTEXPECTED ]; then
 coloredEcho  "Ran $TESTCOUNT of $TESTCOUNTEXPECTED expected" green
else
	coloredEcho  "Ran $TESTCOUNT of $TESTCOUNTEXPECTED expected" yellow
fi


# ls noqata_tusunayawami.mp3 || {
# 	result="`curl -O --retry 999 --retry-max-time 0 -C - https://github.com/OpenSourceFieldlinguistics/FieldDB/blob/master/sample_data/noqata_tusunayawami.mp3?raw=true
# 	mv "noqata_tusunayawami.mp3?raw=true" noqata_tusunayawami.mp3
# }

# 15602
