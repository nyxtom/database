import path from 'path';
import * as virtualFormatters from './virtual-formatters';
import schemaPlugins from './schema-plugins';

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
