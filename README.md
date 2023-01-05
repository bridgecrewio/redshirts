# Redshirts

Counts contributors for git repositories in the same way that Prisma Cloud Code Security counts them for developer-based pricing. Use this tool to estimate the impact on credit consumption prior to connecting repos to the platform. Note that while this tool applies the same logic as the platform when identifying users, due to the timing of platform scans, differences in repo visibility for different access tokens, etc, these results may not exactly match those in the platform. Report issues to your account team, PANW support, or at https://github.com/bridgecrewio/redshirts/issues

<!-- toc -->

-  [Usage](#usage)
-  [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g redshirts
$ redshirts COMMAND
running command...
$ redshirts (--version)
redshirts/0.0.0 darwin-arm64 node-v16.17.0
$ redshirts --help [COMMAND]
USAGE
  $ redshirts COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [Redshirts](#redshirts)
- [Usage](#usage)
- [Commands](#commands)
  - [`redshirts github`](#redshirts-github)
  - [`redshirts gitlab [FILE]`](#redshirts-gitlab-file)
  - [`redshirts help [COMMAND]`](#redshirts-help-command)

## `redshirts github`

Count active contributors for Github

```
USAGE
  $ redshirts github -t <value> [--orgs <value>] [--repos <value>]

FLAGS
  -t, --token=<value>  (required) Github personal access token
  --orgs=<value>       Organization names
  --repos=<value>      Repository names

DESCRIPTION
  Count active contributors for Github

EXAMPLES
  $ redshirts github --token github_pat_xxx --orgs bridgecrewio --repos checkov,terragoat
```

_See code: [dist/commands/github.ts](https://github.com/bridgecrewio/redshirts/blob/v0.0.0/dist/commands/github.ts)_

## `redshirts gitlab [FILE]`

describe the command here

```
USAGE
  $ redshirts gitlab [FILE] [-n <value>] [-f]

FLAGS
  -f, --force
  -n, --name=<value>  name to print

DESCRIPTION
  describe the command here

EXAMPLES
  $ redshirts gitlab
```

_See code: [dist/commands/gitlab.ts](https://github.com/bridgecrewio/redshirts/blob/v0.0.0/dist/commands/gitlab.ts)_

## `redshirts help [COMMAND]`

Display help for redshirts.

```
USAGE
  $ redshirts help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for redshirts.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.19/src/commands/help.ts)_

<!-- commandsstop -->
