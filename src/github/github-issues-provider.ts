type GitHubCredentials = {
  apiUrl: string;
  username: string;
  accessToken: string;
};

export default class GitHubIssueProvider {
  constructor(private readonly credentials: GitHubCredentials) {}

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

  public async getIssues(repository: string): Promise<any> {
    const issues = [];

    // Fetch issues themselves
    for (let page = 1; ; page++) {
      const response = await this.request(`/repos/${repository}/issues?page=${page}`);

      if (response.length) {
        console.log(`Fetched ${response.length} issues for repository ${repository}'`);
        issues.push(...response);
      } else {
        break;
      }
    }

    // Fetch comments of issues
    for (const issue of issues as { comments: number; comments_url: string; comments_data: unknown[] }[]) {
      if (issue.comments > 0) {
        const response = await this.request(issue.comments_url, false);
        issue.comments_data = response;
      } else {
        issue.comments_data = [];
      }
    }

    return issues;
  }
}
