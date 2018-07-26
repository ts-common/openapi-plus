import * as oa from "./openApi"
import * as oaPlus from "./openApiPlus"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as tuple from "@ts-common/tuple"
import * as ps from "@ts-common/property-set"

type OptionalProperties<T> = {
    readonly [K in keyof T]+?: T[K]
}

function isJsonReference<T>(v: oa.JsonReference|T): v is oa.JsonReference {
    const o: OptionalProperties<oa.JsonReference> = v
    return o.$ref !== undefined
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
    readonly name?: string
    readonly value?: string
}

function isBodyParameter(parameter: oa.Parameter): parameter is oa.BodyParameter {
    return parameter.in === "body"
}

function isPathParameter(parameter: oa.NonBodyParameter): parameter is oa.PathParameterSubSchema {
    return parameter.in === "path"
}

function isHeaderParameter(parameter: oa.NonBodyParameter): parameter is oa.HeaderParameterSubSchema {
    return parameter.in === "header"
}

function isQueryParameter(parameter: oa.NonBodyParameter): parameter is oa.QueryParameterSubSchema {
    return parameter.in === "query"
}

function copyPropertyFactory<T>(value: T): <K extends keyof T>(k: K) => T[K] {
    return (k) => value[k]
}

function getDiscriminatorParameter(discriminatorValue: string, parameter: oa.Parameter) {
    if (isBodyParameter(parameter)) {
        // TODO: should we fix schema to support `enum`?
        return parameter
    } else {
        return ps.copyCreate(parameter, { enum: () => [discriminatorValue] })
    }
}

function getOperation(
    { name, value }: Discriminator, operation: oa.Operation
): oa.Operation|undefined {
    const parameters = operation.parameters

    if (parameters === undefined) {
        // operation has no parameters
        return operation
    }

    const parameter = _.find(parameters, p => getParameterName(p) === name)
    if (parameter === undefined) {
        // operation has no discriminator parameter
        return operation
    }

    const parameterEnum = getParameterEnum(parameter)
    if (parameterEnum === undefined) {
        // the discriminator parameter is not an enumeration
        // TODO: we may have an error/warning in this case
        return operation
    }

    if (_.find(parameterEnum, v => v === value) === undefined) {
        // the operation is not compatible with the given discriminator value.
        return undefined
    }

    const copy = copyPropertyFactory(operation)
    const parametersFactory = () => parameters.map(p => {
        const pName = getParameterName(p)
        if (value !== undefined && pName === name) {
            const pEnum = getParameterEnum(p)
            if (pEnum !== undefined) {
                // TODO: apply a property set factory.
                // Should it be applied on a resolved parameter object (no $ref)?
                return getDiscriminatorParameter(value, parameter as oa.Parameter)
            }
        }
        return p
    })
    const factory: ps.Factory<oa.Operation> = {
        tags: copy,
        summary: copy,
        description: copy,
        externalDocs: copy,
        operationId: copy,
        produces: copy,
        consumes: copy,
        parameters: parametersFactory,
        responses: copy,
        schemes: copy,
        deprecated: copy,
        security: copy
    }
    return ps.create(factory)
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
    const operationFactory = (key: Method) => {
        const operations = pathItem[key]
        return operations === undefined ? undefined : convertOperations(discriminator, operations)
    }
    const copy = copyPropertyFactory(pathItem)
    const factory: ps.Factory<oa.PathItem> = {
        $ref: copy,
        get: operationFactory,
        put: operationFactory,
        post: operationFactory,
        delete: operationFactory,
        options: operationFactory,
        head: operationFactory,
        patch: operationFactory,
        parameters: copy
    }
    return ps.create(factory)
}

function convertPath(discriminator: Discriminator, paths: oaPlus.Paths): oa.Paths {
    const entries = sm.entries(paths)
    const result = _.map(
        entries,
        ([path, pathItem]) => sm.entry(path, convertPathItem(discriminator, pathItem)))
    return sm.stringMap(result)
}

function convertOpenApi(discriminator: Discriminator, source: oaPlus.Main): oa.Main {
    const copy = copyPropertyFactory(source)
    const pathsFactory = () => convertPath(discriminator, source.paths)
    const factory: ps.Factory<oa.Main> = {
        swagger: () => "2.0",
        info: copy,
        host: copy,
        basePath: copy,
        schemes: copy,
        consumes: copy,
        produces: copy,
        paths: pathsFactory,
        definitions: copy,
        parameters: copy,
        responses: copy,
        security: copy,
        securityDefinitions: copy,
        tags: copy,
        externalDocs: copy
    }
    return ps.create(factory)
}

export function convert(source: oaPlus.Main): sm.StringMap<oa.Main> {
    const discriminatorParameter = source.discriminator
    if (discriminatorParameter === undefined) {
        return { default: convertOpenApi({}, source) }
    } else {
        const enumValues = getParameterEnum(discriminatorParameter)
        if (enumValues === undefined) {
            // TODO: report an error
            return { default: convertOpenApi({}, source) }
        } else {
            const name = getParameterName(discriminatorParameter)
            const entries = _.map(
                enumValues,
                value => sm.entry(value, convertOpenApi({ name, value }, source)))
            return sm.stringMap(entries)
        }
    }
}
