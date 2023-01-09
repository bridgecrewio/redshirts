# Run from source

You can build and run Redshirts from the source if you wish. This can be useful if you want to make modifications locally or if you are unable to install packages due to restrictions on your machine.

You must have Node v16 or higher and the [Yarn package manager](https://yarnpkg.com/).

Build the package:

1. Clone the repo
1. `yarn install -D`
1. `yarn build`

**Run in production mode:** `./bin/app <arguments>`

**Run in dev mode (does not require building before running):** `./bin/dev <arguments>`
