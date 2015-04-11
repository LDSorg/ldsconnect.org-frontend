#!/bin/bash
set -e
set -u

LDS_MIN_BACKEND="ldsconnect-static-backend"
echo "Cloning Frontend-Developer Backend (very minimal)..."
git clone https://github.com/LDSorg/backend-oauth2-node-passport-example.git \
  ${LDS_MIN_BACKEND} \
  > /dev/null
pushd ${LDS_MIN_BACKEND}

echo "Installing NPMs (this will take several seconds, maybe a minute)..."
npm install --loglevel silent
npm install --loglevel silent -g less jade watch-lessc

echo "Cloning Developer HTTPS Certificates..."
git clone https://github.com/LDSorg/local.ldsconnect.org-certificates.git \
  ./certs \
  > /dev/null
tree -I .git ./certs

echo "Cloning the Frontend, Creating ./public link and sample app/scripts/client-config.js"
git clone https://github.com/LDSorg/ldsconnect.org-frontend.git \
  ./frontend \
  > /dev/null
rsync -av frontend/app/scripts/client-config.sample.js frontend/app/scripts/client-config.js
ln -s 'frontend/app' ./public

echo "Installing NPMs (this will take several seconds, maybe a minute)..."
pushd frontend
bower install --silent > /dev/null
jade app/views/*.jade
popd


echo ""
echo ""
echo "###############################################"
echo "#                                             #"
echo "#   READY! Here's what you need to do next:   #"
echo "#                                             #"
echo "###############################################"
echo ""
echo ""

echo "(optional) Open up a new tab and watch the jade files like so:"
echo ""
echo "    pushd $(pwd)"
echo "    jade -w ./public/views/*.jade"
echo ""
echo ""

echo "(optional) Open up a new tab and watch the less file like so:"
echo ""
echo "    pushd $(pwd)"
echo "    watch-lessc -i ./public/styles/main.less -o ./public/styles/main.css"
echo ""
echo ""

echo "1. Open up yet another new TERMINAL tab and run the server like so:"
echo ""
echo "    pushd" "$(pwd)"
echo "    node ./serve.js"
echo ""
echo ""

echo "2. Open up your WEB BROWSER and fire it up to the project:"
echo ""
echo "    https://local.ldsconnect.org:8043"
echo ""
echo ""

echo "3. Then open up the JAVASCRIPT CONSOLE and set the backend to lds.io:"
echo ""
echo "    LdsIo.storage.set('providerUrl', 'https://lds.io');"
echo "    LdsIo.storage.set('realProviderUrl', 'https://local.ldsconnect.org');"
echo ""
echo ""
