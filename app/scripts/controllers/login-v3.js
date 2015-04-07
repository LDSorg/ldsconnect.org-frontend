'use strict';

angular.module('yololiumApp')
  .controller('LoginController3', [
    '$scope'
  , '$q'
  , '$timeout'
  , '$modalInstance'
  , 'LdsApiSession'
  , 'LdsApiRequest'
  , 'myLoginOptions'
  , function (
      $scope
    , $q
    , $timeout
    , $modalInstance
    , LdsApiSession
    , LdsApiRequest
    , opts
    ) {
    opts = opts || {};
    var scope = this;
    var secretMinLen = LdsApiSession.secretMinLength;
    var usernameMinLen = LdsApiSession.usernameMinLength;
    var mySession;

    scope.delta = { localLogin: {} };

    scope.loginStrategies = [
      { label: 'Facebook'
      , name: 'facebook'
      , faImage: ""
      , faClass: "fa-facebook"
      , btnClass: "btn-facebook"
      , login: function () {
          return LdsApiSession.logins.authorizationRedirect({
            providerUri: 'facebook.com'
          , scope: ['email'] 
          , redirectUri: 'https://beta.ldsconnect.org/oauth3.html'
          , popup: true
          });
        }
      }
    , { label: 'Google+'
      , name: 'google'
      , faImage: ""
      , faClass: "fa-google-plus"
      , btnClass: "btn-google-plus"
      , login: function () {
          return LdsApiSession.authorizationRedirect({
            providerUri: 'google.com'
          //, scope: ['login']
          });
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
      return LdsApiRequest.profile(ldsSession).then(function (profile) {
        return LdsApiRequest.ward(profile.homeStakeId, profile.homeWardId).then(function (ward) {
          throw new Error("not implemented");
        });
      });
    }

    function onSocialLogin(session) {
      return LdsApiRequest.getToken().then(function () {
        throw new Error("not implemented");
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
        // ALL THE SCOPES!!!
        scope.formState = 'authenticating';
        return LdsApiSession.logins.resourceOwnerPassword(nodeObj.node, nodeObj.secret, '*').then(function (session) {
          // TODO if there is not a default account, show user-switching screen
          $modalInstance.close(session);
        }, function (err) {
          if (!err.message) {
            throw err;
          }

          scope.formState = 'login';

          // TODO fix server err.message / err.code
          scope.flashMessage = err.code || err.message;
          scope.flashMessageClass = "alert-warning";
        }).catch(function (err) {
          scope.formState = 'login';

          console.error('[Uknown Error] resource owner password login');
          console.warn(err);
          scope.flashMessage = err.code || err.message || err || '[Uknown Error] could not log in';
          scope.flashMessageClass = "alert-danger";
        });
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
        }, function (err) {
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
    LdsApiSession.onLogin($scope, onLdsLogin);
    LdsApiSession.onLogout($scope, onLogout);
    LdsApiSession.checkSession().then(onLdsLogin, onLogout);
  }]);
