import { AsyncLocalStorage } from "async_hooks";

type AsyncLocalStorageType = {
    correlationID : string
}

export const asyncLocalStorage = new AsyncLocalStorage<AsyncLocalStorageType>();

export const getCorrelationID = () => { 
    const asyncStore = asyncLocalStorage.getStore();
    return asyncStore?.correlationID ?? 'unknown-error-while-creating-correlation-id';
}