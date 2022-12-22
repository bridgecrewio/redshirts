export type SourceInfo = {
   url: string
   token: string
}

export type Contributor = {
   usernames: string[]
   emails: string[]
   // repos: Array<string>
   lastCommitDate: string
}

// Unique id that identifies a contributor
export type id = string

export type ContributorMap = Map<id, Contributor>

export type Repo = {
   name: string
   owner: {
      login: string
   }
   private?: boolean
}

export type Commit = {
   commit: any
}

export type Report = {
   contributorDetails: any
   totalContributors: number
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
