import { Logger } from "../logger";

export type GitHubCredentials = {
  apiUrl: string;
  username: string;
  accessToken: string;
};

export type GitHubIssuesFeatures = {
  issueComments: boolean;
};

export type GitHubIssuesData = ({
  comments: number;
  comments_url: string;
  comments_data: unknown[];
} & unknown)[];

/**
 * Implements the exporting of GitHub issues and their comments to JSON.
 */
export default class GitHubIssuesProvider {
  constructor(
    private readonly log: Logger,
    private readonly credentials: GitHubCredentials,
    private readonly features: GitHubIssuesFeatures,
  ) {}

  private async request(path: string, relative: boolean = true): Promise<unknown[]> {
    const response = await fetch((relative ? this.credentials.apiUrl : "") + path, {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(this.credentials.username + ":" + this.credentials.accessToken).toString("base64"),
      },
    });
    return (await response.json()) as unknown[];
  }

  public async getIssues(repository: string): Promise<GitHubIssuesData> {
    const issues = [];

    // Fetch issues themselves
    for (let page = 1; ; page++) {
      const response = (await this.request(
        `/repos/${repository}/issues?state=all&per_page=100&page=${page}`,
      )) as GitHubIssuesData;

      if (response.length) {
        this.log.info(`Fetched ${response.length} issues for repository '${repository}'`);
        issues.push(...response);
      } else {
        break;
      }
    }

    if (this.features.issueComments) {
      // Fetch comments of issues
      for (const issue of issues) {
        if (issue.comments > 0) {
          const response = await this.request(`${issue.comments_url}?per_page=100`, false);
          issue.comments_data = response;
        } else {
          issue.comments_data = [];
        }
      }
    }

    return issues;
  }
}
