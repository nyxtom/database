'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.setSchemaTypes = setSchemaTypes;
exports.setSchemaValidators = setSchemaValidators;
exports.setSchemaSets = setSchemaSets;
exports.addVirtualsAndPlugins = addVirtualsAndPlugins;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mongoose = require('mongoose');

var _mongooseBcrypt = require('mongoose-bcrypt');

var _mongooseBcrypt2 = _interopRequireDefault(_mongooseBcrypt);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var schemaTypes = {
    'Number': Number,
    'String': String,
    'Date': Date,
    'Boolean': Boolean,
    'Schema.Types.Mixed': _mongoose.Schema.Types.Mixed,
    'Schema.Types.ObjectId': _mongoose.Schema.Types.ObjectId,
    'ObjectId': _mongoose.Schema.Types.ObjectId
};

function setSchemaTypes(schema) {
    Object.keys(schema).forEach(function (schemaKey) {
        var schemaProp = void 0;
        var value = schema[schemaKey];
        if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
            if (value.type) {
                schemaProp = value;
            } else if (Array.isArray(value)) {
                if (typeof value[0] === 'string') {
                    value[0] = { type: value[0] };
                }
                schemaProp = value[0];
            } else {
                return setSchemaTypes(value);
            }
        } else if (typeof value === 'string') {
            schemaProp = schema[schemaKey] = { type: schema[schemaKey] };
        } else {
            throw new Error('Unexpected schema structure in model name ' + modelName, schema);
        }

        schemaProp.type = schemaTypes[schemaProp.type];
    });
}

function setSchemaValidators(schema, validators) {
    setSchemaMiddleware(schema, 'validator', validators);
}

function setSchemaSets(schema, setMiddleware) {
    setSchemaMiddleware(schema, 'set', setMiddleware);
}

function setSchemaMiddleware(schema, key, middleware) {
    Object.keys(schema).forEach(function (schemaKey) {
        var schemaProp = void 0;
        var value = schema[schemaKey];
        if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
            if (value.hasOwnProperty(key)) {
                schemaProp = value;
            } else if (Array.isArray(value)) {
                schemaProp = value[0];
            } else {
                return setSchemaSets(value);
            }
        }

        if (!schemaProp || !schemaProp.hasOwnProperty(key)) {
            return;
        }

        schemaProp[key] = _lodash2.default.get(middleware, schemaProp[key]);
    });
}

function hasBcryptFields(schema) {
    if (!schema || (typeof schema === 'undefined' ? 'undefined' : _typeof(schema)) !== 'object') {
        return false;
    }
    return Object.keys(schema).some(function (schemaKey) {
        if (schema[schemaKey].bcrypt) {
            return true;
        } else if (Array.isArray(schema[schemaKey])) {
            return hasBcryptFields(schema[schemaKey][0]);
        } else {
            return hasBcryptFields(schema[schemaKey]);
        }
    });
}

function addVirtualsAndPlugins(definition, schema, formatters, schemaPlugins) {
    if (definition.itemType) {
        var getItemType = function getItemType() {
            return definition.itemType;
        };

        schema.virtual('itemType').get(getItemType);
    }
    if (definition.alias) {
        var getAlias = function getAlias() {
            return definition.alias;
        };

        schema.virtual('alias').get(getAlias);
    }
    if (!definition.schema.name && definition.nameProperty) {
        var getName = function getName() {
            return this[definition.nameProperty];
        };

        schema.virtual('name').get(getName);
    }
    if (hasBcryptFields(schema)) {
        schema.plugin(_mongooseBcrypt2.default, { rounds: 8 });
    }
    if (definition.virtual && formatters) {
        Object.keys(definition.virtual).forEach(function (key) {
            var field = definition.virtual[key];

            if (typeof field === 'string') {
                field = {
                    formatter: {
                        template: field
                    }
                };
            }

            if (!field.formatter) {
                return;
            }

            var formatter = field.formatter;
            if (!formatter) {
                return;
            }
            if (typeof formatter === 'string') {
                formatter = _defineProperty({}, formatter, []);
            }
            if ((typeof formatter === 'undefined' ? 'undefined' : _typeof(formatter)) !== 'object') {
                return;
            }

            var formatMiddlewareKey = Object.keys(formatter)[0];
            var middleware = _lodash2.default.get(formatters, formatMiddlewareKey);
            if (!middleware) {
                return;
            }

            var options = formatter[formatMiddlewareKey];
            if (!Array.isArray(options)) {
                options = [options];
            }
            schema.virtual(key).get(function format() {
                return middleware.apply(this, options);
            });
        });
    }
    if (definition.plugins && schemaPlugins) {
        Object.values(definition.plugins).forEach(function (p) {
            if (typeof p === 'string') {
                if (schemaPlugins[p]) {
                    schema.plugin(schemaPlugins[p]);
                }
            } else if ((typeof p === 'undefined' ? 'undefined' : _typeof(p)) === 'object') {
                var key = Object.keys(p)[0];
                var options = p[key];
                if (schemaPlugins[key]) {
                    schema.plugin(schemaPlugins[key], options);
                }
            }
        });
    }
}