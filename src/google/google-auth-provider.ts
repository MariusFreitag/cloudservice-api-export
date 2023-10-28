import { readFile, writeFile } from "fs/promises";
import { Auth, google } from "googleapis";
import * as http from "http";

const TOKEN_CACHE_PATH = __dirname + "/../../private/cached-google-token.json";
const AUTH_CALLBACK_PORT = "3124";

export type GoogleAuthCredentials = {
  installed: {
    client_secret: string;
    client_id: string;
  };
};

export default class GoogleAuthProvider {
  private authClient?: Auth.OAuth2Client;

  constructor(
    private readonly credentials: GoogleAuthCredentials,
    private readonly scopes: string[],
  ) {}

  private async fetchAuthCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      const authUrl = this.authClient!.generateAuthUrl({
        access_type: "offline",
        scope: this.scopes.join(" "),
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
      server.listen(AUTH_CALLBACK_PORT, () => {
        console.log("Log in to Google by visiting this url:", authUrl);
      });
    });
  }

  public async getAccessToken(): Promise<string | undefined | null> {
    const client = await this.getClient();
    return (await client.getAccessToken())?.token;
  }

  public async getClient(): Promise<Auth.OAuth2Client> {
    if (this.authClient) {
      return this.authClient;
    }

    const { client_secret, client_id } = this.credentials.installed;
    this.authClient = new google.auth.OAuth2(
      client_id,
      client_secret,
      `http://localhost:${AUTH_CALLBACK_PORT}`,
    );

    const cachedToken = await readFile(TOKEN_CACHE_PATH, "utf-8").catch(() => null);
    if (cachedToken) {
      this.authClient.setCredentials(JSON.parse(cachedToken));
    } else {
      const code = await this.fetchAuthCode();
      const tokenResponse = await this.authClient.getToken(code);
      await writeFile(TOKEN_CACHE_PATH, JSON.stringify(tokenResponse.tokens));
      this.authClient.setCredentials(tokenResponse.tokens);
    }

    return this.authClient;
  }
}
