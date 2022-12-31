export interface SourceInfo {
    sourceType: SourceType
    repoTerm: string
    orgTerm: string
}

export interface VcsSourceInfo extends SourceInfo {
    url: string
    token: string
    orgFlagName: string,
    minPathLength: number,
    maxPathLength: number
}

export type Contributor = {
    email: string
    usernames: Set<string>
    lastCommitDate: string
}

export type ContributorMap = Map<string, Contributor>

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
export interface RepoResponse { }

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VCSCommit { }

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
    CONNECTION = 'Connection',
    OTHER = 'Other'
}

export enum Protocol {
    HTTP = 'http',
    HTTPS = 'https'
}

export type OutputTableRow = { Repo: string, Contributors: number };