import { AssertionError } from 'assert';
import Debug from 'debug';
import fs from 'fs';
import lodash from 'lodash';
import { Schema } from 'mongoose';
import os from 'os';
import path from 'path';
import validator from 'validator';
import mongooseSchemaToGraphQl from 'mongoose-schema-to-graphql';
import { printType } from 'graphql';

import { addVirtualsAndPlugins, addIndexes, setSchemaTypes, setSchemaSets, setSchemaValidators } from './definition-models';
import * as setFormatters from './repository-set-formatters';

const debug = new Debug('repository');

export class RepositoryManager {

    constructor(fetch, yaml) {
        this.loadedSchemas = null;
        this.loadedGqlSchemas = null;
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
    get isLoaded() {
        return !!this.loadedSchemas;
    }

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
    schemas(options) {
        let loadedSchemas = this.loadedSchemas;
        if (options && options.db) {
            loadedSchemas = loadedSchemas[options.db] || {};
        }

        if (!options || !options.schemaPath) {
            return loadedSchemas;
        }

        return lodash.get(loadedSchemas, options.schemaPath);
    }

    /**
     * Returns the graphql based on the given query options.
     * @param {String} [options.db] - Database to select in the loaded schemas
     * @return {Object} Returns all the graphql schema based on the given selector
     */
    gql(options) {
        let loadedGqlSchemas = this.loadedGqlSchemas;
        if (options && options.db) {
            loadedGqlSchemas = loadedGqlSchemas[options.db] || [];
        }

        return loadedGqlSchemas;
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
    plugin(name, plugin, options) {
        if (!plugin) {
            return;
        }

        let p = plugin;
        if (typeof plugin === 'function') {
            p = { load: plugin };
        } else if (typeof plugin.default === 'function') {
            p = { load: plugin.default };
        }

        this.plugins.push({ name, plugin: p, options });
    }

    /**
     * Loads the default validators, set formatters and virtual formatters for the database.
     */
    loadDefaultFormattersAndValidators() {
        this.validators = Object.assign({}, validator);
        this.setFormatters = Object.assign({}, setFormatters);
        this.virtualFormatters = {};
        this.schemaPlugins = {};
    }

    /**
     * Loads all the plugins for this database.
     */
    async loadPlugins() {
        debug('load plugins', this.plugins);
        this.loadDefaultFormattersAndValidators();

        let promises = this.plugins.map(async plugin => {
            if (plugin.plugin.virtualFormatters) {
                this.addVirtualFormatters(plugin.plugin.virtualFormatters);
            }
            if (plugin.plugin.schemaPlugins) {
                this.addSchemaPlugins(plugin.plugin.schemaPlugins);
            }
            if (plugin.plugin.validators) {
                this.addValidators(plugin.plugin.validators);
            }
            if (plugin.plugin.setFormatters) {
                this.addSetFormatters(plugin.plugin.setFormatters);
            }
            if (plugin.plugin.definitions) {
                await this.addDefinitions(plugin.plugin.definitions, plugin.options || {});
            }
            let loadFn = plugin.plugin.load;
            if (!loadFn || typeof loadFn !== 'function') {
                return;
            }
            let options = plugin.options;
            await loadFn(this, options);
        });

        await Promise.all(promises);
    }

    /**
     * Adds the schema plugins (a map of function name to function) to the current schema plugins.
     * @param {Object.<string, Function>} validators - The map of schema plugin functions
     */
    addSchemaPlugins(schemaPlugins) {
        if (!schemaPlugins || typeof schemaPlugins !== 'object') {
            throw new AssertionError({ message: `Schema plugins must be a non-null object with the name and functions` });
        }

        if (schemaPlugins.default) {
            schemaPlugins = schemaPlugins.default;
        }

        this.schemaPlugins = Object.assign({}, this.schemaPlugins, schemaPlugins);
    }

    /**
     * Adds the validators (a map of function name to function) to the current validators.
     * @param {Object.<string, Function>} validators - The map of validator functions
     */
    addValidators(validators) {
        if (!validators || typeof validators !== 'object') {
            throw new AssertionError({ message: `Validators must be a non-null object with the name and functions` });
        }

        if (validators.default) {
            validators = validators.default;
        }

        this.validators = Object.assign({}, this.validators, validators);
    }

    /**
     * Adds the set formatters (a map of function name to function) to the current set formatters.
     * @param {Object.<string, Function>} formatters - The map of formatter functions
     */
    addSetFormatters(formatters) {
        if (!formatters || typeof formatters !== 'object') {
            throw new AssertionError({ message: `Formatters must be a non-null object with the name and functions` });
        }

        if (formatters.default) {
            formatters = formatters.default;
        }

        this.setFormatters = Object.assign({}, this.setFormatters, formatters);
    }

    /**
     * Adds the virtual formatters (a map of function name to function) to the current virtual formatters.
     * @param {Object.<string, Function>} formatters - The map of formatter functions
     */
    addVirtualFormatters(formatters) {
        if (!formatters || typeof formatters !== 'object') {
            throw new AssertionError({ message: `Formatters must be a non-null object with the name and functions` });
        }

        if (formatters.default) {
            formatters = formatters.default;
        }

        this.virtualFormatters = Object.assign({}, this.virtualFormatters, formatters);
    }

    /**
     * Loads the given parsed definition, or yaml string definition
     * or definition uri string to load from the filesystem.
     * @param {Array|Object|String} definition - Yaml based definition string to parse
     * @param {{ name: String, db: String }} options - Options to include for default name
     */
    addDefinitions(definitions, options) {
        if (Array.isArray(definitions)) {
            let promises = definitions.map(definition => {
                if (typeof definition === 'object') {
                    return this.addDefinition(definition, options);
                } else if (typeof definition === 'string') {
                    return this.addDefinitionUri(definition, options);
                } else {
                    return Promise.reject(new TypeError('Invalid type for definition in plugin'));
                }
            });
            return Promise.all(promises);
        } else {
            if (typeof definitions === 'object') {
                return this.addDefinition(definitions, options);
            } else if (typeof definitions === 'string') {
                return this.addDefinitionUri(definitions, options);
            } else {
                return Promise.reject(new TypeError('Invalid type for definition in plugin'));
            }
        }
    }

    /**
     * Loads the given parsed definition, or yaml string definition
     * or definition uri string to load from the filesystem.
     * @param {Object|String} definition - Yaml based definition string to parse
     * @param {{ name: String}} options - Options to include for default name
     */
    addDefinition(definition, options) {
        if (!definition.schema) {
            return;
        }

        setSchemaTypes(definition.schema);
        setSchemaValidators(definition.schema, this.validators);
        setSchemaSets(definition.schema, this.setFormatters);
        if (!definition.name && options && options.name) {
            definition.name = options.name;
        }

        if (!definition.name) {
            throw new AssertionError({ message: `Must provide a valid model name for the definition schema`, expected: 'model' });
        }

        // define the new mongoose schema with virtuals + plugins setup
        let name = definition.name;
        let schema = new Schema(Object.assign({}, definition.schema));
        addVirtualsAndPlugins(definition, schema, this.virtualFormatters, this.schemaPlugins);
        addIndexes(definition, schema);

        // models to export for each definition
        let models = definition.models || definition.model || definition.name;
        if (typeof models === 'string') {
            models = [models];
        }

        // set the schema into the loaded schemas segmented by db
        if (!definition.db && options && options.db) {
            definition.db = options.db;
        }

        // use env for database name if none is provided
        if (!definition.db && process.env.DATABASE_NAME) {
            definition.db = process.env.DATABASE_NAME;
        }

        if (!definition.db) {
            throw new AssertionError({ message: `Must provide a db name to associate the schema with`, expected: 'db' });
        }

        let gqlObject;
        if (definition.gql) {
            let gqlConfig = Object.assign({
                name: lodash.camelCase(definition.name),
                description: definition.description || `${definition.name} schema`,
                class: 'GraphQLObjectType',
                schema: schema,
                exclude: ['_id']
            });
            gqlObject = printType(mongooseSchemaToGraphQl(gqlConfig));
        }

        let db = definition.db;
        this.loadedSchemas = this.loadedSchemas || {};
        this.loadedSchemas[db] = this.loadedSchemas[db] || {};
        this.loadedSchemas[db][definition.name] = { name, db, definition, models, schema, gql: gqlObject };
        this.loadedGqlSchemas = this.loadedGqlSchemas || {};
        this.loadedGqlSchemas[db] = Object.values(this.loadedSchemas[db])
            .map(d => d.gql)
            .filter(g => !!g);
    }

    /**
     * Parses a yaml definition into schema, models, virtuals and views.
     * @param {String} definition - Yaml definition string to load/parse and add.
     * @param {{ name: String, db: String}} options - Options to include for default name and db
     */
    addDefinitionString(definition, options) {
        return this.addDefinition(this.yaml.load(definition), options);
    }

    /**
     * Loads a definition via get request or from disk, to load/parse.
     * @param {String} definition - Uri to the definition to load
     * @param {{ name: String, db: String}} options - Options to include for default name and db
     */
    addDefinitionUri(definition, options) {
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
    _readDefinitionUri(definition, options) {
        return new Promise((resolve, reject) => {
            if (definition.indexOf('~') === 0) {
                definition = definition.replace('~', os.homedir());
            }
            definition = path.resolve(definition);
            let parsed = path.parse(definition);
            options = options || {};
            options.name = options.name || parsed.name;
            fs.readFile(definition, { flag: 'r', encoding: 'utf8' }, (err, data) => {
                if (err) { return reject(err); }
                return resolve(this.addDefinitionString(data.toString(), options));
            });
        });
    }

    /**
     * Downloads a definition via get request or from disk, to load/parse.
     * @private
     * @param {String} definition - Uri to the definition to download
     * @param {{ name: String, db: String}} options - Options to include for default name and db
     */
    async _downloadDefinitionUri(definition, options) {
        let result = await this.fetch(definition);
        let content = await result.text();
        let parsed = path.parse(definition);
        options = options || {};
        options.name = options.name || parsed.name;
        return this.addDefinitionString(content, options);
    }

    /**
     * Adds a schema to the loaded schemas.
     * @param {String} name - Name of the schema to add
     * @param {Object} schema - Schema definition
     */
    addSchema(name, schema) {
        if (!name) {
            throw new AssertionError({ message: `Must provide a valid schema name`, expected: 'name' });
        }
        this.loadedSchemas = this.loadedSchemas || {};
        this.loadedSchemas[name] = schema;
    }
}
