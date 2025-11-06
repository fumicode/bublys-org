export function getDomainWithProtocol(url: string) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}
export default getDomainWithProtocol;
