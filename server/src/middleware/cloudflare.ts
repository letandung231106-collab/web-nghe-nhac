import net from 'net';
import { Request, Response, NextFunction } from 'express';

// Cloudflare edge IP ranges (https://www.cloudflare.com/ips/)
const CLOUDFLARE_IPV4 = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];
const CLOUDFLARE_IPV6 = [
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
  '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
];

const cloudflareRanges = new net.BlockList();
for (const cidr of CLOUDFLARE_IPV4) {
  const [ip, prefix] = cidr.split('/');
  cloudflareRanges.addSubnet(ip, Number(prefix), 'ipv4');
}
for (const cidr of CLOUDFLARE_IPV6) {
  const [ip, prefix] = cidr.split('/');
  cloudflareRanges.addSubnet(ip, Number(prefix), 'ipv6');
}

const isCloudflareIp = (ip: string): boolean => {
  const normalized = ip.replace(/^::ffff:/, '');
  const family = net.isIP(normalized);
  if (!family) return false;
  return cloudflareRanges.check(normalized, family === 4 ? 'ipv4' : 'ipv6');
};

// When the request reaches us through a Cloudflare edge, replace req.ip with the real visitor IP
// (CF-Connecting-IP). The header is only trusted if the immediate proxy is a Cloudflare IP,
// otherwise anyone could spoof it to bypass rate limiting.
export const cloudflareRealIp = (req: Request, _res: Response, next: NextFunction) => {
  const proxyIp = req.ip || req.socket.remoteAddress || '';
  const cfIp = req.headers['cf-connecting-ip'];

  if (typeof cfIp === 'string' && net.isIP(cfIp.trim()) && isCloudflareIp(proxyIp)) {
    Object.defineProperty(req, 'ip', { value: cfIp.trim(), configurable: true });
  }

  next();
};
