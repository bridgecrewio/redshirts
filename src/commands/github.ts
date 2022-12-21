import { Command, Flags } from '@oclif/core'
import { GithubApiManager } from '../vcs/github/api-manager'
import { GithubSourceInfo } from '../vcs/github/types'

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
      repos: Flags.string({
         description: 'Repository names',
         required: false,
      }),
   }

   async run(): Promise<void> {
      const { flags } = await this.parse(Github)

      this.log(`Token: ${flags.token} (./src/commands/github.ts)`)
      const githubSourceInfo: GithubSourceInfo = {
         url: 'https://api.github.com',
         token: flags.token,
      }
      const githubApi: GithubApiManager = new GithubApiManager(githubSourceInfo)
      const repos: unknown[] = await githubApi.getUserRepos()
      const orgs: unknown = await githubApi.getUserOrgs()
      console.log(repos)
      console.log(orgs)
   }
}
