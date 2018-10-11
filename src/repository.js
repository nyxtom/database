import { AssertionError } from 'assert';
import Debug from 'debug';
import yaml from 'js-yaml';
import merge from 'lodash/merge';
import mongoose from 'mongoose';
import fetch from 'node-fetch';

import { RepositoryManager } from './repository-manager';

const debug = new Debug('repository');
const ObjectId = mongoose.Types.ObjectId;

export { ObjectId };

// Use native promises
mongoose.Promise = global.Promise;

// turn on mongoose debugging when applicable
if (process.env.DEBUG) {
    let debugVars = process.env.DEBUG.split(',');
    if (debugVars.includes('*') || debugVars.includes('mongoose')) {
        mongoose.set('debug', true);
    }
}

const connectionTimeout = 60000;
const defaultOptions = {
    keepAlive: 1000,
    autoReconnect: true,
    socketTimeoutMS: 0,
    connectTimeoutMS: 0,
    reconnectInterval: 2000,
    useNewUrlParser: true
};

class Repository {
    constructor() {
        this.dbConnections = null;
        this.loadedModels = null;
        this.configuration = null;
        this.dbReadyCallbacks = null;
        this.manager = new RepositoryManager(fetch, yaml);
    }

    /**
     * Configures the database with dbs, connection strings and possible connection options.
     * @param {Object} config - The database repository configuration
     */
    configure(config) {
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
    async schemas(options) {
        await this._checkConfigAndLoadSchemas();
        return this.manager.schemas(options);
    }

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
    plugin(name, plugin, options) {
        return this.manager.plugin(name, plugin, options);
    }

    /**
     * Checks to make sure the configuration and database models are loaded
     * before returning the repository models for the given db.
     * @param {String} db - The db to look for the given map of model
     * @returns {Object.<string, mongoose.Model>} Map of model name to mongoose models.
     */
    async models(db) {
        await this._checkConfigAndLoad();
        return this.loadedModels[db];
    }

    /**
     * Checks to make sure the configuration and database models are loaded
     * before returning the db connections that are ready to be used.
     * @param {String} db - Db to return connections for
     * @returns {mongoose.Connection} - Mongoose pooled host connection to the given database
     */
    async connections(db) {
        await this._checkConfigAndLoad();
        return this.dbConnections[db];
    }

    /**
     * Returns a promise or uses the callback when the db is ready.
     * @param {String} db - Db to return the connection ready callback for
     * @returns {Promise} - Returns a promise
     */
    async connectionReady(db) {
        await this._checkConfigAndLoad();
        return new Promise((resolve) => {
            if (this.dbConnections[db]._hasOpened) { return resolve(); }
            this.dbReadyCallbacks[db].push(resolve);
        });
    }

    /**
     * Disconnects all active mongo connections.
     */
    async disconnect() {
        if (!this.dbConnections) {
            return Promise.resolve();
        }
        let promises = Object.values(this.dbConnections).map(async conn => {
            if (typeof conn.close === 'function') {
                await conn.close();
            }
        });
        await Promise.all(promises);
    }

    /**
     * Validate the configuration and loaded schemas, and attach models/connect to database.
     * @private
     */
    async _checkConfigAndLoad() {
        await this._checkConfigAndLoadSchemas();

        if (!this.loadedModels) {
            this._connectToDbsAndLoadModels();
        }
    }

    /**
     * Validate the configuration and load all plugins to attach schemas.
     * @private
     */
    async _checkConfigAndLoadSchemas() {
        if (!this.configuration) {
            throw new AssertionError({ message: `Must set repository configuration via configure`, expected: 'config' });
        }

        debug('loaded', this.manager.isLoaded, this.manager.plugins);
        if (!this.manager.isLoaded) {
            await this.manager.loadPlugins();
        }
    }

    /**
     * Creates db connections based on the configuration and environment
     * variables for authentication. Iterates over schemas per database and
     * creates mongoose models that are ready to generate document operations.
     * @private
     */
    _connectToDbsAndLoadModels() {
        this.dbConnections = {};
        this.loadedModels = {};
        this.dbReadyCallbacks = {};

        let pool = {};
        this.configuration.dbs.forEach(db => {
            this.dbReadyCallbacks[db] = [];

            let connectionString = this.configuration[db].connectionString;
            let connectionMatch = connectionString.match('mongodb://([^/]+)/(.*)');
            if (!connectionMatch) {
                throw new AssertionError({ message: 'Unknown connection string format', actual: connectionString });
            }

            let hostString = connectionMatch[1];
            let dbString = connectionMatch[2];
            if (!pool[hostString]) {
                let auth = {};
                if (process.env.MONGO_APP_USER) {
                    auth.user = process.env.MONGO_APP_USER;
                }
                if (process.env.MONGO_APP_PASSWORD) {
                    auth.pass = process.env.MONGO_APP_PASSWORD;
                }
                let opts = merge({}, defaultOptions, this.configuration[db].options, auth);
                pool[hostString] = mongoose.createConnection(connectionString, opts);
                this.dbConnections[db] = pool[hostString];
            } else {
                // share the connection pool after we have established an authenticated pooled connection
                this.dbConnections[db] = pool[hostString].useDb(dbString);
            }

            let failedToConnect = setTimeout(() => { throw new Error(`mongo db ${db} failed to connect`); }, connectionTimeout);
            this.dbConnections[db].repository = this;
            this.dbConnections[db].on('error', err => {
                console.error('connection error:', err);
                if (err.name === 'DisconnectedError') {
                    // ran out of reconnect retries, kill the process so we can start again
                    console.error('Ran out of reconnection retries, exiting');
                    process.exit();
                }
            });

            let self = this;
            this.dbConnections[db].once('open', function callback() {
                debug('connected to DB ' + db);
                clearTimeout(failedToConnect);
                self.dbReadyCallbacks[db].forEach((callback) => { callback(); });
            });

            this.loadedModels = this.loadedModels || {};
            this.loadedModels[db] = this._loadModels(db);
        });
    }

    /**
     * Loads all the models based on the manager's loaded schemas.
     * @returns {Object.<string, mongoose.Model>} Map of model name to mongoose models.
     * @private
     */
    _loadModels(db) {
        let dbModels = {};
        let schemaName;
        try {
            let schemas = this.manager.schemas({ db });
            if (!schemas) {
                return;
            }

            Object.values(schemas).forEach(schema => {
                schemaName = schema.name;
                if (schema.db !== db) {
                    return;
                }
                if (schema.models) {
                    schema.models.forEach(model => {
                        dbModels[model] = this.dbConnections[db].model(model, schema.schema);
                    });
                }

                // bind schema to function to get models based on db
                // this would allow us to access models/connections across dbs
                schema.schema.repositoryModels = this.models.bind(this, db);
            });
        } catch (err) {
            console.error(`Error while loading model in ${schemaName}:\n`, err);
            throw err;
        }

        return dbModels;
    }
}

/**
 * Singleton instance of the repository.
 */
export var instance = new Repository();

/**
 * Configures the database with dbs, connection strings and possible connection options.
 * @param {Object} config - The database repository configuration
 */
export function configure(config) { return instance.configure(config); }

/**
 * Returns the schemas based on the given query options.
 * @param {SchemaQueryOptions} options - Options to pass to schemas query
 * @return {SchemaModel[]} Returns all the schema models based on the given selector
 */
export async function schemas(options) { return instance.schemas(options); }

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
export function plugin(name, plugin, options) { return instance.plugin(name, plugin, options); }

/**
 * Checks to make sure the configuration and database models are loaded
 * before returning the repository models for the given db.
 * @param {String} db - The db to look for the given map of model
 * @returns {Object.<string, mongoose.Model>} Map of model name to mongoose models.
 */
export async function models(db) { return instance.models(db); }

/**
 * Checks to make sure the configuration and database models are loaded
 * before returning the db connections that are ready to be used.
 * @param {String} db - Db to return connections for
 * @returns {mongoose.Connection} - Mongoose pooled host connection to the given database
 */
export async function connections(db) { return instance.connections(db); }

/**
 * Returns a promise when the db is ready.
 * @param {String} db - Db to return the connection ready callback for
 * @returns {Promise} - Returns a promise
 */
export async function connectionReady(db) { return instance.connectionReady(db); }

/**
 * Disconnects all mongoose connections opened in this instance.
 * @returns {Promise} - Returns a promise
 */
export function disconnect() { return instance.disconnect(); }
