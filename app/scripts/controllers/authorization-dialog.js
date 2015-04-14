'use strict';

/**
 * @ngdoc function
 * @name yololiumApp.controller:OauthCtrl
 * @description
 * # OauthCtrl
 * Controller of the yololiumApp
 */
angular.module('yololiumApp')
  .controller('AuthorizationDialogController', [ 
    '$window'
  , '$location'
  , '$stateParams'
  , '$q'
  , '$timeout'
  , '$scope'
  , '$http'
  , 'LdsApiConfig'
  , 'LdsApiSession'
  , 'LdsApiRequest'
  , function (
      $window
    , $location
    , $stateParams
    , $q
    , $timeout
    , $scope
    , $http
    , LdsApiConfig
    , LdsApiSession
    , LdsApiRequest
    ) {

    var scope = this;

    function isIframe () {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    }

    // TODO move into config
    var scopeMessages = {
      directories: "View Stake and Ward Directories"
    , me: "View your own LDS Account"
    , '*': "Use the Full Developer API"
    };

    function updateAccepted() {
      scope.acceptedString = scope.pendingScope.filter(function (obj) {
        return obj.acceptable && obj.accepted;
      }).map(function (obj) {
        return obj.value;
      }).join(' ');

      return scope.acceptedString;
    }

    function scopeStrToObj(value) {
      return {
        accepted: true
      , acceptable: !!scopeMessages[value]
      , name: scopeMessages[value] || 'Invalid Scope \'' + value + '\''
      , value: value
      };
    }

    function requestSelectedAccount(account) {
      return $http.get(
        LdsApiConfig.providerUri + '/api/oauth3'
          + '/scope/' + $stateParams.token
          + '?account=' +  account.accountId
      , { headers: { Authorization: "Bearer " + account.token } }
      ).then(function (resp) {
        if (!resp.data) {
          throw new Error("[Uknown Error] got no response (not even an error)");
        }

        if (resp.data.error) {
          console.error('[ldsconnect.org] [authorization-dialog] resp.data');
          console.log(resp.data);
          scope.error = resp.data.error;
          scope.rawResponse = resp.data;
          return $q.reject(new Error(resp.data.error.message));
        }

        if ('string' !== typeof resp.data.pendingString) {
          console.error('[ldsconnect.org] [authorization-dialog] resp.data (TODO look for redirect uri)');
          console.log(resp.data);
          scope.error = { message: "missing scope request" };
          scope.rawResponse = resp.data;

          return $q.reject(new Error(scope.error.message));
        }

        return resp.data;
      });
    }

    scope.chooseAccount = function (/*profile*/) {
      $window.alert("user switching not yet implemented");
    };
    scope.updateScope = function () {
      updateAccepted();
    };

    function getAccountPermissions(account) {
      return requestSelectedAccount(account).then(function (txdata) {
        scope.client = txdata.client;

        if (!scope.client.title) {
          scope.client.title = scope.client.name || 'Missing App Title';
        }

        scope.selectedAccountId = account.accountId;
        scope.transactionId = txdata.transactionId;
        // todo fix trimming on server
        scope.grantedString = (txdata.grantedString || '').trim();
        scope.grantedArr = scope.grantedString.split(/[\s,]+/);
        scope.requestedString = (txdata.requestedString || '').trim();
        scope.pendingString = (txdata.pendingString || '').trim();
        scope.pendingScope = [];

        scope.grantedScope = scope.grantedArr.filter(function (value) {
          return value;
        }).map(scopeStrToObj);
        if (scope.pendingString) {
          scope.pendingScope = txdata.pendingArr.filter(function (value) {
            if ('!' !== value) {
              return true;
            }
            // TODO fix server such that empty strings are not sent
            return value;
          }).map(scopeStrToObj);
        } else if (txdata.granted) {
          scope.hackFormSubmit({ allow: true });
        }

        if (scope.iframe && (!txdata.granted || scope.pendingString)) {
          scope.hackFormSubmit({ allow: false });
        }

        updateAccepted();

        return txdata;
      });
    }

    function redirectToFailure() {
      var redirectUri = $location.search().redirect_uri;

      var parser = document.createElement('a');
      parser.href = redirectUri;
      if (parser.search) {
        parser.search += '&';
      } else {
        parser.search += '?';
      }
      parser.search += 'error=E_NO_SESSION';
      redirectUri = parser.href;

      window.location.href = redirectUri;
    }

    function initAccount(session) {
      return LdsApiRequest.getAccountSummaries(session).then(function (accounts) {
        var account = LdsApiSession.selectAccount(session);
        var profile;

        scope.accounts = accounts.map(function (account) {
          return account.profile.me;
        });
        accounts.some(function (a) {
          if (LdsApiSession.getId(a) === LdsApiSession.getId(account)) {
            profile = a.profile;
            a.selected = true;
            return true;
          }
        });

        if (profile.me.photos[0]) {
          if (!profile.me.photos[0].appScopedId) {
            // TODO fix API to ensure corrent id
            profile.me.photos[0].appScopedId = profile.me.appScopedId || profile.me.app_scoped_id;
          }
        }
        profile.me.photo = profile.me.photos[0] && LdsApiRequest.photoUrl(account, profile.me.photos[0], 'medium');
        scope.account = profile.me;

        scope.token = $stateParams.token;

        /*
        scope.accounts.push({
          displayName: 'Login as a different user'
        , new: true
        });
        */

        //return determinePermissions(session, account);
        return getAccountPermissions(account).then(function () {
          // do nothing?
          scope.selectedAccount = session; //.account;
          scope.previousAccount = session; //.account;
          scope.updateScope();
        }, function (err) {
          if (/logged in/.test(err.message)) {
            return LdsApiSession.destroy().then(function () {
              init();
            });
          }

          if ('E_INVALID_TRANSACTION' === err.code) {
            window.alert(err.message);
            return;
          }

          console.warn("[ldsconnect.org] [authorization-dialog] ERROR somewhere in oauth process");
          console.warn(err);
          window.alert(err.message);
        });
      });
    }

    function init() {
      scope.iframe = isIframe();

      if (scope.iframe) {
        return LdsApiSession.checkSession().then(function (session) {
          if (session.accounts.length) {
            // TODO make sure this fails / notifies
            return initAccount(session);
          } else {
            // TODO also notify to bring to front
            redirectToFailure();
          }
        });
      }

      // session means both login(s) and account(s)
      return LdsApiSession.requireSession(
        // role
        null
        // TODO login opts (these are hypothetical)
      , { close: false
        , options: ['login', 'create']
        , default: 'login'
        }
        // TODO account opts
      , { verify: ['email', 'phone']
        }
      ).then(initAccount);
    }

    init();

    // I couldn't figure out how to get angular to bubble the event
    // and the oauth2orize framework didn't seem to work with json form uploads
    // so I dropped down to quick'n'dirty jQuery to get it all to work
    scope.hackFormSubmit = function (opts) {
      scope.submitting = true;
      scope.cancelHack = !opts.allow;
      scope.authorizationDecisionUri = LdsApiConfig.providerUri + '/api/oauth3/authorization_decision';
      $window.jQuery('form.js-hack-hidden-form').attr('action', scope.authorizationDecisionUri);

      // give time for the apply to take place
      $timeout(function () {
        $window.jQuery('form.js-hack-hidden-form').submit();
      }, 50);
    };
    scope.allowHack = function () {
      scope.hackFormSubmit({ allow: true });
    };
    scope.rejectHack = function () {
      scope.hackFormSubmit({ allow: false });
    };
  }]);
