function getDomainWithProtocol(url: string) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}
export default getDomainWithProtocol;
