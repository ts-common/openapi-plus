import * as openApi from "./openApi"
import * as openApiPlus from "./openApiPlus"

/**
 * The main function.
 */
// tslint:disable-next-line:only-arrow-functions no-empty
export function main(): void {
    const oap: openApiPlus.Main = {
        swagger: "2.0",
        info: {
            title: "Test",
            version: "1.0"
        },
        paths: {
            "somePath/sss": {
                get: [
                    {
                        operationId: "a"
                    },
                    {
                        operationId: "b"
                    }
                ]
            }
        }
    }
    const oa2: openApi.Main = oap
}

// tslint:disable-next-line:no-console
console.log("test")
