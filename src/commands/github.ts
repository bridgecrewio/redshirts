import { Flags } from '@oclif/core';
import { commonFlags } from '../common/flags';
import { RedshirtsCommand } from '../common/redshirts-command';
import { Repo } from '../common/types';
import { GithubApiManager } from '../vcs/github/github-api-manager';
import { GithubCounter } from '../vcs/github/github-counter';
import { GithubRepoResponse } from '../vcs/github/github-types';

export default class Github extends RedshirtsCommand {
   static description = 'Count active contributors for GitHub repos'

   static examples = [
      `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --repos bridgecrewio/checkov,try-bridgecrew/terragoat`,
      `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --orgs bridgecrewio,try-bridgecrew`,
   ]

   static flags = {
      token: Flags.string({
         char: 't',
         description: 'Github personal access token. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
         required: true,
      }),
      orgs: Flags.string({
         description: 'Organization or user names for which to fetch repos. Takes precendence over the --repos option.',
         required: false,
      }),
      ...commonFlags,
   }

   async run(): Promise<void> {
      const { flags } = await this.parse(Github);

      const sourceInfo = {
         url: 'https://api.github.com',
         token: flags.token,
         repoTerm: 'repo',
         orgTerm: 'organization',
         orgFlagName: 'orgs'
      };

      const apiManager = new GithubApiManager(sourceInfo, flags.cert);
      const counter = new GithubCounter();

      await this.execute(flags, sourceInfo, apiManager, counter);
   }

   filterRepos(reposResponse: GithubRepoResponse[]): Repo[] {
      const filteredRepos: Repo[] = [];
      for (const repo of reposResponse) {
         filteredRepos.push({
            name: repo.name,
            owner: repo.owner.login,
            private: repo.private,
         });
      }

      return filteredRepos;
   }
}
