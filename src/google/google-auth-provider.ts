import { readFile, writeFile } from "fs/promises";
import { Auth, google } from "googleapis";
import * as http from "http";
import { Logger } from "../logger";

export type GoogleAuthCredentials = {
  installed: {
    client_secret: string;
    client_id: string;
  };
};

export default class GoogleAuthProvider {
  private authClient?: Auth.OAuth2Client;

  constructor(
    private readonly log: Logger,
    private readonly credentials: GoogleAuthCredentials,
    private readonly tokenCachePath: string,
    private readonly authCallbackPort: string,
    private readonly scopes: string[],
  ) {}

  private async fetchAuthCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      const authUrl = this.authClient!.generateAuthUrl({
        access_type: "offline",
        scope: this.scopes,
      });

      const server = http.createServer((req, res) => {
        const token = /\?code=(.*)&scope=/.exec(req.url ?? "")?.[1];
        res.end(token ? "Success. You can now close this tab." : "Failure. Try again.");
        server.close();

        if (token) {
          resolve(token);
        } else {
          reject("Invalid token received");
        }
      });
      server.on("connection", (socket) => socket.unref());
      server.listen(this.authCallbackPort, () => {
        this.log.attention("Log in to Google by visiting this url:", authUrl);
      });
    });
  }

  public async getClient(): Promise<Auth.OAuth2Client> {
    if (this.authClient) {
      return this.authClient;
    }

    const { client_secret, client_id } = this.credentials.installed;
    this.authClient = new google.auth.OAuth2(
      client_id,
      client_secret,
      `http://localhost:${this.authCallbackPort}`,
    );

    const cachedToken = await readFile(this.tokenCachePath, "utf-8").catch(() => null);
    if (cachedToken) {
      this.authClient.setCredentials(JSON.parse(cachedToken));
    } else {
      const code = await this.fetchAuthCode();
      const tokenResponse = await this.authClient.getToken(code);
      await writeFile(this.tokenCachePath, JSON.stringify(tokenResponse.tokens));
      this.authClient.setCredentials(tokenResponse.tokens);
    }

    return this.authClient;
  }
}
