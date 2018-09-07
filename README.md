# mongo-boiler
Simple mongoose/mongodb boilerplate with support for model based yaml definitions/plugins, validators, formatters and common mongo models

# Plugin model

Simple ES6/Promise based plugin model for loading models into the database. For every project I've run into I have all this setup code that I use and I got tired of doing it. I like being able to define the common models without all the extra usual stuff like importing commonly used formatters, validators, schemas..etc. `mongo-boiler` uses a singleton instance for the repository as well so the way we will setup plugins is as so. Also check out the `test/` folder for a test plugin example.

```js
import * as repo from 'mongo-boiler';
import * as testPlugin from './test-plugin';

repo.configure({
    dbs: ['test'],
    foo: {
        connectionString: 'mongodb://localhost/test'
    }
});

repo.plugin('foo', testPlugin);

let models = await repo.models('test');
let doc = new models.Foo({
    firstName: 'Foo', 
    lastName: 'Bar', 
    email: 'test@example.com',
    password: 'test123' 
});
console.log(doc.name); // Foo Bar
doc.save();
```

in test-plugin/Foo.yml
```yaml
name: Foo
db: test

schema:
  firstName: String
  lastName: String
  email:
    type: String
    required: true
    unique: true
    set: toLowerCase
    validator: isEmail
  password:
    type: String
    required: true
    bcrypt: true

virtual:
  name:
    type: String
    formatter:
      name: # middleware formatter + arguments to pass
        - firstName
        - lastName

plugins:
  - fooNewDocument
  - fooHello
```

test-plugin/virtual-formatters.js
```js
export function name(a, b) {
    return `${this[a]} ${this[b]}`;
}
```

test-plugin/index.js
```js
import path from 'path';
import * as virtualFormatters from './virtual-formatters';
import * as schemaPlugins from './schema-plugins';

/**
 * List of definition files to load.
 */
const definitions = [
    'Foo'
];

/**
 * For each model name in definitions, calls addDefinitionUri for the
 * resolved path in './${definition}.yml'
 * @typedef {import('../../src/repository-manager').RepositoryManager} RepositoryManager
 *
 * @param {RepositoryManager} repository - Database repository with methods for adding definitions/schemas
 */
async function load(repository) {
    repository.addVirtualFormatters(virtualFormatters);
    repository.addSchemaPlugins(schemaPlugins);

    let promises = definitions.map(async definition => {
        // TODO: use special asset loading to make sure we work in the browser
        await repository.addDefinitionUri(path.resolve(__dirname + `/${definition}.yml`));
    });

    await Promise.all(promises);
}

export default load;
```

## Repository Manager API

Adding definitions (inside the test-plugin prior to calling `repository.plugin`
```js
async function load(repository) {
    await repository.addDefinitionUri(path.resolve(__dirname + '/Foo.yml'));
}
```

Adding definitions via url
```js
async function load(repository) {
    await repository.addDefinitionUri('https://www.example.com/Foo.yml');
}
```

Add validators, schemas plugins, virtual formatters, set formatters.

```js
async function load(repository) {
    repository.addVirtualFormatters(virtualFormatters);
    repository.addSchemaPlugins(schemaPlugins);
    repository.addSetFormatters(setFormatters);
    repository.addValidators(validators);
}
```

## Default Plugins

By default the `mongoose-bcrypt` plugin is used to handle bcrypt fields. Additional support for other types may be used depending on long term needs. Otherwise, the base minimum has been setup. Additional plugins can be added via `repository.addSchemaPlugins`, `repository.addVirtualFormatters`, `repository.addSetFormatters`, `repository.addValidators`. 

## LICENSE

Copyright (c) 2018 Thomas Holloway
Licensed under the MIT license.



