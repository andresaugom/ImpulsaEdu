'use strict';

/**
 * Returns the standard error envelope expected by the OpenAPI spec.
 */
const errBody = (code, message, details = null) => ({
    error: { code, message, details }
});

module.exports = { errBody };
