# openapi-plus
OpenAPI

A transpiler to transform OpenAPI with features to the standard OpenAPI (3.\*). Proposed components:
- **OpenAPI+ parser.** It should produce statically typed AST (using TypeScript type system). We may use the [Schema2Ts](http://github.com/ts-common/schema2ts) to generate the main part of the parser.
- **Transpiler from OpenAPI+ AST to OpenAPI AST**

## Proposed Features

### Improve API version support

Several options

1. Keep only files for the latests API version and use source control (Git) to reference old API versions
1. Have `dif` files for new API version.
   - this implementation requires a specific `dif` file format.
1. Keep all API version in one file
   - this implementation may require OpenAPI language changes.
