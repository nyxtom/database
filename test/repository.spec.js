import { expect } from 'chai';

import * as repo from '../src/repository';
import * as testPlugin from './test-plugin';

describe('database repository', () => {

    beforeEach(() => {
        repo.configure({
            dbs: ['test'],
            test: {
                connectionString: 'mongodb://localhost/test'
            }
        });
        repo.plugin('foo', testPlugin);
    });

    afterEach(async () => {
        await repo.disconnect();
    });

    it('should be able to load a plugin and retrieve schemas', async () => {
        // load the schemas
        let schemas = await repo.schemas();
        expect(schemas).to.exist;
        expect(schemas.test).to.exist;
        expect(schemas.test.Foo).to.exist;
        expect(schemas.test.Foo.name).to.equal('Foo');
        expect(schemas.test.Foo.db).to.equal('test');
        expect(schemas.test.Foo.definition).to.exist;
        expect(schemas.test.Foo.definition.virtual).to.exist;
        expect(schemas.test.Foo.definition.virtual.name).to.exist;
        expect(typeof schemas.test.Foo.schema.newDocument).to.equal('function');
    });

    it('should be able to load a plugin and get the model', async () => {
        // load the models
        let models = await repo.models('test');
        expect(models).to.exist;
        expect(models.Foo).to.exist;
        await models.Foo.deleteOne({ _id: '5b91eb654c5786f255ff7290' });

        let doc = new models.Foo({ _id: '5b91eb654c5786f255ff7290', firstName: 'Foo', lastName: 'Bar', email: 'test@example.com', password: 'testpass' });
        await doc.save();
        expect(doc.verifyPasswordSync('testpass')).to.be.true;
        expect(doc.password).to.not.equal('testpass');
        expect(doc.firstName).to.equal('Foo');
        expect(doc.lastName).to.equal('Bar');
        expect(doc.name).to.equal('Foo Bar');
        expect(typeof doc.hello).to.equal('function');
        expect(doc.hello()).to.equal('world');
        await doc.delete();
    });

});
