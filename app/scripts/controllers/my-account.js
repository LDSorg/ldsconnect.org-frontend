'use strict';

angular.module('yololiumApp')
  .controller('MyAccountController', [
    '$scope'
  , '$location'
  , '$http'
  , 'LdsApiConfig'
  , 'LdsApiSession'
  , 'LdsApiRequest'
  , 'LdsAccount'
  , function ($scope, $location, $http, LdsApiConfig, LdsApiSession, LdsApiRequest, LdsAccount) {
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
        return LdsAccount.verifyAccount(session, profile);
      });
    }

    function getLeadership(members) {
      var honchos = { membershipClerks: [] };

      members.forEach(function (member) {
        if (!Array.isArray(member.callings)) {
          // each member should have an array of callings, even if empty
          // so this is just a sanity check
          return;
        }

        member.callings.forEach(function (calling) {
          if ("Bishopric" === calling.name || 4 === calling.typeId) {
            honchos.bishop = member;
          }
          if ("Bishopric First Counselor" === calling.name || 54 === calling.typeId) {
            honchos.firstCounselor = member;
          }
          if ("Bishopric Second Counselor" === calling.name || 55 === calling.typeId) {
            honchos.secondCounselor = member;
          }
          if ("Ward Executive Secretary" === calling.name || 56 === calling.typeId) {
            honchos.executiveSecretary = member;
          }
          if ("Ward Clerk" === calling.name || 57 === calling.typeId) {
            honchos.clerk = member;
          }
          /*
          if ("Ward Assistant Clerk" === calling.name || 58 === calling.typeId) {
            honchos.assistant = member;
          }
          */
          if ("Ward Assistant Clerk--Membership" === calling.name || 787 === calling.typeId) {
            honchos.membershipClerks.push(member);
          }
        });
      });

      return honchos;
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
