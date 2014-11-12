module.exports = function(grunt) {

  grunt.initConfig({

    requirejs: {
      options: {
        baseUrl: 'example',
        mainConfigFile: 'example/main.js',
        optimize: 'none',
        optimizeCss: 'none',
        inlineText: true,
        useStrict: true,
        rjs: __dirname + '/bower_components/requirejs',
        name: 'main',
				exclude: ['messageformat'],
        pragmasOnSave: {
  	      excludePo: true
  	    },     
      },
      build_de_DE: {
        options: {
          locale: 'de_DE',
          out: 'example/build/main_de_DE.js'
        }
      },
      build_en_EN: {
        options: {
          locale: 'en_GB',
          out: 'example/build/main_en_GB.js'
        }
      }      
    },
    
    copy: {
      html: {src: ['*.html'], dest: 'example/build', expand: true, cwd: 'example', filter: 'isFile'}
    },
    
    clean: {
      build: ['example/build']
    }
    
  });
  
  grunt.registerTask('replace-mode', function () {
    var fs = require('fs');
    var index = String(fs.readFileSync(__dirname + '/example/build/index.html'));
    index = index.replace('data-mode="develop"', 'data-mode="build"');
    fs.writeFileSync(__dirname + '/example/build/index.html', index);
  });
  
  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  
  grunt.registerTask('default', ['clean:build', 'copy:html', 'requirejs:build_de_DE', 'requirejs:build_en_EN', 'replace-mode']);
};