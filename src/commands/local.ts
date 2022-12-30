import { Command } from '@oclif/core';
import { CLIError } from '@oclif/errors';
import { commonFlags } from '../common/flags';
import { SourceInfo, SourceType } from '../common/types';
import { replaceFlagMetadata } from '../common/utils';
import { AzureRunner } from '../vcs/azure/azure-runner';

// TODO access notes:
// user must be at least "basic" in the ADO org (which is higher than you get by default if you add a user to a team)

export default class Local extends Command {

    static summary = 'Count active contributors in local directories using `git log`'

    static description = ''

    static examples = [
        `$ <%= config.bin %> <%= command.id %> --repos . --skip-repos ./terragoat`,
        `$ <%= config.bin %> <%= command.id %> --repos ~/repos,/tmp/repo,/tmp/repo/submodule`,
    ]

    static flags = {
        ...replaceFlagMetadata(
            commonFlags, 
            new Map([
                [
                    'repos',
                    'A comma-separated list of relative or absolute paths to directories on the file system that contain git repositories. The tool will traverse this directory recursively, stopping at any directories with a .git directory (the root of a repo) - it will not traverse more deeply than that. This means that if you have a repo with a submodule, you should specify the submodule directory explicitly here. If you have directories with commas in the name, use the --repo-file option.'
                ],
                [
                    'skip-repos',
                    'A comma-separated list of relative or absolute paths of directories within the directories of --repos to skip. Relative paths will be skipped if they are relative to any of the specified --repo directories. It is recommended to use absolute paths for skipping directories. Once any skipped directory is reached, traversing of that part of the directory tree immediately stops.'
                ]
            ]),
            new Map([
                [
                    'repos',
                    '.'
                ]
            ]))
    } as any;

    async run(): Promise<void> {
        const { flags } = (await this.parse(Local));

        const sourceInfo = this.getSourceInfo(':' + flags.token);

        const runner = new AzureRunner(sourceInfo, flags, apiManager);

        if (!(flags.orgs || flags.projects || flags.repos || flags['repo-file'])) {
            throw new CLIError('At least one of --orgs, --projects, --repos, or --repo-file is required for Azure DevOps');
        }

        await runner.execute();
    }
}
