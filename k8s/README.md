# Quak — Kubernetes deployment

This directory contains a Kustomize-based deployment for Quak.

## Layout

```
k8s/
├── base/                 # Shared, environment-agnostic manifests
│   ├── namespace.yaml
│   ├── serviceaccount.yaml
│   ├── configmap.yaml
│   ├── service.yaml
│   ├── statefulset.yaml
│   ├── ingress.yaml
│   ├── pdb.yaml
│   ├── networkpolicy.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/              # quak-dev namespace, MOCK_LLM=true, smaller resources
    └── prod/             # quak namespace, full resources, cert-manager TLS
```

## Why a StatefulSet (not a Deployment)?

Quak uses an embedded DuckDB single-file database (`server/storage/data/quak.duckdb`)
plus disk-based file uploads (`server/storage/uploads/`). Both must be
persisted across restarts and only one writer can hold the DuckDB file.
A StatefulSet with `replicas: 1` and a `volumeClaimTemplate` is the
correct pattern: stable identity, ordered rollouts, and a PVC bound to
the pod's lifecycle.

The app cannot be scaled horizontally without first replacing the embedded
DuckDB / local-disk uploads with shared backing stores (e.g., a managed
Postgres + S3-compatible object store).

## Storage layout inside the container

Set via `STORAGE_DIR=/var/lib/quak` in the ConfigMap:

```
/var/lib/quak/
├── data/
│   └── quak.duckdb
└── uploads/
    └── <uuid>.<ext>
```

The PVC is mounted at `/var/lib/quak`. The container also mounts an
`emptyDir` at `/tmp` because the root filesystem is read-only.

## URL

- Production: `https://quak.scalebase.io`
- Dev:        `https://quak-dev.scalebase.io`

## Build & push the image

```bash
# From the repo root
docker buildx build --platform linux/amd64 \
  -t ghcr.io/imran31415/quak:v1.0.0 \
  -t ghcr.io/imran31415/quak:latest \
  --push .
```

The Dockerfile is multi-stage (`builder` + `runtime`), based on
`node:20-bookworm-slim` (glibc — required for the native
`@duckdb/node-api` addon), runs as non-root uid 1001, and uses `tini`
for PID 1 signal handling.

## Render manifests locally

```bash
kubectl kustomize k8s/overlays/dev    # dry render
kubectl kustomize k8s/overlays/prod
```

## Deploy

```bash
# Dev
kubectl apply -k k8s/overlays/dev

# Prod
kubectl apply -k k8s/overlays/prod
```

To pin a specific image tag without editing files, override via Kustomize:

```bash
( cd k8s/overlays/prod && kustomize edit set image \
  ghcr.io/imran31415/quak=ghcr.io/imran31415/quak:v1.2.3 )
kubectl apply -k k8s/overlays/prod
```

## Rolling restart

```bash
kubectl -n quak rollout restart statefulset/quak
kubectl -n quak rollout status  statefulset/quak
```

## Backups

The DuckDB file lives on the PVC. To snapshot from a running pod:

```bash
kubectl -n quak exec quak-0 -- \
  sh -c 'cat /var/lib/quak/data/quak.duckdb' \
  > "quak-$(date +%Y%m%d-%H%M%S).duckdb"
```

For production, schedule a `CronJob` that mounts the same PVC
read-only and ships the file to object storage.

## Probes

All three probes hit `/api/health`:

| Probe       | Behavior                                                   |
|-------------|------------------------------------------------------------|
| `startup`   | Up to ~150s (DuckDB init / first-write) before failing     |
| `readiness` | Removes pod from Service if `/api/health` fails 3 times    |
| `liveness`  | Restarts pod after sustained failures                      |

## Security posture

- `pod-security.kubernetes.io/enforce: restricted` on the namespace
- `runAsNonRoot`, uid/gid 1001, `fsGroup` 1001 for PVC ownership
- `readOnlyRootFilesystem: true` (writable paths: `/var/lib/quak`, `/tmp`)
- `allowPrivilegeEscalation: false`, all capabilities dropped
- `seccompProfile: RuntimeDefault`
- `automountServiceAccountToken: false`
- Default-deny NetworkPolicy + explicit ingress (from `ingress-nginx`)
  and egress (DNS + 443/TCP to public internet for OpenRouter)
- `PodDisruptionBudget` with `maxUnavailable: 0` — single replica, no
  voluntary disruption while serving traffic

## What is *not* configured (intentionally)

- **Auth**: API routes are unauthenticated. If exposed publicly, front
  with an auth proxy (oauth2-proxy, Cloudflare Access, etc.) or add app
  auth before opening Ingress to the world.
- **Secrets**: The OpenRouter API key is supplied per-request from the
  browser (`x-api-key`), so no Secret is needed server-side. If that
  changes, add a `Secret` and reference it in the StatefulSet via
  `envFrom`.
- **Horizontal scaling**: Not supported; see "Why a StatefulSet" above.
