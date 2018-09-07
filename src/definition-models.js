import lodash from 'lodash';
import { Schema } from 'mongoose';
import mongooseBcrypt from 'mongoose-bcrypt';

const schemaTypes = {
    'Number': Number,
    'String': String,
    'Date': Date,
    'Boolean': Boolean,
    'Schema.Types.Mixed': Schema.Types.Mixed,
    'Schema.Types.ObjectId': Schema.Types.ObjectId,
    'ObjectId': Schema.Types.ObjectId
};

export function setSchemaTypes(schema) {
    Object.keys(schema).forEach(schemaKey => {
        let schemaProp;
        let value  = schema[schemaKey];
        if (typeof value === 'object') {
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
            throw new Error(`Unexpected schema structure`, schema);
        }

        schemaProp.type = schemaTypes[schemaProp.type];
    });
}

export function setSchemaValidators(schema, validators) {
    setSchemaMiddleware(schema, 'validator', validators);
}

export function setSchemaSets(schema, setMiddleware) {
    setSchemaMiddleware(schema, 'set', setMiddleware);
}

function setSchemaMiddleware(schema, key, middleware) {
    Object.keys(schema).forEach(schemaKey => {
        let schemaProp;
        let value  = schema[schemaKey];
        if (typeof value === 'object') {
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

        schemaProp[key] = lodash.get(middleware, schemaProp[key]);
    });
}

function hasBcryptFields(schema) {
    if (!schema || typeof schema !== 'object') {
        return false;
    }
    return Object.keys(schema).some(schemaKey => {
        if (schema[schemaKey].bcrypt) {
            return true;
        } else if (Array.isArray(schema[schemaKey])) {
            return hasBcryptFields(schema[schemaKey][0]);
        } else {
            return hasBcryptFields(schema[schemaKey]);
        }
    });
}

export function addVirtualsAndPlugins(definition, schema, formatters, schemaPlugins) {
    if (definition.itemType) {
        let getItemType = function() {
            return definition.itemType;
        };
        schema.virtual('itemType').get(getItemType);
    }
    if (definition.alias) {
        let getAlias = function() {
            return definition.alias;
        };
        schema.virtual('alias').get(getAlias);
    }
    if (!definition.schema.name && definition.nameProperty) {
        let getName = function() {
            return this[definition.nameProperty];
        }
        schema.virtual('name').get(getName);
    }
    if (hasBcryptFields(schema)) {
        schema.plugin(mongooseBcrypt, { rounds: 8 });
    }
    if (definition.virtual && formatters) {
        Object.keys(definition.virtual).forEach(key => {
            let field = definition.virtual[key];

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

            let formatter = field.formatter;
            if (!formatter) {
                return;
            }
            if (typeof formatter === 'string') {
                formatter = { [formatter]: [] };
            }
            if (typeof formatter !== 'object') {
                return;
            }

            let formatMiddlewareKey = Object.keys(formatter)[0];
            let middleware = lodash.get(formatters, formatMiddlewareKey);
            if (!middleware) {
                return;
            }

            let options = formatter[formatMiddlewareKey];
            if (!Array.isArray(options)) {
                options = [options];
            }
            schema.virtual(key).get(function format() {
                return middleware.apply(this, options);
            });
        });
    }
    if (definition.plugins && schemaPlugins) {
        Object.values(definition.plugins).forEach(p => {
            if (typeof p === 'string') {
                if (schemaPlugins[p]) {
                    schema.plugin(schemaPlugins[p]);
                }
            } else if (typeof p === 'object') {
                let key = Object.keys(p)[0];
                let options = p[key];
                if (schemaPlugins[key]) {
                    schema.plugin(schemaPlugins[key], options);
                }
            }
        });
    }
}
