'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.connectionReady = exports.connections = exports.models = exports.schemas = exports.instance = exports.ObjectId = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

/**
 * Returns the schemas based on the given query options.
 * @param {SchemaQueryOptions} options - Options to pass to schemas query
 * @return {SchemaModel[]} Returns all the schema models based on the given selector
 */
var schemas = exports.schemas = function () {
    var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(options) {
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
            while (1) {
                switch (_context9.prev = _context9.next) {
                    case 0:
                        return _context9.abrupt('return', instance.schemas(options));

                    case 1:
                    case 'end':
                        return _context9.stop();
                }
            }
        }, _callee9, this);
    }));

    return function schemas(_x6) {
        return _ref9.apply(this, arguments);
    };
}();

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


/**
 * Checks to make sure the configuration and database models are loaded
 * before returning the repository models for the given db.
 * @param {String} db - The db to look for the given map of model
 * @returns {Object.<string, mongoose.Model>} Map of model name to mongoose models.
 */
var models = exports.models = function () {
    var _ref10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(db) {
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
            while (1) {
                switch (_context10.prev = _context10.next) {
                    case 0:
                        return _context10.abrupt('return', instance.models(db));

                    case 1:
                    case 'end':
                        return _context10.stop();
                }
            }
        }, _callee10, this);
    }));

    return function models(_x7) {
        return _ref10.apply(this, arguments);
    };
}();

/**
 * Checks to make sure the configuration and database models are loaded
 * before returning the db connections that are ready to be used.
 * @param {String} db - Db to return connections for
 * @returns {mongoose.Connection} - Mongoose pooled host connection to the given database
 */


var connections = exports.connections = function () {
    var _ref11 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(db) {
        return regeneratorRuntime.wrap(function _callee11$(_context11) {
            while (1) {
                switch (_context11.prev = _context11.next) {
                    case 0:
                        return _context11.abrupt('return', instance.connections(db));

                    case 1:
                    case 'end':
                        return _context11.stop();
                }
            }
        }, _callee11, this);
    }));

    return function connections(_x8) {
        return _ref11.apply(this, arguments);
    };
}();

/**
 * Returns a promise when the db is ready.
 * @param {String} db - Db to return the connection ready callback for
 * @returns {Promise} - Returns a promise
 */


var connectionReady = exports.connectionReady = function () {
    var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(db) {
        return regeneratorRuntime.wrap(function _callee12$(_context12) {
            while (1) {
                switch (_context12.prev = _context12.next) {
                    case 0:
                        return _context12.abrupt('return', instance.connectionReady(db));

                    case 1:
                    case 'end':
                        return _context12.stop();
                }
            }
        }, _callee12, this);
    }));

    return function connectionReady(_x9) {
        return _ref12.apply(this, arguments);
    };
}();

/**
 * Disconnects all mongoose connections opened in this instance.
 * @returns {Promise} - Returns a promise
 */


exports.configure = configure;
exports.plugin = plugin;
exports.disconnect = disconnect;

var _assert = require('assert');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _repositoryManager = require('./repository-manager');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = new _debug2.default('repository');
var ObjectId = _mongoose2.default.Types.ObjectId;

exports.ObjectId = ObjectId;

// Use native promises

_mongoose2.default.Promise = global.Promise;

// turn on mongoose debugging when applicable
if (process.env.DEBUG) {
    var debugVars = process.env.DEBUG.split(',');
    if (debugVars.includes('*') || debugVars.includes('mongoose')) {
        _mongoose2.default.set('debug', true);
    }
}

var connectionTimeout = 60000;
var defaultOptions = {
    keepAlive: 1000,
    autoReconnect: true,
    socketTimeoutMS: 0,
    connectTimeoutMS: 0,
    reconnectInterval: 2000
};

