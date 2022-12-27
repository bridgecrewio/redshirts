export type SourceInfo = {
   url: string
   token: string
   repoTerm: string
   orgTerm: string
   orgFlagName: string
}

export type Contributor = {
   username: string
   emails: Set<string>
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RepoResponse {}

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

export enum SortField {
   REPO = 'repo',
   CONTRIBUTORS = 'contributors'
}

export enum HelpGroup {
   REPO_SPEC = 'Repo specification',
   AUTH = 'Authentication',
   OUTPUT = 'Output',
   OTHER = 'Other'
}

export type OutputTableRow = { Repo: string, Contributors: number };