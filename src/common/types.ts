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

export type Commit = {
   commit: any
}

export interface Report {
   contributors: Contributor[];
   totalContributors: number;
}

export interface SummaryReport extends Report {
   repos: RepoReport[]
}

export interface RepoReport extends Report {
   repo: string
}

export enum SourceType {
   Github = 'Github',
   GithubServer = 'GithubServer',
   Gitlab = 'Gitlab',
   GitlabServer = 'GitlabServer',
   Bitbucket = 'Bitbucket',
   BitbucketServer = 'BitbucketServer',
   AzureRepos = 'AzureRepos',
   Local = 'Local',
}

export enum OutputFormat {
   Summary = 'summary',
   JSON = 'json',
}
