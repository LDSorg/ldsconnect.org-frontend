'use strict';

angular.module('yololiumApp')
  .controller('MyAccountController', [
    '$scope'
  , '$location'
  , '$http'
  , 'LdsApiConfig'
  , 'LdsApiSession'
  , 'LdsApiRequest'
  , function ($scope, $location, $http, LdsApiConfig, LdsApiSession, LdsApiRequest) {
    var scope = this;

    function init(session) {
      if (!session || session.message) {
        scope.session = null;
        scope.account = null;
        scope.accounts = null;
        $location.url('/');
        return;
      }

      scope.session = session;
      scope.accounts = session.accounts;
      scope.account = LdsApiSession.account(session);

      console.log('session', session);
      return LdsApiRequest.profile(session).then(function (profile) {
        console.log('profile', profile);
        return LdsApiRequest.ward(session, profile.homeStakeAppScopedId, profile.homeWardAppScopedId).then(function (ward) {
          console.log('ward', ward);
        });
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
