import * as oa from "./openApi"
import * as oaPlus from "./openApiPlus"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as tuple from "@ts-common/tuple"

/**
 * Returns a name of the given parameter
 * @param parameter an OpenAPI parameter.
 *
 * TODO:
 * - the given parameter can have a `$ref`.
 * - the function should never return `undefined`
 */
function getParameterName(parameter: oa.Parameter): string|undefined {
    return parameter.name
}

/**
 * Returns an enum of the given parameter.
 * @param parameter an OpenAPI parameter
 *
 * TODO: the given parameter can have a `$ref` or a `schema`. The `schema` may have a `$ref` as well.
 */
function getParameterEnum(parameter: oa.Parameter): ReadonlyArray<string>|undefined {
    return parameter.enum
}

interface Discriminator {
    readonly name: string
    readonly value: string
}

function getOperation(
    { name, value }: Discriminator, operation: oa.Operation
): oa.Operation|undefined {
    const parameters = operation.parameters

    if (parameters === undefined) {
        // operation has no parameters
        return undefined
    }

    const parameter = _.find(parameters, p => getParameterName(p) === name)
    if (parameter === undefined) {
        // operation has no discriminator parameter
        return undefined
    }

    const parameterEnum = getParameterEnum(parameter)
    if (parameterEnum === undefined) {
        // the discriminator parameter is not an enumeration
        return undefined
    }

    if (!_.find(parameterEnum, v => v === value)) {
        // the operation is not compatible with the given discriminator value.
        return undefined
    }

    // TODO: a discriminator parameter should have only one value.
    return operation
}

function convertOperations(
    discriminator: Discriminator,
    operations: oaPlus.Operations,
): oa.Operation|undefined {
    const operationArray = _.isArray(operations) ? operations : [operations]
    const result = _.toArray(_.filterMap(operationArray, o => getOperation(discriminator, o)))
    // TODO: if result.length > 1 then we have more than one operation for the given discriminator
    // value.
    return result.length === 0 ? undefined : result[0]
}

type Method = "get"|"put"|"post"|"delete"|"options"|"head"|"patch"

const methods: ReadonlyArray<Method> = ["get", "put", "post", "delete", "options", "head", "patch"]

function convertPathItem(
    discriminator: Discriminator,
    pathItem: oaPlus.PathItem
): oa.PathItem {
    // TODO: resolve `pathItem.$ref`.
    const result = _.filterMap(methods, method => {
        const operations = pathItem[method]
        return operations !== undefined
            ? tuple.tuple2(method, convertOperations(discriminator, operations))
            : undefined
    })
    // TODO: we need to use propertyMap to properly clone the object.
    return sm.stringMap(result)
}

function convertPath(discriminator: Discriminator, paths: oaPlus.Paths): oa.Paths {
    const entries = sm.entries(paths)
    const result = _.map(
        entries,
        ([path, pathItem]) => sm.entry(path, convertPathItem(discriminator, pathItem)))
    // TODO: we need to use propertyMap to properly clone the object.
    return sm.stringMap(result)
}

function convertOpenApi(discriminator: Discriminator, source: oaPlus.Main): oa.Main {
    // TODO: we need to use propertyMap to properly clone the object.
    return {
        swagger: source.swagger,
        info: source.info,
        paths: convertPath(discriminator, source.paths),
    }
}

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
