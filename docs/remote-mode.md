# Remote mode

Generate `setup --client CLIENT --mode remote-oauth --preset core --output NEW_DIRECTORY`. Merge the resulting config following `INSTALL.md`, install/import the skills, enable the MCP connections, and authenticate through DigitalOcean when prompted by the client.

The output contains one server per selected service. Documentation is unauthenticated. No Authorization header is added in OAuth mode. Always compare selected services in the client's MCP status UI before use.

ChatGPT and Claude Desktop can require adding connectors through their UI; a generated JSON example alone does not install a connector. Claude Desktop's `connectors.json` is an installation inventory, not its native developer config. No local bridge is included.

An HTTP error or successful unauthenticated response does not prove account access. Use the [acceptance checks](acceptance.md) after authentication. A 401 is not necessarily an outdated endpoint; it may indicate that OAuth has not completed. Do not switch to a token or another account silently.

Use `remote-token` only with one of the documented adapters in [authentication](authentication.md). The CLI emits runtime references and never substitutes credential values.
