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
      const repos: any = []
      const githubSourceInfo: GithubSourceInfo = {
         url: 'https://api.github.com',
         token: flags.token,
      }
      const githubApi: GithubApiManager = new GithubApiManager(githubSourceInfo)
      const githubCounter: GithubCounter = new GithubCounter(githubSourceInfo)

      if (flags.orgs) {
         orgs = stringToArr(flags.orgs)
         for (const org of orgs) {
            console.log(`Getting repos for org ${org}..`)
            const orgRepos = await githubApi.getOrgRepos(org)
            for (const repo of orgRepos) {
               repos.push({
                  name: repo.name,
                  owner: repo.owner.login,
                  private: repo.private,
               })
            }
         }
      }

      const repo: Repo = {
         owner: {
            login: 'kartikp10',
         },
         name: 'sample-tf',
      }
      const commits: GithubCommit[] = (await githubApi.getCommits(repo, 90)) as GithubCommit[]
      const contributors: ContributorMap = githubCounter.convertCommitsToContributors(commits)

      githubCounter.printSummary(
         ...githubCounter.countContributors(contributors, githubCounter.excludedUsers),
         flags.output
      )
   }
}
