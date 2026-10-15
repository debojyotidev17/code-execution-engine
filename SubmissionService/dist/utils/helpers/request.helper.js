// to store and retrieve the correlation ID for the current request
import { AsyncLocalStorage } from "async_hooks";
// to store request-specific correlationID in the current async context
export const asyncLocalStorage = new AsyncLocalStorage();
// gets the correlationID of the current request
export const getCorrelationID = () => {
    const asyncStore = asyncLocalStorage.getStore();
    // return the correlation ID if available otherwise use a fallback value
    return asyncStore?.correlationID ?? "unknown-correlation-id";
};
