export type SourceInfo = {
   url: string
   token?: string
}

export type Contributor = {
   username: string
   emails: Set<string>
   // repos: Array<string>
   lastCommitDate: string
}

// Unique id that identifies a contributor
export type id = string

export type ContributorMap = Map<id, Contributor>

export type Repo = {
   name: string
   owner: string
   private?: boolean
}

export interface Commit {
   username: string,
   email: string,
   commitDate: string
};

export interface Report {
   contributors: Contributor[];
   totalContributors: number;
}

export interface SummaryReport extends Report {
   repos: Map<string, Report>
}

export enum SourceType {
   Github = 'GitHub',
   GithubServer = 'GitHubServer',
   Gitlab = 'GitLab',
   GitlabServer = 'GitLabServer',
   Bitbucket = 'Bitbucket',
   BitbucketServer = 'BitbucketServer',
   AzureRepos = 'AzureRepos',
   Local = 'Local',
}

export enum OutputFormat {
   Summary = 'summary',
   JSON = 'json',
   CSV = 'csv'
}
