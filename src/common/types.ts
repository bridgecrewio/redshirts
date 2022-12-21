export type SourceInfo = {
   url: string
   token: string
}

export type Contributor = {
   username: string
   email: string
   repos: Array<string>
}

export type Repo = {
   name: string
   owner: string
   private?: boolean
   defaultBranch?: string
}

export type Commit = {
   date: Date
   author: string
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
