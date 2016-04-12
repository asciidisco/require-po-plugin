/*jslint regexp: true, eval: true */
/*global require: false, XMLHttpRequest: false, ActiveXObject: false,
  define: false, window: false, process: false, Packages: false,
  java: false, location: false */

define([
  'module'
  //>>excludeStart('excludePo', pragmas.excludePo)
  ,'messageformat'
  //>>excludeEnd('excludePo')
  ], function (
    module
  //>>excludeStart('excludePo', pragmas.excludePo)
    ,MessageFormat
  //>>excludeEnd('excludePo')
  ) {
  //>>excludeStart('excludePo', pragmas.excludePo)
    'use strict';
    var sharedFuncs = {};

    /**
     * Parses a header string into an object of key-value pairs
     *
     * @param {String} str Header string
     * @return {Object} An object of key-value pairs
     */
    sharedFuncs.parseHeader = function (str){
        var lines = (str || "").split("\n"),
            headers = {};

        lines.forEach(function(line){
            var parts = line.trim().split(":"),
                key = (parts.shift() || "").trim().toLowerCase(),
                value = parts.join(":").trim();
            if(!key){
                return;
            }
            headers[key] = value;
        });

        return headers;
    };

    sharedFuncs.convert = function (po) {
      var parser = new Parser(po, 'utf-8');
      var translations = parser.parse();
      var translationMap = {};
      Object.keys(translations.translations['']).forEach(function (key) {
        var msgstr = null;
        if (key === '') {
          return;
        }

        try {
          msgstr = translations.translations[''][key].msgstr;
        } catch (e) {}

        if (msgstr !== null) {
          msgstr.forEach(function (data) {
            if (data !== null) {
              translationMap[key] = data;
            }
          });
        }
      });

      return translationMap;
    };

    /**
     * Creates a PO parser object. If PO object is a string,
     * UTF-8 will be used as the charset
     *
     * @constructor
     * @param {Buffer|String} fileContents PO object
     * @param {String} [defaultCharset] Default charset to use
     */
    function Parser(fileContents, defaultCharset){

        this._charset = defaultCharset || "iso-8859-1";

        if(typeof fileContents == "string"){
            this._charset = "utf-8";
            this._fileContents = fileContents;
        }else{
            this._handleCharset(fileContents);
        }

    }

    /**
     * Detects charset for PO strings from the header
     *
     * @param {Buffer} headers Header value
     */
    Parser.prototype._handleCharset = function(buf){
        var str = (buf || "").toString(),
            pos, headers = "", match;

        if((pos = str.search(/^\s*msgid/im))>=0){
            if((pos = pos + str.substr(pos + 5).search(/^\s*(msgid|msgctxt)/im))){
                headers = str.substr(0, pos);
            }
        }

        if((match = headers.match(/[; ]charset\s*=\s*([\w\-]+)(?:[\s;]|\\n)*"\s*$/mi))){
            this._charset = sharedFuncs.formatCharset(match[1], this._charset);
        }

        if(this._charset == "utf-8"){
            this._fileContents = str;
        }else{
            this._fileContents = encoding.convert(buf, "utf-8", this._charset).toString("utf-8");
        }
    };

    /**
     * State constants for parsing FSM
     */
    Parser.prototype.states = {
        none: 0x01,
        comments: 0x02,
        key: 0x03,
        string: 0x04
    };

    /**
     * Value types for lexer
     */
    Parser.prototype.types = {
        comments: 0x01,
        key: 0x02,
        string: 0x03
    };

    /**
     * String matches for lexer
     */
    Parser.prototype.symbols = {
        quotes: /['"]/,
        comments: /\#/,
        whitespace: /\s/,
        key: /[\w\-\[\]]/
    };

    /**
     * Token parser
     *
     * @return {Object} Parsed tokens
     */
    Parser.prototype._lexer = function(){
        var chr,
            escaped = false,
            lex = [],
            node,
            state = this.states.none;

        for(var i=0, len = this._fileContents.length; i<len; i++){
            chr = this._fileContents.charAt(i);
            switch(state){
                case this.states.none:
                    if(chr.match(this.symbols.quotes)){
                        node = {
                            type: this.types.string,
                            value: "",
                            quote: chr
                        };
                        lex.push(node);
                        state = this.states.string;
                    }else if(chr.match(this.symbols.comments)){
                        node = {
                            type: this.types.comments,
                            value: ""
                        };
                        lex.push(node);
                        state = this.states.comments;
                    }else if(!chr.match(this.symbols.whitespace)){
                        node = {
                            type: this.types.key,
                            value: chr
                        };
                        lex.push(node);
                        state = this.states.key;
                    }
                    break;
                case this.states.comments:
                    if(chr == "\n"){
                        state = this.states.none;
                    }else if(chr != "\r"){
                        node.value += chr;
                    }
                    break;
                case this.states.string:
                    if(escaped){
                        switch(chr){
                            case "t": node.value += "\t"; break;
                            case "n": node.value += "\n"; break;
                            case "r": node.value += "\r"; break;
                            default:
                                node.value += chr;
                        }
                        escaped = false;
                    }else{
                        if(chr == node.quote){
                            state = this.states.none;
                        }else if(chr == "\\"){
                            escaped = true;
                            break;
                        }else{
                            node.value += chr;
                        }
                        escaped = false;
                    }
                    break;
                case this.states.key:
                    if(!chr.match(this.symbols.key)){
                        state = this.states.none;
                        i--;
                    }else{
                        node.value += chr;
                    }
                    break;
            }
        }

        return lex;
    };

    /**
     * Join multi line strings
     *
     * @param {Object} lex Parsed tokens
     * @return {Object} Parsed tokens, with multi line strings joined into one
     */
    Parser.prototype._joinStringValues = function(lex){
        var lastNode, response = [];

        for(var i=0, len = lex.length; i<len; i++){
            if(lastNode && lex[i].type == this.types.string && lastNode.type == this.types.string){
                lastNode.value += lex[i].value;
            }else if(lastNode && lex[i].type == this.types.comments && lastNode.type == this.types.comments){
                lastNode.value += "\n" + lex[i].value;
            }else{
                response.push(lex[i]);
                lastNode = lex[i];
            }
        }

        return response;
    };

    /**
     * Parse comments into separate comment blocks
     *
     * @param {Object} lex Parsed tokens
     */
    Parser.prototype._parseComments = function(lex){
        // parse comments
        lex.forEach((function(node){
            var comment, lines;

            if(node && node.type == this.types.comments){
                comment = {translator: [], extracted: [], reference: [], flag: [], previous: []};
                lines = (node.value || "").split(/\n/);
                lines.forEach(function(line){
                    switch(line.charAt(0) || ""){
                        case ":":
                            comment.reference.push(line.substr(1).trim());
                            break;
                        case ".":
                            comment.extracted.push(line.substr(1).replace(/^\s+/, ""));
                            break;
                        case ",":
                            comment.flag.push(line.substr(1).replace(/^\s+/, ""));
                            break;
                        case "|":
                            comment.previous.push(line.substr(1).replace(/^\s+/, ""));
                            break;
                        default:
                            comment.translator.push(line.replace(/^\s+/, ""));
                    }
                });

                node.value = {};

                Object.keys(comment).forEach(function(key){
                    if(comment[key] && comment[key].length){
                        node.value[key] = comment[key].join("\n");
                    }
                });
            }
        }).bind(this));
    };

    /**
     * Join gettext keys with values
     *
     * @param {Object} lex Parsed tokens
     * @return {Object} Tokens
     */
    Parser.prototype._handleKeys = function(lex){
        var response = [], lastNode;

        for(var i=0, len = lex.length; i<len; i++){
            if(lex[i].type == this.types.key){
                lastNode = {
                    key: lex[i].value
                };
                if(i && lex[i-1].type == this.types.comments){
                    lastNode.comments = lex[i-1].value;
                }
                lastNode.value = "";
                response.push(lastNode);
            }else if(lex[i].type == this.types.string && lastNode){
                lastNode.value += lex[i].value;
            }
        }

        return response;
    };

    /**
     * Separate different values into individual translation objects
     *
     * @param {Object} lex Parsed tokens
     * @return {Object} Tokens
     */
    Parser.prototype._handleValues = function(lex){
        var response = [], lastNode, curContext, curComments;

        for(var i=0, len = lex.length; i<len; i++){
            if(lex[i].key.toLowerCase() == "msgctxt"){
                curContext = lex[i].value;
                curComments = lex[i].comments;
            }else if(lex[i].key.toLowerCase() == "msgid"){
                lastNode = {
                    msgid: lex[i].value
                };

                if(curContext){
                    lastNode.msgctxt = curContext;
                }

                if(curComments){
                    lastNode.comments = curComments;
                }

                if(lex[i].comments && !lastNode.comments){
                    lastNode.comments = lex[i].comments;
                }

                curContext = false;
                curComments = false;
                response.push(lastNode);
            }else if(lex[i].key.toLowerCase() == "msgid_plural"){
                if(lastNode){
                    lastNode.msgid_plural = lex[i].value;
                }

                if(lex[i].comments && !lastNode.comments){
                    lastNode.comments = lex[i].comments;
                }

                curContext = false;
                curComments = false;
            }else if(lex[i].key.substr(0, 6).toLowerCase() == "msgstr"){
                if(lastNode){
                    lastNode.msgstr = (lastNode.msgstr || []).concat(lex[i].value);
                }

                if(lex[i].comments && !lastNode.comments){
                    lastNode.comments = lex[i].comments;
                }

                curContext = false;
                curComments = false;
            }
        }

        return response;
    };

    /**
     * Compose a translation table from tokens object
     *
     * @param {Object} lex Parsed tokens
     * @return {Object} Translation table
     */
    Parser.prototype._normalize = function(lex){
        var msgctxt,
            table = {
                charset: this._charset,
                headers: undefined,
                translations: {}
            };

        for(var i=0, len = lex.length; i < len; i++){
            msgctxt = lex[i].msgctxt || "";

            if(!table.translations[msgctxt]){
                table.translations[msgctxt] = {};
            }

            if(!table.headers && !msgctxt && !lex[i].msgid){
                table.headers = sharedFuncs.parseHeader(lex[i].msgstr[0]);
            }

            table.translations[msgctxt][lex[i].msgid] = lex[i];
        }

        return table;
    };

    /**
     * Parses the PO object and returns translation table
     *
     * @return {Object} Translation table
     */
    Parser.prototype.parse = function(){
        var lex = this._lexer();

        lex = this._joinStringValues(lex);
        this._parseComments(lex);
        lex = this._handleKeys(lex);
        lex = this._handleValues(lex);

        return this._normalize(lex);
    };

    var localizeFile = function (config, name) {
        var localizedFilename  = 'foo',
            root;

        try {
          root = window;
        } catch (e) {
          root = config;
        }

        var locale = root.locale || root._lang,
            _locale = locale,
            _shortLocale = locale.split('_')[0];

        if (typeof locale === 'function') {
          _locale = locale(root);
        }

        localizedFilename = name.replace('{{locale}}', _locale);
        return localizedFilename;
    };

    var parseOutLocale = function (text, options) {
        options = options || {};
        var localeFunc;
        var metaMarker = 'Plural-Forms:';
        var metaMarkerLength = metaMarker.length;
        var pos = text.search(metaMarker);
        var startFromText = text.substr(pos + metaMarkerLength);
        var inlineMarker = 'plurals=';
        var inlineMarkerLength = inlineMarker.length;
        var inlinePos = inlineMarker.search(inlineMarker);
        var startFromInlinedText = startFromText.substr(inlinePos + inlineMarkerLength);
        var nextSemicolon = startFromInlinedText.indexOf(';');
        startFromInlinedText = startFromInlinedText.substr(nextSemicolon + 1);
        nextSemicolon = startFromInlinedText.search(';');
        startFromInlinedText = startFromInlinedText.substr(0, nextSemicolon);
        startFromInlinedText = startFromInlinedText.replace('plural=', '');
        startFromInlinedText = startFromInlinedText.replace(/'/g, '"');

        if (options.useDefine) {
            localeFunc = 'define(function defineInternationalization_' + globalConfig.locale + '_Locale () {\n' +
                         '  return function (n) { return ' + startFromInlinedText + '; }\n' +
                         '});';
        } else {
            localeFunc = '(function defineInternationalization_' + globalConfig.locale + '_Locale () {\n' +
                         '  return function (n) { return ' + startFromInlinedText + '; }\n' +
                         '}());';
        };
        return localeFunc;
    };

    var globalConfig;
    var localeEmitter;
    //>>excludeEnd('excludePo')
    var text, fs,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = [],
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '0.1.0',

        strip: function (content) {
          //>>excludeStart('excludePo', pragmas.excludePo)
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            //>>excludeEnd('excludePo')
            return content;
        },
        //>>excludeStart('excludePo', pragmas.excludePo)
        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            name += '.po';
            var strip = false, index = name.lastIndexOf("."),
                modName = name.substring(0, index),
                ext = name.substring(index + 1, name.length);

            index = ext.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = ext.substring(index + 1, ext.length);
                strip = strip === "strip";
                ext = ext.substring(0, index);
            }

            if (ext === 'po.po') {
              ext = 'po';
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            globalConfig = config;
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            if (typeof config.locale === 'function' && !config.isBuild) {
              var root;
              try {
               root = window;
              } catch (e) {
               root = {};
              }
              config.locale = config.locale(root);
            }

            masterConfig.isBuild = config.isBuild;
            var parsed = text.parseName(name);

            // use `i18nLocation` configuration as url default
            var nonStripName = config.po.i18nLocation + '/' + config.locale + '/' + parsed.moduleName + '.' + parsed.ext;
            // check if we need to modify the location of the file, this is the case if the locale placeholder has been set
            if (parsed.moduleName.search('{{locale}}') !== -1) {
                nonStripName = localizeFile(config, parsed.moduleName) + '.' + parsed.ext;
            }

            var url = req.toUrl(nonStripName);
            var useXhr = (masterConfig.useXhr) || text.useXhr;

            localeEmitter = req.toUrl(config.po.i18nLocation + '/' + '{{locale}}/locale.js');
            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = buildMap[moduleName];
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () {" +
                                   content +
                               ";});");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                nonStripName = parsed.moduleName + '.' + parsed.ext,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + '.' +
                                     parsed.ext) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }

    };

    if (masterConfig.env === 'node' || (!masterConfig.env && typeof process !== "undefined" && process.versions && !!process.versions.node)) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');
          text.get = function (url, callback) {
              var file = fs.readFileSync(url, 'utf8');
              //Remove BOM (Byte Mark Order) from utf8 files if it is there.
              if (file.indexOf('\uFEFF') === 0) {
                  file = file.substring(1);
              }

              // okay, this is so evil...
              if(globalConfig.po.usePluralFromPo !== true) {
                var loacalething = fs.readFileSync(localeEmitter.replace('{{locale}}', globalConfig.locale));
                var localeThingy = null;
                var define = function (fn) {
                  localeThingy = fn;
                };
                eval(String(loacalething));
              }

              // check for inlined localization plural forms
              var localeFunc;
              if (globalConfig.po.usePluralFromPo === true && file.search('Plural-Forms:') !== -1) {
                var loacalething = parseOutLocale(file, {useDefine: true});
                var localeThingy = null;
                var define = function (fn) {
                  localeThingy = fn;
                };
                eval(String(loacalething));
              }

              var mf = new MessageFormat(globalConfig.locale, localeThingy);

              var compiledMessageFormat = ['returnee = {};' + 'var ' +mf.runtime.pluralFuncs[globalConfig.locale].name + ' = ' + mf.runtime.pluralFuncs[globalConfig.locale].toString() + ';'];
              compiledMessageFormat.push(" " + mf.runtime.pluralFuncs[globalConfig.locale].name + ".__masterGlobalVars = function (d) {"
                + "  var globs = require.s.contexts._.config.po.globals || {};"
                + "  d = d === Object(d) ? d : {};"
                + "  Object.keys(globs).forEach(function (name) {"
                + "    if (!d[name]) d[name] = globs[name];"
                + "  });"
                + "  return d;"
                + "};"
              );

              var translations = sharedFuncs.convert(file);

              var funcs = mf.compile(translations).toString();
              var start = funcs.indexOf('function anonymous() {') + 'function anonymous() {'.length;
              var end = funcs.indexOf('return {');
              compiledMessageFormat.push(funcs.substring(start, end));
              Object.keys(translations).forEach(function(key){
                var ostr = mf.compile(translations[key]);
                var str = "function (d) { return " + ostr + "(" + mf.runtime.pluralFuncs[globalConfig.locale].name + ".__masterGlobalVars(d)); };";
                var retString = 'returnee["' + key + '"] = ' + str.replace(/\\"/g, '\\"') + ';';
                compiledMessageFormat.push(retString.replace(/\n/g, ' '));
              });

              compiledMessageFormat.push('return returnee');
              callback(compiledMessageFormat.join(' '));
      };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env && text.createXhr())) {
        text.get = function (url, callback, errback) {
            var xhr = text.createXhr();
            xhr.open('GET', url, true);

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        errback(err);
                    } else {

                      // check for inlined localization plural forms
                      var localeFunc;
                      if (globalConfig.po.usePluralFromPo === true && xhr.responseText.search('Plural-Forms:') !== -1) {
                        localeFunc = parseOutLocale(xhr.responseText);
                      }

                      if (globalConfig.po.usePluralFromPo !== true) {
                        require([localeEmitter.replace('{{locale}}', globalConfig.locale)], function (locale) {
                            if (!MessageFormat.locale) MessageFormat.locale = {};
                            MessageFormat.locale[globalConfig.locale] = locale;
                            var mf = new MessageFormat(globalConfig.locale);
                            var returnee = {};
                            var translations = sharedFuncs.convert(xhr.responseText);

                            if (!require.i18n) {
                                require.i18n = {};
                            }

                            var fileName = url.split('/').pop().split('.')[0];
                            if (!require.i18n[fileName]) {
                                require.i18n[fileName] = {};
                            }

                            Object.keys(translations).forEach(function (key) {
                                var tmp = mf.compile(translations[key]);
                                require.i18n[fileName][key] = returnee[key] = function (d) {
                                  var globs = globalConfig.po.globals || {};
                                  d = typeof d === 'object' ? d : {};
                                  Object.keys(globs).forEach(function (name) {
                                    if (!d[name]) d[name] = globs[name];
                                  });
                                  return tmp(d);
                                };
                            });

                            callback(returnee);
                        });
                      } else {
                        var locale = eval(localeFunc);
                        if (!MessageFormat.locale) MessageFormat.locale = {};
                        MessageFormat.locale[globalConfig.locale] = locale;
                        var mf = new MessageFormat(globalConfig.locale);
                        var returnee = {};
                        var translations = sharedFuncs.convert(xhr.responseText);

                        if (!require.i18n) {
                            require.i18n = {};
                        }

                        var fileName = url.split('/').pop().split('.')[0];
                        if (!require.i18n[fileName]) {
                            require.i18n[fileName] = {};
                        }

                        Object.keys(translations).forEach(function (key) {
                            var tmp = mf.compile(translations[key]);
                            require.i18n[fileName][key] = returnee[key] = function (d) {
                              var globs = globalConfig.po.globals || {};
                              d = typeof d === 'object' ? d : {};
                              Object.keys(globs).forEach(function (name) {
                                if (!d[name]) d[name] = globs[name];
                              });
                              return tmp(d);
                            };
                        });

                       callback(returnee);
                      }
                    }
                }
            };
            xhr.send(null);
        };
    //>>excludeEnd('excludePo')
    }
    return text;
});
