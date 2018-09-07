export function fooNewDocument(schema) {
    schema.newDocument = function (obj) {
        if (!obj) { obj = {}; }
        return new Document(obj, schema);
    };
}
