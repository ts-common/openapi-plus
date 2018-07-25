import * as oa from "./openApi"
import * as oaPlus from "./openApiPlus"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as tuple from "@ts-common/tuple"
import * as ps from "@ts-common/property-set"

function isJsonReference<T>(v: oa.JsonReference|T): v is oa.JsonReference {
    return (v as oa.JsonReference).$ref !== undefined
}

/**
 * Returns a name of the given parameter
 * @param parameter an OpenAPI parameter.
 *
 * TODO:
 * - the given parameter can have a `$ref`.
 * - the function should never return `undefined`
 */
function getParameterName(parameter: oa.Parameter|oa.JsonReference): string|undefined {
    if (isJsonReference(parameter)) {
        return undefined
    }
    return parameter.name
}

/**
 * Returns an enum of the given parameter.
 * @param parameter an OpenAPI parameter
 *
 * TODO: the given parameter can have a `$ref` or a `schema`. The `schema` may have a `$ref` as well.
 */
function getParameterEnum(parameter: oa.Parameter|oa.JsonReference): ReadonlyArray<string>|undefined {
    if (isJsonReference(parameter)) {
        return undefined
    }
    if (parameter.in === "body") {
        return undefined
    }
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
    const co = (key: Method) => {
        const operations = pathItem[key]
        return operations === undefined ? undefined : convertOperations(discriminator, operations)
    }
    const id = <K extends keyof oaPlus.PathItem>(k: K) => pathItem[k]
    const factory: ps.PropertySetFactory<oa.PathItem> = {
        $ref: id,
        get: co,
        put: co,
        post: co,
        delete: co,
        options: co,
        head: co,
        patch: co,
        parameters: id
    }
    return ps.propertySet(factory)
}

function convertPath(discriminator: Discriminator, paths: oaPlus.Paths): oa.Paths {
    const entries = sm.entries(paths)
    const result = _.map(
        entries,
        ([path, pathItem]) => sm.entry(path, convertPathItem(discriminator, pathItem)))
    return sm.stringMap(result)
}

function convertOpenApi(discriminator: Discriminator, source: oaPlus.Main): oa.Main {
    const id = <K extends keyof oaPlus.Main>(k: K) => source[k]
    const cp = (k: "paths") => convertPath(discriminator, source.paths)
    const factory: ps.PropertySetFactory<oa.Main> = {
        swagger: id,
        info: id,
        host: id,
        basePath: id,
        schemes: id,
        consumes: id,
        produces: id,
        paths: cp,
        definitions: id,
        parameters: id,
        responses: id,
        security: id,
        securityDefinitions: id,
        tags: id,
        externalDocs: id
    }
    return ps.propertySet(factory)
}
