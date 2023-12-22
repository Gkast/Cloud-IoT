import { Pool, QueryResult } from "pg";
import { MyHttpHandler, MyHttpResponse } from "../../util/tool/http-tools";
export type Scenario = {
    type: "tab";
    label: "Health Services";
    disabled: false;
    info: "";
    env: [];
    nodes: ScenarioNodes;
};
export type ScenarioNodes = Array<{
    [key: string]: string;
}>;
export type ScenarioQueryResult = {
    has_dependency: boolean;
    is_dependency_injected: boolean;
    is_tab_injected: boolean;
    service_id: string;
    service_url: string;
    service_params: {
        [key: string]: string;
    };
    service_pack_id: string;
    service_tab_url: string;
    dependency_data: {
        [key: string]: string;
    };
    dependency_node_id: string;
    dependency_id: string;
    service_pack_flow_id: string;
};
export type ScenarioQueryResultGrouped = {
    has_dependency: boolean;
    dependencies: [
        {
            is_dependency_injected: boolean;
            dependency_data: {
                [key: string]: string;
            };
            dependency_node_id: string;
            dependency_id: string;
        }
    ];
    service_id: string;
    service_url: string;
    service_params: {
        [key: string]: string;
    };
    is_tab_injected: boolean;
    service_pack_id: string;
    service_tab_url: string;
    service_pack_flow_id: string;
};
export declare function addScenario(pool: Pool): MyHttpHandler;
export declare function parseScenarioQueryResult(scenarioQueryResult: QueryResult<ScenarioQueryResult>): Promise<any>;
export declare function parseScenario(scenario: Array<{
    [key: string]: string;
}>, scenarioParams: Array<{
    paramToReplace: string;
    replaceValue: string;
}>): Promise<{
    [x: string]: string;
}[]>;
export declare function parseScenarioParams(scenarioGrouped: ScenarioQueryResultGrouped, userParams: Array<{
    [key: string]: string;
}>): Promise<any[]>;
export declare function sendScenario(pool: Pool, scenarioTab: Scenario, scenarioGrouped: ScenarioQueryResultGrouped, deviceID: string, username: string, password: string, ip_address: string, scenarioParams: any[]): Promise<MyHttpResponse>;
