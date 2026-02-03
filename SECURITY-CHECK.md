# Security Check

## npm audit

Attempted `npm audit --audit-level=low`, but the registry endpoint returned a 403 Forbidden error in this environment, so a vulnerability report could not be generated.

```
npm warn audit 403 Forbidden - POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk
Forbidden
npm error audit endpoint returned an error
```
