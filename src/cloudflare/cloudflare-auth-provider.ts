import * as Cloudflare from "cloudflare";

export type CloudflareAuthCredentials = {
  token: string;
};

export default class CloudflareAuthProvider {
  private authClient?: Cloudflare;

  constructor(private readonly credentials: CloudflareAuthCredentials) {}

  public async getClient(): Promise<Cloudflare> {
    if (this.authClient) {
      return this.authClient;
    }

    this.authClient = new Cloudflare(this.credentials);

    return this.authClient;
  }
}
