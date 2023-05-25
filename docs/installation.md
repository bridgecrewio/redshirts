# Installation

Redshirts requires nodejs version 16 or higher.

Redshirts is installed as a Node package using NPM. The general command for this is: `npm install -g @paloaltonetworks/redshirts`.

This should create a `redshirts` executable in the same directory as your global `npm` executable, which must be in your system `PATH` variable. Then you can simply run the command `redshirts` to execute the tool.

Test it with the `reshirts help` or `redshirts --version` commands.

Depending on your environment, you may need to use a different approach to install it.

If you cannot add `npm` to your global `PATH`, you may be able to run it using its fully qualified path, e.g. `/path/to/node/bin/npm install @paloaltonetworks/redshirts`.

If you cannot or do not wish to install packages globally, you can install it locally in the `node_modules` directory of a directory on your system. This directory will probably not be in your `PATH`, but you can run redshirts directly from that directory. Example:

```
npm install @paloaltonetworks/redshirts  # installs to node_modules in the current directory
node_modules/@paloaltonetworks/redshirts/bin/run help
```

If you receive SSL-related errors while running the commands above, you may have a VPN that is intercepting requests. Try disabling the VPN or [obtaining a certificate chain](https://www.baeldung.com/linux/ssl-certificates) for `registry.npmjs.org`. Then add it to your `.npmrc` file: `cafile=<path_to_file>`. See [NPM docs](https://docs.npmjs.com/cli/v9/using-npm/config#npmrc-files) for more details.

You can also [build and run from source](./run-from-source.md), if you prefer.

# Upgrading

To upgrade redshirts to the latest version, use the same approach you used to install it, but replace `install` with `upgrade`. For example:

```
npm upgrade -g @paloaltonetworks/redshirts
```
