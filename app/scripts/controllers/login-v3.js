'use strict';

angular.module('yololiumApp')
  .controller('LoginController3', [
    '$scope'
  , '$q'
  , '$timeout'
  , '$modalInstance'
  , 'LdsApiSession'
  , 'LdsApiRequest'
  , 'LdsAccount'
  , 'myLoginOptions'
  , function (
      $scope
    , $q
    , $timeout
    , $modalInstance
    , LdsApiSession
    , LdsApiRequest
    , LdsAccount
    , opts
    ) {
    opts = opts || {};
    var scope = this;
    var secretMinLen = LdsApiSession.secretMinLength;
    //var usernameMinLen = LdsApiSession.usernameMinLength;
    var mySession;

    scope.hideSocial = opts.hideSocial;
    scope.flashMessage = opts.flashMessage;
    scope.flashMessageClass = opts.flashMessageClass;

    scope.delta = { localLogin: {} };

    function handleSuccess(session) {
      LdsApiSession.requireAccount(session).then(onLdsLogin, function (err) {
        if ('E_NO_LDSACCOUNT' !== err.code) {
          throw err;
        }

        scope.hideSocial = true;
        scope.flashMessage = err.message;
        scope.flashMessageClass = "alert-warning";
      }).catch(handleLoginException);
    }

    scope.loginStrategies = [
      { label: 'Facebook'
      , name: 'facebook'
      , faImage: ""
      , faClass: "fa-facebook"
      , btnClass: "btn-facebook"
      , login: function () {
          return LdsApiSession.logins.authorizationRedirect({
            providerUri: 'facebook.com'
          , scope: [ 'email' ] 
          , redirectUri: 'https://beta.ldsconnect.org/oauth3.html'
          , popup: true
          }).then(handleSuccess, handleLoginError).catch(handleLoginException);
        }
      }
    , { label: 'Google+'
      , name: 'google'
      , faImage: ""
      , faClass: "fa-google-plus"
      , btnClass: "btn-google-plus"
      , login: function () {
          return LdsApiSession.logins.authorizationRedirect({
            providerUri: 'google.com'
          , scope: [ 'https://www.googleapis.com/auth/plus.login' ]
          , redirectUri: 'https://beta.ldsconnect.org/oauth3.html'
          , popup: true
          }).then(handleSuccess, handleLoginError).catch(handleLoginException);
        }
      }

    /*
    , { label: 'LDS.org Account'
      , faImage: "images/moroni-128px.png"
      , faClass: ""
      , btnClass: "openid"
      , login: scope.loginWithLdsconnect
      }
    */
    ];

    scope.hideSocial = opts.hideSocial;
    scope.flashMessage = opts.flashMessage;
    scope.flashMessageClass = opts.flashMessageClass;

    // This dialog is opened to update necessary account details
    // It should be passed options to inform the dialog which
    // missing fields are necessary to show at this time
    //
    // Examples:
    // we want to get facebook but haven't connected yet, so we should show the connection dialog
    // we just logged in for the first time and don't have an account or a local login
    function onLogout() {
      scope.session = null;
      scope.account = null;
      scope.accounts = null;
    }

    function onLdsLogin(ldsSession) {
      console.log('onLdsLogin');
      console.log(ldsSession);
      // TODO if there is not a default account, show user-switching screen
      // this will close both on user/pass and social login
      scope.flashMessage = "You've logged in. Please wait while we download some ward and stake data...";
      scope.flashMessageClass = 'alert-info';
      return LdsApiRequest.profile(ldsSession).then(function (profile) {
        console.log('profile');
        console.log(profile);
        return LdsAccount.verifyAccount(ldsSession, profile).then(function () {
          scope.flashMessage = "Done!";
          scope.flashMessageClass = 'alert-success';
          console.log('verifiedAccount');
          $modalInstance.close(ldsSession);
        });
      });
    }

    function onLogin(session) {
      // session is always ensured as part of login
      mySession = session;

      var defaultAction = '';
      var emails = [];

      scope.account = scope.account || mySession.account || {};
      if (scope.account.id) {
        defaultAction = 'update';
      }

      scope.formAction = scope.formAction || defaultAction;

      scope.account = scope.account || {};
      scope.delta = scope.delta || {};
      scope.deltaEmail = { type: 'email' };
      scope.deltaPhone = { type: 'phone' };
      scope.delta.localLogin = scope.delta.localLogin || {};
      scope.logins = mySession.logins.map(function (login) {
        return {
          comment: ('local' === (login.provider || login.type)) ? (login.uid || 'username') : login.provider
        , id: login.id
        , uid: login.uid
        , provider: login.provider
        , type: login.type
        , link: true
        };
      });

      mySession.logins.some(function (login) {
        if ('local' === (login.type || login.provider)) {
          scope.account.localLoginId = login.id;
          scope.delta.localLogin.id = login.id;
        }
      });

      // login is always ensured prior to account
      mySession.logins.forEach(function (l) {
        (l.emails||[]).forEach(function (email) {
          if (email && email.value) {
            emails.push(email);
          }
        });
      });
      
      // TODO combo box for creating new logins
      scope.emails = emails;
      scope.deltaEmail.node = (emails[0] || {}).value;

      if (!scope.deltaEmail.node) {
        mySession.logins.some(function (login) {
          scope.deltaEmail.node = (login.emails && login.emails[0] || {}).value;
          return scope.deltaEmail.node;
        });
      }

      /*
      if (mySession.logins.length) {
        scope.formAction = 'create';
      }
      */

      // TODO check mySession
      if (mySession.logins.length >= 2) {
        scope.recoverable = true;
      }
    }

    scope.checkSecret = function (nodeObj) {
      var len = (nodeObj.secret||'').length;
      var meetsLen = (len >= secretMinLen);

      if (meetsLen) {
        nodeObj.secretMessage = 'Login when ready, captain!';
        return;
      }

      nodeObj.secretMessage = 'Passphrase is too short '
        + len + '/' + secretMinLen 
        + ' (needs to be ' + secretMinLen + '+ characters)'
        ;
    };

    function handleLoginError(err) {
      console.error('handleLoginError');
      console.error(err);
      console.warn(err.stack);
      if (!err.message) {
        throw err;
      }

      scope.formState = 'login';

      // TODO fix server err.message / err.code
      scope.flashMessage = err.code || err.message;
      scope.flashMessageClass = "alert-warning";

      throw err;
    }

    function handleLoginException(err) {
      scope.formState = 'login';

      console.error("[Uknown Error] Either 'resource owner password' or 'delegated' login");
      console.warn(err);
      scope.flashMessage = err.code || err.message || err || '[Uknown Error] could not log in';
      scope.flashMessageClass = "alert-danger";
    }

    scope.submitLogin = function (nodeObj) {
      var promise;
      scope.flashMessage = "";
      scope.flashMessageClass = "alert-danger";

      if (scope._loginPromise) {
        promise = scope._loginPromise;
      } else {
        promise = $q.when();
      }

      return promise.then(function () {
        // TODO change the state to authenticating for social logins as well
        scope.formState = 'authenticating';
        // ALL THE SCOPES!!!
        return LdsApiSession.logins.resourceOwnerPassword(nodeObj.node, nodeObj.secret, '*').then(function (session) {
          return LdsApiSession.requireAccount(session).then(onLdsLogin);
        }, handleLoginError).catch(handleLoginException);
      });
    };

    scope.checkLdsLogin = function (nodeObj) {
      var username;
      var myPromise;
      var nameError;

      scope.formState = 'login';
      nodeObj.claimable = false;
      nodeObj.message = '';
      scope.flashMessage = '';
      scope.flashMessageClass = "alert-warning";
      username = nodeObj.node;

      $timeout.cancel(scope._loginTimeout);

      if (!username || 'null' === username || 'undefined' === username) {
        myPromise = false;
        scope.formState = 'invalid';
        nodeObj.message = '';
        return;
      }

      // returns true or error object
      nameError = LdsApiSession.validateUsername(nodeObj.node);
      if (nameError.message) {
        myPromise = false;
        scope.formState = 'invalid';
        nodeObj.message = nameError.message;
        return;
      }

      nodeObj.message = 'Checking username...';
      myPromise = scope._loginTimeout = $timeout(function () {
        scope._loginPromise = LdsApiSession.checkUsername(nodeObj.node).then(function () {
          myPromise = false;
          nodeObj.message = "'" + username + "' is already registered."
            + ' Welcome back!'
            ;
          scope.formState = 'login';
        }, function () {
          // TODO test that error is simply not exists
          // and not a server error
          if (myPromise !== scope._loginTimeout) {
            return;
          }

          scope.formState = 'create';
          nodeObj.message = "'" + username + "' is available!";
        }).catch(function (err) {
          nodeObj.message = '';

          scope.formState = 'login';
          scope.flashMessage = "[Uknown Error] " + err.message
            + " (might need to wait a minute and try again)";
          scope.flashMessageClass = "alert-danger";
          throw err;
        });
      }, 250);

      return scope._loginTimeout;
    };

    //
    // Begin
    //
    //LdsApiSession.onLogin($scope, onLdsLogin);
    LdsApiSession.onLogout($scope, onLogout);
    //LdsApiSession.checkSession().then(onLdsLogin, onLogout);
    if (false) {
      // prevent lint warnings until I figure out how I'll use this
      onLogin();
    }
  }]);
