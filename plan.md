# Plan

## Questions

### OpenAPI 2.0 vs OpenAPI 3.0

Currently, almost all Azure OpenAPI specifications are OpenAPI 2.0. There is no official JSON-Schema for OpenAPI 3.0. See https://github.com/OAI/OpenAPI-Specification/issues/1032.

### Syntax

#### Current

```json
{
    "swagger": "2.0",

    "paths": {
        "somepath/something": {
            "get": {
                "operationId": "someOperationId"
            }
        }
    }
}
```

#### Proposed

```json
{
    "swagger": "2.0",
    "discriminator": "api-version",
    "paths": {
        "somepath/something": {
            "get": [
                {
                    "operationId": "someOperationId",
                    "parameters": {
                        "api-version": { "enum": ["2013-05", "2013-06"] }
                    }
                },
                {
                    "operationId": "someOperationId",
                    "parameters": {
                        "api-version": { "enum": ["2013-06"] }
                    }
                }
            ]
        }
    }
}
```

See also [JSON-Schema. Enumerated Values](https://spacetelescope.github.io/understanding-json-schema/reference/generic.html#enumerated-values).

## Questions

1. `Discriminator` should have all values
   ```json
   "discriminator": {
       "name": "api-version",
       "enum": ["2013-05", "2013-06"]
   }
   ```
2. Should we rename `Operations` to `OperationOverload`?