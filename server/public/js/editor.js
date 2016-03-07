var editorApp = angular.module('editorApp', []);

editorApp.controller('EditorCtrl', ['$scope', '$http', function ($scope,$http) {
  $http.get('example.json').success(function(data) {
    /* fix default actions */
    for (var mi in data.markers) {
      var marker = data.markers[mi];
      if (marker.action!==undefined) {
        if (marker.actions===undefined)
          marker.actions = [];
        marker.actions.push({url:marker.action,channel:''});
        delete marker.action;
      }
    }
    $scope.markers = data.markers;
    $scope.parameters = data.parameters;
    console.log('read experience with '+(data.markers.length)+' markers');
  });
}]);
