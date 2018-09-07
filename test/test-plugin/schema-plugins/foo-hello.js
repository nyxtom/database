export function fooHello(schema) {
    schema.methods.hello = function () {
        return 'world';
    };
}
