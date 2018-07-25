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
                name: "api-version",
                enum: ["2016", "2017", "2018"],
            },
            paths: {
                "/path": {
                    get: {
                        operationId: "",
                        parameters: [
                            {
                                name: "api-version",
                                type: "string",
                            }
                        ],
                        responses: {},
                    },
                    put: {
                        operationId: "",
                        parameters: [
                            {
                                name: "api-version",
                                type: "string",
                                enum: ["2017", "2018"]
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
