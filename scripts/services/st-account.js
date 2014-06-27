'use strict';

/**
 * @ngdoc service
 * @name yololiumApp.StAccount
 * @description
 * # StAccount
 * Service in the yololiumApp.
 */
angular.module('yololiumApp')
  .service('StAccount', function StAccount($q, $http, $modal, StApi) {
    // AngularJS will instantiate a singleton by calling "new" on this function

    var me = this
      , required = ['localLoginId']
      ;

    me.showAccountModal = function (session, opts) {
      console.log('opening the account update');
      return $modal.open({
        templateUrl: '/views/account-new.html'
      , controller: 'AccountNewCtrl as A'
      , backdrop: 'static'
      , resolve: {
          mySession: function () {
            return session;
          }
        , stAccountOptions: function () {
            return opts;
          }
        }
      }).result;
    };

    me.ensureAccount = function (session, opts) {
      // TODO move this logic to StAccount
      function hasField(field) {
        return session.account[field];
      }

      if (session.account && required.every(hasField)) {
        console.log("I don't need to open UpdateSession modal");
        return $q.when(session);
      }

      // TODO check if the account is up-to-date (no missing fields)
      return me.showAccountModal(opts);
    };
    
    function update(id, updates) {
      if (!id) {
        return create(updates);
      }

      return $http.post(StApi.apiPrefix + '/accounts' + id, updates).then(function (resp) {
        console.log('UPDATE account');
        console.log(resp);
        return resp.data;
      });
    }

    function create(updates) {
      if (updates.id) {
        return update(updates.id, updates);
      }

      return $http.post(StApi.apiPrefix + '/accounts', updates).then(function (resp) {
        console.log('CREATE account');
        console.log(resp);
        return resp.data;
      });
    }

    me.update = update;
    me.create = create;
  });
