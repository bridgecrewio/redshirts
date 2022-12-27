import { Flags } from '@oclif/core';
import { commonFlags } from '../common/flags';
import { RedshirtsCommand } from '../common/redshirts-command';
import { Repo } from '../common/types';
import { BitbucketApiManager } from '../vcs/bitbucket/bitbucket-api-manager';
import { BitbucketCounter } from '../vcs/bitbucket/bitbucket-counter';
import { BitbucketRepoResponse } from '../vcs/bitbucket/bitbucket-types';

export default class Bitbucket extends RedshirtsCommand {
   static description = 'Count active contributors for Bitbucket repos'

   static examples = [
      `$ <%= config.bin %> <%= command.id %> --username my_username --token ATBBXXX --repos bridgecrewio/checkov,try-bridgecrew/terragoat`,
      `$ <%= config.bin %> <%= command.id %> --username my_username --token ATBBXXX --workspaces bridgecrewio,try-bridgecrew`,
   ]

   static flags = {
      username: Flags.string({
         description: 'Your Bitbucket username associated with the provided app token',
         char: 'u',
         required: true
      }),
      token: Flags.string({
         char: 't',
         description: 'A Bitbucket app token tied to the provided username. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
         required: true,
      }),
      workspaces: Flags.string({
         description: 'Workspace or usernames for which to fetch repos. Takes precendence over the --repos option.',
         required: false,
      }),
      ...commonFlags,
   }

   async run(): Promise<void> {
      const { flags } = await this.parse(Bitbucket);

      const sourceInfo = {
         url: 'https://api.bitbucket.org/2.0',
         token: flags.username + ':' + flags.token,
         repoTerm: 'repo',
         orgTerm: 'workspace',
         orgFlagName: 'workspaces'
      };

      const apiManager = new BitbucketApiManager(sourceInfo, flags.cert);
      const counter = new BitbucketCounter();

      await this.execute(flags, sourceInfo, apiManager, counter);
   }

   filterRepos(reposResponse: BitbucketRepoResponse[]): Repo[] {
      const filteredRepos: Repo[] = [];
      for (const repo of reposResponse) {
         const nameParts = repo.full_name.split('/');
         filteredRepos.push({
            name: nameParts[1],
            owner: nameParts[0],
            private: repo.is_private,
         });
      }

      return filteredRepos;
   }
}
