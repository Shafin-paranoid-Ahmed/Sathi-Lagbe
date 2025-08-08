export declare const APILoadingStatus: {
    readonly NOT_LOADED: "NOT_LOADED";
    readonly LOADING: "LOADING";
    readonly LOADED: "LOADED";
    readonly FAILED: "FAILED";
    readonly AUTH_FAILURE: "AUTH_FAILURE";
};
export type APILoadingStatus = (typeof APILoadingStatus)[keyof typeof APILoadingStatus];
