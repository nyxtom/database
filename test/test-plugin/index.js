import path from 'path';

import * as virtualFormatters from './virtual-formatters';
import * as schemaPlugins from './schema-plugins';

const definitions = ['Foo'].map(d => {
    return path.resolve(__dirname + `/schemas/${d}.yml`);
});

export { definitions, virtualFormatters, schemaPlugins };