var Repository = function () {
    function Repository() {
        _classCallCheck(this, Repository);

        this.dbConnections = null;
        this.loadedModels = null;
        this.configuration = null;
        this.dbReadyCallbacks = null;
        this.manager = new _repositoryManager.RepositoryManager(_nodeFetch2.default, _jsYaml2.default);
    }

    /**
     * Configures the database with dbs, connection strings and possible connection options.
     * @param {Object} config - The database repository configuration
     */


    _createClass(Repository, [{
        key: 'configure',
        value: function configure(config) {
            this.configuration = config;
        }

        /**
         * @typedef {Object} SchemaQueryOptions
         * @property {String} [db] - The db to select in the loaded schemas (if one is necessary)
         * @property {String} [schemaPath] - The schema selection path to look for in loaded schemas
         */

        /**
         * Returns the schemas based on the given query options.
         * @param {SchemaQueryOptions} options - Options to pass to schemas query
         * @return {SchemaModel[]} Returns all the schema models based on the given selector
         */

    }, {
        key: 'schemas',
        value: function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(options) {
                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return this._checkConfigAndLoadSchemas();

                            case 2:
                                return _context.abrupt('return', this.manager.schemas(options));

                            case 3:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function schemas(_x) {
                return _ref.apply(this, arguments);
            }

            return schemas;
        }()

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
            return this.manager.plugin(name, _plugin, options);
        }

        /**
         * Checks to make sure the configuration and database models are loaded
         * before returning the repository models for the given db.
         * @param {String} db - The db to look for the given map of model
         * @returns {Object.<string, mongoose.Model>} Map of model name to mongoose models.
         */

    }, {
        key: 'models',
        value: function () {
            var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(db) {
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                _context2.next = 2;
                                return this._checkConfigAndLoad();

                            case 2:
                                return _context2.abrupt('return', this.loadedModels[db]);

                            case 3:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function models(_x2) {
                return _ref2.apply(this, arguments);
            }

            return models;
        }()

        /**
         * Checks to make sure the configuration and database models are loaded
         * before returning the db connections that are ready to be used.
         * @param {String} db - Db to return connections for
         * @returns {mongoose.Connection} - Mongoose pooled host connection to the given database
         */

    }, {
        key: 'connections',
        value: function () {
            var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(db) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this._checkConfigAndLoad();

                            case 2:
                                return _context3.abrupt('return', this.dbConnections[db]);

                            case 3:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function connections(_x3) {
                return _ref3.apply(this, arguments);
            }

            return connections;
        }()

        /**
         * Returns a promise or uses the callback when the db is ready.
         * @param {String} db - Db to return the connection ready callback for
         * @returns {Promise} - Returns a promise
         */

    }, {
        key: 'connectionReady',
        value: function () {
            var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(db) {
                var _this = this;

                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this._checkConfigAndLoad();

                            case 2:
                                return _context4.abrupt('return', new Promise(function (resolve) {
                                    if (_this.dbConnections[db]._hasOpened) {
                                        return resolve();
                                    }
                                    _this.dbReadyCallbacks[db].push(resolve);
                                }));

                            case 3:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function connectionReady(_x4) {
                return _ref4.apply(this, arguments);
            }

            return connectionReady;
        }()

        /**
         * Disconnects all active mongo connections.
         */

    }, {
        key: 'disconnect',
        value: function () {
            var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6() {
                var _this2 = this;

                var promises;
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                if (this.dbConnections) {
                                    _context6.next = 2;
                                    break;
                                }

                                return _context6.abrupt('return', Promise.resolve());

                            case 2:
                                promises = Object.values(this.dbConnections).map(function () {
                                    var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(conn) {
                                        return regeneratorRuntime.wrap(function _callee5$(_context5) {
                                            while (1) {
                                                switch (_context5.prev = _context5.next) {
                                                    case 0:
                                                        if (!(typeof conn.close === 'function')) {
                                                            _context5.next = 3;
                                                            break;
                                                        }

                                                        _context5.next = 3;
                                                        return conn.close();

                                                    case 3:
                                                    case 'end':
                                                        return _context5.stop();
                                                }
                                            }
                                        }, _callee5, _this2);
                                    }));

                                    return function (_x5) {
                                        return _ref6.apply(this, arguments);
                                    };
                                }());
                                _context6.next = 5;
                                return Promise.all(promises);

                            case 5:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function disconnect() {
                return _ref5.apply(this, arguments);
            }

            return disconnect;
        }()

        /**
         * Validate the configuration and loaded schemas, and attach models/connect to database.
         * @private
         */

    }, {
        key: '_checkConfigAndLoad',
        value: function () {
            var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7() {
                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.next = 2;
                                return this._checkConfigAndLoadSchemas();

                            case 2:

                                if (!this.loadedModels) {
                                    this._connectToDbsAndLoadModels();
                                }

                            case 3:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function _checkConfigAndLoad() {
                return _ref7.apply(this, arguments);
            }

            return _checkConfigAndLoad;
        }()

        /**
         * Validate the configuration and load all plugins to attach schemas.
         * @private
         */

    }, {
        key: '_checkConfigAndLoadSchemas',
        value: function () {
            var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8() {
                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                if (this.configuration) {
                                    _context8.next = 2;
                                    break;
                                }

                                throw new _assert.AssertionError({ message: 'Must set repository configuration via configure', expected: 'config' });

                            case 2:

                                debug('loaded', this.manager.isLoaded, this.manager.plugins);

                                if (this.manager.isLoaded) {
                                    _context8.next = 6;
                                    break;
                                }

                                _context8.next = 6;
                                return this.manager.loadPlugins();

                            case 6:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function _checkConfigAndLoadSchemas() {
                return _ref8.apply(this, arguments);
            }

            return _checkConfigAndLoadSchemas;
        }()

        /**
         * Creates db connections based on the configuration and environment
         * variables for authentication. Iterates over schemas per database and
         * creates mongoose models that are ready to generate document operations.
         * @private
         */

    }, {
        key: '_connectToDbsAndLoadModels',
        value: function _connectToDbsAndLoadModels() {
            var _this3 = this;

            this.dbConnections = {};
            this.loadedModels = {};
            this.dbReadyCallbacks = {};

            var pool = {};
            this.configuration.dbs.forEach(function (db) {
                _this3.dbReadyCallbacks[db] = [];

                var connectionString = _this3.configuration[db].connectionString;
                var connectionMatch = connectionString.match('mongodb://([^/]+)/(.*)');
                if (!connectionMatch) {
                    throw new _assert.AssertionError({ message: 'Unknown connection string format', actual: connectionString });
                }

                var hostString = connectionMatch[1];
                var dbString = connectionMatch[2];
                if (!pool[hostString]) {
                    var auth = {};
                    if (process.env.MONGO_APP_USER) {
                        auth.user = process.env.MONGO_APP_USER;
                    }
                    if (process.env.MONGO_APP_PASSWORD) {
                        auth.pass = process.env.MONGO_APP_PASSWORD;
                    }
                    var opts = _lodash2.default.merge({}, defaultOptions, _this3.configuration[db].options, auth);
                    pool[hostString] = _mongoose2.default.createConnection(connectionString, opts);
                    _this3.dbConnections[db] = pool[hostString];
                } else {
                    // share the connection pool after we have established an authenticated pooled connection
                    _this3.dbConnections[db] = pool[hostString].useDb(dbString);
                }

                var failedToConnect = setTimeout(function () {
                    throw new Error('mongo db ' + db + ' failed to connect');
                }, connectionTimeout);
                _this3.dbConnections[db].repository = _this3;
                _this3.dbConnections[db].on('error', function (err) {
                    console.error('connection error:', err);
                    if (err.name === 'DisconnectedError') {
                        // ran out of reconnect retries, kill the process so we can start again
                        console.error('Ran out of reconnection retries, exiting');
                        process.exit();
                    }
                });

                var self = _this3;
                _this3.dbConnections[db].once('open', function callback() {
                    debug('connected to DB ' + db);
                    clearTimeout(failedToConnect);
                    self.dbReadyCallbacks[db].forEach(function (callback) {
                        callback();
                    });
                });

                _this3.loadedModels = _this3.loadedModels || {};
                _this3.loadedModels[db] = _this3._loadModels(db);
            });
        }

        /**
         * Loads all the models based on the manager's loaded schemas.
         * @returns {Object.<string, mongoose.Model>} Map of model name to mongoose models.
         * @private
         */

    }, {
        key: '_loadModels',
        value: function _loadModels(db) {
            var _this4 = this;

            var dbModels = {};
            var schemaName = void 0;
            try {
                var _schemas = this.manager.schemas({ db: db });
                if (!_schemas) {
                    return;
                }

                Object.values(_schemas).forEach(function (schema) {
                    schemaName = schema.name;
                    if (schema.db !== db) {
                        return;
                    }
                    if (schema.models) {
                        schema.models.forEach(function (model) {
                            dbModels[model] = _this4.dbConnections[db].model(model, schema.schema);
                        });
                    }

                    // bind schema to function to get models based on db
                    // this would allow us to access models/connections across dbs
                    schema.schema.repositoryModels = _this4.models.bind(_this4, db);
                });
            } catch (err) {
                console.error('Error while loading model in ' + schemaName + ':\n', err);
                throw err;
            }

            return dbModels;
        }
    }]);

    return Repository;
}();

/**
 * Singleton instance of the repository.
 */


var instance = exports.instance = new Repository();

/**
 * Configures the database with dbs, connection strings and possible connection options.
 * @param {Object} config - The database repository configuration
 */
function configure(config) {
    return instance.configure(config);
}function plugin(name, plugin, options) {
    return instance.plugin(name, plugin, options);
}function disconnect() {
    return instance.disconnect();
}