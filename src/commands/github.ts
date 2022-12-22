/* eslint-disable no-await-in-loop */
import { Command, Flags } from '@oclif/core'
import { AxiosError } from 'axios'
import { Repo } from '../common/types'
import { commonFlags, splitRepos, stringToArr } from '../common/utils'
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
         description: 'Github personal access token. This is generally required, especially for any private repos. However, in some cases, omitting this can get around org-level restrictions like IP whitelisting.',
         required: false,
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
      const githubApi: GithubApiManager = new GithubApiManager(githubSourceInfo, flags.cert)
      const githubCounter: GithubCounter = new GithubCounter(githubSourceInfo)

      // fetch all repos for specified orgs
      if (flags.orgs) {
         orgs = stringToArr(flags.orgs)
         for (const org of orgs) {
            console.log(`Getting repos for org ${org}..`)
            const orgRepos = await githubApi.getOrgRepos(org)
            repos.push(...this.filterRepos(orgRepos))
         }
      } else if (flags.repos) {
         repos = splitRepos(flags.repos);

      } else {
         const userRepos = await githubApi.getUserRepos()
         repos = this.filterRepos(userRepos)
      }

      // // for testing - to be deleted
      // const repoList: Repo[] = [
      //    {
      //       owner: 'mikeurbanski1',
      //       name: 'tfcloud',
      //    },
      //    {
      //       owner: 'mikeurbanski2',
      //       name: 'terragoat',
      //    },
      //    {
      //       owner: 'mikeurbanski1',
      //       name: 'repo1',
      //       private: true
      //    },
      //    {
      //       owner: 'bridgecrewio',
      //       name: 'checkov',
      //       private: false
      //    }
      // ];

      // TODO:
      /**
       *    - loop over list of repos
       *    - for each repo, get commits and convert commits to contributors
       *    - only append to the contributor map if the map does not have the contributor already
       */
      for (const repo of repos) {
         try {
            const commits: GithubCommit[] = (await githubApi.getCommits(repo, 90)) as GithubCommit[];
            githubCounter.aggregateCommitContributors(repo, commits);
         } catch (error) {
            if (error instanceof AxiosError) {
               console.error(`Failed to get commits for repo ${repo.owner}/${repo.name}. Reason: ${error.response?.data?.message}`);
            }
         }
      }

      githubCounter.printSummary(
         flags.output
      );
   }

   filterRepos(reposResponse: Repo[]): any {
      const filteredRepos: any = []
      for (const repo of reposResponse) {
         filteredRepos.push({
            name: repo.name,
            owner: repo.owner,
            private: repo.private,
         })
      }

      return filteredRepos
   }
}
