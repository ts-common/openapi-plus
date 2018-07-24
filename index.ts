import * as oa from "./openApi"
import * as oaPlus from "./openApiPlus"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as tuple from "@ts-common/tuple"

// TODO: the given parameter can have a `$ref`
function getParameterName(parameter: oa.Parameter): string|undefined {
    return parameter.name
}

// TODO: the given parameter can have a `$ref` or a `schema`. The `schema` can have a `$ref` as well.
function getParameterEnum(parameter: oa.Parameter): ReadonlyArray<string>|undefined {
    return parameter.enum
}

function getDiscriminatorValues(
    discriminatorName: string, operation: oa.Operation
): ReadonlyArray<string> {
    const parameters = operation.parameters

    if (parameters === undefined) {
        return []
    }

    const parameter = _.find(parameters, p => getParameterName(p) === discriminatorName)
    if (parameter === undefined) {
        return []
    }

    const parameterEnum = getParameterEnum(parameter)
    if (parameterEnum === undefined) {
        return []
    }

    return parameterEnum
}

function getOperations(discriminator: string, operation: oa.Operation): Iterable<sm.Entry<oa.Operation>> {
    const discriminators = getDiscriminatorValues(discriminator, operation)
    return _.map(discriminators, d => sm.entry(d, operation))
}

function convertOperations(discriminator: string, operations: oaPlus.Operations): Iterable<sm.Entry<oa.Operation>> {
    if (_.isArray(operations)) {
        return _.flatMap(operations, o => getOperations(discriminator, o))
    }
    return getOperations(discriminator, operations)
}

type Method = "get"|"put"|"post"|"delete"|"options"|"head"|"patch"

const methods: ReadonlyArray<Method> = ["get", "put", "post", "delete", "options", "head", "patch"]

// TODO: this function requires a propertyMap
function convertPathItem(
    discriminator: string,
    pathItem: oaPlus.PathItem,
): sm.StringMap<oa.PathItem> {
    const operations = _.filterMap(methods, v => {
        const o = pathItem[v]
        return o === undefined ? undefined : tuple.tuple2(v, o)
    })
    return {}
}

//export function array<T>(...v: T[]): array.ImmutableArray<T> {
//    return v as array.ImmutableArray<T>
//}

/**
 * The main function.
 */
export function main(): void {
    const operationA: oaPlus.Operation = {
        operationId: "a",
        parameters: [
            {
                name: "api-version",
                enum: ["2015-01-01"]
            }
        ],
        responses: {}
    }
    const operationB: oaPlus.Operation = {
        operationId: "b",
        parameters: [
            {
                name: "api-version",
                enum: ["2015-02-01"]
            }
        ],
        responses: {}
    }
    const pathItemPlus: oaPlus.PathItem = {
        get: [operationA, operationB]
    }
    // const pathItem: openApi.PathItem = pathItemPlus
    const oaPlusMain: oaPlus.Main = {
        swagger: "2.0",
        info: {
            title: "Test",
            version: "1.0"
        },
        paths: {
            "somePath/sss": pathItemPlus
        }
    }
    const oaMain: oa.Main = oaPlusMain
}

// tslint:disable-next-line:no-console
console.log("test")
