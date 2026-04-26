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

Create the zone first:

```bash
az network dns zone create \
  --resource-group rg-impulsaedu \
  --name impulsaedu.com
```

| Record type | Name | Value |
|-------------|------|-------|
| A | `your.domain.com` | `<LoadBalancer IP>` |

Configure this in your DNS provider (e.g., Azure DNS, Cloudflare, GoDaddy).

**Azure DNS example:**

```bash
az network dns record-set a add-record \
  --resource-group rg-impulsaedu \
  --zone-name impulsaedu.com \
  --record-set-name app \
  --ipv4-address <LoadBalancer IP>
```

Then, get the nameservers assigned to the zone: 

```bash
az network dns zone show \
  --resource-group rg-impulsaedu \
  --name impulsaedu.com \
  --query nameServers -o tsv
```

---

### No-IP DDNS (free dynamic DNS option)

If you do not own a domain, [No-IP](https://www.noip.com) provides free hostnames (e.g. `myapp.ddns.net`) that you can point to the LoadBalancer IP.

**2a. Create or update a hostname in the No-IP dashboard**

1. Log in at <https://www.noip.com> and go to **Dynamic DNS → No-IP Hostnames**.
2. Click **Create Hostname** (or edit an existing one).
3. Fill in:
   - **Hostname**: your chosen label (e.g. `impulsaedu`)
   - **Domain**: pick a free suffix (e.g. `ddns.net`) or your own domain if linked
   - **IP / Target**: paste the LoadBalancer IP from Step 1
4. Click **Save**.

Your hostname (e.g. `impulsaedu.ddns.net`) now resolves to the LoadBalancer IP.

**2b. Keep the record up to date if your IP changes**

The Azure LoadBalancer IP is stable as long as the cluster exists, but if you ever recreate the cluster (and did not reserve a static IP in Step 1), you must update the No-IP record manually — or run the No-IP Dynamic Update Client (DUC) on a machine that monitors the IP:

```bash
# Install the DUC on a Linux host (see https://www.noip.com/support/knowledgebase/install-linux-3-x-dynamic-update-client-duc/)
# Then configure /etc/no-ip2.conf with your credentials and hostname.
# The DUC polls your public IP and pushes updates to No-IP automatically.
noip2 -C   # interactive configuration wizard
noip2      # start the daemon
```

> **Tip:** If the LoadBalancer IP is reserved as a static Azure public IP (see Step 1), the IP never changes and you do not need the DUC.

**2c. Use the No-IP hostname in your ingress**

Replace any reference to `your.domain.com` in `k8s/overlays/prod/ingress.yaml` (and in cert-manager's `dnsNames`) with your No-IP hostname before applying `kubectl apply -k k8s/overlays/prod`:

```yaml
spec:
  tls:
    - hosts:
        - impulsaedu.ddns.net
      secretName: impulsa-tls
  rules:
    - host: impulsaedu.ddns.net
```

Let's Encrypt supports HTTP-01 challenges for `ddns.net` subdomains, so certificate issuance works the same way as with a custom domain.

---

## Step 3 — Verify DNS propagation

```bash
# Confirm the A record resolves
dig +short your.domain.com
# Should return the LoadBalancer IP

# Or with nslookup
nslookup your.domain.com
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
curl -I https://your.domain.com/           # → frontend (200)
curl -I https://your.domain.com/auth/      # → auth-service
curl -I https://your.domain.com/api/v1/schools  # → api-service (200, public)
curl -I https://your.domain.com/api/v1/courses  # → api-service (401, JWT required)

# HTTP → HTTPS redirect
curl -I http://your.domain.com/
# → HTTP/1.1 301 Moved Permanently
# → Location: https://your.domain.com/
```

---

## Rate limits

Let's Encrypt production enforces a limit of **5 duplicate certificates per week**. Always use staging first. If you hit the limit, you must wait 7 days or use a new domain/subdomain.
