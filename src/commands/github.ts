/* eslint-disable no-await-in-loop */
import { Command, Flags } from '@oclif/core'
import { Repo, ContributorMap } from '../common/types'
import { commonFlags, stringToArr } from '../common/utils'
import { GithubApiManager } from '../vcs/github/api-manager'
import { GithubCounter } from '../vcs/github/github-counter'
import { GithubCommit, GithubSourceInfo } from '../vcs/github/types'

export default class Github extends Command {
   static description = 'Count active contributors for Github'

   static examples = [
      `$ <%= config.bin %> <%= command.id %> --token github_pat_xxx --orgs bridgecrewio --repos checkov,terragoat
`,
   ]

   static flags = {
      token: Flags.string({
         char: 't',
         description: 'Github personal access token',
         required: true,
      }),
      orgs: Flags.string({
         description: 'Organization names',
         required: false,
      }),
      ...commonFlags,
   }

   async run(): Promise<void> {
      const { flags } = await this.parse(Github)
      let orgs: string[]
      let repos: any = []
      const githubSourceInfo: GithubSourceInfo = {
         url: 'https://api.github.com',
         token: flags.token,
      }
      const githubApi: GithubApiManager = new GithubApiManager(githubSourceInfo)
      const githubCounter: GithubCounter = new GithubCounter(githubSourceInfo)

      // fetch all repos for specified orgs
      if (flags.orgs) {
         orgs = stringToArr(flags.orgs)
         for (const org of orgs) {
            console.log(`Getting repos for org ${org}..`)
            const orgRepos = await githubApi.getOrgRepos(org)
            repos.push(...this.filterRepos(orgRepos))
         }
      } else {
         const userRepos = await githubApi.getUserRepos()
         repos = this.filterRepos(userRepos)
      }

      // for testing - to be deleted
      const repo: Repo = {
         owner: {
            login: 'kartikp10',
         },
         name: 'sample-tf',
      }

      /**
       * TODO:
       *    - loop over list of repos
       *    - for each repo, get commits and convert commits to contributors
       *    - only append to the contributor map if the map does not have the contributor already
       */
      const commits: GithubCommit[] = (await githubApi.getCommits(repo, 90)) as GithubCommit[]
      const contributors: ContributorMap = githubCounter.convertCommitsToContributors(commits)

      githubCounter.printSummary(
         ...githubCounter.countContributors(contributors, githubCounter.excludedUsers),
         flags.output
      )
   }

   filterRepos(reposResponse: Repo[]): any {
      const filteredRepos: any = []
      for (const repo of reposResponse) {
         filteredRepos.push({
            name: repo.name,
            owner: repo.owner.login,
            private: repo.private,
         })
      }

      return filteredRepos
   }
}
