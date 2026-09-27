# Supported services

Generated from data/services.json. Verified 2026-09-27. Do not edit manually.

[Remote source](https://github.com/digitalocean-labs/mcp-digitalocean/blob/v1.1.1/README.md) · [Local identifiers](https://github.com/digitalocean-labs/mcp-digitalocean/blob/v1.1.1/pkg/registry/registry.go)

Local package: `@digitalocean/mcp@1.1.1`. All endpoints and tools remain upstream-managed. Local MCP also registers shared region tools; service selection is not an authorization boundary.

| Key | Service | Remote endpoint | Authentication | Local |
| --- | --- | --- | --- | --- |
| accounts | Accounts | https://accounts.mcp.digitalocean.com/mcp | oauth-or-token | accounts |
| apps | App Platform | https://apps.mcp.digitalocean.com/mcp | oauth-or-token | apps |
| insights | Insights | https://insights.mcp.digitalocean.com/mcp | oauth-or-token | insights |
| docs | Documentation | https://docs.mcp.digitalocean.com/mcp | none | docs |
| docr | Container Registry | https://docr.mcp.digitalocean.com/mcp | oauth-or-token | docr |
| spaces | Spaces | https://spaces.mcp.digitalocean.com/mcp | oauth-or-token | spaces |
| networking | Networking | https://networking.mcp.digitalocean.com/mcp | oauth-or-token | networking |
| droplets | Droplets | https://droplets.mcp.digitalocean.com/mcp | oauth-or-token | droplets |
| databases | Managed Databases | https://databases.mcp.digitalocean.com/mcp | oauth-or-token | databases |
| doks | Kubernetes | https://doks.mcp.digitalocean.com/mcp | oauth-or-token | doks |
| volumes | Volumes | https://volumes.mcp.digitalocean.com/mcp | oauth-or-token | volumes |
| nfs | NFS | https://nfs.mcp.digitalocean.com/mcp | oauth-or-token | nfs |
| functions | Functions | https://functions.mcp.digitalocean.com/mcp | oauth-or-token | functions |
| marketplace | Marketplace | https://marketplace.mcp.digitalocean.com/mcp | oauth-or-token | marketplace |
| vector-databases | Vector Databases | https://vector-databases.mcp.digitalocean.com/mcp | oauth-or-token | vector-databases |
| dedicated-inference | Dedicated Inference | https://dedicated-inference.mcp.digitalocean.com/mcp | oauth-or-token | dedicated-inference |
| inference-modelcatalog | Inference Model Catalog | https://inference-modelcatalog.mcp.digitalocean.com/mcp | oauth-or-token | inference-modelcatalog |
| genai-evaluation | GenAI Evaluation | https://genai-evaluation.mcp.digitalocean.com/mcp | oauth-or-token | genai-evaluation |
| genai-custom-models | GenAI Custom Models | https://genai-custom-models.mcp.digitalocean.com/mcp | oauth-or-token | genai-custom-models |
| genai-batchinference | GenAI Batch Inference | https://genai-batchinference.mcp.digitalocean.com/mcp | oauth-or-token | genai-batchinference |
| genai-inferencerouter | GenAI Inference Router | https://genai-inferencerouter.mcp.digitalocean.com/mcp | oauth-or-token | genai-inferencerouter |

## Presets

- **core**: accounts, apps, insights, docs.
- **app-platform**: accounts, apps, insights, docr, spaces, networking, docs.
- **infrastructure**: accounts, droplets, databases, doks, networking, volumes, nfs, insights, docs.
- **full**: accounts, apps, insights, docs, docr, spaces, networking, droplets, databases, doks, volumes, nfs, functions, marketplace, vector-databases, dedicated-inference, inference-modelcatalog, genai-evaluation, genai-custom-models, genai-batchinference, genai-inferencerouter.

Core is the default. Full is advanced and may reduce tool-selection accuracy. Custom selections enable only the requested services. Availability of an endpoint does not establish support for every resource or metric within its product.
