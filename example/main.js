require.config({
    paths: {
	     	messageformat: '../bower_components/messageformat/messageformat',
        po: '../po',
    },
    locale: function (root) {
      return root._lang || 'en_GB';
    },
    po: {
      // avoid loading the locale.js
      useMessageformatPlurals: true,
      i18nLocation: 'i18n'
    }
});

require(['po!labels', 'po!./relatives/{{locale}}/rl'], function (translations, relativeTranslations) {

  // load translatable content
  document.getElementById('yes').innerHTML = '"' + document.getElementById('yes').innerHTML + '" translated to: "' + translations[document.getElementById('yes').innerHTML]() + '"';
  document.getElementById('no').innerHTML = '"' + document.getElementById('no').innerHTML + '" translated to: "' + translations[document.getElementById('no').innerHTML]() + '"';
  document.getElementById('apples').innerHTML = '"' + document.getElementById('apples').innerHTML + '" translated to: "' + translations[document.getElementById('apples').innerHTML]({count: 5}) + '"';
  document.getElementById('mails').innerHTML = '"' + document.getElementById('mails').innerHTML + '" translated to: "' + translations[document.getElementById('mails').innerHTML]({mails: 6, folders: 2}) + '"';
  document.getElementById('one-item').innerHTML = '"' + document.getElementById('items').innerHTML + '" translated to: "' + translations[document.getElementById('items').innerHTML]({items: 1}) + '"';
  document.getElementById('more-items').innerHTML = '"' + document.getElementById('items').innerHTML + '" translated to: "' + translations[document.getElementById('items').innerHTML]({items: 5}) + '"';
  document.getElementById('items').innerHTML = '"' + document.getElementById('items').innerHTML + '" translated to: "' + translations[document.getElementById('items').innerHTML]({items: 0}) + '"';
  document.getElementById('multi-items').innerHTML = '"' + document.getElementById('multi-items').innerHTML + '" translated to: "' + translations[document.getElementById('multi-items').innerHTML]({items: 1, rooms: 2}) + '"';


  document.getElementById('hello').innerHTML = '"' + document.getElementById('hello').innerHTML + '" translated to: "' + relativeTranslations[document.getElementById('hello').innerHTML]() + '"';
});
