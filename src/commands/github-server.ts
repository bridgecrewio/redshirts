import { SourceType } from '../common/types';
import { getServerUrl, init } from '../common/utils';
import { GithubServerRunner } from '../vcs/githubServer/github-server-runner';
import { GithubServerApiManager } from '../vcs/githubServer/github-server-api-manager';
import Github from './github';
import { vcsServerFlags } from '../common/flags';

export default class GithubServer extends Github {
    static summary = 'Count active contributors for GitHub server (self-hosted) repos'

    static description = `This tool works with GitHub enterprise server v3 APIs. Note that earlier versions are out of support from GitHub, and thus are not supported here.

    Authentication: you must use a personal access token (PAT) with the "repo" scope (the top-level checkbox must be checked).
    
    About rate limiting: GitHub server returns rate limit details in response headers, and thus this tool will submit requests as quickly as possible while respecting the rate limit provided. If rate limiting is disabled on the server, then this tool will not attempt to throttle requests.`

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --repos bridgecrewio/checkov,try-bridgecrew/terragoat --hostname github.mycompany.internal`,
        `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --orgs bridgecrewio,try-bridgecrew --hostname github.mycompany.internal --port 9999`,
    ]

    static flags = {
        ...vcsServerFlags,
        ...Github.flags
    }

    async run(): Promise<void> {
        
        const { flags } = await this.parse(GithubServer);
        init(flags);

        const serverUrl = getServerUrl(flags.hostname, flags.port, flags.protocol);
        const baseUrl = `${serverUrl}/api/v3`;
        const sourceInfo = Github.getSourceInfo(flags.token, flags['include-public'], baseUrl, SourceType.GithubServer);

        const apiManager = new GithubServerApiManager(sourceInfo, flags['ca-cert']);
        const runner = new GithubServerRunner(sourceInfo, flags, apiManager);

        await runner.execute();
    }
}
