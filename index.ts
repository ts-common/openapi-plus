import * as oa from "./openApi"
import * as oaPlus from "./openApiPlus"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"

function getParameterName(parameter: oa.Parameter): string|undefined {
    return parameter.name
}

function getParameterEnum(parameter: oa.Parameter): ReadonlyArray<string>|undefined {
    return parameter.enum
}

function getDiscriminatorValues(discriminatorName: string, operation: oa.Operation): ReadonlyArray<string> {
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

function convertPathItem(
    discriminator: string,
    pathItem: oaPlus.PathItem,
): sm.StringMap<oa.PathItem> {
    return {}
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
        get: [ operationA, operationB ]
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
