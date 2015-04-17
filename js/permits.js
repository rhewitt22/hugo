var app = angular.module('permitApp', [])

  .factory('Permits', ['$http', function ($http) {

    var getPermits = function () {
      return $http.get('https://rawgit.com/USFWS/permit-lookup/master/permits.json');
    };

    return {
      getPermits: getPermits
    };
  }])

  .controller('SearchController', ['$scope', 'Permits', function ($scope, Permits) {
    $scope.model = {
      search: '',
      permits: []
    };

    Permits.getPermits().then( function (response) {
      $scope.model.permits = response.data;
    });
  }]);