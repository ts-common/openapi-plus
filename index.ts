import * as oa from "./openApi"
import * as oaPlus from "./openApiPlus"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as ps from "@ts-common/property-set"

type OptionalProperties<T> = {
    readonly [K in keyof T]+?: T[K]
}

function isJsonReference<T>(v: oa.JsonReference|T): v is oa.JsonReference {
    const o: OptionalProperties<oa.JsonReference> = v
    return o.$ref !== undefined
}

/**
 * Returns an enum of the given parameter.
 * @param parameter an OpenAPI parameter
 *
 * TODO: the given parameter can have a `$ref` or a `schema`. The `schema` may have a `$ref` as well.
 */
function getParameterEnum(parameter: oa.Parameter): ReadonlyArray<string>|undefined {
    if (parameter.in === "body") {
        // TODO: we may need to get it from `schema`.
        return undefined
    }
    // TODO: we may need to get it from `schema` as well.
    return parameter.enum
}

interface Discriminator {
    readonly name?: string
    readonly value?: string
}

function getDiscriminatorParameter(discriminatorValue: string, parameter: oa.Parameter) {
    if (parameter.in === "body") {
        // TODO: should we fix schema to support `enum`?
        return parameter
    } else {
        return ps.copyCreate(parameter, { enum: () => [discriminatorValue] })
    }
}

type ParameterArray = ReadonlyArray<oa.Parameter|oa.JsonReference>|undefined

type Optional<T> = {
    readonly value: T
}|undefined

function optional<T>(value: T): Optional<T> {
    return { value }
}

function getOptionalParameter({ name, value }: Discriminator, parameter: oa.Parameter): oa.Parameter|undefined {
    const pName = parameter.name
    if (value !== undefined && pName === name) {
        const pEnum = getParameterEnum(parameter)
        if (pEnum !== undefined) {
            if (_.find(pEnum, v => v === value) === undefined) {
                // the operation is not compatible with the given discriminator value.
                return undefined
            }
            return getDiscriminatorParameter(value, parameter)
        }
        // the discriminator parameter is not an enumeration
        // TODO: we may have an error/warning in this case
        // TODO: narrow the parameter
    }
    return parameter
}

type ParameterOrRef = oa.Parameter|oa.JsonReference

function getOptionalParameterOrRef(
    discriminator: Discriminator, parameter: ParameterOrRef
): ParameterOrRef|undefined {
    if (isJsonReference(parameter)) {
        // TODO: extract parameter from reference. We need to return `undefined` only if the
        // referenced parameter has no possible values
        return parameter
    }
    return getOptionalParameter(discriminator, parameter)
}

// Parameter Objects
// See also https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md
function getOptionalParameters(
    discriminator: Discriminator, parameters: ParameterArray
): Optional<ParameterArray> {

    if (parameters === undefined) {
        // no parameters
        return optional(parameters)
    }

    const result: ParameterOrRef[] = []
    for (const p of parameters) {
        const op = getOptionalParameterOrRef(discriminator, p)
        if (op === undefined) {
            return undefined
        }
        result.push(op)
    }

    return optional(result)
}

function getOperation(
    discriminator: Discriminator, operation: oa.Operation
): oa.Operation|undefined {

    const optionalParameters = getOptionalParameters(discriminator, operation.parameters)

    if (optionalParameters === undefined) {
        return undefined
    }

    const copy = ps.copyProperty(operation)
    return ps.create<oa.Operation>({
        tags: copy,
        summary: copy,
        description: copy,
        externalDocs: copy,
        operationId: copy,
        produces: copy,
        consumes: copy,
        parameters: () => optionalParameters.value,
        responses: copy,
        schemes: copy,
        deprecated: copy,
        security: copy
    })
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

function convertPathItem(
    discriminator: Discriminator,
    pathItem: oaPlus.PathItem
): oa.PathItem|undefined {
    const parameters = getOptionalParameters(discriminator, pathItem.parameters)
    if (parameters === undefined) {
        return undefined
    }
    // TODO: resolve `pathItem.$ref`.
    const operationFactory = (key: Method) => {
        const operations = pathItem[key]
        return operations === undefined ? undefined : convertOperations(discriminator, operations)
    }
    const copy = ps.copyProperty(pathItem)
    return ps.create<oa.PathItem>({
        $ref: copy,
        get: operationFactory,
        put: operationFactory,
        post: operationFactory,
        delete: operationFactory,
        options: operationFactory,
        head: operationFactory,
        patch: operationFactory,
        parameters: () => parameters.value
    })
}

function convertPath(discriminator: Discriminator, paths: oaPlus.Paths): oa.Paths {
    const entries = sm.entries(paths)
    const result = _.map(
        entries,
        ([path, pathItem]) => sm.entry(path, convertPathItem(discriminator, pathItem)))
    return sm.stringMap(result)
}

function convertParameterDefinitions(
    discriminator: Discriminator, source: oa.ParameterDefinitions|undefined
): oa.ParameterDefinitions|undefined {
    if (source === undefined) {
        return undefined
    }
    const entries = sm.entries(source)
    const result = _.filterMap(entries, ([name, def]) => {
        const defResult = getOptionalParameter(discriminator, def)
        return defResult === undefined ? undefined : sm.entry(name, defResult)
    })
    return sm.stringMap(result)
}

function convertOpenApi(discriminator: Discriminator, source: oaPlus.Main): oa.Main {
    const copy = ps.copyProperty(source)
    return ps.create<oa.Main>({
        swagger: () => "2.0",
        info: copy,
        host: copy,
        basePath: copy,
        schemes: copy,
        consumes: copy,
        produces: copy,
        paths: () => convertPath(discriminator, source.paths),
        definitions: copy,
        parameters: () => convertParameterDefinitions(discriminator, source.parameters),
        responses: copy,
        security: copy,
        securityDefinitions: copy,
        tags: copy,
        externalDocs: copy
    })
}

export function convert(source: oaPlus.Main, discriminator: string): sm.StringMap<oa.Main> {
    const parameters = source.parameters
    const discriminatorParameterEntry = parameters === undefined
        ? undefined
        : _.find(sm.entries(parameters), ([, p]) => p.name === discriminator)
    if (discriminatorParameterEntry === undefined) {
        return { default: convertOpenApi({}, source) }
    } else {
        const discriminatorParameter = discriminatorParameterEntry[1]
        const enumValues = getParameterEnum(discriminatorParameter)
        if (enumValues === undefined) {
            // TODO: report an error
            return { default: convertOpenApi({}, source) }
        } else {
            const name = discriminatorParameter.name
            const entries = _.map(
                enumValues,
                value => sm.entry(value, convertOpenApi({ name, value }, source)))
            return sm.stringMap(entries)
        }
    }
}
