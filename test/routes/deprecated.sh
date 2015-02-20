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
TESTCOUNTEXPECTED=8;

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
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
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
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept corpusteam from the spreadsheet app"
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
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept corpusteam from the spreadsheet app"
  } else {
    if [[ $result =~ readers ]]
      then {
        echo "Response: $result" | grep -C 4 readers;
        echo " server replied with team details to a prototype-like request."
      } else {
        TESTFAILED=$[TESTFAILED + 1]
        TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should reply with corpus team details"
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
        echo " server replied with team details a spreadsheet-like request"
      } else {
        TESTFAILED=$[TESTFAILED + 1]
        TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should reply with corpus team details"
      }
    fi 
  }
fi 

echo ""
echo "It should accept addroletouser"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
$SERVER/addroletouser `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept addroletouser"
  }
fi 

echo ""
echo "It should accept newcorpus"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-H "Content-Type: application/json" \
-d '{"username": "jenkins", "password": "phoneme"}' \
$SERVER/newcorpus `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept newcorpus"
  }
fi 

echo ""
echo "It should accept updateroles"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
$SERVER/updateroles `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept updateroles"
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
