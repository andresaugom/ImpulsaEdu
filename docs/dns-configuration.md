# DNS Configuration — ImpulsaEdu Ingress

## Overview

The ingress-nginx controller creates an Azure LoadBalancer with a public IP. You must point your domain's A record to that IP before Let's Encrypt can issue a certificate.

---

## Step 1 — Get the LoadBalancer IP

After `cluster-setup.sh` completes, retrieve the external IP:

```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}{"\n"}'
```

> **Tip:** If the IP field is empty, the Azure LoadBalancer is still provisioning. Wait 1–2 minutes and retry.

To reserve a static IP (recommended — avoids having to update DNS on cluster recreate):

```bash
az network public-ip create \
  --resource-group rg-impulsaedu \
  --name pip-impulsaedu-ingress \
  --sku Standard \
  --allocation-method Static \
  --query ipAddress -o tsv
```

Then pass it to ingress-nginx:

```bash
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.loadBalancerIP=<STATIC_IP> \
  ...
```

---

## Step 2 — Create the A Record

| Record type | Name | Value |
|-------------|------|-------|
| A | `app.impulsaedu.com` | `<LoadBalancer IP>` |

Configure this in your DNS provider (e.g., Azure DNS, Cloudflare, GoDaddy).

**Azure DNS example:**

```bash
az network dns record-set a add-record \
  --resource-group rg-impulsaedu \
  --zone-name impulsaedu.com \
  --record-set-name app \
  --ipv4-address <LoadBalancer IP>
```

---

## Step 3 — Verify DNS propagation

```bash
# Confirm the A record resolves
dig +short app.impulsaedu.com
# Should return the LoadBalancer IP

# Or with nslookup
nslookup app.impulsaedu.com
```

DNS TTL propagation can take a few minutes up to 1 hour depending on your provider.

---

## Step 4 — Verify staging certificate (before switching to prod)

The Ingress is configured with `letsencrypt-staging` by default. Check issuance:

```bash
# Watch Certificate resource
kubectl describe certificate impulsa-tls -n impulsa-dev

# Watch CertificateRequest
kubectl get certificaterequest -n impulsa-dev

# Watch ACME Challenge (HTTP-01 solver creates a temporary pod/ingress)
kubectl get challenge -n impulsa-dev
```

A successful staging certificate shows `Status: True, Reason: Ready` on the Certificate resource. The certificate itself will show as **untrusted** in browsers — that is expected for staging.

---

## Step 5 — Switch to production issuer

Once staging succeeds, edit `k8s/base/ingress.yaml` and change the annotation:

```yaml
# Before
cert-manager.io/cluster-issuer: "letsencrypt-staging"

# After
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

Delete the existing staging secret so cert-manager re-issues a production certificate:

```bash
kubectl delete secret impulsa-tls -n impulsa-dev
kubectl apply -f k8s/base/ingress.yaml
```

Monitor issuance:

```bash
kubectl describe certificate impulsa-tls -n impulsa-dev
```

Once `Ready`, HTTPS is live and HTTP will automatically redirect (301) to HTTPS.

---

## Verifying end-to-end

```bash
# HTTPS health checks
curl -I https://app.impulsaedu.com/           # → frontend (200)
curl -I https://app.impulsaedu.com/auth/      # → auth-service
curl -I https://app.impulsaedu.com/api/v1/schools  # → api-service (200, public)
curl -I https://app.impulsaedu.com/api/v1/courses  # → api-service (401, JWT required)

# HTTP → HTTPS redirect
curl -I http://app.impulsaedu.com/
# → HTTP/1.1 301 Moved Permanently
# → Location: https://app.impulsaedu.com/
```

---

## Rate limits

Let's Encrypt production enforces a limit of **5 duplicate certificates per week**. Always use staging first. If you hit the limit, you must wait 7 days or use a new domain/subdomain.
