'use strict';

window.addEventListener('error', function (err) {
  console.error("Uncaught Exception:");
  console.log(err);
});

angular.module('yololiumApp', [
  'ui.bootstrap'
, 'ui.router'
, 'oauth3'
, 'lds.io'
, 'steve'
/*
  'ngSanitize'
*/
]).config([
    '$urlRouterProvider'
  , '$stateProvider'
  , '$httpProvider'
  , 'stConfig'
  , function ($urlRouterProvider, $stateProvider, $httpProvider, StApi) {
    var rootTemplate = $('.ui-view-body').html();

    $urlRouterProvider.otherwise('/');
    $stateProvider
      .state('root', {
        url: '/'
      , views: {
          body: {
            template: rootTemplate
          , controller: [
              '$scope'
            , 'LdsApiSession'
            , 'LdsApiRequest'
            , function ($scope, LdsApiSession, LdsApiRequest) {
              var MC = this;

              MC.urlsafe = function (name) {
                return name.toLowerCase().replace(/[^\-\w]/, '').replace(/s$/, '');
              };

              function prefetch(session) {
                // Prefetching
                return LdsApiRequest.profile(session).then(function (profile) {
                  LdsApiRequest.stake(session, profile.homeStakeAppScopedId);
                  LdsApiRequest.ward(session, profile.homeStakeAppScopedId, profile.homeWardAppScopedId);
                });
              }

              LdsApiSession.checkSession(prefetch);
              LdsApiSession.onLogin($scope, prefetch);
            }]
          , controllerAs: 'MC'
          }
        }
      })

      .state('authorization-dialog', {
        url: '/authorize/:token/'
      , views: {
          body: {
            templateUrl: 'views/authorization-dialog.html'
          , controller: 'AuthorizationDialogController as ADC'
          }
        }
      })

      .state('account', {
        url: '/account/'
      , views: {
          body: {
            templateUrl: 'views/my-account.html'
          , controller: 'MyAccountController as MAC'
          }
        }
      })
      ;

    // send creds
    $httpProvider.defaults.withCredentials = true;
    // alternatively, register the interceptor via an anonymous factory?
    $httpProvider.interceptors.push([ '$q', function($q) {
      var recase = window.Recase.create({ exceptions: {} });

      function isApiUrl(url) {
        // TODO provide a list of known-good API urls in StApi and loop
        return !/^https?:\/\//.test(url)
          || url.match(StApi.apiPrefix)
          || url.match(StApi.oauthPrefix)
          ;
      }

      return {
        'request': function (config) {
          if (config.data
              && isApiUrl(config.url)
              && /json/.test(config.headers['Content-Type'])
          ) {
            config.data = recase.snakeCopy(config.data);
          }

          return config;
        }
      , 'requestError': function (rejection) {
          return rejection;
        }
      , 'response': function (response) {
          var config = response.config;
          var err;

          // our own API is snake_case (to match webApi / ruby convention)
          // but we convert to camelCase for javascript convention
          if (isApiUrl(config.url) && /json/.test(response.headers('Content-Type'))) {
            response.data = recase.camelCopy(response.data);
            if (response.data.error) {
              //throw new Error(response.data.error.message);
              err = new Error(response.data.error.message);
              Object.keys(response.data.error).forEach(function (key) {
                err[key] = response.data.error[key];
              });
              return $q.reject(err);
            }
          }
          return response;
        }
      , 'responseError': function (rejection) {
          return rejection;
        }
      };
    }]);

}]).run([
    '$rootScope'
  , '$timeout'
  , '$q'
  , '$http'
  , '$modal'
  , 'LdsApi'
  , 'LdsApiSession'
  , function ($rootScope, $timeout, $q, $http, $modal, LdsApi, LdsApiSession) {

  return LdsApi.init({
    // TODO dedicated root app
    appId: 'TEST_ID_871a371debefb91c919ca848'
  //  appId: 'ID__329d57138a2ddbe291eea77780fe'
  , appVersion: '2.0.0-pre'
  , invokeLogin: function (opts) {
      console.info('login invoked');
      return $modal.open({
        templateUrl: '/views/login-v3.html'
      , controller: 'LoginController3 as LC'
      , backdrop: 'static'
      , keyboard: true
      , resolve: {
          myLoginOptions: [function () {
            return opts;
          }]
        }
      }).result;
    }
  }).then(function (LdsApiConfig) {
    $rootScope.R = {};
    // attach after angular is initialized so that angular errors
    // don't annoy developers that forgot bower install
    window.addEventListener('error', function (err) {
      window.alert('Uncaught Exception: ' + (err.message || 'unknown error'));
    });

    $http.get(LdsApiConfig.providerUri + '/api' + '/public/apps').then(function (resp) {
      $rootScope.R.ready = true;
      $rootScope.R.apps = resp.data.result.filter(function (app) {
        return app.live;
      });
    });

    // normally we'd do a background login here, but ldsconnect.org already
    // is the provider, so no sense in doing that...
    return LdsApiSession.checkSession().then(function () {
      $rootScope.rootReady = true;
      $rootScope.rootDeveloperMode = LdsApiConfig.developerMode;
      $rootScope.R.dev = $rootScope.rootDeveloperMode;
    }, function () {
      $rootScope.rootReady = true;
      $rootScope.rootDeveloperMode = LdsApiConfig.developerMode;
      $rootScope.R.dev = $rootScope.rootDeveloperMode;
    });
  });
}]);
