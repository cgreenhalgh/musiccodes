//jshint strict: false
module.exports = function(config) {
  config.set({

    basePath: './public',

    files: [
      'vendor/angular/angular.js',
      'vendor/angular-route/angular-route.js',
      'vendor/angular-mocks/angular-mocks.js',
      'js/*.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    browsers: ['Chrome'],

    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-jasmine',
      'karma-junit-reporter'
    ],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    }

  });
};
