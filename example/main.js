//window._lang = 'de_DE';

require.config({
    paths: {
        underscore: '../bower_components/underscore/underscore',
        messageformat: '../bower_components/messageformat/messageformat',
        po: '../po',
    },
    shim: {
        underscore: {
            exports: '_',
            deps: []
        }
    },
    locale: function (root) {
      return root._lang || 'en_EN';
    },
    po: {
      i18nLocation: 'i18n'
    }
});

require(['po!labels'], function (translations) {
  Object.keys(translations).forEach(function (key) {
    console.log(key, ':', translations[key]());
  });
});
