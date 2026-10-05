// Agave 4.2 serves transaction v1 (SIMD-0385). A getTransaction call that caps the version below 1 is
// answered with -32015 as soon as the requested transaction is v1.
export const MAX_SUPPORTED_TRANSACTION_VERSION = 1;
