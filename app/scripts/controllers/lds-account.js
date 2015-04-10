'use strict';

angular.module('yololiumApp')
  .controller('LdsAccountController', [
    '$scope'
  , '$q'
  , '$timeout'
  , '$http'
  , '$modalInstance'
  , 'realLdsAccount'
  , 'LdsApiConfig'
  , 'LdsApiSession'
  , 'mySession'
  , 'myProfile'
  , 'myOptions'
  , function (
      $scope
    , $q
    , $timeout
    , $http
    , $modalInstance
    , LdsAccount // prevent circular reference
    , LdsApiConfig
    , LdsApiSession
    , account // session doubles as account
    , profile
    //, opts
    ) {
    var scope = this;

    scope.me = profile.me;
    scope.leaders = profile.leaders;
    scope.home = profile.home;
    scope.ward = profile.ward;
    scope.stake = profile.stake;
    scope.meetinghouse = profile.ward.meetinghouse;

    console.log("profile", profile);

    scope.markAsChecked = function () {
      console.log('account');
      console.log(account);
      return $http.post(
        LdsApiConfig.providerUri + '/api/ldsio/' + account.id + '/mark-as-checked'
      , null
      , { headers: { 'Authorization': 'Bearer ' + account.token } }
      ).then(function (resp) {
        if (!resp.data || resp.data.error || !resp.data.success) {
          scope.flashMessage = (resp.data && resp.data.error) || "Failed to mark account as checked.";
          scope.flashMessageClass = 'alert-danger';
          return;
        }

        account.userVerifiedAt = new Date().toISOString();

        // pass back anything?
        return $modalInstance.close();
      });
    };
  }]);
