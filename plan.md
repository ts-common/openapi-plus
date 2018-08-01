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

1. `discriminator` for models. See also
   - [OpenAPI 2.0](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#fixed-fields-13)
   - [OpenAPI 3.0](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#discriminatorObject)
2. Should we rename `Operations` to `OperationOverload`?

## The Parameter Based Model Discriminator

```json
"match-parameter": {
    "name": "api-version",
    "enum": ["2017"]
}
```

## Presentation Feedback

1. GitHub project url
   1. accepting proposals/feedbacks
1. operation example
   1. a webpage which can show generated files. Interactive?
1. Vision/RoadMap for features