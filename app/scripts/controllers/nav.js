'use strict';

angular.module('yololiumApp')
  .controller('NavController', [
    '$scope'
  , '$http'
  , 'LdsApiConfig'
  , 'LdsApiSession'
  , 'LdsApiRequest'
  , function ($scope, $http, LdsApiConfig, LdsApiSession, LdsApiRequest) {
    var scope = this;

    function init(session) {
      if (!session || session.message) {
        scope.session = null;
        scope.account = null;
        scope.accounts = null;
        return;
      }

      scope.session = session;
      scope.accounts = session.accounts;
      scope.account = LdsApiSession.account(session);

      return;

      return LdsApiRequest.accounts(session).then(function (accounts) {
        if (!accounts.length) {
          throw new Error("0 length accounts array");
        }

        scope.accounts = accounts;
        // TODO some method of getting the selected account
      }, function (err) {
        console.error(err);
        console.warn(err.stack);
        throw new Error("Has session, but could not retrieve accounts."
          + " TODO: delete session and try again."
          + " [error]" + err.message
        );
      });
    }

    scope.showLoginModal = function () {
      // TODO profile manager
      return LdsApiSession.openAuthorizationDialog();
    };

    scope.logout = function () {
      // TODO which token(s) to destroy?
      return LdsApiSession.logout();
    };

    LdsApiSession.checkSession().then(init, init).catch(init);
    LdsApiSession.onLogin($scope, init);
    LdsApiSession.onLogout($scope, init);
  }]);
