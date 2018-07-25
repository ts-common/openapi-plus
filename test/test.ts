import * as openApiPlus from "../index"
import * as oaPlus from "../openApiPlus"

describe("test", () => {
    it("simple", () => {
        const source: oaPlus.Main = {
            swagger: "2.0+",
            info: {
                title: "something",
                version: "0"
            },
            paths: {},
        }
        const result = openApiPlus.convert(source)
        // tslint:disable-next-line:no-console
        console.log(result)
    })
    it("default", () => {
        const source: oaPlus.Main = {
            swagger: "2.0+",
            info: {
                title: "something",
                version: "0"
            },
            paths: {
                "/path": {
                    get: {
                        operationId: "",
                        responses: {}
                    }
                }
            },
        }
        const result = openApiPlus.convert(source)
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(result))
    })
    it("noChanges", () => {
        const source: oaPlus.Main = {
            swagger: "2.0+",
            info: {
                title: "something",
                version: "0",
            },
            discriminator: {
                name: "ud",
                enum: ["1", "2"],
            },
            paths: {
                "/path": {
                    get: {
                        operationId: "",
                        parameters: [],
                        responses: {},
                    },
                    put: {
                        operationId: "",
                        parameters: [
                            {
                                name: "ud"
                            }
                        ],
                        responses: {},
                    }
                }
            },
        }
        const result = openApiPlus.convert(source)
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(result))
    })
})
