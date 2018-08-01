import * as oa from "./openApi"
import * as oaPlus from "./openApiPlus"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as ps from "@ts-common/property-set"
import { Json, stringify } from "@ts-common/json"

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
function getParameterEnum(parameter: oa.Parameter): ReadonlyArray<Json>|undefined {
    if (parameter.in === "body") {
        // TODO: we may need to get it from `schema`.
        return undefined
    }
    // TODO: we may need to get it from `schema` as well.
    return parameter.enum
}

interface Context {
    readonly source: oaPlus.Main
    readonly discriminatorName?: string
    readonly discriminatorValue?: string
}

interface Tracked<T> {
    readonly value: T
    readonly name: string
}

function tracked<K extends keyof oaPlus.Main>(source: oaPlus.Main, k: K): Tracked<oaPlus.Main[K]> {
    return { value: source[k], name: k }
}

function resolve<T>(
    t: Tracked<sm.StringMap<T|undefined>|undefined>,
    ref: oa.JsonReference
): T|undefined {
    const value = t.value
    if (value === undefined) {
        // error
        return undefined
    }
    const split = ref.$ref.split("/")
    // tslint:disable-next-line:no-magic-numbers
    if (split.length !== 3) {
        // error
        return undefined
    }
    if (split[0] !== "#") {
        // error
        return undefined
    }
    if (split[1] !== t.name) {
        // error
        return undefined
    }
    // tslint:disable-next-line:no-magic-numbers
    return value[split[2]]
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

function getOptionalParameter(
    { discriminatorName, discriminatorValue }: Context,
    parameter: oa.Parameter
): oa.Parameter|undefined {
    const pName = parameter.name
    if (discriminatorValue !== undefined && pName === discriminatorName) {
        const pEnum = getParameterEnum(parameter)
        if (pEnum !== undefined) {
            if (_.find(pEnum, v => v === discriminatorValue) === undefined) {
                // the operation is not compatible with the given discriminator value.
                return undefined
            }
            return getDiscriminatorParameter(discriminatorValue, parameter)
        }
        // the discriminator parameter is not an enumeration
        // TODO: we may have an error/warning in this case
        // TODO: narrow the parameter
    }
    return parameter
}

type ParameterOrRef = oa.Parameter|oa.JsonReference

function getOptionalParameterOrRef(
    discriminator: Context, parameter: ParameterOrRef
): ParameterOrRef|undefined {
    if (isJsonReference(parameter)) {
        const t = tracked(discriminator.source, "parameters")
        const p = resolve(t, parameter)
        if (p === undefined) {
            // can't resolve the parameter.
            return undefined
        }
        const op = getOptionalParameter(discriminator, p)
        // TODO: extract parameter from reference. We need to return `undefined` only if the
        // referenced parameter has no possible values
        return op === undefined ? undefined : parameter
    }
    return getOptionalParameter(discriminator, parameter)
}

// Parameter Objects
// See also https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md
function getOptionalParameters(
    discriminator: Context, parameters: ParameterArray
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
    discriminator: Context, operation: oa.Operation
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
    discriminator: Context,
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
    discriminator: Context,
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

function convertPath(discriminator: Context, paths: oaPlus.Paths): oa.Paths {
    const entries = sm.entries(paths)
    const result = _.map(
        entries,
        ([path, pathItem]) => sm.entry(path, convertPathItem(discriminator, pathItem)))
    return sm.stringMap(result)
}

function convertParameterDefinitions(
    discriminator: Context, source: oa.ParameterDefinitions|undefined
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

function convertOpenApi(context: Context): oa.Main {
    const source = context.source
    const copy = ps.copyProperty(source)
    return ps.create<oa.Main>({
        swagger: () => "2.0",
        info: copy,
        host: copy,
        basePath: copy,
        schemes: copy,
        consumes: copy,
        produces: copy,
        paths: () => convertPath(context, source.paths),
        definitions: copy,
        parameters: () => convertParameterDefinitions(context, source.parameters),
        responses: copy,
        security: copy,
        securityDefinitions: copy,
        tags: copy,
        externalDocs: copy
    })
}

export function mergeEnum(
    a: ReadonlyArray<Json>, b: ReadonlyArray<Json>
): ReadonlyArray<Json> {
    const c = _.concat(a, b)
    const f = _.map(c, v => sm.entry(stringify(v), true))
    const m = sm.stringMap(f)
    const result = _.map(sm.entries(m), ([n]) => n)
    return _.toArray(result)
}

export function convert(source: oaPlus.Main, discriminator: string): sm.StringMap<oa.Main> {
    const parameters = source.parameters
    if (parameters === undefined) {
        return { default: convertOpenApi({ source }) }
    }
    const discriminatorParameters = _.filter(sm.values(parameters), p => p.name === discriminator)
    const discriminatorEnums = _.filterMap(discriminatorParameters, getParameterEnum)
    const discriminatorEnum = _.reduce(discriminatorEnums, mergeEnum)
    if (discriminatorEnum === undefined) {
        return { default: convertOpenApi({ source }) }
    } else {
        const entries = _.map(
            discriminatorEnum,
            value => sm.entry(
                stringify(value),
                convertOpenApi({
                    source,
                    discriminatorName: discriminator,
                    discriminatorValue: stringify(value)
                })
            )
        )
        return sm.stringMap(entries)
    }
}
