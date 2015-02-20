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
TESTCOUNTEXPECTED=5;

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
-d '{}' \
$SERVER/login `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
   TESTFAILED=$[TESTFAILED + 1]
   TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept login"
 }
fi 

echo ""
echo "It should accept register"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-d '{}' \
$SERVER/register `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept register"
  }
fi 

echo ""
echo "It should accept changepassword"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-d '{}' \
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
echo "It should accept corpusteam"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-d '{}' \
$SERVER/corpusteam `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept corpusteam"
  }
fi 


echo ""
echo "It should accept newcorpus"
TESTCOUNT=$[TESTCOUNT + 1]
result="`curl -kX POST \
-d '{}' \
$SERVER/newcorpus `"
echo ""
echo "Response: $result";
if [[ $result =~ userFriendlyErrors ]]
  then {
    TESTFAILED=$[TESTFAILED + 1]
    TESTSFAILEDSTRING="$TESTSFAILEDSTRING : It should accept newcorpus"
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
  coloredEcho  " $TESTFAILED tests failed" red
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
