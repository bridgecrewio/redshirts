import { Flags } from '@oclif/core';
import { commonFlags } from '../common/flags';
import { RedshirtsCommand } from '../common/redshirts-command';
import { HelpGroup, Repo } from '../common/types';
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
            required: true,
            helpGroup: HelpGroup.AUTH
        }),
        token: Flags.string({
            char: 't',
            description: 'A Bitbucket app token tied to the provided username. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
            required: true,
            helpGroup: HelpGroup.AUTH
        }),
        workspaces: Flags.string({
            description: 'Workspace and / or usernames for which to fetch repos. Use the --repos option to add additional specific repos on top of those in the specified workspace(s). Use the --skip-repos option to exclude individual repos that are a part of these workspace(s).',
            required: false,
            helpGroup: HelpGroup.REPO_SPEC
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
            orgFlagName: 'workspaces',
            minPathLength: 2,
            maxPathLength: 2
        };

        const apiManager = new BitbucketApiManager(sourceInfo, flags['ca-cert']);
        const counter = new BitbucketCounter();

        await this.execute(flags, sourceInfo, apiManager, counter);
    }

    convertRepos(reposResponse: BitbucketRepoResponse[]): Repo[] {
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
