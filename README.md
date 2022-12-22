oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
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
* [`redshirts github`](#redshirts-github)
* [`redshirts gitlab [FILE]`](#redshirts-gitlab-file)
* [`redshirts help [COMMAND]`](#redshirts-help-command)

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
