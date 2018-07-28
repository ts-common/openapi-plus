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
        const result = openApiPlus.convert(source, "api-version")
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
        const result = openApiPlus.convert(source, "api-version")
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(result))
    })
    it("three versions", () => {
        const source: oaPlus.Main = {
            swagger: "2.0+",
            info: {
                title: "something",
                version: "0",
            },
            parameters: {
                allApiVersions: {
                    name: "api-version",
                    in: "query",
                    type: "string",
                    enum: ["2016", "2017", "2018"],
                }
            },
            paths: {
                "/path": {
                    get: {
                        operationId: "",
                        parameters: [
                            {
                                in: "query",
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
                                in: "query",
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
        const result = openApiPlus.convert(source, "api-version")
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(result))
    })
    it("pathItem parameters", () => {
        const source: oaPlus.Main = {
            swagger: "2.0+",
            info: {
                title: "something",
                version: "0"
            },
            parameters: {
                allApiVersion: {
                    name: "api-version",
                    in: "query",
                    type: "string",
                    enum: ["2016", "2017"],
                }
            },
            paths: {
                "/path": {
                    get: {
                        operationId: "",
                        responses: {}
                    },
                    parameters: [
                        {
                            in: "query",
                            name: "api-version",
                            type: "string",
                            enum: ["2017"]
                        }
                    ],
                }
            },
        }
        const result = openApiPlus.convert(source, "api-version")
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(result))
    })
    it("parameter reference", () => {
        const source: oaPlus.Main = {
            swagger: "2.0+",
            info: {
                title: "something",
                version: "0",
            },
            parameters: {
                allApiVersions: {
                    name: "api-version",
                    in: "query",
                    type: "string",
                    enum: ["2016", "2017", "2018"],
                },
                apiVersionFrom2017: {
                    name: "api-version",
                    in: "query",
                    type: "string",
                    enum: ["2017", "2018"],
                },
            },
            paths: {
                "/path": {
                    get: {
                        operationId: "",
                        parameters: [
                            {
                                $ref: "#/parameters/allApiVersions"
                            }
                        ],
                        responses: {},
                    },
                    put: {
                        operationId: "",
                        parameters: [
                            {
                                $ref: "#/parameters/apiVersionFrom2017"
                            }
                        ],
                        responses: {},
                    }
                }
            },
        }
        const result = openApiPlus.convert(source, "api-version")
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(result))
    })
})
