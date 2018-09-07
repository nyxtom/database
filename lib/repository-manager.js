'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RepositoryManager = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _assert = require('assert');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mongoose = require('mongoose');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _validator = require('validator');

var _validator2 = _interopRequireDefault(_validator);

var _definitionModels = require('./definition-models');

var _repositorySetFormatters = require('./repository-set-formatters');

var setFormatters = _interopRequireWildcard(_repositorySetFormatters);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = new _debug2.default('repository');

var RepositoryManager = function () {
    function RepositoryManager(fetch, yaml) {
        _classCallCheck(this, RepositoryManager);

        this.loadedSchemas = null;
        this.validators = null;
        this.setFormatters = null;
        this.virtualFormatters = null;
        this.schemaPlugins = null;
        this.fetch = fetch;
        this.yaml = yaml;
        this.plugins = [];
    }

    /**
     * Gets whether there are loaded schemas.
     * @return {Boolean} true if there are schemas, false otherwise
     */


    _createClass(RepositoryManager, [{
        key: 'schemas',


        /**
         * A database schema model as managed by the repository manager
         * @typedef {Object} SchemaModel
         * @property {String} name - Name of the schema model
         * @property {String} db - Name of the db associated with the schema model
         * @property {Object} definition - Definition containing views, schema, and properties
         * @property {String[]} models - Models to bind for the schema
         * @property {mongoose.Schema} schema - Mongoose schema document as loaded with virtuals, plugins from definition
         */

        /**
         * Returns the schemas based on the given query options.
         * @param {String} [options.db] - Database to select in the loaded schemas
         * @param {String} [options.schemaPath] - Schema selection path to look for in the loaded schemas
         * @return {SchemaModel[]} Returns all the schema models based on the given selector
         */
        value: function schemas(options) {
            var loadedSchemas = this.loadedSchemas;
            if (options && options.db) {
                loadedSchemas = loadedSchemas[options.db] || {};
            }

            if (!options || !options.schemaPath) {
                return loadedSchemas;
            }

            return _lodash2.default.get(loadedSchemas, schemaPath);
        }

        /**
         * A database plugin to load schema definitions, formatters, validators,
         * and other database utilities and schema modified plugins.
         * @typedef {Object} Plugin
         * @property {String} [name] - Name of the plugin to load into the dabase
         * @property {String} [db] - The default database to select
         * @property {Function} load - Loads the plugin into the database
         * @property {Object?} [validators] - Exported validators for fields
         * @property {Object?} [virtualFormatters] - Exported formatters for virtual fields
         * @property {Object?} [setFormatters] - Exported set transforms for fields
         */

        /**
         * Each plugin corresponds to modifications it makes to the
         * database or databases configured for this server. A host
         * may have 1-to-many databases using 1-to-many plugins. Each plugin
         * might be just a single database with 1-to-many collections/tables.
         * Or it might just modify existing databases. This differs from collection
         * or table plugins that mean to modify an existing schema model.
         * @param {String} name - Name to associate with the plugin load
         * @param {Function|Plugin} plugin - Database plugin to attach schemas/models
         * @param {Object} options - The options to attach to the plugin
         */

    }, {
        key: 'plugin',
        value: function plugin(name, _plugin, options) {
            if (!_plugin) {
                return;
            }

            var p = _plugin;
            if (typeof _plugin === 'function') {
                p = { load: _plugin };
            } else if (typeof _plugin.default === 'function') {
                p = { load: _plugin.default };
            }

            this.plugins.push({ name: name, plugin: p, options: options });
        }

        /**
         * Loads the default validators, set formatters and virtual formatters for the database.
         */

    }, {
        key: 'loadDefaultFormattersAndValidators',
        value: function loadDefaultFormattersAndValidators() {
            this.validators = Object.assign({}, _validator2.default);
            this.setFormatters = Object.assign({}, setFormatters);
            this.virtualFormatters = {};
            this.schemaPlugins = {};
        }

        /**
         * Loads all the plugins for this database.
         */

    }, {
        key: 'loadPlugins',
        value: function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
                var _this = this;

                var promises;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                debug('load plugins', this.plugins);
                                this.loadDefaultFormattersAndValidators();

                                promises = this.plugins.map(function () {
                                    var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(plugin) {
                                        var loadFn, options;
                                        return regeneratorRuntime.wrap(function _callee$(_context) {
                                            while (1) {
                                                switch (_context.prev = _context.next) {
                                                    case 0:
                                                        loadFn = plugin.plugin.load;

                                                        if (!(!loadFn || typeof loadFn !== 'function')) {
                                                            _context.next = 3;
                                                            break;
                                                        }

                                                        return _context.abrupt('return');

                                                    case 3:
                                                        options = plugin.options;
                                                        _context.next = 6;
                                                        return loadFn(_this, options);

                                                    case 6:
                                                    case 'end':
                                                        return _context.stop();
                                                }
                                            }
                                        }, _callee, _this);
                                    }));

                                    return function (_x) {
                                        return _ref2.apply(this, arguments);
                                    };
                                }());
                                _context2.next = 5;
                                return Promise.all(promises);

                            case 5:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function loadPlugins() {
                return _ref.apply(this, arguments);
            }

            return loadPlugins;
        }()

        /**
         * Adds the schema plugins (a map of function name to function) to the current schema plugins.
         * @param {Object.<string, Function>} validators - The map of schema plugin functions
         */

    }, {
        key: 'addSchemaPlugins',
        value: function addSchemaPlugins(schemaPlugins) {
            if (!schemaPlugins || (typeof schemaPlugins === 'undefined' ? 'undefined' : _typeof(schemaPlugins)) !== 'object') {
                throw new _assert.AssertionError({ message: 'Schema plugins must be a non-null object with the name and functions' });
            }

            this.schemaPlugins = Object.assign({}, this.schemaPlugins, schemaPlugins);
        }

        /**
         * Adds the validators (a map of function name to function) to the current validators.
         * @param {Object.<string, Function>} validators - The map of validator functions
         */

    }, {
        key: 'addValidators',
        value: function addValidators(validators) {
            if (!validators || (typeof validators === 'undefined' ? 'undefined' : _typeof(validators)) !== 'object') {
                throw new _assert.AssertionError({ message: 'Validators must be a non-null object with the name and functions' });
            }

            this.validators = Object.assign({}, this.validators, validators);
        }

        /**
         * Adds the set formatters (a map of function name to function) to the current set formatters.
         * @param {Object.<string, Function>} formatters - The map of formatter functions
         */

    }, {
        key: 'addSetFormatters',
        value: function addSetFormatters(formatters) {
            if (!formatters || (typeof formatters === 'undefined' ? 'undefined' : _typeof(formatters)) !== 'object') {
                throw new _assert.AssertionError({ message: 'Formatters must be a non-null object with the name and functions' });
            }

            this.setFormatters = Object.assign({}, this.setFormatters, formatters);
        }

        /**
         * Adds the virtual formatters (a map of function name to function) to the current virtual formatters.
         * @param {Object.<string, Function>} formatters - The map of formatter functions
         */

    }, {
        key: 'addVirtualFormatters',
        value: function addVirtualFormatters(formatters) {
            if (!formatters || (typeof formatters === 'undefined' ? 'undefined' : _typeof(formatters)) !== 'object') {
                throw new _assert.AssertionError({ message: 'Formatters must be a non-null object with the name and functions' });
            }

            this.virtualFormatters = Object.assign({}, this.virtualFormatters, formatters);
        }

        /**
         * Loads the given parsed definition, or yaml string definition
         * or definition uri string to load from the filesystem.
         * @param {Object|String} definition - Yaml based definition string to parse
         * @param {{ name: String}} options - Options to include for default name
         */

    }, {
        key: 'addDefinition',
        value: function addDefinition(definition, options) {
            if (!definition.schema) {
                return;
            }

            (0, _definitionModels.setSchemaTypes)(definition.schema);
            (0, _definitionModels.setSchemaValidators)(definition.schema, this.validators);
            (0, _definitionModels.setSchemaSets)(definition.schema, this.setFormatters);
            if (!definition.name && options && options.name) {
                definition.name = options.name;
            }

            if (!definition.name) {
                throw new _assert.AssertionError({ message: 'Must provide a valid model name for the definition schema', expected: 'model' });
            }

            // define the new mongoose schema with virtuals + plugins setup
            var name = definition.name;
            var schema = new _mongoose.Schema(Object.assign({}, definition.schema));
            (0, _definitionModels.addVirtualsAndPlugins)(definition, schema, this.virtualFormatters, this.schemaPlugins);

            // models to export for each definition
            var models = definition.models || definition.model || definition.name;
            if (typeof models === 'string') {
                models = [models];
            }

            // set the schema into the loaded schemas segmented by db
            if (!definition.db && options && options.db) {
                definition.db = options.db;
            }

            if (!definition.db) {
                throw new _assert.AssertionError({ message: 'Must provide a db name to associate the schema with', expected: 'db' });
            }

            var db = definition.db;
            this.loadedSchemas = this.loadedSchemas || {};
            this.loadedSchemas[db] = this.loadedSchemas[db] || {};
            this.loadedSchemas[db][definition.name] = { name: name, db: db, definition: definition, models: models, schema: schema };
        }

        /**
         * Parses a yaml definition into schema, models, virtuals and views.
         * @param {String} definition - Yaml definition string to load/parse and add.
         * @param {{ name: String, db: String}} options - Options to include for default name and db
         */

    }, {
        key: 'addDefinitionString',
        value: function addDefinitionString(definition, options) {
            return this.addDefinition(this.yaml.load(definition), options);
        }

        /**
         * Loads a definition via get request or from disk, to load/parse.
         * @param {String} definition - Uri to the definition to load
         * @param {{ name: String, db: String}} options - Options to include for default name and db
         */

    }, {
        key: 'addDefinitionUri',
        value: function addDefinitionUri(definition, options) {
            if (definition.indexOf('http') === 0) {
                return this._downloadDefinitionUri(definition, options);
            }

            return this._readDefinitionUri(definition, options);
        }

        /**
         * Loads a definition via the filesystem.
         * @param {String} definition - Uri to the definition to load
         * @param {{ name: String, db: String}} options - Options to include for default name and db
         */

    }, {
        key: '_readDefinitionUri',
        value: function _readDefinitionUri(definition, options) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
                if (definition.indexOf('~') === 0) {
                    definition = definition.replace('~', os.homedir());
                }
                definition = _path2.default.resolve(definition);
                var parsed = _path2.default.parse(definition);
                options = options || {};
                options.name = options.name || parsed.name;
                _fs2.default.readFile(definition, { flag: 'r', encoding: 'utf8' }, function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(_this2.addDefinitionString(data.toString(), options));
                });
            });
        }

        /**
         * Downloads a definition via get request or from disk, to load/parse.
         * @private
         * @param {String} definition - Uri to the definition to download
         * @param {{ name: String, db: String}} options - Options to include for default name and db
         */

    }, {
        key: '_downloadDefinitionUri',
        value: function () {
            var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(definition, options) {
                var result, content, parsed;
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this.fetch(definition);

                            case 2:
                                result = _context3.sent;
                                _context3.next = 5;
                                return result.text();

                            case 5:
                                content = _context3.sent;
                                parsed = _path2.default.parse(definition);

                                options = options || {};
                                options.name = options.name || parsed.name;
                                return _context3.abrupt('return', this.addDefinitionString(content, options));

                            case 10:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function _downloadDefinitionUri(_x2, _x3) {
                return _ref3.apply(this, arguments);
            }

            return _downloadDefinitionUri;
        }()

        /**
         * Adds a schema to the loaded schemas.
         * @param {String} name - Name of the schema to add
         * @param {Object} schema - Schema definition
         */

    }, {
        key: 'addSchema',
        value: function addSchema(name, schema) {
            if (!name) {
                throw new _assert.AssertionError({ message: 'Must provide a valid schema name', expected: 'name' });
            }
            this.loadedSchemas = this.loadedSchemas || {};
            this.loadedSchemas[name] = schema;
        }
    }, {
        key: 'isLoaded',
        get: function get() {
            return !!this.loadedSchemas;
        }
    }]);

    return RepositoryManager;
}();

exports.RepositoryManager = RepositoryManager;